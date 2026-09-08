import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/session";
import { monthLabel } from "@/lib/accounting/period";
import { deleteStatementAction } from "@/app/actions/statements";

export default async function StatementsPage() {
  const ctx = await requireOrgContext();

  const statements = await prisma.statement.findMany({
    where: { organizationId: ctx.organizationId },
    include: { ledgerAccount: true },
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }, { uploadedAt: "desc" }],
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Statements</h1>
        <Link
          href="/statements/upload"
          className="rounded-md bg-yellow-500 px-4 py-2 text-sm font-medium text-black hover:bg-yellow-400"
        >
          Upload statement
        </Link>
      </div>

      {statements.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No statements uploaded yet. Upload a monthly bank or credit card statement to get started.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-900 text-left text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">Period</th>
                <th className="px-4 py-2 font-medium">Account</th>
                <th className="px-4 py-2 font-medium">File</th>
                <th className="px-4 py-2 font-medium">Transactions</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {statements.map((s) => (
                <tr key={s.id} className="border-t border-neutral-200 dark:border-neutral-800">
                  <td className="px-4 py-2">{monthLabel(s.periodYear, s.periodMonth)}</td>
                  <td className="px-4 py-2">{s.ledgerAccount.name}</td>
                  <td className="px-4 py-2 text-neutral-500">{s.fileName}</td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/transactions?statementId=${s.id}`}
                      className="text-yellow-600 hover:underline"
                    >
                      {s.transactionCount}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={s.status} />
                    {s.errorMessage && (
                      <p className="mt-1 max-w-xs text-xs text-neutral-500">{s.errorMessage}</p>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <form action={deleteStatementAction}>
                      <input type="hidden" name="statementId" value={s.id} />
                      <button type="submit" className="text-xs text-red-600 hover:underline">
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PROCESSED: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    PENDING: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
    ERROR: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? ""}`}>
      {status}
    </span>
  );
}
