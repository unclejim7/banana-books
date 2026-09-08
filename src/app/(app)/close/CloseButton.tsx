"use client";

import { useActionState } from "react";
import { closePeriodAction } from "@/app/actions/close";

export function CloseButton({ year, month, disabled }: { year: number; month: number; disabled: boolean }) {
  const [state, formAction, pending] = useActionState(closePeriodAction, undefined);

  return (
    <form action={formAction} className="space-y-1">
      <input type="hidden" name="year" value={year} />
      <input type="hidden" name="month" value={month} />
      <button
        type="submit"
        disabled={disabled || pending}
        className="rounded-md bg-yellow-500 px-3 py-1.5 text-xs font-medium text-black hover:bg-yellow-400 disabled:opacity-40"
      >
        {pending ? "Closing…" : "Close period"}
      </button>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
