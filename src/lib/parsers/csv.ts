import Papa from "papaparse";
import type { ParseResult } from "./types";

const DATE_HEADERS = ["date", "transaction date", "posted date", "posting date"];
const DESCRIPTION_HEADERS = ["description", "desc", "memo", "payee", "name", "details"];
const AMOUNT_HEADERS = ["amount", "transaction amount"];
const DEBIT_HEADERS = ["debit", "withdrawal", "withdrawals", "money out", "paid out"];
const CREDIT_HEADERS = ["credit", "deposit", "deposits", "money in", "paid in"];

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

function findColumn(headers: string[], candidates: string[]): string | undefined {
  return headers.find((h) => candidates.includes(normalizeHeader(h)));
}

function parseAmount(raw: string): number | null {
  if (raw == null) return null;
  let s = raw.trim();
  if (s === "") return null;
  let negative = false;
  if (s.startsWith("(") && s.endsWith(")")) {
    negative = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/[^0-9.\-]/g, "");
  if (s === "" || s === "-") return null;
  const value = Number(s);
  if (Number.isNaN(value)) return null;
  return negative ? -Math.abs(value) : value;
}

function parseDate(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;

  const mdy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (mdy) {
    const [, m, d] = mdy;
    let y = mdy[3];
    if (y.length === 2) y = `20${y}`;
    const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    if (!Number.isNaN(date.getTime())) return date;
  }

  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const [, y, m, d] = iso;
    const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    if (!Number.isNaN(date.getTime())) return date;
  }

  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
  }
  return null;
}

export function parseCsv(fileContents: string): ParseResult {
  const warnings: string[] = [];
  const parsed = Papa.parse<Record<string, string>>(fileContents, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (parsed.errors.length > 0) {
    for (const err of parsed.errors.slice(0, 5)) {
      warnings.push(`CSV parse warning (row ${err.row ?? "?"}): ${err.message}`);
    }
  }

  const rows = parsed.data;
  if (rows.length === 0) {
    return { transactions: [], warnings: ["No rows found in CSV file."] };
  }

  const headers = parsed.meta.fields ?? Object.keys(rows[0]);
  const dateCol = findColumn(headers, DATE_HEADERS);
  const descCol = findColumn(headers, DESCRIPTION_HEADERS);
  const amountCol = findColumn(headers, AMOUNT_HEADERS);
  const debitCol = findColumn(headers, DEBIT_HEADERS);
  const creditCol = findColumn(headers, CREDIT_HEADERS);

  if (!dateCol) {
    return { transactions: [], warnings: [`Could not find a date column. Found headers: ${headers.join(", ")}`] };
  }
  if (!descCol) {
    warnings.push("Could not confidently find a description column; using the first non-date/amount column.");
  }
  if (!amountCol && !debitCol && !creditCol) {
    return {
      transactions: [],
      warnings: [`Could not find an amount, debit, or credit column. Found headers: ${headers.join(", ")}`],
    };
  }

  const fallbackDescCol = headers.find(
    (h) => h !== dateCol && h !== amountCol && h !== debitCol && h !== creditCol,
  );

  const transactions = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const date = parseDate(row[dateCol] ?? "");
    if (!date) {
      warnings.push(`Skipped row ${i + 2}: could not parse date "${row[dateCol]}".`);
      continue;
    }

    let amount: number | null = null;
    if (amountCol) {
      amount = parseAmount(row[amountCol] ?? "");
    } else {
      const debit = debitCol ? parseAmount(row[debitCol] ?? "") : null;
      const credit = creditCol ? parseAmount(row[creditCol] ?? "") : null;
      if (debit != null && debit !== 0) amount = -Math.abs(debit);
      else if (credit != null && credit !== 0) amount = Math.abs(credit);
    }
    if (amount == null) {
      warnings.push(`Skipped row ${i + 2}: could not parse an amount.`);
      continue;
    }

    const description = (row[descCol ?? fallbackDescCol ?? ""] ?? "").trim() || "(no description)";

    transactions.push({ date, description, amount });
  }

  return { transactions, warnings };
}
