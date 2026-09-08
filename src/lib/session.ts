import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

const ACTIVE_ORG_COOKIE = "activeOrgId";

export async function getActiveOrgId(userId: string): Promise<string | null> {
  const cookieStore = await cookies();
  const cookieOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;

  if (cookieOrgId) {
    const membership = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId: cookieOrgId } },
    });
    if (membership) return cookieOrgId;
  }

  const firstMembership = await prisma.membership.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  return firstMembership?.organizationId ?? null;
}

export async function setActiveOrgId(organizationId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

export type OrgContext = {
  userId: string;
  userName: string;
  organizationId: string;
  organizationName: string;
  role: Role;
  memberships: { organizationId: string; organizationName: string; role: Role }[];
};

/**
 * Resolves the signed-in user's active organization, redirecting to /login or
 * /onboarding when no session or no organization exists yet.
 */
export async function requireOrgContext(): Promise<OrgContext> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });

  if (memberships.length === 0) {
    redirect("/onboarding");
  }

  const activeOrgId = (await getActiveOrgId(userId)) ?? memberships[0].organizationId;
  const active = memberships.find((m) => m.organizationId === activeOrgId) ?? memberships[0];

  return {
    userId,
    userName: session.user.name ?? session.user.email ?? "User",
    organizationId: active.organizationId,
    organizationName: active.organization.name,
    role: active.role,
    memberships: memberships.map((m) => ({
      organizationId: m.organizationId,
      organizationName: m.organization.name,
      role: m.role,
    })),
  };
}
