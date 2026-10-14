"use client";

import { useActionState, useEffect, useRef } from "react";
import { createGroup } from "@/app/actions";

export function GroupForm() {
  const [state, action, pending] = useActionState(createGroup, {});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} action={action} className="grid gap-2">
      <label htmlFor="group-name" className="label" style={{ color: "#56565e" }}>Add a group</label>
      <div className="flex flex-wrap gap-2">
        <input id="group-name" name="name" required maxLength={40} className="input min-w-0 flex-1" placeholder="For example: Payroll" />
        <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Adding..." : "Add group"}</button>
      </div>
      {state.error && <p role="alert" className="error">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm" style={{ color: "#187444" }}>Group added. Founders can post to it now.</p>}
    </form>
  );
}
