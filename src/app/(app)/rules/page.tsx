import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/session";
import { deleteRuleAction } from "@/app/actions/rules";
import { RuleForm } from "./RuleForm";

export default async function RulesPage() {
  const ctx = await requireOrgContext();

  const [rules, accounts] = await Promise.all([
    prisma.categorizationRule.findMany({
      where: { organizationId: ctx.organizationId },
      include: { ledgerAccount: true },
      orderBy: { priority: "desc" },
    }),
    prisma.ledgerAccount.findMany({
      where: { organizationId: ctx.organizationId, archived: false },
      orderBy: { code: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Categorization Rules</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Rules automatically categorize matching transactions the moment a statement is uploaded.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-900 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Pattern</th>
              <th className="px-4 py-2 font-medium">Match</th>
              <th className="px-4 py-2 font-medium">Category</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id} className="border-t border-neutral-200 dark:border-neutral-800">
                <td className="px-4 py-2 font-mono text-xs">{r.pattern}</td>
                <td className="px-4 py-2 text-neutral-500">{r.matchType}</td>
                <td className="px-4 py-2">{r.ledgerAccount.name}</td>
                <td className="px-4 py-2 text-right">
                  <form action={deleteRuleAction}>
                    <input type="hidden" name="ruleId" value={r.id} />
                    <button type="submit" className="text-xs text-red-600 hover:underline">
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-neutral-500" colSpan={4}>
                  No rules yet. Rules are also created automatically when you check &ldquo;remember&rdquo;
                  while categorizing a transaction.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <RuleForm accounts={accounts} />
    </div>
  );
}
