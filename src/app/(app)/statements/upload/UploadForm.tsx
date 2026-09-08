"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function UploadForm({
  accounts,
}: {
  accounts: { id: string; name: string; code: string; type: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const now = new Date();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/statements/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed.");
        setPending(false);
        return;
      }
      router.push(`/transactions?statementId=${data.statementId}`);
    } catch {
      setError("Upload failed. Please try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="ledgerAccountId">
          Account
        </label>
        <select
          id="ledgerAccountId"
          name="ledgerAccountId"
          required
          className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
        >
          <option value="">Select an account…</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.code} · {a.name} ({a.type === "LIABILITY" ? "Credit Card" : "Bank"})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="periodMonth">
            Statement month
          </label>
          <select
            id="periodMonth"
            name="periodMonth"
            defaultValue={now.getMonth() + 1}
            className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="periodYear">
            Year
          </label>
          <input
            id="periodYear"
            name="periodYear"
            type="number"
            defaultValue={now.getFullYear()}
            className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="file">
          Statement file
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".csv,.ofx,.qfx,.pdf"
          required
          className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-neutral-200 dark:file:bg-neutral-800 file:px-2 file:py-1"
        />
        <p className="text-xs text-neutral-500">CSV, OFX, QFX, or PDF (text-based).</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-yellow-500 px-4 py-2 text-sm font-medium text-black hover:bg-yellow-400 disabled:opacity-60"
      >
        {pending ? "Uploading & parsing…" : "Upload"}
      </button>
    </form>
  );
}
