"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/session";
import type { AccountType, CashFlowSection } from "@prisma/client";

export type AccountFormState = { error?: string } | undefined;

export async function createAccountAction(
  _prevState: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const ctx = await requireOrgContext();

  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const cashFlowSection = String(formData.get("cashFlowSection") ?? "OPERATING");

  if (!code || !name || !type) return { error: "Code, name, and type are required." };

  const existing = await prisma.ledgerAccount.findFirst({
    where: { organizationId: ctx.organizationId, code },
  });
  if (existing) return { error: `Account code ${code} is already in use.` };

  await prisma.ledgerAccount.create({
    data: {
      organizationId: ctx.organizationId,
      code,
      name,
      type: type as AccountType,
      cashFlowSection: cashFlowSection as CashFlowSection,
      isCashAccount: formData.get("isCashAccount") === "on",
    },
  });

  revalidatePath("/accounts");
  return undefined;
}

export async function archiveAccountAction(formData: FormData) {
  const ctx = await requireOrgContext();
  const accountId = String(formData.get("accountId") ?? "");

  const account = await prisma.ledgerAccount.findFirst({
    where: { id: accountId, organizationId: ctx.organizationId },
  });
  if (!account || account.isSystem) return;

  await prisma.ledgerAccount.update({
    where: { id: accountId },
    data: { archived: !account.archived },
  });

  revalidatePath("/accounts");
}
