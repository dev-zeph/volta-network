import Link from "next/link";
import { signOut } from "@/app/actions";
import { displayName, type Founder } from "@/lib/auth";

export function Header({ me }: { me: Founder }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper">
      <div className="wrap flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
        <Link href="/" className="no-underline" style={{ fontFamily: "var(--font-condensed)", fontWeight: 700, fontSize: 20, textTransform: "uppercase", letterSpacing: ".16em" }}>
          Volta Network
        </Link>
        <div className="flex items-center gap-3">
          {me.is_admin && (
            <Link href="/laura" className="btn btn-sm btn-primary no-underline">Laura&apos;s view</Link>
          )}
          <span className="text-sm font-medium">{displayName(me)}</span>
          <form action={signOut}>
            <button type="submit" className="btn btn-secondary btn-sm">Sign out</button>
          </form>
        </div>
      </div>
    </header>
  );
}
