import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/session";
import { detectFileType, parseStatementFile } from "@/lib/parsers";
import { applyRulesToTransactions } from "@/lib/accounting/applyRules";
import { assertPeriodOpen, PeriodClosedError } from "@/lib/accounting/journal";

export async function POST(request: Request) {
  const ctx = await requireOrgContext();

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const ledgerAccountId = String(formData.get("ledgerAccountId") ?? "");
  const periodYear = Number(formData.get("periodYear"));
  const periodMonth = Number(formData.get("periodMonth"));

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "Please choose a file to upload." }, { status: 400 });
  }
  if (!ledgerAccountId) {
    return NextResponse.json({ error: "Please choose which account this statement is for." }, { status: 400 });
  }
  if (!periodYear || !periodMonth || periodMonth < 1 || periodMonth > 12) {
    return NextResponse.json({ error: "Please choose a valid statement period." }, { status: 400 });
  }

  const account = await prisma.ledgerAccount.findFirst({
    where: { id: ledgerAccountId, organizationId: ctx.organizationId },
  });
  if (!account) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  if (account.type !== "ASSET" && account.type !== "LIABILITY") {
    return NextResponse.json(
      { error: "Statements can only be uploaded for asset (bank) or liability (credit card) accounts." },
      { status: 400 },
    );
  }

  try {
    await assertPeriodOpen(ctx.organizationId, periodYear, periodMonth);
  } catch (err) {
    if (err instanceof PeriodClosedError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }

  const fileType = detectFileType(file.name);
  if (!fileType) {
    return NextResponse.json(
      { error: "Unsupported file type. Please upload a .csv, .ofx, .qfx, or .pdf file." },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const statement = await prisma.statement.create({
    data: {
      organizationId: ctx.organizationId,
      ledgerAccountId,
      fileName: file.name,
      fileType,
      periodYear,
      periodMonth,
      uploadedById: ctx.userId,
      status: "PENDING",
    },
  });

  let result;
  try {
    result = await parseStatementFile(buffer, fileType, periodYear);
  } catch (err) {
    await prisma.statement.update({
      where: { id: statement.id },
      data: { status: "ERROR", errorMessage: err instanceof Error ? err.message : "Failed to parse file." },
    });
    return NextResponse.json(
      { error: "Failed to parse the uploaded file. It may be corrupted or in an unexpected format." },
      { status: 400 },
    );
  }

  if (result.transactions.length === 0) {
    await prisma.statement.update({
      where: { id: statement.id },
      data: { status: "ERROR", errorMessage: result.warnings.join(" ") || "No transactions found." },
    });
    return NextResponse.json(
      { error: result.warnings[0] ?? "No transactions could be extracted from this file." },
      { status: 400 },
    );
  }

  const created = await prisma.$transaction(
    result.transactions.map((t) =>
      prisma.transaction.create({
        data: {
          organizationId: ctx.organizationId,
          statementId: statement.id,
          ledgerAccountId,
          date: t.date,
          description: t.description,
          rawDescription: t.description,
          amount: t.amount,
          periodYear,
          periodMonth,
        },
      }),
    ),
  );

  await applyRulesToTransactions(
    ctx.organizationId,
    created.map((t) => t.id),
  );

  await prisma.statement.update({
    where: { id: statement.id },
    data: {
      status: "PROCESSED",
      transactionCount: created.length,
      errorMessage: result.warnings.length > 0 ? result.warnings.join(" ") : null,
    },
  });

  return NextResponse.json({ statementId: statement.id });
}
