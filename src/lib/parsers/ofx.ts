import type { ParseResult } from "./types";

function parseOfxDate(raw: string): Date | null {
  const m = raw.trim().match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  return Number.isNaN(date.getTime()) ? null : date;
}

function decodeSgmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"');
}

/**
 * OFX/QFX is SGML-derived: leaf tags are often unclosed (e.g. <DTPOSTED>20230105
 * with no </DTPOSTED>). We extract each <STMTTRN>...</STMTTRN> block and pull
 * fields out with regex rather than a strict XML/SGML parse.
 */
export function parseOfx(fileContents: string): ParseResult {
  const warnings: string[] = [];
  const transactions = [];

  const blocks = fileContents.match(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi);
  if (!blocks || blocks.length === 0) {
    return { transactions: [], warnings: ["No <STMTTRN> transaction blocks found in this OFX/QFX file."] };
  }

  const fieldRegex = (tag: string) => new RegExp(`<${tag}>([^<\r\n]*)`, "i");

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    const amtMatch = block.match(fieldRegex("TRNAMT"));
    const dateMatch = block.match(fieldRegex("DTPOSTED"));
    const nameMatch = block.match(fieldRegex("NAME"));
    const memoMatch = block.match(fieldRegex("MEMO"));

    if (!amtMatch || !dateMatch) {
      warnings.push(`Skipped transaction ${i + 1}: missing amount or posted date.`);
      continue;
    }

    const amount = Number(amtMatch[1].trim());
    const date = parseOfxDate(dateMatch[1]);
    if (Number.isNaN(amount) || !date) {
      warnings.push(`Skipped transaction ${i + 1}: could not parse amount or date.`);
      continue;
    }

    const description = decodeSgmlEntities(
      (nameMatch?.[1] || memoMatch?.[1] || "(no description)").trim(),
    );

    transactions.push({ date, description, amount });
  }

  return { transactions, warnings };
}
