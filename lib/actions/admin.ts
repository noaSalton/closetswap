"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import type { ActionState } from "@/lib/actions/action-state";

async function requireAdmin(): Promise<ActionState | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return { error: "You don't have permission to do that." };
  }
  return null;
}

export async function setUserBlocked(userId: string, isBlocked: boolean): Promise<ActionState> {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;

  // Uses the service-role client: profiles.is_blocked is protected by the
  // protect_profile_columns trigger (see supabase/migrations/0001_init.sql)
  // against every non-service-role writer, including this app's own
  // regular client - so a normal authenticated request, even from code
  // that already checked requireAdmin() above, could not make this write.
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ is_blocked: isBlocked }).eq("id", userId);
  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  return { error: null };
}
