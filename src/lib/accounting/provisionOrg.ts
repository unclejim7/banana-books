import { prisma } from "@/lib/prisma";
import { DEFAULT_CHART_OF_ACCOUNTS } from "./defaultChartOfAccounts";

export async function provisionOrganization(userId: string, orgName: string) {
  return prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { name: orgName },
    });

    await tx.membership.create({
      data: {
        userId,
        organizationId: organization.id,
        role: "OWNER",
      },
    });

    await tx.ledgerAccount.createMany({
      data: DEFAULT_CHART_OF_ACCOUNTS.map((account) => ({
        organizationId: organization.id,
        code: account.code,
        name: account.name,
        type: account.type,
        cashFlowSection: account.cashFlowSection,
        isCashAccount: account.isCashAccount ?? false,
        excludeFromCashFlow: account.excludeFromCashFlow ?? false,
        isSystem: account.isSystem ?? false,
        description: account.description,
      })),
    });

    return organization;
  });
}
