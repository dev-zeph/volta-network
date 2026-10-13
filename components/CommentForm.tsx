"use client";

import { useState, useTransition } from "react";
import { addComment } from "@/app/actions";

export function CommentForm({ postId }: { postId: string }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    start(async () => {
      const r = await addComment({ postId, body });
      if (!r.ok) return setError(r.error ?? "Something went wrong.");
      setBody("");
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-2">
      <label htmlFor={`c-${postId}`} className="sr-only">Add a comment</label>
      <div className="flex gap-2">
        <input id={`c-${postId}`} className="input input-sm" maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add a comment" />
        <button type="submit" className="btn btn-secondary btn-sm" disabled={pending || !body.trim()}>{pending ? "Sending" : "Send"}</button>
      </div>
      {error && <p role="alert" className="error">{error}</p>}
    </form>
  );
}
