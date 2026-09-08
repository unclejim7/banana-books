import { PDFParse } from "pdf-parse";
import { parseCsv } from "./csv";
import { parseOfx } from "./ofx";
import { parsePdfText } from "./pdf";
import type { ParseResult } from "./types";
import type { StatementFileType } from "@prisma/client";

export type { ParsedTransaction, ParseResult } from "./types";

export function detectFileType(fileName: string): StatementFileType | null {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "csv") return "CSV";
  if (ext === "ofx") return "OFX";
  if (ext === "qfx") return "QFX";
  if (ext === "pdf") return "PDF";
  return null;
}

export async function parseStatementFile(
  buffer: Buffer,
  fileType: StatementFileType,
  statementYear: number,
): Promise<ParseResult> {
  switch (fileType) {
    case "CSV":
      return parseCsv(buffer.toString("utf-8"));
    case "OFX":
    case "QFX":
      return parseOfx(buffer.toString("utf-8"));
    case "PDF": {
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      try {
        const result = await parser.getText();
        return parsePdfText(result.text, statementYear);
      } finally {
        await parser.destroy();
      }
    }
  }
}
