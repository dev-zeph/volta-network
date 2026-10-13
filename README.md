# Volta Network

A small poster board where Volta founders share updates, ask for help, comment on each other's posts, and book a chat with one click. Next.js (App Router), Tailwind v4, Supabase Postgres, Resend for email.

## Run it

```bash
npm install
npm run dev        # http://localhost:3020
node --env-file=.env.local scripts/seed.mjs   # optional demo content (safe to rerun)
npm run build && npm run lint
```

## Environment (.env.local, see .env.example)

| Key | Purpose |
| --- | --- |
| SUPABASE_URL, SUPABASE_KEY | Supabase project (server only) |
| VN_DB_SECRET | Sent as the `x-vn-secret` header; row level security rejects requests without it |
| AUTH_SECRET | Signs sign-in links and session cookies |
| RESEND_API_KEY | Leave empty for dev mode (no email is sent) |
| EMAIL_FROM | From address for Resend |
| APP_URL | Base URL used in emailed links (http://localhost:3020 locally) |
| ALLOWLIST_ONLY | Set to `true` to let only existing founders sign in |

Nothing is exposed to the browser; the database client lives in `lib/db.ts` (server only).

## How it works

- **Sign in:** enter an email, get a link `APP_URL/auth/verify?token=...` (HMAC signed, valid 20 minutes). Verifying it creates the founder row and sets a signed httpOnly session cookie (30 days). New founders land on `/welcome` once to add their name and startup.
- **Dev mode:** with `RESEND_API_KEY` empty, the link is printed in the server console and shown on the "Check your email" screen. With a key set, it is never shown.
- **Emails:** everything goes through `lib/email.ts`. It skips sending (and logs instead) when the key is empty or the recipient ends in `@example.com`. Failures are logged and never break the action. Comments email the post author (not for your own comments); Let's talk emails the author too.
- **Let's talk:** a link that opens a prefilled Google Calendar event (author invited) in a new tab and, on click, records a talk request and emails the author. Hidden on your own posts, and one request per founder per post.
- **Laura's view (`/laura`):** totals and a per-post table, for admins only.

## Make someone an admin

In the Supabase SQL editor: `update founders set is_admin = true where email = 'laura@example.org';` (the person must have signed in once, or insert the row first).

## Files

`app/` pages and server actions (`app/actions.ts`), `app/auth/verify/route.ts`, `components/` UI, `lib/` db, auth, email, time helpers, `scripts/seed.mjs`.
