import { AccountType, CashFlowSection } from "@prisma/client";

export type DefaultAccount = {
  code: string;
  name: string;
  type: AccountType;
  cashFlowSection: CashFlowSection;
  isCashAccount?: boolean;
  excludeFromCashFlow?: boolean;
  isSystem?: boolean;
  description?: string;
};

export const DEFAULT_CHART_OF_ACCOUNTS: DefaultAccount[] = [
  // Assets
  {
    code: "1000",
    name: "Checking Account",
    type: "ASSET",
    cashFlowSection: "NONE",
    isCashAccount: true,
    excludeFromCashFlow: true,
    description: "Primary business checking account",
  },
  {
    code: "1010",
    name: "Savings Account",
    type: "ASSET",
    cashFlowSection: "NONE",
    isCashAccount: true,
    excludeFromCashFlow: true,
  },
  {
    code: "1200",
    name: "Accounts Receivable",
    type: "ASSET",
    cashFlowSection: "OPERATING",
  },
  {
    code: "1500",
    name: "Equipment & Fixed Assets",
    type: "ASSET",
    cashFlowSection: "INVESTING",
  },

  // Liabilities
  {
    code: "2000",
    name: "Credit Card",
    type: "LIABILITY",
    // Paying down a credit card balance is a real cash outflow (like a loan
    // repayment), so — unlike a transfer between two of your own cash
    // accounts — it is NOT excluded from the cash flow statement.
    cashFlowSection: "FINANCING",
    description: "Business credit card",
  },
  {
    code: "2100",
    name: "Accounts Payable",
    type: "LIABILITY",
    cashFlowSection: "OPERATING",
  },
  {
    code: "2400",
    name: "Loans Payable",
    type: "LIABILITY",
    cashFlowSection: "FINANCING",
  },
  {
    code: "2500",
    name: "Sales Tax Payable",
    type: "LIABILITY",
    cashFlowSection: "OPERATING",
  },

  // Equity
  {
    code: "3000",
    name: "Owner's Contribution",
    type: "EQUITY",
    cashFlowSection: "FINANCING",
  },
  {
    code: "3100",
    name: "Owner's Draw",
    type: "EQUITY",
    cashFlowSection: "FINANCING",
  },
  {
    code: "3900",
    name: "Retained Earnings",
    type: "EQUITY",
    cashFlowSection: "NONE",
    isSystem: true,
    description: "System-managed accumulated earnings from prior periods",
  },

  // Income
  {
    code: "4000",
    name: "Sales Revenue",
    type: "INCOME",
    cashFlowSection: "OPERATING",
  },
  {
    code: "4900",
    name: "Other Income",
    type: "INCOME",
    cashFlowSection: "OPERATING",
  },

  // Expenses
  { code: "5000", name: "Advertising & Marketing", type: "EXPENSE", cashFlowSection: "OPERATING" },
  { code: "5100", name: "Bank Fees & Charges", type: "EXPENSE", cashFlowSection: "OPERATING" },
  { code: "5200", name: "Contractors & Professional Services", type: "EXPENSE", cashFlowSection: "OPERATING" },
  { code: "5300", name: "Insurance", type: "EXPENSE", cashFlowSection: "OPERATING" },
  { code: "5400", name: "Meals & Entertainment", type: "EXPENSE", cashFlowSection: "OPERATING" },
  { code: "5500", name: "Office Supplies & Software", type: "EXPENSE", cashFlowSection: "OPERATING" },
  { code: "5600", name: "Payroll & Wages", type: "EXPENSE", cashFlowSection: "OPERATING" },
  { code: "5700", name: "Rent & Utilities", type: "EXPENSE", cashFlowSection: "OPERATING" },
  { code: "5800", name: "Travel", type: "EXPENSE", cashFlowSection: "OPERATING" },
  { code: "5900", name: "Taxes & Licenses", type: "EXPENSE", cashFlowSection: "OPERATING" },
  { code: "5950", name: "Interest Expense", type: "EXPENSE", cashFlowSection: "OPERATING" },
  { code: "5990", name: "Uncategorized Expense", type: "EXPENSE", cashFlowSection: "OPERATING" },
];
