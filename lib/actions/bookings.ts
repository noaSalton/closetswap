"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requestBookingSchema } from "@/lib/validation/bookings";
import { firstIssueMessage } from "@/lib/validation/utils";
import { canTransition, type BookingAction } from "@/lib/booking-state-machine";
import { rentalTotal } from "@/lib/pricing";
import type { ActionState } from "@/lib/actions/action-state";
import type { Booking } from "@/lib/types";

const ACTIVE_STATUSES = ["approved", "paid", "in_progress"] as const;

async function hasOverlap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  itemId: string,
  startDate: string,
  endDate: string,
  excludeBookingId?: string,
) {
  let query = supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("item_id", itemId)
    .in("status", ACTIVE_STATUSES)
    .lte("start_date", endDate)
    .gte("end_date", startDate);
  if (excludeBookingId) query = query.neq("id", excludeBookingId);

  const { count } = await query;
  return (count ?? 0) > 0;
}

export async function createBooking(input: {
  itemId: string;
  startDate: string;
  endDate: string;
}): Promise<ActionState> {
  const parsed = requestBookingSchema.safeParse(input);
  if (!parsed.success) {
    return { error: firstIssueMessage(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in to request a rental." };

  const { data: item } = await supabase
    .from("items")
    .select("id, owner_id, price_per_day, is_active")
    .eq("id", parsed.data.itemId)
    .single();
  if (!item || !item.is_active) {
    return { error: "This item is no longer available." };
  }
  if (item.owner_id === user.id) {
    return { error: "You can't rent your own item." };
  }

  if (await hasOverlap(supabase, item.id, parsed.data.startDate, parsed.data.endDate)) {
    return { error: "This item is already booked for part of that date range." };
  }

  const totalPrice = rentalTotal(parsed.data.startDate, parsed.data.endDate, item.price_per_day);

  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      item_id: item.id,
      renter_id: user.id,
      owner_id: item.owner_id,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate,
      total_price: totalPrice,
    })
    .select("id")
    .single();
  if (error || !booking) {
    return { error: error?.message ?? "Could not create the booking request." };
  }

  revalidatePath("/dashboard");
  redirect(`/bookings/${booking.id}`);
}

async function runTransition(bookingId: string, action: BookingAction): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single<Booking>();
  if (!booking) return { error: "Booking not found." };

  const role = booking.renter_id === user.id ? "renter" : booking.owner_id === user.id ? "owner" : null;
  if (!role) return { error: "You're not part of this booking." };

  const result = canTransition(booking.status, action, role);
  if (!result.ok) return { error: result.reason };

  if (
    (result.next === "approved" || result.next === "paid") &&
    (await hasOverlap(supabase, booking.item_id, booking.start_date, booking.end_date, booking.id))
  ) {
    return { error: "This item was already booked for overlapping dates in the meantime." };
  }

  const { error } = await supabase
    .from("bookings")
    .update({ status: result.next })
    .eq("id", bookingId);
  if (error) return { error: error.message };

  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/dashboard");
  return { error: null };
}

export async function approveBooking(bookingId: string) {
  return runTransition(bookingId, "approve");
}

export async function rejectBooking(bookingId: string) {
  return runTransition(bookingId, "reject");
}

export async function payBooking(bookingId: string) {
  return runTransition(bookingId, "pay");
}

export async function markPickedUp(bookingId: string) {
  return runTransition(bookingId, "markPickedUp");
}

export async function markReturned(bookingId: string) {
  return runTransition(bookingId, "markReturned");
}
