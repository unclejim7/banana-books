import type { ParseResult } from "./types";

const MONTH_NAMES =
  "jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december";

// Matches a leading date like "01/05", "01/05/2024", or "Jan 05".
const LEADING_DATE = new RegExp(
  `^\\s*(?:(\\d{1,2})[/-](\\d{1,2})(?:[/-](\\d{2,4}))?|(${MONTH_NAMES})\\.?\\s+(\\d{1,2}),?(?:\\s+(\\d{4}))?)\\b`,
  "i",
);

// Matches a trailing dollar amount, optionally negative or parenthesized, optionally followed by a running balance.
const TRAILING_AMOUNT =
  /([-(]?\$?\s?-?[\d,]+\.\d{2}\)?)\s*(?:[-(]?\$?\s?-?[\d,]+\.\d{2}\)?)?\s*$/;

function parseAmountToken(token: string): number | null {
  let s = token.trim();
  let negative = false;
  if (s.startsWith("(") && s.endsWith(")")) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1);
  }
  s = s.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const value = Number(s);
  return negative ? -value : value;
}

function monthIndex(name: string): number {
  const short = name.slice(0, 3).toLowerCase();
  return ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(short);
}

function parseLeadingDate(match: RegExpMatchArray, defaultYear: number): Date | null {
  const [, mm, dd, yy, monthName, day2, year2] = match;
  if (mm && dd) {
    const year = yy ? (yy.length === 2 ? 2000 + Number(yy) : Number(yy)) : defaultYear;
    return new Date(Date.UTC(year, Number(mm) - 1, Number(dd)));
  }
  if (monthName && day2) {
    const year = year2 ? Number(year2) : defaultYear;
    const month = monthIndex(monthName);
    if (month < 0) return null;
    return new Date(Date.UTC(year, month, Number(day2)));
  }
  return null;
}

/**
 * Best-effort line-based extraction of transactions from a text-based bank
 * statement PDF. Bank PDF layouts vary widely, so this looks for lines that
 * start with a date and end with a dollar amount, and treats the text in
 * between as the description. Results should always be reviewed by the user
 * before relying on them — parsing quality depends heavily on the bank's
 * statement layout.
 */
export function parsePdfText(text: string, statementYear: number): ParseResult {
  const warnings: string[] = [];
  const transactions = [];

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    const dateMatch = line.match(LEADING_DATE);
    if (!dateMatch) continue;

    const amountMatch = line.match(TRAILING_AMOUNT);
    if (!amountMatch) continue;

    const date = parseLeadingDate(dateMatch, statementYear);
    if (!date) continue;

    const amount = parseAmountToken(amountMatch[1]);
    if (amount == null) continue;

    const description = line
      .slice(dateMatch[0].length, line.length - amountMatch[0].length)
      .replace(/\s{2,}/g, " ")
      .trim();

    if (!description) continue;

    transactions.push({ date, description, amount });
  }

  if (transactions.length === 0) {
    warnings.push(
      "Could not automatically detect any transaction lines in this PDF. The statement layout may not be supported yet — try exporting a CSV from your bank instead.",
    );
  } else {
    warnings.push(
      `Extracted ${transactions.length} transaction(s) from PDF text. PDF parsing is best-effort — please review dates, descriptions, and amounts before closing the period.`,
    );
  }

  return { transactions, warnings };
}
