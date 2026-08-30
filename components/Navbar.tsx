import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/lib/actions/auth";

const navLink = "text-xs uppercase tracking-wider text-stone-600 hover:text-stone-900 transition-colors";

export async function Navbar() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <Link
          href="/"
          className="font-serif text-[26px] italic tracking-wide text-stone-900"
        >
          closetswap
        </Link>
        <nav className="flex items-center gap-6">
          <Link href="/" className={navLink}>
            Browse
          </Link>
          {user ? (
            <>
              <Link href="/items/new" className={navLink}>
                List an item
              </Link>
              <Link href="/dashboard" className={navLink}>
                Dashboard
              </Link>
              {user.role === "admin" && (
                <Link href="/admin" className={navLink}>
                  Admin
                </Link>
              )}
              <Link href="/profile" className={navLink}>
                {user.full_name || "Profile"}
              </Link>
              <form action={signOut}>
                <button type="submit" className={navLink}>
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className={navLink}>
                Log in
              </Link>
              <Link
                href="/signup"
                className="border border-stone-900 bg-stone-900 px-4 py-2 text-xs uppercase tracking-wider text-white transition-colors hover:bg-white hover:text-stone-900"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
