# Banana Books

Upload your monthly bank and credit card statements, categorize the transactions, close the
month, and get a Profit & Loss, Balance Sheet, and Cash Flow Statement — a lightweight,
QuickBooks-Online-style bookkeeping app for a small business that doesn't need full invoicing/AR/AP.

## Stack

- **Next.js 16** (App Router, Server Actions, Route Handlers) + TypeScript + Tailwind CSS
- **PostgreSQL** via **Prisma**
- **Auth.js (NextAuth v5)** — email/password, multi-tenant (one login, multiple businesses)

## How it works

1. **Chart of Accounts** — every organization starts with a standard small-business chart of
   accounts (bank/cash, credit card, income, expense, equity), editable at `/accounts`.
2. **Upload a statement** — CSV, OFX/QFX, or text-based PDF, tagged with the account and the
   month it covers. Rows are parsed into transactions (see `src/lib/parsers`).
3. **Categorize** — each transaction gets assigned to a ledger account, which posts a
   double-entry journal entry behind the scenes (`src/lib/accounting/journal.ts`). Rules
   (`/rules`) auto-categorize matching transactions on future imports.
4. **Month-end close** — once every transaction in a period is categorized (or explicitly
   excluded), the period can be closed, locking it from further edits (`/close`).
5. **Reports** — Profit & Loss, Balance Sheet, and a simplified cash flow statement are computed
   directly from posted journal entries (`src/lib/accounting/reports.ts`).

## Local development

Requires Node 20+ and a PostgreSQL database.

```bash
cp .env.example .env   # then edit DATABASE_URL / AUTH_SECRET
npm install
npx prisma migrate dev
npm run dev
```

Generate a real `AUTH_SECRET` with `npx auth secret`.

## Notes & limitations

- This is a cash-basis bookkeeping tool built around imported bank/card transactions — it does
  not include invoicing, bills/AR/AP workflows, payroll, or multi-currency support.
- PDF statement parsing is best-effort (bank statement layouts vary widely); CSV/OFX/QFX are
  more reliable. Always review parsed transactions before closing a period.
- The Balance Sheet shows cumulative net income as a single Equity line rather than performing a
  formal year-end closing entry.
