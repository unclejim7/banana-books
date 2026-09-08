"use client";

import { useActionState } from "react";
import { createRuleAction } from "@/app/actions/rules";

export function RuleForm({ accounts }: { accounts: { id: string; name: string; code: string }[] }) {
  const [state, formAction, pending] = useActionState(createRuleAction, undefined);

  return (
    <form action={formAction} className="grid grid-cols-4 gap-3 max-w-2xl rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
      <div className="col-span-4 text-sm font-medium">Add rule</div>
      <div className="col-span-2 space-y-1">
        <label className="text-xs text-neutral-500" htmlFor="pattern">
          When description contains
        </label>
        <input
          id="pattern"
          name="pattern"
          required
          placeholder="e.g. STARBUCKS"
          className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1.5 text-sm"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-neutral-500" htmlFor="matchType">
          Match
        </label>
        <select
          id="matchType"
          name="matchType"
          defaultValue="CONTAINS"
          className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1.5 text-sm"
        >
          <option value="CONTAINS">Contains</option>
          <option value="STARTS_WITH">Starts with</option>
          <option value="EXACT">Exact</option>
          <option value="REGEX">Regex</option>
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-neutral-500" htmlFor="ledgerAccountId">
          Categorize as
        </label>
        <select
          id="ledgerAccountId"
          name="ledgerAccountId"
          required
          className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1.5 text-sm"
        >
          <option value="">Select…</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
      {state?.error && <p className="col-span-4 text-sm text-red-600">{state.error}</p>}
      <div className="col-span-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-yellow-500 px-4 py-1.5 text-sm font-medium text-black hover:bg-yellow-400 disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add rule"}
        </button>
      </div>
    </form>
  );
}
