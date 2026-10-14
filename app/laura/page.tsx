import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, ChevronDown, MessageSquare } from "lucide-react";
import { db } from "@/lib/db";
import { displayName, getFounder } from "@/lib/auth";
import { timeAgo } from "@/lib/time";
import { Header } from "@/components/Header";
import { GroupForm } from "@/components/GroupForm";
import { CommentForm } from "@/components/CommentForm";

export const metadata = { title: "Laura's view | Volta Network" };

const GROUPS_PER_PAGE = 6;
const CONNECTIONS_PER_PAGE = 4;
const POSTS_PER_PAGE = 4;

type Person = { name: string | null } | null;
type Row = {
  id: string;
  kind: string;
  group_id: string;
  body: string;
  created_at: string;
  author_email: string;
  author: Person;
  comments: { id: string; body: string; author_email: string; created_at: string; author: Person }[];
  talk_requests: { from_email: string; created_at: string; from: Person }[];
};
type Query = { group?: string; panel?: string; page?: string };

const SELECT =
  "id,kind,group_id,body,created_at,author_email,author:founders!author_email(name)," +
  "comments(id,body,author_email,created_at,author:founders!author_email(name))," +
  "talk_requests(from_email,created_at,from:founders!from_email(name))";

const UUID = /^[0-9a-f-]{36}$/i;
const short = (s: string, n: number) => (s.length > n ? s.slice(0, n).trimEnd() + "..." : s);
const name = (p: Person, email: string) => displayName({ name: p?.name ?? null, email });
const responded = (r: Row) => r.comments.some((c) => c.author_email !== r.author_email) || r.talk_requests.length > 0;

function href(q: { group?: string; panel?: string; page?: number }) {
  const u = new URLSearchParams();
  if (q.group) u.set("group", q.group);
  if (q.panel) u.set("panel", q.panel);
  if (q.page && q.page > 1) u.set("page", String(q.page));
  const s = u.toString();
  return s ? `/laura?${s}` : "/laura";
}

function paged<T>(items: T[], raw: string | undefined, size: number) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const page = Math.min(Math.max(Number.parseInt(raw ?? "1", 10) || 1, 1), pages);
  return { page, pages, rows: items.slice((page - 1) * size, page * size) };
}

/** Previous / Next for the panel on screen. */
function MiniPager({ page, pages, to }: { page: number; pages: number; to: (n: number) => string }) {
  if (pages <= 1) return null;
  const off = { opacity: 0.45 };
  return (
    <nav className="mt-4 flex items-center justify-between gap-3" aria-label="Pages">
      {page > 1 ? <Link href={to(page - 1)} className="btn btn-sm btn-secondary">Previous</Link> : <span className="btn btn-sm btn-secondary" aria-disabled="true" style={off}>Previous</span>}
      <span className="mono">Page {page} of {pages}</span>
      {page < pages ? <Link href={to(page + 1)} className="btn btn-sm btn-secondary">Next</Link> : <span className="btn btn-sm btn-secondary" aria-disabled="true" style={off}>Next</span>}
    </nav>
  );
}

export default async function LauraPage({ searchParams }: { searchParams: Promise<Query> }) {
  const me = await getFounder();
  if (!me) redirect("/signin");
  if (!me.is_admin) redirect("/");

  const [{ data }, { data: groupRows }, { data: founderRows }] = await Promise.all([
    db.from("posts").select(SELECT).order("created_at", { ascending: false }).order("created_at", { referencedTable: "comments", ascending: true }),
    db.from("groups").select("id,name").order("name"),
    db.from("founders").select("email,name").not("name", "is", null).order("name"),
  ]);
  const all = (data ?? []) as unknown as Row[];
  const groups = (groupRows ?? []) as { id: string; name: string }[];
  const tag = ((founderRows ?? []) as { email: string; name: string }[]).filter((f) => f.email !== me.email);
  const groupName = new Map(groups.map((g) => [g.id, g.name]));

  const sp = await searchParams;
  const current = UUID.test(sp.group ?? "") ? groups.find((g) => g.id === sp.group) : undefined;
  const panel = !current && sp.panel === "connected" ? "connected" : "groups";

  const talks = all
    .flatMap((r) => r.talk_requests.map((t) => ({ ...t, post: r, replied: r.comments.some((c) => c.author_email === t.from_email) })))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const stats = [
    ["Posts", String(all.length)],
    ["Got a response", `${all.filter(responded).length} of ${all.length}`],
    ["Meetings started", String(talks.length)],
  ] as const;

  const summary = groups
    .map((g) => {
      const rows = all.filter((r) => r.group_id === g.id);
      return { ...g, posts: rows.length, responded: rows.filter(responded).length, talks: rows.reduce((n, r) => n + r.talk_requests.length, 0) };
    })
    .sort((a, b) => b.posts - a.posts || a.name.localeCompare(b.name));

  return (
    <>
      <Header me={me} />
      <main className="wrap flex min-h-[calc(100vh-65px)] flex-col py-6">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h1 className="text-3xl">Laura&apos;s view</h1>
          <p style={{ color: "#56565e" }}>What founders are working through, by group, and who connected.</p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          {stats.map(([label, n]) => (
            <div key={label} className="card flex items-center justify-between gap-4" style={{ padding: "14px 20px" }}>
              <p className="label" style={{ color: "#56565e" }}>{label}</p>
              <p className="text-4xl font-semibold" style={{ letterSpacing: "-.02em", color: "#6d28d9" }}>{n}</p>
            </div>
          ))}
        </div>

        {current ? (
          (() => {
            const { page, pages, rows } = paged(all.filter((r) => r.group_id === current.id), sp.page, POSTS_PER_PAGE);
            return (
              <section aria-labelledby="panel-title">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Link href={href({})} className="label inline-flex items-center gap-1" style={{ color: "#6d28d9" }}><ArrowLeft size={14} aria-hidden /> All groups</Link>
                    <h2 id="panel-title" className="text-2xl">{current.name}</h2>
                  </div>
                  <p className="mono">Click a post to see replies and answer</p>
                </div>
                <div className="grid gap-3">
                  {rows.map((r) => {
                    const replies = r.comments.filter((c) => c.author_email !== r.author_email).length;
                    const talkers = [...new Set(r.talk_requests.map((t) => name(t.from, t.from_email)))];
                    return (
                      <details key={r.id} className="row card">
                        <summary>
                          <span className="row-meta">
                            <span className={`tag ${r.kind === "request" ? "tag-request" : "tag-update"}`}>{r.kind === "request" ? "Request" : "Update"}</span>
                            <span className="font-semibold">{name(r.author, r.author_email)}</span>
                          </span>
                          <span className="row-text">{r.body}</span>
                          <span className="row-end">
                            {talkers.length > 0 && <span className="tag tag-update">Meeting</span>}
                            <span className="mono flex items-center gap-1"><MessageSquare size={14} aria-hidden /> {replies}<span className="sr-only"> replies</span></span>
                            <time className="mono" dateTime={r.created_at}>{timeAgo(r.created_at)}</time>
                            <ChevronDown size={18} aria-hidden className="row-chevron" />
                          </span>
                        </summary>
                        <div className="mt-4 grid gap-4 border-t border-line pt-4">
                          <p className="max-w-[80ch] whitespace-pre-wrap break-words">{r.body}</p>
                          {talkers.length > 0 && <p className="text-sm" style={{ color: "#56565e" }}>Wants to meet: <b style={{ color: "#6d28d9" }}>{talkers.join(", ")}</b></p>}
                          {r.comments.length > 0 ? (
                            <ul className="grid gap-3" aria-label="Replies">
                              {r.comments.map((c) => (
                                <li key={c.id} className="bg-tint p-3">
                                  <div className="mb-1 flex items-baseline justify-between gap-2">
                                    <span className="text-sm font-semibold">{name(c.author, c.author_email)}</span>
                                    <time className="mono" dateTime={c.created_at}>{timeAgo(c.created_at)}</time>
                                  </div>
                                  <p className="whitespace-pre-wrap break-words text-sm">{c.body}</p>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm" style={{ color: "#56565e" }}>No replies yet.</p>
                          )}
                          <CommentForm postId={r.id} tag={tag} placeholder="Reply to this post" />
                        </div>
                      </details>
                    );
                  })}
                  {rows.length === 0 && <div className="card">No posts in this group yet.</div>}
                </div>
                <MiniPager page={page} pages={pages} to={(n) => href({ group: current.id, page: n })} />
              </section>
            );
          })()
        ) : panel === "groups" ? (
          (() => {
            const { page, pages, rows } = paged(summary, sp.page, GROUPS_PER_PAGE);
            return (
              <section aria-labelledby="panel-title">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h2 id="panel-title" className="text-2xl">Groups</h2>
                  <Link href={href({ panel: "connected" })} className="btn btn-sm btn-primary">Who connected ({talks.length}) <ArrowRight size={16} aria-hidden /></Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="t">
                    <thead>
                      <tr><th>Group</th><th style={{ textAlign: "right" }}>Posts</th><th style={{ textAlign: "right" }}>Got a response</th><th style={{ textAlign: "right" }}>Meetings</th></tr>
                    </thead>
                    <tbody>
                      {rows.map((g) => (
                        <tr key={g.id}>
                          <td><Link href={href({ group: g.id })} className="font-semibold" style={{ color: "#6d28d9" }}>{g.name}</Link></td>
                          <td className="num">{g.posts}</td>
                          <td className="num">{g.posts ? `${g.responded} of ${g.posts}` : "-"}</td>
                          <td className="num">{g.talks}</td>
                        </tr>
                      ))}
                      {rows.length === 0 && <tr><td colSpan={4}>No groups yet. Add the first one below.</td></tr>}
                    </tbody>
                  </table>
                </div>
                <MiniPager page={page} pages={pages} to={(n) => href({ page: n })} />
                <div className="mt-4 max-w-xl"><GroupForm /></div>
              </section>
            );
          })()
        ) : (
          (() => {
            const { page, pages, rows } = paged(talks, sp.page, CONNECTIONS_PER_PAGE);
            return (
              <section aria-labelledby="panel-title">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h2 id="panel-title" className="text-2xl">Who connected</h2>
                  <Link href={href({})} className="btn btn-sm btn-secondary"><ArrowLeft size={16} aria-hidden /> Groups</Link>
                </div>
                <ul className="grid gap-3">
                  {rows.map((t, i) => (
                    <li key={i} className="card flex flex-wrap items-center justify-between gap-x-6 gap-y-2" style={{ padding: "14px 20px" }}>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{name(t.from, t.from_email)} <span style={{ color: "#6d28d9" }}>&rarr;</span> {name(t.post.author, t.post.author_email)}</p>
                        <p className="text-sm" style={{ color: "#3a3a40" }}>{short(t.post.body, 120)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {groupName.has(t.post.group_id) && <Link href={href({ group: t.post.group_id })} className="group-tag">{groupName.get(t.post.group_id)}</Link>}
                        <span className="tag tag-update">{t.replied ? "Replied and booked a meeting" : "Booked a meeting"}</span>
                        <time className="mono" dateTime={t.created_at}>{timeAgo(t.created_at)}</time>
                      </div>
                    </li>
                  ))}
                  {talks.length === 0 && <li className="card">No meetings yet.</li>}
                </ul>
                <MiniPager page={page} pages={pages} to={(n) => href({ panel: "connected", page: n })} />
              </section>
            );
          })()
        )}
      </main>
    </>
  );
}
