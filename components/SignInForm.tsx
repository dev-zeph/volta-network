"use client";

import { useActionState } from "react";
import { requestLink, type LinkState } from "@/app/actions";

const initial: LinkState = { status: "idle" };

export function SignInForm({ notice }: { notice?: string }) {
  const [state, action, pending] = useActionState(requestLink, initial);

  if (state.status === "sent") {
    return (
      <div className="grid gap-4" role="status">
        <h2 className="text-3xl">Check your email</h2>
        <p>If {state.email} can sign in, a link is on its way. It works for 20 minutes.</p>
        {state.devLink && (
          <div className="border border-accent bg-accent-wash p-4">
            <p className="label mb-2" style={{ color: "#6d28d9" }}>Dev mode: email sending is off</p>
            <a href={state.devLink} className="break-all font-medium text-accent-deep underline">Open your sign-in link</a>
          </div>
        )}
      </div>
    );
  }

  const message = state.status === "error" ? state.message : notice;
  return (
    <form action={action} className="grid gap-4">
      <h2 className="text-3xl">Sign in</h2>
      <p style={{ color: "#56565e" }}>No password needed. First time here? We email you a link.</p>
      <div>
        <label htmlFor="email" className="label mb-2 block" style={{ color: "#56565e" }}>Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" maxLength={254} className="input" placeholder="you@startup.ca" />
      </div>
      <div>
        <label htmlFor="startup" className="label mb-2 block" style={{ color: "#56565e" }}>Startup name (if you have signed in before)</label>
        <input id="startup" name="startup" type="text" autoComplete="organization" maxLength={80} className="input" placeholder="Your startup" />
        <p className="mt-2 text-sm" style={{ color: "#56565e" }}>Enter it to sign in right away, without the email.</p>
      </div>
      {message && <p role="alert" className="error">{message}</p>}
      <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Signing in..." : "Sign in"}</button>
    </form>
  );
}
