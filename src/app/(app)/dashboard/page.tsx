import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/session";
import { getProfitAndLoss, getBalanceSheet } from "@/lib/accounting/reports";
import { monthLabel, periodFromDate } from "@/lib/accounting/period";
import { formatCurrency } from "@/lib/format";

export default async function DashboardPage() {
  const ctx = await requireOrgContext();
  const now = periodFromDate(new Date());

  const [statementCount, uncategorizedCount, pnl, balanceSheet, openPeriods, cashAccountIds] = await Promise.all([
    prisma.statement.count({ where: { organizationId: ctx.organizationId } }),
    prisma.transaction.count({
      where: { organizationId: ctx.organizationId, categorizedAccountId: null, isExcluded: false },
    }),
    getProfitAndLoss(ctx.organizationId, { year: now.year, month: 1 }, now),
    getBalanceSheet(ctx.organizationId, now),
    prisma.closePeriod.count({ where: { organizationId: ctx.organizationId, status: "OPEN" } }),
    prisma.ledgerAccount
      .findMany({ where: { organizationId: ctx.organizationId, isCashAccount: true }, select: { id: true } })
      .then((rows) => new Set(rows.map((r) => r.id))),
  ]);

  const cashOnHand = balanceSheet.assets
    .filter((a) => cashAccountIds.has(a.id))
    .reduce((sum, a) => sum.plus(a.amount), new Prisma.Decimal(0));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Welcome back, {ctx.userName.split(" ")[0]}</h1>
        <p className="text-sm text-neutral-500 mt-1">{ctx.organizationName}</p>
      </div>

      {statementCount === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-center space-y-3">
          <p className="text-neutral-600 dark:text-neutral-400">
            Upload your first bank or credit card statement to get started.
          </p>
          <Link
            href="/statements/upload"
            className="inline-block rounded-md bg-yellow-500 px-4 py-2 text-sm font-medium text-black hover:bg-yellow-400"
          >
            Upload a statement
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card title="Cash on hand" value={formatCurrency(cashOnHand)} href="/reports/balance-sheet" />
          <Card
            title={`Net income (${monthLabel(now.year, now.month)})`}
            value={formatCurrency(pnl.netIncome)}
            href="/reports/profit-loss"
          />
          <Card
            title="Needs categorizing"
            value={String(uncategorizedCount)}
            href="/transactions?filter=uncategorized"
            warn={uncategorizedCount > 0}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <QuickLink href="/statements/upload" label="Upload a statement" />
        <QuickLink href="/transactions" label="Review transactions" />
        <QuickLink href="/close" label="Month-end close" />
        <QuickLink href="/reports/profit-loss" label="View reports" />
      </div>

      {openPeriods > 0 && (
        <p className="text-sm text-neutral-500">
          You have {openPeriods} open period{openPeriods === 1 ? "" : "s"}. Close them once fully categorized to
          lock in your books for the month.
        </p>
      )}
    </div>
  );
}

function Card({ title, value, href, warn }: { title: string; value: string; href: string; warn?: boolean }) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 hover:border-yellow-500 transition-colors"
    >
      <p className="text-xs text-neutral-500">{title}</p>
      <p className={`mt-1 text-xl font-semibold ${warn ? "text-yellow-600" : ""}`}>{value}</p>
    </Link>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900"
    >
      {label}
    </Link>
  );
}
