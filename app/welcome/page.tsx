import { redirect } from "next/navigation";
import { getFounder } from "@/lib/auth";
import { WelcomeForm } from "@/components/WelcomeForm";

export const metadata = { title: "Welcome | Volta Network" };

export default async function WelcomePage() {
  const me = await getFounder();
  if (!me) redirect("/signin");
  if (me.name) redirect("/");
  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <div className="card w-full max-w-md">
        <p className="label mb-3" style={{ color: "#6d28d9" }}>Welcome to Volta Network</p>
        <h1 className="mb-2 text-4xl">Tell us who you are</h1>
        <p className="mb-6" style={{ color: "#56565e" }}>Other founders will see this next to your posts. You only do this once.</p>
        <WelcomeForm />
      </div>
    </main>
  );
}
