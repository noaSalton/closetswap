"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { submitRatingSchema } from "@/lib/validation/ratings";
import { firstIssueMessage } from "@/lib/validation/utils";
import type { ActionState } from "@/lib/actions/action-state";
import type { Booking } from "@/lib/types";

export async function submitRating(input: {
  bookingId: string;
  score: number;
  comment: string;
}): Promise<ActionState> {
  const parsed = submitRatingSchema.safeParse(input);
  if (!parsed.success) {
    return { error: firstIssueMessage(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", parsed.data.bookingId)
    .single<Booking>();
  if (!booking) return { error: "Booking not found." };
  if (booking.status !== "returned") {
    return { error: "You can only rate a booking after the item has been returned." };
  }

  const isRenter = booking.renter_id === user.id;
  const isOwner = booking.owner_id === user.id;
  if (!isRenter && !isOwner) return { error: "You're not part of this booking." };
  const rateeId = isRenter ? booking.owner_id : booking.renter_id;

  const { error } = await supabase.from("ratings").insert({
    booking_id: booking.id,
    rater_id: user.id,
    ratee_id: rateeId,
    score: parsed.data.score,
    comment: parsed.data.comment || null,
  });
  if (error) {
    if (error.code === "23505") {
      return { error: "You already rated this booking." };
    }
    return { error: error.message };
  }

  revalidatePath(`/bookings/${booking.id}`);
  revalidatePath(`/profile/${rateeId}`);
  return { error: null };
}
