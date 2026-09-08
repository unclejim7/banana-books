import type { Prisma } from "@prisma/client";
import { requireOrgContext } from "@/lib/session";
import { getProfitAndLoss } from "@/lib/accounting/reports";
import { monthLabel, periodFromDate } from "@/lib/accounting/period";
import { formatCurrency } from "@/lib/format";
import { ReportPeriodForm } from "@/components/ReportPeriodForm";

export default async function ProfitAndLossPage({
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

  const report = await getProfitAndLoss(ctx.organizationId, from, to);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Profit &amp; Loss</h1>
        <p className="text-sm text-neutral-500 mt-1">
          {monthLabel(from.year, from.month)} – {monthLabel(to.year, to.month)}
        </p>
      </div>

      <ReportPeriodForm mode="range" from={from} to={to} />

      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800">
        <Section title="Income" lines={report.income} total={report.totalIncome} />
        <Section title="Expenses" lines={report.expenses} total={report.totalExpenses} />
        <div className="flex items-center justify-between px-4 py-3 font-semibold">
          <span>Net Income</span>
          <span className={report.netIncome.isNegative() ? "text-red-600" : "text-green-700 dark:text-green-400"}>
            {formatCurrency(report.netIncome)}
          </span>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  lines,
  total,
}: {
  title: string;
  lines: { id: string; name: string; amount: Prisma.Decimal }[];
  total: Prisma.Decimal;
}) {
  return (
    <div className="px-4 py-3">
      <h2 className="text-sm font-semibold text-neutral-500 mb-2">{title}</h2>
      {lines.length === 0 ? (
        <p className="text-sm text-neutral-400">None</p>
      ) : (
        <div className="space-y-1">
          {lines.map((l) => (
            <div key={l.id} className="flex items-center justify-between text-sm">
              <span>{l.name}</span>
              <span>{formatCurrency(l.amount)}</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 flex items-center justify-between text-sm font-medium border-t border-neutral-200 dark:border-neutral-800 pt-2">
        <span>Total {title}</span>
        <span>{formatCurrency(total)}</span>
      </div>
    </div>
  );
}
