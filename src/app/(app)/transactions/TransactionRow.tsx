"use client";

import { useRef, useState, useTransition } from "react";
import { categorizeTransactionAction, setTransactionExcludedAction } from "@/app/actions/transactions";

type Account = { id: string; code: string; name: string; type: string };

export function TransactionRow({
  transaction,
  accounts,
  locked,
}: {
  transaction: {
    id: string;
    date: string;
    description: string;
    amount: string;
    categorizedAccountId: string | null;
    isExcluded: boolean;
  };
  accounts: Account[];
  locked: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [createRule, setCreateRule] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const amountNum = Number(transaction.amount);

  async function submitCategory() {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    startTransition(async () => {
      const result = await categorizeTransactionAction(undefined, formData);
      setError(result?.error ?? null);
    });
  }

  async function toggleExclude() {
    const formData = new FormData();
    formData.set("transactionId", transaction.id);
    formData.set("excluded", String(!transaction.isExcluded));
    startTransition(async () => {
      await setTransactionExcludedAction(formData);
    });
  }

  return (
    <tr className={`border-t border-neutral-200 dark:border-neutral-800 ${transaction.isExcluded ? "opacity-50" : ""}`}>
      <td className="px-4 py-2 whitespace-nowrap text-neutral-500">
        {new Date(transaction.date).toLocaleDateString("en-US", { timeZone: "UTC" })}
      </td>
      <td className="px-4 py-2 max-w-xs truncate" title={transaction.description}>
        {transaction.description}
      </td>
      <td className={`px-4 py-2 text-right whitespace-nowrap ${amountNum < 0 ? "text-red-600" : "text-green-700 dark:text-green-400"}`}>
        {amountNum.toLocaleString("en-US", { style: "currency", currency: "USD" })}
      </td>
      <td className="px-4 py-2">
        <form ref={formRef} className="flex items-center gap-2">
          <input type="hidden" name="transactionId" value={transaction.id} />
          <select
            name="categorizedAccountId"
            defaultValue={transaction.categorizedAccountId ?? ""}
            disabled={locked || transaction.isExcluded || pending}
            onChange={submitCategory}
            className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1 text-sm disabled:opacity-50"
          >
            <option value="">Uncategorized</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <input type="hidden" name="createRule" value={createRule ? "on" : ""} />
          <label className="flex items-center gap-1 text-xs text-neutral-500" title="Auto-categorize similar transactions in the future">
            <input
              type="checkbox"
              checked={createRule}
              onChange={(e) => setCreateRule(e.target.checked)}
              disabled={locked}
            />
            remember
          </label>
        </form>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </td>
      <td className="px-4 py-2 text-right">
        <button
          type="button"
          onClick={toggleExclude}
          disabled={locked || pending}
          className="text-xs text-neutral-500 hover:underline disabled:opacity-50"
        >
          {transaction.isExcluded ? "Include" : "Exclude"}
        </button>
      </td>
    </tr>
  );
}
