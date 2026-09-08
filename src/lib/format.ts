import type { Prisma } from "@prisma/client";

export function formatCurrency(amount: Prisma.Decimal | number): string {
  const value = typeof amount === "number" ? amount : Number(amount.toString());
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
