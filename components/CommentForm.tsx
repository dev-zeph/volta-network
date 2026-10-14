"use client";

import { useState, useTransition } from "react";
import { addComment } from "@/app/actions";

export type Taggable = { email: string; name: string };

/** Comment box. With `tag`, the writer can also @ one founder, who gets an email. */
export function CommentForm({ postId, tag, placeholder = "Add a comment" }: { postId: string; tag?: Taggable[]; placeholder?: string }) {
  const [body, setBody] = useState("");
  const [mention, setMention] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    start(async () => {
      const r = await addComment({ postId, body, mentionEmail: mention || undefined });
      if (!r.ok) return setError(r.error ?? "Something went wrong.");
      setBody("");
      setMention("");
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-2">
      <label htmlFor={`c-${postId}`} className="sr-only">Add a comment</label>
      <div className="flex flex-wrap gap-2">
        {tag && (
          <>
            <label htmlFor={`m-${postId}`} className="sr-only">Tag a founder</label>
            <select id={`m-${postId}`} className="input input-sm" style={{ width: "auto", maxWidth: 220 }} value={mention} onChange={(e) => setMention(e.target.value)}>
              <option value="">@ Tag a founder (optional)</option>
              {tag.map((f) => <option key={f.email} value={f.email}>@{f.name}</option>)}
            </select>
          </>
        )}
        <input id={`c-${postId}`} className="input input-sm min-w-0 flex-1" maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} placeholder={placeholder} />
        <button type="submit" className="btn btn-secondary btn-sm" disabled={pending || !body.trim()}>{pending ? "Sending" : "Send"}</button>
      </div>
      {error && <p role="alert" className="error">{error}</p>}
    </form>
  );
}
