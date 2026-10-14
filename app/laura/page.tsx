import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { displayName, getFounder } from "@/lib/auth";
import { timeAgo } from "@/lib/time";
import { Header } from "@/components/Header";
import { GroupForm } from "@/components/GroupForm";
import { readQuery, slicePage, type RawQuery } from "@/components/Pager";

const GROUPS_PER_PAGE = 6;
const CONNECTIONS_PER_PAGE = 4;
const POSTS_PER_PAGE = 4;

type LauraQuery = RawQuery & { gp?: string; cp?: string };
const pageNum = (v: string | undefined, max: number) => Math.min(Math.max(Number.parseInt(v ?? "1", 10) || 1, 1), max);

/** Previous / Next for one panel. Each panel keeps its own page in the URL. */
function MiniPager({ page, pages, href }: { page: number; pages: number; href: (n: number) => string }) {
  if (pages <= 1) return null;
  const off = { opacity: 0.45 };
  return (
    <nav className="mt-3 flex items-center justify-between gap-3" aria-label="Pages">
      {page > 1 ? <Link href={href(page - 1)} className="btn btn-sm btn-secondary">Previous</Link> : <span className="btn btn-sm btn-secondary" aria-disabled="true" style={off}>Previous</span>}
      <span className="mono">Page {page} of {pages}</span>
      {page < pages ? <Link href={href(page + 1)} className="btn btn-sm btn-secondary">Next</Link> : <span className="btn btn-sm btn-secondary" aria-disabled="true" style={off}>Next</span>}
    </nav>
  );
}

export const metadata = { title: "Laura's view | Volta Network" };

type Person = { name: string | null } | null;
type Row = {
  id: string;
  kind: string;
  group_id: string;
  body: string;
  created_at: string;
  author_email: string;
  author: Person;
  comments: { author_email: string; created_at: string; author: Person }[];
  talk_requests: { from_email: string; created_at: string; from: Person }[];
};

const SELECT =
  "id,kind,group_id,body,created_at,author_email,author:founders!author_email(name)," +
  "comments(author_email,created_at,author:founders!author_email(name))," +
  "talk_requests(from_email,created_at,from:founders!from_email(name))";

const short = (s: string, n: number) => (s.length > n ? s.slice(0, n).trimEnd() + "..." : s);
const name = (p: Person, email: string) => displayName({ name: p?.name ?? null, email });
const responded = (r: Row) => r.comments.some((c) => c.author_email !== r.author_email) || r.talk_requests.length > 0;

export default async function LauraPage({ searchParams }: { searchParams: Promise<LauraQuery> }) {
  const me = await getFounder();
  if (!me) redirect("/signin");
  if (!me.is_admin) redirect("/");

  const [{ data }, { data: groupRows }] = await Promise.all([
    db.from("posts").select(SELECT).order("created_at", { ascending: false }),
    db.from("groups").select("id,name").order("name"),
  ]);
  const all = (data ?? []) as unknown as Row[];
  const groups = (groupRows ?? []) as { id: string; name: string }[];
  const groupName = new Map(groups.map((g) => [g.id, g.name]));
  const sp = await searchParams;
  const query = readQuery(sp);
  const current = groups.find((g) => g.id === query.group);

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

  const { rows, pages, query: q } = slicePage(all, query, () => 0, undefined, POSTS_PER_PAGE);

  const groupPages = Math.max(1, Math.ceil(summary.length / GROUPS_PER_PAGE));
  const gp = pageNum(sp.gp, groupPages);
  const shownGroups = summary.slice((gp - 1) * GROUPS_PER_PAGE, gp * GROUPS_PER_PAGE);
  const talkPages = Math.max(1, Math.ceil(talks.length / CONNECTIONS_PER_PAGE));
  const cp = pageNum(sp.cp, talkPages);
  const shownTalks = talks.slice((cp - 1) * CONNECTIONS_PER_PAGE, cp * CONNECTIONS_PER_PAGE);
  const link = (change: { group?: string; gp?: number; cp?: number; page?: number }) => {
    const next = { group: query.group, gp, cp, page: q.page, ...change };
    const u = new URLSearchParams();
    if (next.group) u.set("group", next.group);
    if (next.page > 1 && next.group) u.set("page", String(next.page));
    if (next.gp > 1) u.set("gp", String(next.gp));
    if (next.cp > 1) u.set("cp", String(next.cp));
    const str = u.toString();
    return str ? `/laura?${str}` : "/laura";
  };

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
            <div key={label} className="card flex items-baseline justify-between gap-4" style={{ padding: "14px 20px" }}>
              <p className="label" style={{ color: "#56565e" }}>{label}</p>
              <p className="text-4xl font-semibold" style={{ letterSpacing: "-.02em", color: "#6d28d9" }}>{n}</p>
            </div>
          ))}
        </div>

        <div className="grid flex-1 gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <section aria-labelledby="groups-title">
            {current ? (
              <>
                <Link href={link({ group: "", page: 1 })} className="label mb-2 inline-block" style={{ color: "#6d28d9" }}>&larr; All groups</Link>
                <h2 id="groups-title" className="mb-3 text-2xl">{current.name}</h2>
                <ul className="grid gap-3">
                  {rows.map((r) => {
                    const repliers = [...new Set(r.comments.filter((c) => c.author_email !== r.author_email).map((c) => name(c.author, c.author_email)))];
                    const talkers = [...new Set(r.talk_requests.map((t) => name(t.from, t.from_email)))];
                    return (
                      <li key={r.id} className="card" style={{ padding: "12px 18px" }}>
                        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                          <span className="font-semibold">{name(r.author, r.author_email)} <span className="label" style={{ color: "#56565e", fontWeight: 500 }}>{r.kind}</span></span>
                          <time className="mono" dateTime={r.created_at}>{timeAgo(r.created_at)}</time>
                        </div>
                        <p className="mb-1" style={{ color: "#3a3a40" }}>{short(r.body, 120)}</p>
                        <p className="text-sm" style={{ color: "#56565e" }}>
                          {repliers.length ? <>Shared experience: <b style={{ color: "#17171a" }}>{repliers.join(", ")}</b></> : "No response yet"}
                          {talkers.length > 0 && <> · Wants to meet: <b style={{ color: "#6d28d9" }}>{talkers.join(", ")}</b></>}
                        </p>
                      </li>
                    );
                  })}
                  {rows.length === 0 && <li className="card">No posts in this group yet.</li>}
                </ul>
                <MiniPager page={q.page} pages={pages} href={(n) => link({ page: n })} />
              </>
            ) : (
              <>
                <h2 id="groups-title" className="mb-3 text-2xl">Groups</h2>
                <div className="overflow-x-auto">
                  <table className="t">
                    <thead>
                      <tr><th>Group</th><th style={{ textAlign: "right" }}>Posts</th><th style={{ textAlign: "right" }}>Got a response</th><th style={{ textAlign: "right" }}>Meetings</th></tr>
                    </thead>
                    <tbody>
                      {shownGroups.map((g) => (
                        <tr key={g.id}>
                          <td><Link href={link({ group: g.id, page: 1 })} className="font-semibold" style={{ color: "#6d28d9" }}>{g.name}</Link></td>
                          <td className="num">{g.posts}</td>
                          <td className="num">{g.posts ? `${g.responded} of ${g.posts}` : "-"}</td>
                          <td className="num">{g.talks}</td>
                        </tr>
                      ))}
                      {summary.length === 0 && <tr><td colSpan={4}>No groups yet. Add the first one below.</td></tr>}
                    </tbody>
                  </table>
                </div>
                <MiniPager page={gp} pages={groupPages} href={(n) => link({ gp: n })} />
                <div className="mt-4"><GroupForm /></div>
              </>
            )}
          </section>

          <section aria-labelledby="connections-title">
            <h2 id="connections-title" className="mb-3 text-2xl">Who connected</h2>
            <ul className="grid gap-3">
              {shownTalks.map((t, i) => (
                <li key={i} className="card" style={{ padding: "12px 18px" }}>
                  <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold">{name(t.from, t.from_email)} <span style={{ color: "#6d28d9" }}>&rarr;</span> {name(t.post.author, t.post.author_email)}</span>
                    <time className="mono" dateTime={t.created_at}>{timeAgo(t.created_at)}</time>
                  </div>
                  <p className="mb-2 text-sm" style={{ color: "#3a3a40" }}>{short(t.post.body, 90)}</p>
                  <p className="flex flex-wrap gap-2">
                    {groupName.has(t.post.group_id) && <span className="group-tag">{groupName.get(t.post.group_id)}</span>}
                    <span className="tag tag-update">{t.replied ? "Replied and booked a meeting" : "Booked a meeting"}</span>
                  </p>
                </li>
              ))}
              {talks.length === 0 && <li className="card">No meetings yet.</li>}
            </ul>
            <MiniPager page={cp} pages={talkPages} href={(n) => link({ cp: n })} />
          </section>
        </div>
      </main>
    </>
  );
}
