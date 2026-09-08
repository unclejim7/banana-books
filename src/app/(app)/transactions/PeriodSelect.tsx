"use client";

import { useRouter } from "next/navigation";
import { periodKey } from "@/lib/accounting/period";

export function PeriodSelect({
  periods,
  selected,
}: {
  periods: { year: number; month: number; label: string }[];
  selected: { year: number; month: number };
}) {
  const router = useRouter();

  return (
    <select
      defaultValue={periodKey(selected.year, selected.month)}
      onChange={(e) => {
        const [year, month] = e.target.value.split("-");
        router.push(`/transactions?year=${year}&month=${Number(month)}`);
      }}
      className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1.5 text-sm"
    >
      {periods.map((p) => (
        <option key={periodKey(p.year, p.month)} value={periodKey(p.year, p.month)}>
          {p.label}
        </option>
      ))}
    </select>
  );
}
