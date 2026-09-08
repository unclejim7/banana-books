"use client";

import { useActionState, useState } from "react";
import { createAccountAction } from "@/app/actions/accounts";

export function AccountForm() {
  const [state, formAction, pending] = useActionState(createAccountAction, undefined);
  const [type, setType] = useState("EXPENSE");

  return (
    <form action={formAction} className="grid grid-cols-2 gap-3 max-w-lg rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
      <div className="col-span-2 text-sm font-medium">Add account</div>
      <div className="space-y-1">
        <label className="text-xs text-neutral-500" htmlFor="code">
          Code
        </label>
        <input
          id="code"
          name="code"
          required
          className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1.5 text-sm"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-neutral-500" htmlFor="name">
          Name
        </label>
        <input
          id="name"
          name="name"
          required
          className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1.5 text-sm"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-neutral-500" htmlFor="type">
          Type
        </label>
        <select
          id="type"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1.5 text-sm"
        >
          <option value="ASSET">Asset</option>
          <option value="LIABILITY">Liability</option>
          <option value="EQUITY">Equity</option>
          <option value="INCOME">Income</option>
          <option value="EXPENSE">Expense</option>
        </select>
      </div>
      {(type === "INCOME" || type === "EXPENSE" || type === "LIABILITY" || type === "EQUITY") && (
        <div className="space-y-1">
          <label className="text-xs text-neutral-500" htmlFor="cashFlowSection">
            Cash flow section
          </label>
          <select
            id="cashFlowSection"
            name="cashFlowSection"
            defaultValue="OPERATING"
            className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1.5 text-sm"
          >
            <option value="OPERATING">Operating</option>
            <option value="INVESTING">Investing</option>
            <option value="FINANCING">Financing</option>
          </select>
        </div>
      )}
      {type === "ASSET" && (
        <label className="col-span-2 flex items-center gap-2 text-sm">
          <input type="checkbox" name="isCashAccount" />
          This is a cash/bank account (checking, savings)
        </label>
      )}
      {state?.error && <p className="col-span-2 text-sm text-red-600">{state.error}</p>}
      <div className="col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-yellow-500 px-4 py-1.5 text-sm font-medium text-black hover:bg-yellow-400 disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add account"}
        </button>
      </div>
    </form>
  );
}
