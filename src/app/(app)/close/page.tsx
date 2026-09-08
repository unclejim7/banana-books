import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/session";
import { monthLabel } from "@/lib/accounting/period";
import { reopenPeriodAction } from "@/app/actions/close";
import { CloseButton } from "./CloseButton";

export default async function ClosePage() {
  const ctx = await requireOrgContext();

  const periodRows = await prisma.transaction.groupBy({
    by: ["periodYear", "periodMonth"],
    where: { organizationId: ctx.organizationId },
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
  });

  const closePeriods = await prisma.closePeriod.findMany({
    where: { organizationId: ctx.organizationId },
  });
  const closeByKey = new Map(closePeriods.map((c) => [`${c.year}-${c.month}`, c]));

  const rows = await Promise.all(
    periodRows.map(async (p) => {
      const uncategorized = await prisma.transaction.count({
        where: {
          organizationId: ctx.organizationId,
          periodYear: p.periodYear,
          periodMonth: p.periodMonth,
          categorizedAccountId: null,
          isExcluded: false,
        },
      });
      const total = await prisma.transaction.count({
        where: { organizationId: ctx.organizationId, periodYear: p.periodYear, periodMonth: p.periodMonth },
      });
      const close = closeByKey.get(`${p.periodYear}-${p.periodMonth}`);
      return { year: p.periodYear, month: p.periodMonth, uncategorized, total, close };
    }),
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Month-End Close</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Close a period once every transaction is categorized or excluded. Closed periods are locked from
          further edits until reopened.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-900 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Period</th>
              <th className="px-4 py-2 font-medium">Transactions</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const closed = r.close?.status === "CLOSED";
              return (
                <tr key={`${r.year}-${r.month}`} className="border-t border-neutral-200 dark:border-neutral-800">
                  <td className="px-4 py-2">{monthLabel(r.year, r.month)}</td>
                  <td className="px-4 py-2">
                    <Link href={`/transactions?year=${r.year}&month=${r.month}`} className="text-yellow-600 hover:underline">
                      {r.total} total
                    </Link>
                    {r.uncategorized > 0 && (
                      <span className="ml-2 text-xs text-neutral-500">{r.uncategorized} uncategorized</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {closed ? (
                      <span className="rounded-full bg-green-100 dark:bg-green-900/40 px-2 py-0.5 text-xs font-medium text-green-800 dark:text-green-300">
                        Closed {r.close?.closedAt?.toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
                        Open
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {closed ? (
                      <form action={reopenPeriodAction}>
                        <input type="hidden" name="year" value={r.year} />
                        <input type="hidden" name="month" value={r.month} />
                        <button type="submit" className="text-xs text-neutral-500 hover:underline">
                          Reopen
                        </button>
                      </form>
                    ) : (
                      <CloseButton year={r.year} month={r.month} disabled={r.uncategorized > 0} />
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-neutral-500" colSpan={4}>
                  No periods yet. Upload a statement to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
