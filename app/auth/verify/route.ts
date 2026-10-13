import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { SESSION_COOKIE, SESSION_TTL_MS, signToken, verifyToken } from "@/lib/auth";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? undefined;
  const email = verifyToken(token, "login")?.toLowerCase();
  if (!email) redirect("/signin?error=expired");

  if (process.env.ALLOWLIST_ONLY === "true") {
    const { data } = await db.from("founders").select("email").eq("email", email).maybeSingle();
    if (!data) redirect("/signin?error=allowlist");
  }

  await db.from("founders").upsert({ email }, { onConflict: "email", ignoreDuplicates: true });
  const { data: founder } = await db.from("founders").select("name").eq("email", email).maybeSingle();
  if (!founder) redirect("/signin?error=expired");

  (await cookies()).set(SESSION_COOKIE, signToken(email, "session", SESSION_TTL_MS), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
  redirect(founder.name ? "/" : "/welcome");
}
