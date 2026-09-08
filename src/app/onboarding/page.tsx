import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createAdditionalOrgAction } from "@/app/actions/auth";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-neutral-200 dark:border-neutral-800 p-8 shadow-sm">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Set up your business</h1>
          <p className="text-sm text-neutral-500">
            Give your business a name to start uploading statements.
          </p>
        </div>
        <form action={createAdditionalOrgAction} className="space-y-4">
          <input
            name="businessName"
            required
            placeholder="Acme LLC"
            className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-500"
          />
          <button
            type="submit"
            className="w-full rounded-md bg-yellow-500 px-3 py-2 text-sm font-medium text-black hover:bg-yellow-400"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
