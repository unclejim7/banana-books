"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { provisionOrganization } from "@/lib/accounting/provisionOrg";
import { setActiveOrgId } from "@/lib/session";

export type SignupState = { error?: string; success?: boolean } | undefined;

/**
 * Creates the account, its first organization, and the default chart of
 * accounts. Does NOT sign the user in — the client calls next-auth/react's
 * signIn() after this succeeds, since that path (unlike calling signIn()
 * from within a server action) reliably persists the session cookie via a
 * real browser fetch/redirect.
 */
export async function signupAction(_prevState: SignupState, formData: FormData): Promise<SignupState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const businessName = String(formData.get("businessName") ?? "").trim();

  if (!name || !email || !password || !businessName) {
    return { error: "All fields are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash },
  });

  const organization = await provisionOrganization(user.id, businessName);
  await setActiveOrgId(organization.id);

  return { success: true };
}

export async function createAdditionalOrgAction(formData: FormData) {
  const { auth } = await import("@/auth");
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const businessName = String(formData.get("businessName") ?? "").trim();
  if (!businessName) return;

  const organization = await provisionOrganization(session.user.id, businessName);
  await setActiveOrgId(organization.id);
  redirect("/dashboard");
}

export async function switchOrgAction(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  if (!organizationId) return;
  await setActiveOrgId(organizationId);
  redirect("/dashboard");
}
