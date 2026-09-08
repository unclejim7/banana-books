"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/session";
import type { RuleMatchType } from "@prisma/client";

export type RuleFormState = { error?: string } | undefined;

export async function createRuleAction(
  _prevState: RuleFormState,
  formData: FormData,
): Promise<RuleFormState> {
  const ctx = await requireOrgContext();
  const pattern = String(formData.get("pattern") ?? "").trim();
  const matchType = String(formData.get("matchType") ?? "CONTAINS") as RuleMatchType;
  const ledgerAccountId = String(formData.get("ledgerAccountId") ?? "");

  if (!pattern || !ledgerAccountId) return { error: "Pattern and account are required." };

  const account = await prisma.ledgerAccount.findFirst({
    where: { id: ledgerAccountId, organizationId: ctx.organizationId },
  });
  if (!account) return { error: "Account not found." };

  await prisma.categorizationRule.create({
    data: { organizationId: ctx.organizationId, pattern, matchType, ledgerAccountId },
  });

  revalidatePath("/rules");
  return undefined;
}

export async function deleteRuleAction(formData: FormData) {
  const ctx = await requireOrgContext();
  const ruleId = String(formData.get("ruleId") ?? "");

  await prisma.categorizationRule.deleteMany({
    where: { id: ruleId, organizationId: ctx.organizationId },
  });

  revalidatePath("/rules");
}
