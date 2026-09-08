import { prisma } from "@/lib/prisma";
import { categorizeTransaction } from "./journal";
import type { CategorizationRule } from "@prisma/client";

function ruleMatches(rule: CategorizationRule, description: string): boolean {
  const haystack = description.toLowerCase();
  const needle = rule.pattern.toLowerCase();

  switch (rule.matchType) {
    case "CONTAINS":
      return haystack.includes(needle);
    case "STARTS_WITH":
      return haystack.startsWith(needle);
    case "EXACT":
      return haystack === needle;
    case "REGEX":
      try {
        return new RegExp(rule.pattern, "i").test(description);
      } catch {
        return false;
      }
  }
}

/**
 * Applies an organization's categorization rules (highest priority first) to
 * a batch of freshly-imported transactions, posting journal entries for any
 * that match. Transactions that don't match any rule are left uncategorized
 * for manual review.
 */
export async function applyRulesToTransactions(organizationId: string, transactionIds: string[]) {
  if (transactionIds.length === 0) return { categorized: 0, total: 0 };

  const rules = await prisma.categorizationRule.findMany({
    where: { organizationId },
    orderBy: { priority: "desc" },
  });

  if (rules.length === 0) return { categorized: 0, total: transactionIds.length };

  const transactions = await prisma.transaction.findMany({
    where: { id: { in: transactionIds } },
  });

  let categorized = 0;
  for (const transaction of transactions) {
    const match = rules.find((rule) => ruleMatches(rule, transaction.rawDescription));
    if (match) {
      await categorizeTransaction(transaction.id, match.ledgerAccountId);
      categorized += 1;
    }
  }

  return { categorized, total: transactions.length };
}
