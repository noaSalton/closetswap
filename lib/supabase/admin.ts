import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import "server-only";

// Uses the Supabase service-role key, which bypasses Row Level Security
// entirely. Only ever call this from server action code that has already
// verified the caller's profile.role === "admin" - see lib/actions/admin.ts.
// Never import this module from a Client Component or expose its result to
// the browser.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
