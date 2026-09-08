"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/session";
import { categorizeTransaction, assertPeriodOpen, PeriodClosedError } from "@/lib/accounting/journal";

export type TxActionState = { error?: string } | undefined;

export async function categorizeTransactionAction(
  _prevState: TxActionState,
  formData: FormData,
): Promise<TxActionState> {
  const ctx = await requireOrgContext();
  const transactionId = String(formData.get("transactionId") ?? "");
  const categorizedAccountId = String(formData.get("categorizedAccountId") ?? "") || null;
  const createRule = formData.get("createRule") === "on";

  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, organizationId: ctx.organizationId },
  });
  if (!transaction) return { error: "Transaction not found." };

  try {
    await categorizeTransaction(transactionId, categorizedAccountId);
  } catch (err) {
    if (err instanceof PeriodClosedError) return { error: err.message };
    throw err;
  }

  if (createRule && categorizedAccountId) {
    const pattern = transaction.rawDescription.trim();
    const existingRule = await prisma.categorizationRule.findFirst({
      where: { organizationId: ctx.organizationId, pattern, matchType: "CONTAINS" },
    });
    if (!existingRule) {
      await prisma.categorizationRule.create({
        data: {
          organizationId: ctx.organizationId,
          pattern,
          matchType: "CONTAINS",
          ledgerAccountId: categorizedAccountId,
        },
      });
    }
  }

  revalidatePath("/transactions");
  return undefined;
}

export async function setTransactionExcludedAction(formData: FormData) {
  const ctx = await requireOrgContext();
  const transactionId = String(formData.get("transactionId") ?? "");
  const excluded = formData.get("excluded") === "true";

  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, organizationId: ctx.organizationId },
  });
  if (!transaction) return;

  await assertPeriodOpen(ctx.organizationId, transaction.periodYear, transaction.periodMonth);

  if (excluded) {
    await categorizeTransaction(transactionId, null);
  }
  await prisma.transaction.update({
    where: { id: transactionId },
    data: { isExcluded: excluded },
  });

  revalidatePath("/transactions");
}
