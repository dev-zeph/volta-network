import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronDown, MessageSquare } from "lucide-react";
import { db } from "@/lib/db";
import { displayName, getFounder } from "@/lib/auth";
import { timeAgo } from "@/lib/time";
import { Header } from "@/components/Header";
import { Composer } from "@/components/Composer";
import { CommentForm } from "@/components/CommentForm";
import { TalkButton } from "@/components/TalkButton";
import { ListControls, Pager, SearchBar, hrefFor, readQuery, slicePage, type RawQuery } from "@/components/Pager";

type Person = { name: string | null; startup: string | null; email: string } | null;
type Post = {
  id: string;
  kind: "update" | "request";
  group_id: string;
  body: string;
  created_at: string;
  author_email: string;
  author: Person;
  comments: { id: string; body: string; created_at: string; author_email: string; author: Person }[];
};

const SELECT =
  "id,kind,group_id,body,created_at,author_email,author:founders!author_email(name,startup,email)," +
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

export default async function BoardPage({ searchParams }: { searchParams: Promise<RawQuery> }) {
  const me = await getFounder();
  if (!me) redirect("/signin");
  if (!me.name) redirect("/welcome");

  const { data } = await db
    .from("posts")
    .select(SELECT)
    .order("created_at", { ascending: false })
    .order("created_at", { referencedTable: "comments", ascending: true })
    .limit(500);
  const all = (data ?? []) as unknown as Post[];
  const { data: groupRows } = await db.from("groups").select("id,name").order("name");
  const groups = (groupRows ?? []) as { id: string; name: string }[];
  const groupName = new Map(groups.map((g) => [g.id, g.name]));
  const perGroup = (id: string) => all.filter((p) => p.group_id === id).length;
  const { rows: posts, counts, pages, query } = slicePage(
    all,
    readQuery(await searchParams),
    (p) => p.comments.length,
    (p) => [p.body, p.author?.name, p.author?.startup, ...p.comments.flatMap((c) => [c.body, c.author?.name])].filter(Boolean).join("\n"),
  );
  const nameOf = (p: { author: Person; author_email: string }) => displayName({ name: p.author?.name ?? null, email: p.author_email });
  const kindTag = (post: Post) => (
    <span className={`tag ${post.kind === "request" ? "tag-request" : "tag-update"}`}>{post.kind === "request" ? "Request" : "Update"}</span>
  );
  const groupTag = (post: Post) =>
    groupName.has(post.group_id) && (
      <Link href={hrefFor("/", query, { group: post.group_id, page: 1 })} className="group-tag">{groupName.get(post.group_id)}</Link>
    );
  const commentList = (post: Post) =>
    post.comments.length > 0 && (
      <ul className="grid gap-3 border-t border-line pt-4" aria-label="Comments">
        {post.comments.map((c) => (
          <li key={c.id} className="bg-tint p-3">
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold">{nameOf(c)}</span>
              <time className="mono" dateTime={c.created_at}>{timeAgo(c.created_at)}</time>
            </div>
            <p className="whitespace-pre-wrap break-words text-sm">{c.body}</p>
          </li>
        ))}
      </ul>
    );
  const actions = (post: Post) => (
    <div className="grid gap-3 border-t border-line pt-4">
      <CommentForm postId={post.id} />
      {post.author_email !== me.email && <div><TalkButton postId={post.id} href={calendarUrl(me, post)} /></div>}
      {post.comments.length === 0 && post.author_email === me.email && (
        <p className="mono flex items-center gap-2"><MessageSquare size={14} aria-hidden /> No comments yet</p>
      )}
    </div>
  );

  return (
    <>
      <Header me={me} />
      <section className="band">
        <div className="wrap flex flex-col items-start gap-6 py-12 md:py-16">
          <p className="label" style={{ color: "#f1ebfe" }}>The board</p>
          <h1 className="max-w-[20ch] text-4xl md:text-6xl">See what other founders are working through</h1>
          <Composer groups={groups} initialGroup={query.group} />
        </div>
      </section>
      <main className="wrap py-10">
        {groups.length > 0 && (
          <nav className="mb-6" aria-label="Groups">
            <p className="label mb-3" style={{ color: "#56565e" }}>Groups</p>
            <div className="flex flex-wrap gap-2">
              <Link href={hrefFor("/", query, { group: "", page: 1 })} aria-current={!query.group ? "true" : undefined} className={`btn btn-sm ${!query.group ? "btn-primary" : "btn-secondary"}`}>All groups ({all.length})</Link>
              {groups.map((g) => (
                <Link key={g.id} href={hrefFor("/", query, { group: g.id, page: 1 })} aria-current={query.group === g.id ? "true" : undefined} className={`btn btn-sm ${query.group === g.id ? "btn-primary" : "btn-secondary"}`}>
                  {g.name} ({perGroup(g.id)})
                </Link>
              ))}
            </div>
          </nav>
        )}
        {(all.length > 0 || query.q) && <SearchBar base="/" q={query} found={counts.all} />}
        {counts.all > 0 && <ListControls base="/" q={query} counts={counts} layout />}
        {all.length === 0 ? (
          <div className="card mx-auto max-w-lg text-center">
            <h2 className="mb-2 text-2xl">The board is quiet</h2>
            <p className="mb-5" style={{ color: "#56565e" }}>Be the first to share what you are working on, or ask the network a question.</p>
            <Composer variant="plain" groups={groups} />
          </div>
        ) : query.view === "list" ? (
          <div className="grid gap-3">
            {posts.map((post) => (
              <details key={post.id} id={`post-${post.id}`} className="row card">
                <summary>
                  <span className="row-meta">
                    {kindTag(post)}
                    {groupTag(post)}
                    <span className="font-semibold">{nameOf(post)}</span>
                    {post.author?.startup && <span className="label" style={{ color: "#56565e", fontWeight: 500 }}>{post.author.startup}</span>}
                  </span>
                  <span className="row-text">{post.body}</span>
                  <span className="row-end">
                    <span className="mono flex items-center gap-1"><MessageSquare size={14} aria-hidden /> {post.comments.length}<span className="sr-only"> comments</span></span>
                    <time className="mono" dateTime={post.created_at}>{timeAgo(post.created_at)}</time>
                    <ChevronDown size={18} aria-hidden className="row-chevron" />
                  </span>
                </summary>
                <div className="mt-4 grid gap-4 border-t border-line pt-4">
                  <p className="max-w-[80ch] whitespace-pre-wrap break-words">{post.body}</p>
                  {commentList(post)}
                  {actions(post)}
                </div>
              </details>
            ))}
          </div>
        ) : (
          <div className="board">
            {posts.map((post) => (
              <article key={post.id} id={`post-${post.id}`} className="card flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex flex-wrap items-center gap-2">{kindTag(post)}{groupTag(post)}</span>
                  <time className="mono" dateTime={post.created_at}>{timeAgo(post.created_at)}</time>
                </div>
                <div>
                  <p className="font-semibold">{nameOf(post)}</p>
                  {post.author?.startup && <p className="label" style={{ color: "#56565e", fontWeight: 500 }}>{post.author.startup}</p>}
                </div>
                <p className="whitespace-pre-wrap break-words">{post.body}</p>
                {commentList(post)}
                {actions(post)}
              </article>
            ))}
          </div>
        )}
        {all.length > 0 && posts.length === 0 && !query.q && <p style={{ color: "#56565e" }}>Nothing in this group yet. Be the first to post here.</p>}
        <Pager base="/" q={query} pages={pages} />
      </main>
    </>
  );
}
