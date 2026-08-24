import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import "server-only";

// Creates a Supabase client for use in Server Components, Server Actions,
// and Route Handlers. Reads the session from request cookies and, when
// called from a Server Action, writes refreshed auth cookies back out.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called during a Server Component render, where cookies can't
            // be written. The proxy (see proxy.ts) refreshes the session
            // cookie on every request instead, so this is safe to ignore.
          }
        },
      },
    },
  );
}
