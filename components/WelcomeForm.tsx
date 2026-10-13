"use client";

import { useActionState } from "react";
import { saveProfile } from "@/app/actions";

export function WelcomeForm() {
  const [state, action, pending] = useActionState(saveProfile, {} as { error?: string });
  return (
    <form action={action} className="grid gap-4">
      <div>
        <label htmlFor="name" className="label mb-2 block" style={{ color: "#56565e" }}>Your name</label>
        <input id="name" name="name" required maxLength={80} autoComplete="name" className="input" />
      </div>
      <div>
        <label htmlFor="startup" className="label mb-2 block" style={{ color: "#56565e" }}>Your startup</label>
        <input id="startup" name="startup" required maxLength={80} className="input" />
      </div>
      {state.error && <p role="alert" className="error">{state.error}</p>}
      <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Saving..." : "Continue"}</button>
    </form>
  );
}
