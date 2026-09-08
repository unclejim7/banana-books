import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/session";
import { archiveAccountAction } from "@/app/actions/accounts";
import { AccountForm } from "./AccountForm";

const TYPE_ORDER = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"];

export default async function AccountsPage() {
  const ctx = await requireOrgContext();

  const accounts = await prisma.ledgerAccount.findMany({
    where: { organizationId: ctx.organizationId },
    orderBy: { code: "asc" },
  });

  const grouped = TYPE_ORDER.map((type) => ({
    type,
    accounts: accounts.filter((a) => a.type === type),
  }));

  return (
    <div className="space-y-8 max-w-3xl">
      <h1 className="text-2xl font-semibold">Chart of Accounts</h1>

      {grouped.map((group) => (
        <div key={group.type} className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            {group.type.charAt(0) + group.type.slice(1).toLowerCase()}
          </h2>
          <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-sm">
              <tbody>
                {group.accounts.map((a) => (
                  <tr
                    key={a.id}
                    className={`border-t border-neutral-200 dark:border-neutral-800 first:border-t-0 ${a.archived ? "opacity-50" : ""}`}
                  >
                    <td className="px-4 py-2 text-neutral-500 w-16">{a.code}</td>
                    <td className="px-4 py-2">{a.name}</td>
                    <td className="px-4 py-2 text-xs text-neutral-500">
                      {a.isCashAccount && "Cash · "}
                      {a.cashFlowSection !== "NONE" && a.cashFlowSection}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {!a.isSystem && (
                        <form action={archiveAccountAction}>
                          <input type="hidden" name="accountId" value={a.id} />
                          <button type="submit" className="text-xs text-neutral-500 hover:underline">
                            {a.archived ? "Unarchive" : "Archive"}
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
                {group.accounts.length === 0 && (
                  <tr>
                    <td className="px-4 py-2 text-sm text-neutral-500" colSpan={4}>
                      No accounts yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <AccountForm />
    </div>
  );
}
