import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/session";
import { monthLabel, periodFromDate } from "@/lib/accounting/period";
import { TransactionRow } from "./TransactionRow";
import { PeriodSelect } from "./PeriodSelect";

type Filter = "all" | "uncategorized" | "excluded";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ statementId?: string; year?: string; month?: string; filter?: string }>;
}) {
  const ctx = await requireOrgContext();
  const params = await searchParams;

  let year: number;
  let month: number;

  if (params.statementId) {
    const statement = await prisma.statement.findFirst({
      where: { id: params.statementId, organizationId: ctx.organizationId },
    });
    if (statement) {
      year = statement.periodYear;
      month = statement.periodMonth;
    } else {
      ({ year, month } = periodFromDate(new Date()));
    }
  } else if (params.year && params.month) {
    year = Number(params.year);
    month = Number(params.month);
  } else {
    const latest = await prisma.transaction.findFirst({
      where: { organizationId: ctx.organizationId },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
    });
    if (latest) {
      year = latest.periodYear;
      month = latest.periodMonth;
    } else {
      ({ year, month } = periodFromDate(new Date()));
    }
  }

  const filter: Filter = (params.filter as Filter) ?? "all";

  const [periodRows, closePeriod, accounts, transactions] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["periodYear", "periodMonth"],
      where: { organizationId: ctx.organizationId },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
    }),
    prisma.closePeriod.findUnique({
      where: { organizationId_year_month: { organizationId: ctx.organizationId, year, month } },
    }),
    prisma.ledgerAccount.findMany({
      where: { organizationId: ctx.organizationId, archived: false },
      orderBy: { code: "asc" },
    }),
    prisma.transaction.findMany({
      where: {
        organizationId: ctx.organizationId,
        periodYear: year,
        periodMonth: month,
        ...(params.statementId ? { statementId: params.statementId } : {}),
        ...(filter === "uncategorized" ? { categorizedAccountId: null, isExcluded: false } : {}),
        ...(filter === "excluded" ? { isExcluded: true } : {}),
      },
      include: { ledgerAccount: true },
      orderBy: { date: "asc" },
    }),
  ]);

  const periods = periodRows.length
    ? periodRows.map((p) => ({
        year: p.periodYear,
        month: p.periodMonth,
        label: monthLabel(p.periodYear, p.periodMonth),
      }))
    : [{ year, month, label: monthLabel(year, month) }];

  const locked = closePeriod?.status === "CLOSED";
  const uncategorizedCount = await prisma.transaction.count({
    where: {
      organizationId: ctx.organizationId,
      periodYear: year,
      periodMonth: month,
      categorizedAccountId: null,
      isExcluded: false,
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Transactions</h1>
        <PeriodSelect periods={periods} selected={{ year, month }} />
      </div>

      {locked && (
        <div className="rounded-md bg-neutral-100 dark:bg-neutral-900 px-4 py-2 text-sm text-neutral-600 dark:text-neutral-400">
          This period is closed. Reopen it from Month-End Close to make changes.
        </div>
      )}

      <div className="flex items-center gap-4 text-sm">
        <FilterLink current={filter} value="all" year={year} month={month}>
          All
        </FilterLink>
        <FilterLink current={filter} value="uncategorized" year={year} month={month}>
          Uncategorized ({uncategorizedCount})
        </FilterLink>
        <FilterLink current={filter} value="excluded" year={year} month={month}>
          Excluded
        </FilterLink>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-900 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Description</th>
              <th className="px-4 py-2 font-medium text-right">Amount</th>
              <th className="px-4 py-2 font-medium">Category</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <TransactionRow
                key={t.id}
                transaction={{
                  id: t.id,
                  date: t.date.toISOString(),
                  description: `${t.description} · ${t.ledgerAccount.name}`,
                  amount: t.amount.toString(),
                  categorizedAccountId: t.categorizedAccountId,
                  isExcluded: t.isExcluded,
                }}
                accounts={accounts}
                locked={locked}
              />
            ))}
            {transactions.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-neutral-500" colSpan={5}>
                  No transactions for this period yet.{" "}
                  <Link href="/statements/upload" className="text-yellow-600 hover:underline">
                    Upload a statement
                  </Link>
                  .
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterLink({
  current,
  value,
  year,
  month,
  children,
}: {
  current: Filter;
  value: Filter;
  year: number;
  month: number;
  children: React.ReactNode;
}) {
  const active = current === value;
  return (
    <Link
      href={`/transactions?year=${year}&month=${month}&filter=${value}`}
      className={active ? "font-medium text-yellow-600" : "text-neutral-500 hover:underline"}
    >
      {children}
    </Link>
  );
}
