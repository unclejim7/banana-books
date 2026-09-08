import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/session";
import { UploadForm } from "./UploadForm";

export default async function UploadStatementPage() {
  const ctx = await requireOrgContext();

  const accounts = await prisma.ledgerAccount.findMany({
    where: {
      organizationId: ctx.organizationId,
      archived: false,
      type: { in: ["ASSET", "LIABILITY"] },
    },
    orderBy: { code: "asc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Upload a statement</h1>
      <UploadForm accounts={accounts} />
    </div>
  );
}
