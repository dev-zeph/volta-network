import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { db } from "./db";

export const SESSION_COOKIE = "vn_session";
export const LOGIN_TTL_MS = 20 * 60 * 1000;
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type Kind = "login" | "session";

function mac(data: string) {
  return createHmac("sha256", process.env.AUTH_SECRET!).update(data).digest("base64url");
}

export function signToken(email: string, kind: Kind, ttlMs: number) {
  const payload = Buffer.from(JSON.stringify({ email, kind, exp: Date.now() + ttlMs })).toString("base64url");
  return `${payload}.${mac(payload)}`;
}

export function verifyToken(token: string | undefined, kind: Kind): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = Buffer.from(mac(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (data.kind !== kind || typeof data.email !== "string" || typeof data.exp !== "number") return null;
    if (data.exp < Date.now()) return null;
    return data.email;
  } catch {
    return null;
  }
}

export type Founder = {
  email: string;
  name: string | null;
  startup: string | null;
  is_admin: boolean;
};

export const getFounder = cache(async (): Promise<Founder | null> => {
  const store = await cookies();
  const email = verifyToken(store.get(SESSION_COOKIE)?.value, "session");
  if (!email) return null;
  const { data } = await db
    .from("founders")
    .select("email,name,startup,is_admin")
    .eq("email", email)
    .maybeSingle();
  return (data as Founder | null) ?? null;
});

export function displayName(f: { name: string | null; email?: string }) {
  return f.name?.trim() || (f.email ? f.email.split("@")[0] : "A founder");
}
