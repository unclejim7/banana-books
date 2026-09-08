import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function periodOrdinal(year: number, month: number): number {
  return year * 12 + month;
}

type AccountBalance = {
  id: string;
  code: string;
  name: string;
  debit: Prisma.Decimal;
  credit: Prisma.Decimal;
};

async function aggregateJournalLines(
  organizationId: string,
  opts: { throughYear: number; throughMonth: number } | { fromYear: number; fromMonth: number; toYear: number; toMonth: number },
): Promise<Map<string, AccountBalance>> {
  const entries = await prisma.journalEntry.findMany({
    where: { organizationId },
    include: { lines: { include: { ledgerAccount: true } } },
  });

  const to = "throughYear" in opts ? periodOrdinal(opts.throughYear, opts.throughMonth) : periodOrdinal(opts.toYear, opts.toMonth);
  const from = "fromYear" in opts ? periodOrdinal(opts.fromYear, opts.fromMonth) : null;

  const result = new Map<string, AccountBalance>();

  for (const entry of entries) {
    const ord = periodOrdinal(entry.periodYear, entry.periodMonth);
    if (ord > to) continue;
    if (from !== null && ord < from) continue;

    for (const line of entry.lines) {
      const existing = result.get(line.ledgerAccountId);
      if (existing) {
        existing.debit = existing.debit.plus(line.debit);
        existing.credit = existing.credit.plus(line.credit);
      } else {
        result.set(line.ledgerAccountId, {
          id: line.ledgerAccount.id,
          code: line.ledgerAccount.code,
          name: line.ledgerAccount.name,
          debit: new Prisma.Decimal(line.debit),
          credit: new Prisma.Decimal(line.credit),
        });
      }
    }
  }

  return result;
}

export type ReportLine = { id: string; code: string; name: string; amount: Prisma.Decimal };

export async function getProfitAndLoss(
  organizationId: string,
  from: { year: number; month: number },
  to: { year: number; month: number },
) {
  const balances = await aggregateJournalLines(organizationId, {
    fromYear: from.year,
    fromMonth: from.month,
    toYear: to.year,
    toMonth: to.month,
  });

  const accounts = await prisma.ledgerAccount.findMany({
    where: { organizationId, type: { in: ["INCOME", "EXPENSE"] } },
    orderBy: { code: "asc" },
  });

  const income: ReportLine[] = [];
  const expenses: ReportLine[] = [];

  for (const account of accounts) {
    const bal = balances.get(account.id);
    if (!bal) continue;
    if (account.type === "INCOME") {
      const amount = bal.credit.minus(bal.debit);
      if (!amount.isZero()) income.push({ id: account.id, code: account.code, name: account.name, amount });
    } else {
      const amount = bal.debit.minus(bal.credit);
      if (!amount.isZero()) expenses.push({ id: account.id, code: account.code, name: account.name, amount });
    }
  }

  const totalIncome = income.reduce((sum, l) => sum.plus(l.amount), new Prisma.Decimal(0));
  const totalExpenses = expenses.reduce((sum, l) => sum.plus(l.amount), new Prisma.Decimal(0));

  return {
    income,
    expenses,
    totalIncome,
    totalExpenses,
    netIncome: totalIncome.minus(totalExpenses),
  };
}

export async function getBalanceSheet(organizationId: string, asOf: { year: number; month: number }) {
  const balances = await aggregateJournalLines(organizationId, { throughYear: asOf.year, throughMonth: asOf.month });

  const accounts = await prisma.ledgerAccount.findMany({
    where: { organizationId, type: { in: ["ASSET", "LIABILITY", "EQUITY"] } },
    orderBy: { code: "asc" },
  });

  const assets: ReportLine[] = [];
  const liabilities: ReportLine[] = [];
  const equity: ReportLine[] = [];

  for (const account of accounts) {
    const bal = balances.get(account.id);
    if (!bal) continue;
    if (account.type === "ASSET") {
      const amount = bal.debit.minus(bal.credit);
      if (!amount.isZero()) assets.push({ id: account.id, code: account.code, name: account.name, amount });
    } else if (account.type === "LIABILITY") {
      const amount = bal.credit.minus(bal.debit);
      if (!amount.isZero()) liabilities.push({ id: account.id, code: account.code, name: account.name, amount });
    } else {
      const amount = bal.credit.minus(bal.debit);
      if (!amount.isZero()) equity.push({ id: account.id, code: account.code, name: account.name, amount });
    }
  }

  // Retained earnings / current net income isn't posted to an equity account directly
  // (there's no formal year-end closing entry in this app) — it's computed here as a
  // plug so the balance sheet always balances against cumulative income and expenses.
  const pnl = await getProfitAndLoss(organizationId, { year: 1900, month: 1 }, asOf);
  if (!pnl.netIncome.isZero()) {
    equity.push({ id: "net-income", code: "3999", name: "Net Income (cumulative)", amount: pnl.netIncome });
  }

  const totalAssets = assets.reduce((sum, l) => sum.plus(l.amount), new Prisma.Decimal(0));
  const totalLiabilities = liabilities.reduce((sum, l) => sum.plus(l.amount), new Prisma.Decimal(0));
  const totalEquity = equity.reduce((sum, l) => sum.plus(l.amount), new Prisma.Decimal(0));

  return {
    assets,
    liabilities,
    equity,
    totalAssets,
    totalLiabilities,
    totalEquity,
    totalLiabilitiesAndEquity: totalLiabilities.plus(totalEquity),
  };
}

export async function getCashFlowStatement(
  organizationId: string,
  from: { year: number; month: number },
  to: { year: number; month: number },
) {
  const cashAccounts = await prisma.ledgerAccount.findMany({
    where: { organizationId, isCashAccount: true },
  });
  const cashAccountIds = cashAccounts.map((a) => a.id);

  const beforeFromOrdinal = periodOrdinal(from.year, from.month) - 1;
  const beforeFromYear = Math.floor((beforeFromOrdinal - 1) / 12);
  const beforeFromMonth = beforeFromOrdinal - beforeFromYear * 12;

  const [balancesThrough, balancesBefore] = await Promise.all([
    aggregateJournalLines(organizationId, { throughYear: to.year, throughMonth: to.month }),
    beforeFromOrdinal >= 1
      ? aggregateJournalLines(organizationId, { throughYear: beforeFromYear, throughMonth: beforeFromMonth })
      : Promise.resolve(new Map<string, AccountBalance>()),
  ]);

  const sumCash = (balances: Map<string, AccountBalance>) =>
    cashAccountIds.reduce((sum, id) => {
      const bal = balances.get(id);
      return bal ? sum.plus(bal.debit.minus(bal.credit)) : sum;
    }, new Prisma.Decimal(0));

  const beginningCash = sumCash(balancesBefore);
  const endingCash = sumCash(balancesThrough);

  // Look at every posted journal line that touches a cash account, from
  // either side of the entry (the cash account may be the transaction's own
  // statement account, or the account it was categorized into — e.g. a
  // credit card payment categorized from the card's own statement still
  // moves money out of checking). Using the actual posted debit/credit
  // avoids re-deriving the sign conventions from journal.ts.
  const fromOrd = periodOrdinal(from.year, from.month);
  const toOrd = periodOrdinal(to.year, to.month);

  const cashLines = await prisma.journalLine.findMany({
    where: {
      ledgerAccountId: { in: cashAccountIds },
      journalEntry: { organizationId },
    },
    include: { journalEntry: { include: { lines: { include: { ledgerAccount: true } } } } },
  });

  const buckets = { OPERATING: new Prisma.Decimal(0), INVESTING: new Prisma.Decimal(0), FINANCING: new Prisma.Decimal(0) };

  for (const line of cashLines) {
    const entry = line.journalEntry;
    const ord = periodOrdinal(entry.periodYear, entry.periodMonth);
    if (ord < fromOrd || ord > toOrd) continue;

    const other = entry.lines.find((l) => l.id !== line.id);
    if (!other) continue;
    if (other.ledgerAccount.isCashAccount) continue; // transfer between two of your own cash accounts
    if (other.ledgerAccount.excludeFromCashFlow) continue;
    if (other.ledgerAccount.cashFlowSection === "NONE") continue;

    const cashImpact = new Prisma.Decimal(line.debit).minus(line.credit);
    const section = other.ledgerAccount.cashFlowSection;
    buckets[section] = buckets[section].plus(cashImpact);
  }

  const netChange = buckets.OPERATING.plus(buckets.INVESTING).plus(buckets.FINANCING);

  return {
    beginningCash,
    endingCash,
    operating: buckets.OPERATING,
    investing: buckets.INVESTING,
    financing: buckets.FINANCING,
    netChange,
    reconciles: beginningCash.plus(netChange).equals(endingCash),
  };
}
