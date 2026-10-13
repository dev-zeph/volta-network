import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { db } from "@/lib/db";
import { displayName, getFounder } from "@/lib/auth";
import { timeAgo } from "@/lib/time";
import { Header } from "@/components/Header";
import { Composer } from "@/components/Composer";
import { CommentForm } from "@/components/CommentForm";
import { TalkButton } from "@/components/TalkButton";

type Person = { name: string | null; startup: string | null; email: string } | null;
type Post = {
  id: string;
  kind: "update" | "request";
  body: string;
  created_at: string;
  author_email: string;
  author: Person;
  comments: { id: string; body: string; created_at: string; author_email: string; author: Person }[];
};

const SELECT =
  "id,kind,body,created_at,author_email,author:founders!author_email(name,startup,email)," +
  "comments(id,body,created_at,author_email,author:founders!author_email(name,startup,email))";

function calendarUrl(me: { name: string | null; email: string }, post: Post) {
  const authorName = displayName({ name: post.author?.name ?? null, email: post.author_email });
  const quote = post.body.length > 200 ? post.body.slice(0, 200) + "..." : post.body;
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: `Volta Network: ${displayName(me)} x ${authorName}`,
    details: `Talking about this ${post.kind} on Volta Network:\n\n"${quote}"`,
    add: post.author_email,
  });
  return `https://calendar.google.com/calendar/render?${p.toString().replace(/\+/g, "%20")}`;
}

export default async function BoardPage() {
  const me = await getFounder();
  if (!me) redirect("/signin");
  if (!me.name) redirect("/welcome");

  const { data } = await db
    .from("posts")
    .select(SELECT)
    .order("created_at", { ascending: false })
    .order("created_at", { referencedTable: "comments", ascending: true })
    .limit(100);
  const posts = (data ?? []) as unknown as Post[];

  return (
    <>
      <Header me={me} />
      <section className="band">
        <div className="wrap flex flex-col items-start gap-6 py-12 md:py-16">
          <p className="label" style={{ color: "#f1ebfe" }}>The board</p>
          <h1 className="max-w-[20ch] text-4xl md:text-6xl">See what other founders are working through</h1>
          <Composer />
        </div>
      </section>
      <main className="wrap py-10">
        {posts.length === 0 ? (
          <div className="card mx-auto max-w-lg text-center">
            <h2 className="mb-2 text-2xl">The board is quiet</h2>
            <p className="mb-5" style={{ color: "#56565e" }}>Be the first to share what you are working on, or ask the network a question.</p>
            <Composer variant="plain" />
          </div>
        ) : (
          <div className="board">
            {posts.map((post) => (
              <article key={post.id} id={`post-${post.id}`} className="card flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                  <span className={`tag ${post.kind === "request" ? "tag-request" : "tag-update"}`}>{post.kind === "request" ? "Request" : "Update"}</span>
                  <time className="mono" dateTime={post.created_at}>{timeAgo(post.created_at)}</time>
                </div>
                <div>
                  <p className="font-semibold">{displayName({ name: post.author?.name ?? null, email: post.author_email })}</p>
                  {post.author?.startup && <p className="label" style={{ color: "#56565e", fontWeight: 500 }}>{post.author.startup}</p>}
                </div>
                <p className="whitespace-pre-wrap break-words">{post.body}</p>
                {post.comments.length > 0 && (
                  <ul className="grid gap-3 border-t border-line pt-4" aria-label="Comments">
                    {post.comments.map((c) => (
                      <li key={c.id} className="bg-tint p-3">
                        <div className="mb-1 flex items-baseline justify-between gap-2">
                          <span className="text-sm font-semibold">{displayName({ name: c.author?.name ?? null, email: c.author_email })}</span>
                          <time className="mono" dateTime={c.created_at}>{timeAgo(c.created_at)}</time>
                        </div>
                        <p className="whitespace-pre-wrap break-words text-sm">{c.body}</p>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="grid gap-3 border-t border-line pt-4">
                  <CommentForm postId={post.id} />
                  {post.author_email !== me.email && <div><TalkButton postId={post.id} href={calendarUrl(me, post)} /></div>}
                  {post.comments.length === 0 && post.author_email === me.email && (
                    <p className="mono flex items-center gap-2"><MessageSquare size={14} aria-hidden /> No comments yet</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
