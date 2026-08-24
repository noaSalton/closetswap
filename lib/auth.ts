import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

// Uses supabase.auth.getUser(), which revalidates the JWT against the
// Supabase Auth server rather than trusting the (spoofable) session cookie
// on its own - this is the check every server action/page should use to
// establish identity.
export async function getCurrentUser(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (profile as Profile) ?? null;
}
