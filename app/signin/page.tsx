import { redirect } from "next/navigation";
import { getFounder } from "@/lib/auth";
import { SignInForm } from "@/components/SignInForm";

export const metadata = { title: "Sign in | Volta Network" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getFounder()) redirect("/");
  const { error } = await searchParams;
  const notice =
    error === "allowlist"
      ? "This email isn't on Volta's founder list yet."
      : error === "expired"
        ? "That sign-in link has expired or is not valid. Request a new one."
        : undefined;
  return (
    <main className="grid min-h-screen md:grid-cols-[1.1fr_1fr]">
      <section className="band flex flex-col justify-end gap-4 px-[clamp(20px,4vw,56px)] py-12 md:py-20">
        <p className="label" style={{ fontWeight: 700, fontSize: 20, letterSpacing: ".16em" }}>Volta Network</p>
        <h1 className="max-w-[14ch] text-5xl md:text-6xl">Founders helping founders, one post at a time.</h1>
        <p className="max-w-md" style={{ color: "#f1ebfe" }}>Share what you are working through and get a real answer from someone who has been there.</p>
      </section>
      <section className="flex items-center px-[clamp(20px,4vw,56px)] py-12">
        <div className="w-full max-w-md"><SignInForm notice={notice} /></div>
      </section>
    </main>
  );
}
