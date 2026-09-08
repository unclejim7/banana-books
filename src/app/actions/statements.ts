"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/session";
import { assertPeriodOpen } from "@/lib/accounting/journal";

export async function deleteStatementAction(formData: FormData) {
  const ctx = await requireOrgContext();
  const statementId = String(formData.get("statementId") ?? "");

  const statement = await prisma.statement.findFirst({
    where: { id: statementId, organizationId: ctx.organizationId },
  });
  if (!statement) return;

  await assertPeriodOpen(ctx.organizationId, statement.periodYear, statement.periodMonth);
  await prisma.statement.delete({ where: { id: statementId } });
  redirect("/statements");
}
