-- AlterTable
ALTER TABLE "public"."LedgerAccount" ADD COLUMN     "excludeFromCashFlow" BOOLEAN NOT NULL DEFAULT false;
