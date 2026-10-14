import Link from "next/link";

export const PAGE_SIZE = 12;

export type ListQuery = { sort: "recent" | "replies"; show: "all" | "request" | "update"; page: number; view: "grid" | "list"; q: string };

export type RawQuery = { sort?: string; show?: string; page?: string; view?: string; q?: string };

export function readQuery(sp: RawQuery): ListQuery {
  const page = Number.parseInt(sp.page ?? "1", 10);
  return {
    sort: sp.sort === "replies" ? "replies" : "recent",
    show: sp.show === "request" || sp.show === "update" ? sp.show : "all",
    page: Number.isFinite(page) && page > 0 ? page : 1,
    view: sp.view === "grid" ? "grid" : "list",
    q: typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "",
  };
}

export function hrefFor(base: string, q: ListQuery, change: Partial<ListQuery>) {
  const next = { ...q, ...change };
  const p = new URLSearchParams();
  if (next.sort !== "recent") p.set("sort", next.sort);
  if (next.show !== "all") p.set("show", next.show);
  if (next.view !== "list") p.set("view", next.view);
  if (next.q) p.set("q", next.q);
  if (next.page > 1) p.set("page", String(next.page));
  const s = p.toString();
  return s ? `${base}?${s}` : base;
}

/** Search box for the board. A plain GET form, so it keeps the current sort, type and layout. */
export function SearchBar({ base, q, found }: { base: string; q: ListQuery; found: number }) {
  return (
    <div className="mb-5">
      <form action={base} method="get" role="search" className="flex flex-wrap gap-2">
        {q.sort !== "recent" && <input type="hidden" name="sort" value={q.sort} />}
        {q.show !== "all" && <input type="hidden" name="show" value={q.show} />}
        {q.view !== "list" && <input type="hidden" name="view" value={q.view} />}
        <label htmlFor="q" className="sr-only">Search posts</label>
        <input id="q" name="q" type="search" defaultValue={q.q} maxLength={80} className="input min-w-0 flex-1" style={{ maxWidth: 520 }} placeholder="Search posts, founders or startups" />
        <button type="submit" className="btn btn-primary">Search</button>
        {q.q && <Link href={hrefFor(base, q, { q: "", page: 1 })} className="btn btn-secondary">Clear</Link>}
      </form>
      {q.q && <p className="mt-3" role="status" style={{ color: "#56565e" }}>{found} {found === 1 ? "post matches" : "posts match"} &ldquo;{q.q}&rdquo;</p>}
    </div>
  );
}

/** Switches the board between cards and full-width rows. */
export function ViewToggle({ base, q }: { base: string; q: ListQuery }) {
  const views = [["list", "List"], ["grid", "Cards"]] as const;
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Layout">
      <span className="label" style={{ color: "#56565e" }}>Layout</span>
      {views.map(([key, label]) => (
        <Link key={key} href={hrefFor(base, q, { view: key })} aria-current={q.view === key ? "true" : undefined} className={`btn btn-sm ${q.view === key ? "btn-primary" : "btn-secondary"}`}>
          {label}
        </Link>
      ))}
    </div>
  );
}

/** Sort and type choices. Picking one goes back to page 1. */
export function ListControls({ base, q, counts, layout = false }: { base: string; q: ListQuery; counts: { all: number; request: number; update: number }; layout?: boolean }) {
  const shows = [["all", "All"], ["request", "Requests"], ["update", "Updates"]] as const;
  const sorts = [["recent", "Most recent"], ["replies", "Most replies"]] as const;
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Show">
        {shows.map(([key, label]) => (
          <Link key={key} href={hrefFor(base, q, { show: key, page: 1 })} aria-current={q.show === key ? "true" : undefined} className={`btn btn-sm ${q.show === key ? "btn-primary" : "btn-secondary"}`}>
            {label} ({counts[key]})
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      {layout && <ViewToggle base={base} q={q} />}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Sort by">
        <span className="label" style={{ color: "#56565e" }}>Sort by</span>
        {sorts.map(([key, label]) => (
          <Link key={key} href={hrefFor(base, q, { sort: key, page: 1 })} aria-current={q.sort === key ? "true" : undefined} className={`btn btn-sm ${q.sort === key ? "btn-primary" : "btn-secondary"}`}>
            {label}
          </Link>
        ))}
      </div>
      </div>
    </div>
  );
}

export function Pager({ base, q, pages }: { base: string; q: ListQuery; pages: number }) {
  if (pages <= 1) return null;
  return (
    <nav className="mt-8 flex items-center justify-center gap-4" aria-label="Pages">
      {q.page > 1 ? (
        <Link href={hrefFor(base, q, { page: q.page - 1 })} className="btn btn-sm btn-secondary">Previous</Link>
      ) : (
        <span className="btn btn-sm btn-secondary" aria-disabled="true" style={{ opacity: 0.45 }}>Previous</span>
      )}
      <span className="mono">Page {q.page} of {pages}</span>
      {q.page < pages ? (
        <Link href={hrefFor(base, q, { page: q.page + 1 })} className="btn btn-sm btn-secondary">Next</Link>
      ) : (
        <span className="btn btn-sm btn-secondary" aria-disabled="true" style={{ opacity: 0.45 }}>Next</span>
      )}
    </nav>
  );
}

/** Filters, sorts and cuts one page out of the full list. */
export function slicePage<T extends { kind: string; created_at: string }>(everything: T[], q: ListQuery, replies: (row: T) => number, text?: (row: T) => string) {
  const needle = q.q.toLowerCase();
  const all = needle && text ? everything.filter((r) => text(r).toLowerCase().includes(needle)) : everything;
  const counts = { all: all.length, request: all.filter((r) => r.kind === "request").length, update: all.filter((r) => r.kind === "update").length };
  const shown = q.show === "all" ? all : all.filter((r) => r.kind === q.show);
  const sorted = q.sort === "replies" ? [...shown].sort((a, b) => replies(b) - replies(a) || b.created_at.localeCompare(a.created_at)) : shown;
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const page = Math.min(q.page, pages);
  return { counts, pages, query: { ...q, page }, rows: sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) };
}
