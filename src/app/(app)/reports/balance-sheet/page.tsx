import type { Prisma } from "@prisma/client";
import { requireOrgContext } from "@/lib/session";
import { getBalanceSheet } from "@/lib/accounting/reports";
import { monthLabel, periodFromDate, periodEnd } from "@/lib/accounting/period";
import { formatCurrency } from "@/lib/format";
import { ReportPeriodForm } from "@/components/ReportPeriodForm";

export default async function BalanceSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ asOfYear?: string; asOfMonth?: string }>;
}) {
  const ctx = await requireOrgContext();
  const params = await searchParams;
  const now = periodFromDate(new Date());

  const asOf = {
    year: Number(params.asOfYear) || now.year,
    month: Number(params.asOfMonth) || now.month,
  };

  const report = await getBalanceSheet(ctx.organizationId, asOf);
  const balanced = report.totalAssets.equals(report.totalLiabilitiesAndEquity);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Balance Sheet</h1>
        <p className="text-sm text-neutral-500 mt-1">As of {periodEnd(asOf.year, asOf.month).toLocaleDateString("en-US", { timeZone: "UTC", dateStyle: "long" })}</p>
      </div>

      <ReportPeriodForm mode="asOf" asOf={asOf} />

      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800">
        <Section title="Assets" lines={report.assets} total={report.totalAssets} />
        <Section title="Liabilities" lines={report.liabilities} total={report.totalLiabilities} />
        <Section title="Equity" lines={report.equity} total={report.totalEquity} />
        <div className="flex items-center justify-between px-4 py-3 font-semibold">
          <span>Total Liabilities &amp; Equity</span>
          <span>{formatCurrency(report.totalLiabilitiesAndEquity)}</span>
        </div>
      </div>

      {!balanced && (
        <p className="text-sm text-red-600">
          Warning: assets ({formatCurrency(report.totalAssets)}) do not equal liabilities + equity (
          {formatCurrency(report.totalLiabilitiesAndEquity)}). This can happen if journal entries were modified
          outside the normal categorization flow.
        </p>
      )}
      <p className="text-xs text-neutral-500">
        &ldquo;{monthLabel(asOf.year, asOf.month)}&rdquo; net income is shown as a single cumulative Equity line
        since no formal year-end closing entry has been made.
      </p>
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
