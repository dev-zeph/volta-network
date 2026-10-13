// Demo data. Founders come from scripts/demo-data.csv; posts and comments below are written from its
// "Working on now", "Stuck on", "Lived through" and "Can help with" columns.
// Run: node --env-file=.env.local scripts/seed.mjs
// Every run removes the made-up (example.com) founders and their posts, then loads this set again.
import { readFileSync } from "node:fs";
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
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");

const rows = readFileSync(new URL("./demo-data.csv", import.meta.url), "utf8").trim().split(/\r?\n/).slice(1);
const founders = rows.map((r) => {
  const [name, startup] = r.split(",");
  const first = name.split(" ")[0];
  return { key: first.toLowerCase(), email: `${slug(first)}@${slug(startup)}.example.com`, name, startup };
});
const E = Object.fromEntries(founders.map((f) => [f.key, f.email]));

const posts = [
  { by: "ana", kind: "request", d: [13, 4], body: "We are about to sign our first clinic group with more than five locations and I do not know how to price it. Per location feels too expensive for them, a flat fee feels too cheap for us.\n\nHas anyone priced for customers with many sites?" },
  { by: "theo", kind: "request", d: [13, 1], body: "Larger clinic groups keep sending us security questionnaires with 200 or more questions. Each one takes me days. How do other small teams handle these without a full-time security person?" },
  { by: "mira", kind: "request", d: [12, 6], body: "We are opening a small sales office in Boston. What is the simplest way to hire and pay staff in the US from a Canadian company? Did you set up a US entity first or use a service?" },
  { by: "desmond", kind: "request", d: [12, 2], body: "Has anyone sold to a port authority? We are stuck in procurement and I cannot tell who actually makes the decision or how long it should take." },
  { by: "leila", kind: "request", d: [11, 5], body: "We have grown on revenue to 22 people and are preparing our first institutional round to expand into Ontario. What surprised you most the first time you raised from investors?" },
  { by: "owen", kind: "update", d: [11, 1], body: "Interviewed 9 of 20 contractors so far about how they quote jobs. Most do it at night on a spreadsheet, and several said they lose jobs because the quote goes out two days late. That lateness is the problem I want to solve." },
  { by: "colm", kind: "request", d: [10, 7], body: "We have staff in three provinces now. Has anyone set up group benefits across provinces? I am trying to find out whether one plan can cover everyone or whether we need a broker." },
  { by: "jordan", kind: "request", d: [10, 2], body: "Applying for IRAP for the first time. I am based in Charlottetown and have never written a grant. What does the first conversation with an IRAP advisor look like, and what should I have ready?" },
  { by: "anjali", kind: "request", d: [9, 8], body: "We are 14 staff and still run HR and payroll on spreadsheets. We are hiring three nurses and a sales lead, so it is time for a real platform. Which one did you pick, and would you pick it again?" },
  { by: "arjun", kind: "update", d: [9, 3], body: "Sea trials of our second hull-cleaning prototype started this week in Halifax harbour. The robot held to the hull for a full 40 minute run. Next test is in rougher water." },
  { by: "owen", kind: "request", d: [8, 6], body: "I am still working full-time as a construction project manager while I test this idea. How did you know it was time to quit your job and go all in?" },
  { by: "luc", kind: "request", d: [8, 1], body: "Hiring our first salesperson outside Atlantic Canada. Commission, salary, or a mix? I would like to hear what you tried and what you would do differently." },
  { by: "grace", kind: "request", d: [7, 5], body: "We are responding to our first school board RFP. The approval steps are long and I am not sure which parts matter most. Has anyone been through a public sector RFP?" },
  { by: "rosalie", kind: "request", d: [7, 1], body: "A national grocer wants to list our chowders, which is great, but the first order is bigger than anything we have produced. How do you cover ingredients and co-packer costs before the grocer pays?" },
  { by: "leah", kind: "update", d: [6, 7], body: "Sent our 41st grant application this week, this time for a customer and not for us. Two free trial users moved to paid plans after their first approved grant." },
  { by: "arjun", kind: "request", d: [6, 2], body: "Pre-seed investors keep comparing our timeline to software companies. How do you explain hardware timelines so an 18 month build does not sound like a red flag?" },
  { by: "tomasz", kind: "request", d: [5, 8], body: "Writing the job post for our first salesperson. Who did you hire first: someone senior who has done it before, or someone junior who is hungry? And how did you pay them?" },
  { by: "leah", kind: "request", d: [5, 3], body: "Stuck on pricing: per seat or per grant application? Nonprofits have small teams but send a lot of applications. What did you learn when you changed how you charge?" },
  { by: "siobhan", kind: "request", d: [4, 9], body: "We are about to close our first US customer, in Maine. What do I need to know about cross-border tax and contracts before I sign? I am in St. John's and doing this for the first time." },
  { by: "felix", kind: "request", d: [4, 4], body: "We are two people, pre-revenue, lab testing lower-carbon concrete with a university partner. Which grants should we apply for first: IRAP or provincial funding?" },
  { by: "grace", kind: "update", d: [3, 9], body: "Our waitlist passed 3,000 parents before launch. What worked: one short video of a child reading aloud, shared in parent groups. Paid ads did very little." },
  { by: "imani", kind: "request", d: [3, 5], body: "I was an ER nurse for ten years and I am building a sleep coaching app with a contract developer. I would like a technical co-founder. Where did you find yours, or your first developer?" },
  { by: "kiran", kind: "request", d: [3, 1], body: "Our first enterprise contract is with a national insurer. Their security review and legal process has taken two months so far. What helped you get through a big company's review faster?" },
  { by: "josie", kind: "request", d: [2, 8], body: "Looking for a US distributor in New England for our wild blueberry snacks. I also need to get our labels ready for the FDA. Has anyone taken a food product into the US?" },
  { by: "ewan", kind: "request", d: [2, 3], body: "Closing a pre-seed round. How often do you send investor updates, and what do you put in them? I am also still looking for a lead investor." },
  { by: "desmond", kind: "update", d: [1, 20], body: "Hiring two more sales reps at Brinewater. Our first rep took four months to ramp, so this time we are writing down the first 30 days before anyone starts." },
  { by: "sofia", kind: "request", d: [1, 9], body: "We are hiring our first US-based account manager. Which HR and payroll platforms handle both Canadian and US staff well?" },
  { by: "mateo", kind: "request", d: [1, 3], body: "Revenue drops hard between game releases. How do other product companies smooth out income between launches?" },
  { by: "amara", kind: "request", d: [0, 9], body: "We are at 50k downloads and everything is free. When did you add a paid tier, and how did your users react?" },
  { by: "tomasz", kind: "update", d: [0, 3], body: "We moved 11 of our long-term care customers from monthly to annual contracts this quarter. Offering one free month and a fixed price for the year was enough." },
];
const P = (by, start) => posts.findIndex((p) => p.by === by && p.body.startsWith(start));

const comments = [
  { post: P("ana", "We are about"), by: "tomasz", d: [12, 20], body: "When we moved our care home customers to annual contracts, we priced per site with a discount that grows after the fifth site. Groups liked that the price was easy to predict." },
  { post: P("theo", "Larger clinic"), by: "kiran", d: [12, 18], body: "We went through this before our SOC 2. We keep one master document of answers and reuse it, so a new questionnaire now takes a few hours and not days. Happy to share how we organised it." },
  { post: P("mira", "We are opening"), by: "sofia", d: [11, 22], body: "We set up a US entity and registered for US sales tax last year. It took about six weeks. The entity made payroll and contracts much simpler than what we tried before." },
  { post: P("desmond", "Has anyone sold"), by: "luc", d: [11, 12], body: "We sold to a utility through a 12 month procurement. What helped most was finding the operations person who lives with the problem. They carried us through the purchasing steps." },
  { post: P("leila", "We have grown"), by: "mira", d: [10, 20], body: "When we raised our Series A, the surprise was how much time investors spent on our numbers by customer group. Have those ready before the first meeting." },
  { post: P("jordan", "Applying for IRAP"), by: "leah", d: [9, 20], body: "I have written over 40 grant applications, IRAP included. The first call is a conversation, not a pitch. Have a one page summary of the technical risk and what you would spend the money on." },
  { post: P("anjali", "We are 14 staff"), by: "colm", d: [9, 2], body: "We switched HR and payroll platforms at 20 staff. My lesson: test how it handles payroll in each province you hire in before you sign. Moving later cost us weeks." },
  { post: P("owen", "I am still working"), by: "felix", d: [7, 22], body: "I left a corporate engineering job to start Ashgrove. I waited until one university partner had committed to lab testing. That one outside commitment made the decision easier." },
  { post: P("luc", "Hiring our first"), by: "desmond", d: [7, 16], body: "I was a startup's first sales hire. A lower base with real commission worked for me, but only because the founder had already closed the first ten deals and could show me how." },
  { post: P("luc", "Hiring our first"), by: "leila", d: [7, 9], body: "We hired our first five salespeople at Ferrybill. Our first hire was on mostly commission and left in three months. A mix of salary and commission kept the next four." },
  { post: P("grace", "We are responding"), by: "anjali", d: [6, 20], body: "We got through a provincial health authority procurement. The scoring table in the RFP tells you exactly what matters. We answered in the same order as the scoring and it helped." },
  { post: P("tomasz", "Writing the job post"), by: "desmond", d: [5, 2], body: "From my experience as a first sales hire: a junior person needs the founder beside them for the first few months. If you cannot give that time, hire someone who has done it before." },
  { post: P("leah", "Stuck on pricing"), by: "tomasz", d: [4, 20], body: "When we changed to annual contracts, customers cared most about knowing the yearly cost up front. A price that changes with usage made budgeting harder for them." },
  { post: P("siobhan", "We are about to close"), by: "sofia", d: [4, 2], body: "We went through US sales tax and contracts when we set up our US entity. For one customer we did not need the entity yet, but we did need to check sales tax rules in that state." },
  { post: P("felix", "We are two people"), by: "leah", d: [3, 20], body: "In my experience IRAP moves faster once you have a relationship with an advisor, so start that conversation now and apply for provincial funding while you wait." },
  { post: P("imani", "I was an ER nurse"), by: "ana", d: [3, 0], body: "We hired our first developer on a small budget. We found them through a local meetup, started with a paid two week project, and only then talked about a longer role." },
  { post: P("kiran", "Our first enterprise"), by: "theo", d: [2, 18], body: "We got through a privacy impact assessment with a health customer. Asking for their full list of requirements on day one, and one named contact on their side, saved us weeks." },
  { post: P("ewan", "Closing a pre-seed"), by: "kiran", d: [1, 22], body: "We closed our seed round in six weeks. I sent a short update every two weeks during the raise: numbers, one win, one ask. Two investors came in through the asks." },
  { post: P("sofia", "We are hiring our first US"), by: "colm", d: [1, 2], body: "When we switched platforms at 20 staff, very few handled both countries well. Ask each one to show you a US pay run in a demo before you decide." },
  { post: P("amara", "We are at 50k"), by: "leah", d: [0, 5], body: "We turned free trials into paid plans by charging at the moment of the first real result. For us that was the first approved grant." },
];

const talks = [
  { post: P("theo", "Larger clinic"), by: "kiran", d: [12, 17] },
  { post: P("mira", "We are opening"), by: "sofia", d: [11, 21] },
  { post: P("jordan", "Applying for IRAP"), by: "leah", d: [9, 19] },
  { post: P("anjali", "We are 14 staff"), by: "colm", d: [9, 1] },
  { post: P("luc", "Hiring our first"), by: "desmond", d: [7, 15] },
  { post: P("imani", "I was an ER nurse"), by: "ana", d: [2, 23] },
  { post: P("ewan", "Closing a pre-seed"), by: "kiran", d: [1, 21] },
];

for (const x of [...comments, ...talks]) if (x.post < 0 || !E[x.by]) throw new Error("bad reference in seed data");
for (const p of posts) if (!E[p.by]) throw new Error(`unknown founder ${p.by}`);

// Clear the previous made-up set. Posts go first so their comments and talk requests go with them.
const { data: old, error: oe } = await db.from("founders").select("email").like("email", "%.example.com");
check("read founders", oe);
const oldEmails = old.map((f) => f.email);
if (oldEmails.length) {
  const { data: oldPosts, error: pe } = await db.from("posts").select("id").in("author_email", oldEmails);
  check("read posts", pe);
  const ids = oldPosts.map((p) => p.id);
  if (ids.length) {
    check("clear talk requests", (await db.from("talk_requests").delete().in("post_id", ids)).error);
    check("clear comments", (await db.from("comments").delete().in("post_id", ids)).error);
  }
  check("clear talk requests", (await db.from("talk_requests").delete().in("from_email", oldEmails)).error);
  check("clear comments", (await db.from("comments").delete().in("author_email", oldEmails)).error);
  check("clear posts", (await db.from("posts").delete().in("author_email", oldEmails)).error);
  check("clear founders", (await db.from("founders").delete().in("email", oldEmails)).error);
  console.log(`removed ${oldEmails.length} made-up founders and ${ids.length} posts`);
}

check("founders", (await db.from("founders").insert(founders.map(({ email, name, startup }) => ({ email, name, startup })))).error);
const { data: made, error: me } = await db
  .from("posts")
  .insert(posts.map((p) => ({ author_email: E[p.by], kind: p.kind, body: p.body, created_at: ago(...p.d) })))
  .select("id,body");
check("posts", me);
const idOf = (i) => made.find((x) => x.body === posts[i].body).id;
check("comments", (await db.from("comments").insert(comments.map((c) => ({ post_id: idOf(c.post), author_email: E[c.by], body: c.body, created_at: ago(...c.d) })))).error);
check("talk_requests", (await db.from("talk_requests").insert(talks.map((t) => ({ post_id: idOf(t.post), from_email: E[t.by], created_at: ago(...t.d) })))).error);
console.log(`loaded ${founders.length} founders, ${posts.length} posts, ${comments.length} comments, ${talks.length} talk requests`);
