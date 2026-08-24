"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendMessageSchema } from "@/lib/validation/messages";
import { firstIssueMessage } from "@/lib/validation/utils";
import type { ActionState } from "@/lib/actions/action-state";

export async function sendMessage(input: {
  bookingId: string;
  body: string;
}): Promise<ActionState> {
  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) {
    return { error: firstIssueMessage(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  // RLS (messages_insert_participant) re-checks that the caller is a
  // participant on this booking; this is just a friendlier failure path.
  const { error } = await supabase.from("messages").insert({
    booking_id: parsed.data.bookingId,
    sender_id: user.id,
    body: parsed.data.body,
  });
  if (error) return { error: error.message };

  revalidatePath(`/bookings/${parsed.data.bookingId}`);
  return { error: null };
}
