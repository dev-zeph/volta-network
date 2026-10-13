"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { LOGIN_TTL_MS, SESSION_COOKIE, SESSION_TTL_MS, displayName, getFounder, signToken } from "@/lib/auth";
import { emailEnabled, esc, layout, sendEmail } from "@/lib/email";

export type Result = { ok: boolean; error?: string };
export type LinkState = {
  status: "idle" | "sent" | "error";
  message?: string;
  devLink?: string;
  email?: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const appUrl = () => (process.env.APP_URL || "http://localhost:3020").replace(/\/$/, "");

function clean(v: unknown, max: number) {
  return typeof v === "string" ? v.trim().slice(0, max + 1) : "";
}

export async function requestLink(_prev: LinkState, formData: FormData): Promise<LinkState> {
  const email = clean(formData.get("email"), 254).toLowerCase();
  if (!email || email.length > 254 || !EMAIL.test(email)) {
    return { status: "error", message: "Please enter a valid email address." };
  }
  if (process.env.ALLOWLIST_ONLY === "true") {
    const { data } = await db.from("founders").select("email").eq("email", email).maybeSingle();
    if (!data) {
      return { status: "error", message: "This email isn't on Volta's founder list yet. Ask Laura to add you." };
    }
  }
  // Returning founders can skip the email by giving the startup name they signed up with.
  const startup = clean(formData.get("startup"), 80).toLowerCase();
  if (startup) {
    const { data: known } = await db.from("founders").select("name, startup").eq("email", email).maybeSingle();
    if (known?.name && known.startup?.trim().toLowerCase() === startup) {
      (await cookies()).set(SESSION_COOKIE, signToken(email, "session", SESSION_TTL_MS), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: SESSION_TTL_MS / 1000,
      });
      redirect("/");
    }
  }
  const token = signToken(email, "login", LOGIN_TTL_MS);
  const link = `${appUrl()}/auth/verify?token=${encodeURIComponent(token)}`;
  const dev = !emailEnabled();
  if (dev) console.log(`[dev sign-in link] ${email}\n${link}`);
  await sendEmail({
    to: email,
    subject: "Your Volta Network sign-in link",
    text: `Use this link to sign in to Volta Network. It works for 20 minutes.\n\n${link}`,
    html: layout(
      "Sign in to Volta Network",
      `<p style="margin:0">Use the button below to sign in. The link works for 20 minutes.</p>`,
      { label: "Sign in", href: link },
    ),
  });
  return { status: "sent", email, devLink: dev ? link : undefined };
}

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/signin");
}

export async function saveProfile(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const me = await getFounder();
  if (!me) redirect("/signin");
  const name = clean(formData.get("name"), 80);
  const startup = clean(formData.get("startup"), 80);
  if (!name || name.length > 80) return { error: "Please enter your name (80 characters or fewer)." };
  if (!startup || startup.length > 80) return { error: "Please enter your startup (80 characters or fewer)." };
  const { error } = await db.from("founders").update({ name, startup }).eq("email", me.email);
  if (error) return { error: "Something went wrong saving that. Please try again." };
  revalidatePath("/", "layout");
  redirect("/");
}

export async function createPost(input: { kind: string; body: string }): Promise<Result> {
  const me = await getFounder();
  if (!me) return { ok: false, error: "Please sign in again." };
  const body = clean(input?.body, 2000);
  const kind = input?.kind;
  if (kind !== "update" && kind !== "request") return { ok: false, error: "Pick Update or Request." };
  if (!body) return { ok: false, error: "Write something first." };
  if (body.length > 2000) return { ok: false, error: "That is over 2000 characters." };
  const { error } = await db.from("posts").insert({ author_email: me.email, kind, body });
  if (error) return { ok: false, error: "Could not post that. Please try again." };
  revalidatePath("/");
  revalidatePath("/laura");
  return { ok: true };
}

async function getPost(id: string) {
  if (typeof id !== "string" || !UUID.test(id)) return null;
  const { data } = await db
    .from("posts")
    .select("id,body,kind,author_email,author:founders!author_email(name,email)")
    .eq("id", id)
    .maybeSingle();
  return data as unknown as {
    id: string;
    body: string;
    kind: string;
    author_email: string;
    author: { name: string | null; email: string };
  } | null;
}

export async function addComment(input: { postId: string; body: string }): Promise<Result> {
  const me = await getFounder();
  if (!me) return { ok: false, error: "Please sign in again." };
  const body = clean(input?.body, 2000);
  if (!body) return { ok: false, error: "Write a comment first." };
  if (body.length > 2000) return { ok: false, error: "That is over 2000 characters." };
  const post = await getPost(input?.postId);
  if (!post) return { ok: false, error: "That post no longer exists." };
  const { error } = await db.from("comments").insert({ post_id: post.id, author_email: me.email, body });
  if (error) return { ok: false, error: "Could not save that comment." };
  revalidatePath("/");
  revalidatePath("/laura");

  if (post.author_email !== me.email) {
    try {
      const who = displayName(me);
      const noun = post.kind === "request" ? "request" : "update";
      const href = `${appUrl()}/#post-${post.id}`;
      await sendEmail({
        to: post.author_email,
        subject: `${who} commented on your ${noun}`,
        text: `${who} commented on your ${noun}:\n\n"${body}"\n\nSee it: ${href}`,
        html: layout(
          `${who} commented on your ${noun}`,
          `<p style="margin:0;padding:12px 16px;border-left:3px solid #7c3aed;background:#f1ebfe;white-space:pre-wrap">${esc(body)}</p>`,
          { label: "View the conversation", href },
        ),
      });
    } catch (e) {
      console.error("[comment email]", e);
    }
  }
  return { ok: true };
}

export async function recordTalk(postId: string): Promise<Result> {
  const me = await getFounder();
  if (!me) return { ok: false, error: "Please sign in again." };
  const post = await getPost(postId);
  if (!post) return { ok: false, error: "That post no longer exists." };
  if (post.author_email === me.email) return { ok: false, error: "That is your own post." };
  const { data: existing } = await db
    .from("talk_requests")
    .select("id")
    .eq("post_id", post.id)
    .eq("from_email", me.email)
    .limit(1);
  if (existing && existing.length > 0) return { ok: true };
  const { error } = await db.from("talk_requests").insert({ post_id: post.id, from_email: me.email });
  if (error) return { ok: false, error: "Could not record that." };
  revalidatePath("/");
  revalidatePath("/laura");
  try {
    const who = displayName(me);
    const noun = post.kind === "request" ? "request" : "update";
    const href = `${appUrl()}/#post-${post.id}`;
    const quote = post.body.length > 200 ? post.body.slice(0, 200) + "..." : post.body;
    await sendEmail({
      to: post.author_email,
      subject: `${who} wants to talk about your ${noun}`,
      text: `${who} wants to talk about your ${noun}:\n\n"${quote}"\n\nThey are sending you a calendar invite. See the post: ${href}`,
      html: layout(
        `${who} wants to talk about your ${noun}`,
        `<p style="margin:0 0 12px">They are sending you a calendar invite. Here is the post they are reacting to:</p><p style="margin:0;padding:12px 16px;border-left:3px solid #7c3aed;background:#f1ebfe;white-space:pre-wrap">${esc(quote)}</p>`,
        { label: "View the post", href },
      ),
    });
  } catch (e) {
    console.error("[talk email]", e);
  }
  return { ok: true };
}
