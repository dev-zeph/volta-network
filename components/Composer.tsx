"use client";

import { useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createPost } from "@/app/actions";

export function Composer({ variant = "band" }: { variant?: "band" | "plain" }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [kind, setKind] = useState<"update" | "request">("update");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    start(async () => {
      const r = await createPost({ kind, body });
      if (!r.ok) return setError(r.error ?? "Something went wrong.");
      setBody("");
      ref.current?.close();
    });
  }

  return (
    <>
      <button type="button" className={`btn ${variant === "band" ? "btn-onband" : "btn-primary"}`} onClick={() => ref.current?.showModal()}>
        <Plus size={18} aria-hidden /> Share an update
      </button>
      <dialog ref={ref} className="modal" aria-labelledby="composer-title" onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}>
        <form onSubmit={submit} className="grid gap-4 p-6">
          <h2 id="composer-title" className="text-2xl">Share with the network</h2>
          <fieldset className="grid gap-2">
            <legend className="label mb-2" style={{ color: "#56565e" }}>What kind of post is it?</legend>
            <div className="grid grid-cols-2">
              {(["update", "request"] as const).map((k) => (
                <label key={k} className="flex min-h-[46px] cursor-pointer items-center justify-center border border-control text-[15px] font-semibold has-[:checked]:border-accent-deep has-[:checked]:bg-accent-deep has-[:checked]:text-white has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent">
                  <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />
                  {k === "update" ? "Update" : "Request"}
                </label>
              ))}
            </div>
            <p className="text-sm" style={{ color: "#56565e" }}>{kind === "update" ? "Share progress or something you learned." : "Ask the network for help or an intro."}</p>
          </fieldset>
          <div>
            <label htmlFor="post-body" className="label mb-2 block" style={{ color: "#56565e" }}>Your post</label>
            <textarea id="post-body" className="input" maxLength={2000} required value={body} onChange={(e) => setBody(e.target.value)} placeholder="What are you working through?" />
            <p className="mono mt-1 text-right">{body.length}/2000</p>
          </div>
          {error && <p role="alert" className="error">{error}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" className="btn btn-secondary" onClick={() => ref.current?.close()}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={pending || !body.trim()}>{pending ? "Posting..." : "Post"}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
