import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/lib/actions/auth";

export async function Navbar() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight text-stone-900">
          ClosetSwap
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-stone-600 hover:text-stone-900">
            Browse
          </Link>
          {user ? (
            <>
              <Link href="/items/new" className="text-stone-600 hover:text-stone-900">
                List an item
              </Link>
              <Link href="/dashboard" className="text-stone-600 hover:text-stone-900">
                Dashboard
              </Link>
              {user.role === "admin" && (
                <Link href="/admin" className="text-stone-600 hover:text-stone-900">
                  Admin
                </Link>
              )}
              <Link href="/profile" className="text-stone-600 hover:text-stone-900">
                {user.full_name || "Profile"}
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="text-stone-600 hover:text-stone-900"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-stone-600 hover:text-stone-900">
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-700"
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
