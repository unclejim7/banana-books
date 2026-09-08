import Link from "next/link";
import { requireOrgContext } from "@/lib/session";
import { signOut } from "@/auth";
import { OrgSwitcherForm } from "@/components/OrgSwitcherForm";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/statements", label: "Statements" },
  { href: "/transactions", label: "Transactions" },
  { href: "/rules", label: "Rules" },
  { href: "/close", label: "Month-End Close" },
  { href: "/accounts", label: "Chart of Accounts" },
  { href: "/reports/profit-loss", label: "Profit & Loss" },
  { href: "/reports/balance-sheet", label: "Balance Sheet" },
  { href: "/reports/cash-flow", label: "Cash Flow" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireOrgContext();

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-r border-neutral-200 dark:border-neutral-800 flex flex-col">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
          <span className="text-lg font-semibold">🍌 Banana Books</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-neutral-200 dark:border-neutral-800 p-3 space-y-3">
          {ctx.memberships.length > 1 ? (
            <OrgSwitcherForm memberships={ctx.memberships} activeOrgId={ctx.organizationId} />
          ) : (
            <div className="text-sm font-medium">{ctx.organizationName}</div>
          )}
          <Link href="/onboarding" className="block text-xs text-yellow-600 hover:underline">
            + Add another business
          </Link>
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span className="truncate">{ctx.userName}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button type="submit" className="font-medium hover:underline">
                Log out
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6 md:p-8">{children}</main>
    </div>
  );
}
