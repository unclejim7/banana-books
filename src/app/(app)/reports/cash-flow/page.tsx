import type { Prisma } from "@prisma/client";
import { requireOrgContext } from "@/lib/session";
import { getCashFlowStatement } from "@/lib/accounting/reports";
import { monthLabel, periodFromDate } from "@/lib/accounting/period";
import { formatCurrency } from "@/lib/format";
import { ReportPeriodForm } from "@/components/ReportPeriodForm";

export default async function CashFlowPage({
  searchParams,
}: {
  searchParams: Promise<{ fromYear?: string; fromMonth?: string; toYear?: string; toMonth?: string }>;
}) {
  const ctx = await requireOrgContext();
  const params = await searchParams;
  const now = periodFromDate(new Date());

  const from = {
    year: Number(params.fromYear) || now.year,
    month: Number(params.fromMonth) || 1,
  };
  const to = {
    year: Number(params.toYear) || now.year,
    month: Number(params.toMonth) || now.month,
  };

  const report = await getCashFlowStatement(ctx.organizationId, from, to);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Cash Flow Statement</h1>
        <p className="text-sm text-neutral-500 mt-1">
          {monthLabel(from.year, from.month)} – {monthLabel(to.year, to.month)}
        </p>
      </div>

      <ReportPeriodForm mode="range" from={from} to={to} />

      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800">
        <Row label="Beginning cash balance" amount={report.beginningCash} />
        <Row label="Net cash from operating activities" amount={report.operating} />
        <Row label="Net cash from investing activities" amount={report.investing} />
        <Row label="Net cash from financing activities" amount={report.financing} />
        <Row label="Net change in cash" amount={report.netChange} bold />
        <Row label="Ending cash balance" amount={report.endingCash} bold />
      </div>

      {!report.reconciles && (
        <p className="text-sm text-neutral-500">
          Note: the net change above doesn&rsquo;t fully reconcile to the change in cash balance — this usually
          means some cash-account transactions in this range are still uncategorized or excluded.
        </p>
      )}
      <p className="text-xs text-neutral-500">
        Transfers between your own bank accounts are excluded from cash flow, since they don&rsquo;t represent
        money entering or leaving the business. Credit card payments are shown under financing activities, similar
        to a loan repayment.
      </p>
    </div>
  );
}

function Row({ label, amount, bold }: { label: string; amount: Prisma.Decimal; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 text-sm ${bold ? "font-semibold" : ""}`}>
      <span>{label}</span>
      <span className={amount.isNegative() ? "text-red-600" : ""}>{formatCurrency(amount)}</span>
    </div>
  );
}
