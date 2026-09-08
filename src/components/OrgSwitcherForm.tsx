"use client";

import { useRef } from "react";
import { switchOrgAction } from "@/app/actions/auth";

export function OrgSwitcherForm({
  memberships,
  activeOrgId,
}: {
  memberships: { organizationId: string; organizationName: string }[];
  activeOrgId: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={switchOrgAction} className="space-y-1">
      <label className="text-xs text-neutral-500">Business</label>
      <select
        name="organizationId"
        defaultValue={activeOrgId}
        onChange={() => formRef.current?.requestSubmit()}
        className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1 text-sm"
      >
        {memberships.map((m) => (
          <option key={m.organizationId} value={m.organizationId}>
            {m.organizationName}
          </option>
        ))}
      </select>
    </form>
  );
}
