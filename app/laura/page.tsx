import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { displayName, getFounder } from "@/lib/auth";
import { timeAgo } from "@/lib/time";
import { Header } from "@/components/Header";
import { ListControls, Pager, readQuery, slicePage, type RawQuery } from "@/components/Pager";

export const metadata = { title: "Laura's view | Volta Network" };

type Row = {
  id: string;
  kind: string;
  body: string;
  created_at: string;
  author_email: string;
  author: { name: string | null } | null;
  comments: { id: string }[];
  talk_requests: { id: string }[];
};

export default async function LauraPage({ searchParams }: { searchParams: Promise<RawQuery> }) {
  const me = await getFounder();
  if (!me) redirect("/signin");
  if (!me.is_admin) redirect("/");

  const { data } = await db
    .from("posts")
    .select("id,kind,body,created_at,author_email,author:founders!author_email(name),comments(id),talk_requests(id)")
    .order("created_at", { ascending: false });
  const all = (data ?? []) as unknown as Row[];
  const total = all.length;
  const engaged = all.filter((r) => r.comments.length > 0 || r.talk_requests.length > 0).length;
  const talks = all.reduce((n, r) => n + r.talk_requests.length, 0);
  const { rows, counts, pages, query } = slicePage(all, readQuery(await searchParams), (r) => r.comments.length + r.talk_requests.length);

  const stats = [
    ["Total posts", total],
    ["Requests", counts.request],
    ["Updates", counts.update],
    ["Posts with a comment or talk request", engaged],
    ["Total talk requests", talks],
  ] as const;

  return (
    <>
      <Header me={me} />
      <main className="wrap py-10">
        <h1 className="mb-6 text-4xl">Laura&apos;s view</h1>
        <div className="mb-10 grid gap-5 md:grid-cols-3 lg:grid-cols-5">
          {stats.map(([label, n]) => (
            <div key={label} className="card">
              <p className="label mb-3" style={{ color: "#56565e" }}>{label}</p>
              <p className="text-6xl font-semibold" style={{ letterSpacing: "-.02em", color: "#6d28d9" }}>{n}</p>
            </div>
          ))}
        </div>
        <ListControls base="/laura" q={query} counts={counts} />
        <div className="overflow-x-auto">
          <table className="t">
            <thead>
              <tr><th>Post</th><th>Author</th><th>Kind</th><th>When</th><th style={{ textAlign: "right" }}>Comments</th><th style={{ textAlign: "right" }}>Talk requests</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ maxWidth: 420 }}>{r.body.length > 110 ? r.body.slice(0, 110) + "..." : r.body}</td>
                  <td>{displayName({ name: r.author?.name ?? null, email: r.author_email })}</td>
                  <td><span className="label">{r.kind}</span></td>
                  <td className="mono">{timeAgo(r.created_at)}</td>
                  <td className="num">{r.comments.length}</td>
                  <td className="num">{r.talk_requests.length}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6}>No posts yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <Pager base="/laura" q={query} pages={pages} />
      </main>
    </>
  );
}
