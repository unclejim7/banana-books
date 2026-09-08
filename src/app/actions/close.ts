"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/session";

export type CloseActionState = { error?: string } | undefined;

export async function closePeriodAction(
  _prevState: CloseActionState,
  formData: FormData,
): Promise<CloseActionState> {
  const ctx = await requireOrgContext();
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));

  const uncategorized = await prisma.transaction.count({
    where: {
      organizationId: ctx.organizationId,
      periodYear: year,
      periodMonth: month,
      categorizedAccountId: null,
      isExcluded: false,
    },
  });
  if (uncategorized > 0) {
    return { error: `${uncategorized} transaction(s) still need to be categorized or excluded.` };
  }

  await prisma.closePeriod.upsert({
    where: { organizationId_year_month: { organizationId: ctx.organizationId, year, month } },
    create: {
      organizationId: ctx.organizationId,
      year,
      month,
      status: "CLOSED",
      closedAt: new Date(),
      closedById: ctx.userId,
    },
    update: {
      status: "CLOSED",
      closedAt: new Date(),
      closedById: ctx.userId,
    },
  });

  revalidatePath("/close");
  revalidatePath("/transactions");
  return undefined;
}

export async function reopenPeriodAction(formData: FormData) {
  const ctx = await requireOrgContext();
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));

  await prisma.closePeriod.updateMany({
    where: { organizationId: ctx.organizationId, year, month },
    data: { status: "OPEN", closedAt: null, closedById: null },
  });

  revalidatePath("/close");
  revalidatePath("/transactions");
}
