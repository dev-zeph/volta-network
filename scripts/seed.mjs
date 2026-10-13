// Idempotent seed. Run: node --env-file=.env.local scripts/seed.mjs
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "x-vn-secret": process.env.VN_DB_SECRET } },
});

const ago = (days, hours = 0) => new Date(Date.now() - (days * 24 + hours) * 3600 * 1000).toISOString();
const check = (label, error) => {
  if (error) {
    console.error(`${label} failed:`, error.message);
    process.exit(1);
  }
};

const founders = [
  { email: "maya@tidewell.example.com", name: "Maya Chen", startup: "Tidewell" },
  { email: "daniel@ledgerly.example.com", name: "Daniel Okafor", startup: "Ledgerly" },
  { email: "priya@northcart.example.com", name: "Priya Nair", startup: "Northcart" },
  { email: "liam@harbourlight.example.com", name: "Liam MacDonald", startup: "Harbourlight" },
  { email: "sophie@kelpworks.example.com", name: "Sophie Leblanc", startup: "Kelpworks" },
  { email: "noah@fogbank.example.com", name: "Noah Pitcher", startup: "Fogbank" },
];
const E = Object.fromEntries(founders.map((f) => [f.name.split(" ")[0].toLowerCase(), f.email]));

// Stable keys so reruns do not duplicate: the first 40 chars of the body identify a seed post.
const posts = [
  { by: "maya", kind: "update", d: [13, 3], body: "We got our first paying customer this week. A small marina in Lunenburg signed a $240 a month plan after one demo.\n\nI keep wondering what to do next: chase more marinas, or go deeper with this one first?" },
  { by: "daniel", kind: "request", d: [12, 1], body: "Choosing an HR platform for a team of 6. We need payroll, benefits and simple onboarding. Has anyone in Atlantic Canada used one that handles NS and NB payroll without a headache?" },
  { by: "priya", kind: "request", d: [10, 5], body: "How are you pricing annual contracts? We charge $199 monthly and I want to offer an annual plan. Is two months free too generous, or the norm?" },
  { by: "liam", kind: "update", d: [9, 2], body: "Hiring our first engineer in Halifax. We got 40 applications in a week, but almost none from people who have shipped a product end to end. Changing the job post to lead with the problem, not the stack." },
  { by: "sophie", kind: "request", d: [7, 4], body: "Anyone filed an SR&ED claim for the first time? I am deciding between a consultant who takes a percentage and doing the paperwork myself. What did it actually cost you in time?" },
  { by: "noah", kind: "update", d: [5, 6], body: "Ran a two week LinkedIn outreach test: 120 personalised messages, 31 replies, 6 calls booked. Short messages with one specific observation about their business did best. Long intros were ignored." },
  { by: "maya", kind: "request", d: [2, 3], body: "Does anyone have a simple template for a customer pilot agreement? Our first few customers want to try before they commit and I do not want to overthink the paperwork." },
  { by: "daniel", kind: "update", d: [0, 20], body: "Closed our books for the quarter and finally have real numbers. Burn is lower than I feared, but our sales cycle is twice as long as I assumed. Adjusting the runway plan this week." },
];

const comments = [
  { post: 0, by: "priya", d: [12, 2], body: "When we got our first customer I went deeper with them for a month. Their feedback shaped the product more than ten cold demos would have. Then we repeated it with the next two." },
  { post: 0, by: "liam", d: [11, 20], body: "Congrats! Ask them for an intro to two other marinas. Happy customers are the cheapest channel." },
  { post: 1, by: "sophie", d: [11, 4], body: "When we went through this we picked a platform that supported multi-province payroll from day one. Switching later cost us a weekend of data entry." },
  { post: 2, by: "maya", d: [9, 8], body: "We did two months free for annual and it worked well, but only after we had 10 monthly customers who proved they stayed. Before that I would keep it monthly." },
  { post: 2, by: "noah", d: [9, 1], body: "When we tried this we offered 15 percent off instead. Easier to explain and it still pulled cash forward." },
  { post: 3, by: "daniel", d: [8, 6], body: "When we hired ours, we paid a small fee for a take-home project and hired the person who explained their thinking best, not the one with the cleverest code." },
  { post: 4, by: "liam", d: [6, 9], body: "We wrote our own first claim and it took about three weeks of evenings. The second year we used a consultant and it was much faster. Keep your project notes from day one." },
  { post: 5, by: "priya", d: [4, 10], body: "This matches what we saw. Mentioning one recent thing the person posted doubled our reply rate." },
];

const talks = [
  { post: 1, by: "sophie", d: [11, 3] },
  { post: 4, by: "liam", d: [6, 8] },
];

const { error: fe } = await db.from("founders").upsert(founders, { onConflict: "email", ignoreDuplicates: true });
check("founders", fe);

const { data: existing, error: ee } = await db
  .from("posts")
  .select("id,body")
  .in("author_email", Object.values(E));
check("read posts", ee);

const idFor = (p) => existing.find((x) => x.body === p.body)?.id;
const toInsert = posts.filter((p) => !idFor(p));
if (toInsert.length) {
  const { error } = await db
    .from("posts")
    .insert(toInsert.map((p) => ({ author_email: E[p.by], kind: p.kind, body: p.body, created_at: ago(...p.d) })));
  check("posts", error);
  console.log(`inserted ${toInsert.length} posts`);

  const { data: all } = await db.from("posts").select("id,body").in("author_email", Object.values(E));
  const find = (p) => all.find((x) => x.body === p.body).id;
  const { error: ce } = await db
    .from("comments")
    .insert(comments.map((c) => ({ post_id: find(posts[c.post]), author_email: E[c.by], body: c.body, created_at: ago(...c.d) })));
  check("comments", ce);
  const { error: te } = await db
    .from("talk_requests")
    .insert(talks.map((t) => ({ post_id: find(posts[t.post]), from_email: E[t.by], created_at: ago(...t.d) })));
  check("talk_requests", te);
  console.log(`inserted ${comments.length} comments, ${talks.length} talk requests`);
} else {
  console.log("seed data already present, nothing to do");
}
console.log("done");
