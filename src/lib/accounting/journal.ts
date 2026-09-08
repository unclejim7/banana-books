import { Prisma, AccountType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class PeriodClosedError extends Error {
  constructor(year: number, month: number) {
    super(`Period ${year}-${String(month).padStart(2, "0")} is closed. Reopen it to make changes.`);
    this.name = "PeriodClosedError";
  }
}

export async function assertPeriodOpen(organizationId: string, year: number, month: number) {
  const period = await prisma.closePeriod.findUnique({
    where: { organizationId_year_month: { organizationId, year, month } },
  });
  if (period?.status === "CLOSED") {
    throw new PeriodClosedError(year, month);
  }
}

/** Which side of a T-account increases this account type's balance. */
export function normalSide(type: AccountType): "DEBIT" | "CREDIT" {
  return type === "ASSET" || type === "EXPENSE" ? "DEBIT" : "CREDIT";
}

/**
 * Categorizes (or re-categorizes, or clears) a transaction and keeps its
 * double-entry journal entry in sync. Bank/card statement accounts must be
 * ASSET (checking/savings) or LIABILITY (credit card) accounts.
 */
export async function categorizeTransaction(
  transactionId: string,
  categorizedAccountId: string | null,
) {
  const transaction = await prisma.transaction.findUniqueOrThrow({
    where: { id: transactionId },
    include: { ledgerAccount: true },
  });

  await assertPeriodOpen(transaction.organizationId, transaction.periodYear, transaction.periodMonth);

  await prisma.journalEntry.deleteMany({ where: { transactionId } });

  if (categorizedAccountId === null) {
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { categorizedAccountId: null },
    });
    return;
  }

  const categoryAccount = await prisma.ledgerAccount.findUniqueOrThrow({
    where: { id: categorizedAccountId },
  });
  if (categoryAccount.organizationId !== transaction.organizationId) {
    throw new Error("Category account does not belong to this organization.");
  }

  const bankAccount = transaction.ledgerAccount;
  const amount = transaction.amount;
  const zero = new Prisma.Decimal(0);
  const magnitude = amount.abs();

  let bankDebit = zero;
  let bankCredit = zero;
  let catDebit = zero;
  let catCredit = zero;

  const bankIsAsset = bankAccount.type === "ASSET";
  const inflow = amount.greaterThanOrEqualTo(0);

  if (bankIsAsset) {
    // Checking/savings: a positive amount is a deposit (debit the asset),
    // a negative amount is a withdrawal (credit the asset).
    if (inflow) {
      bankDebit = magnitude;
      catCredit = magnitude;
    } else {
      bankCredit = magnitude;
      catDebit = magnitude;
    }
  } else {
    // Credit card (liability): a positive amount is a new charge, which
    // increases the liability (credit) and debits the linked category
    // (typically an expense). A negative amount is a payment, which
    // decreases the liability (debit).
    if (inflow) {
      bankCredit = magnitude;
      catDebit = magnitude;
    } else {
      bankDebit = magnitude;
      catCredit = magnitude;
    }
  }

  await prisma.$transaction([
    prisma.journalEntry.create({
      data: {
        organizationId: transaction.organizationId,
        date: transaction.date,
        memo: transaction.description,
        transactionId: transaction.id,
        periodYear: transaction.periodYear,
        periodMonth: transaction.periodMonth,
        lines: {
          create: [
            {
              ledgerAccountId: bankAccount.id,
              debit: bankDebit,
              credit: bankCredit,
            },
            {
              ledgerAccountId: categoryAccount.id,
              debit: catDebit,
              credit: catCredit,
            },
          ],
        },
      },
    }),
    prisma.transaction.update({
      where: { id: transactionId },
      data: { categorizedAccountId },
    }),
  ]);
}
