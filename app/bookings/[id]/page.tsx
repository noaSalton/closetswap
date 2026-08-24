import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { BookingStatusBadge } from "@/components/BookingStatusBadge";
import { BookingActionButton } from "@/components/BookingActionButton";
import { ChatPanel } from "@/components/ChatPanel";
import { RatingForm } from "@/components/RatingForm";
import { RatingStars } from "@/components/RatingStars";
import {
  approveBooking,
  rejectBooking,
  payBooking,
  markPickedUp,
  markReturned,
} from "@/lib/actions/bookings";
import type { Booking, Message } from "@/lib/types";

type BookingDetail = Booking & {
  item: { id: string; title: string; item_images: { url: string }[] };
  renter: { id: string; full_name: string };
  owner: { id: string; full_name: string };
};

export default async function BookingDetailPage(props: PageProps<"/bookings/[id]">) {
  const { id } = await props.params;
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const supabase = await createClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "*, item:items(id,title,item_images(url)), renter:profiles!bookings_renter_id_fkey(id,full_name), owner:profiles!bookings_owner_id_fkey(id,full_name)",
    )
    .eq("id", id)
    .single<BookingDetail>();

  if (!booking) notFound();

  const role = booking.renter_id === currentUser.id ? "renter" : "owner";
  const counterparty = role === "renter" ? booking.owner : booking.renter;

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("booking_id", booking.id)
    .order("created_at", { ascending: true })
    .returns<Message[]>();

  const participantNames: Record<string, string> = {
    [booking.renter.id]: booking.renter.full_name,
    [booking.owner.id]: booking.owner.full_name,
  };

  let myRating: { score: number; comment: string | null } | null = null;
  if (booking.status === "returned") {
    const { data } = await supabase
      .from("ratings")
      .select("score, comment")
      .eq("booking_id", booking.id)
      .eq("rater_id", currentUser.id)
      .maybeSingle();
    myRating = data;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/items/${booking.item.id}`} className="text-sm text-indigo-600 hover:text-indigo-700">
        &larr; {booking.item.title}
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Booking details</h1>
        <BookingStatusBadge status={booking.status} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-stone-200 p-4 text-sm">
        <div>
          <p className="text-stone-500">Dates</p>
          <p className="font-medium">
            {booking.start_date} → {booking.end_date}
          </p>
        </div>
        <div>
          <p className="text-stone-500">Total</p>
          <p className="font-medium">${booking.total_price.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-stone-500">Your role</p>
          <p className="font-medium capitalize">{role}</p>
        </div>
        <div>
          <p className="text-stone-500">{role === "renter" ? "Owner" : "Renter"}</p>
          <p className="font-medium">{counterparty.full_name || "ClosetSwap user"}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {booking.status === "pending" && role === "owner" && (
          <>
            <BookingActionButton
              action={approveBooking}
              bookingId={booking.id}
              label="Approve"
              pendingLabel="Approving..."
            />
            <BookingActionButton
              action={rejectBooking}
              bookingId={booking.id}
              label="Reject"
              pendingLabel="Rejecting..."
              variant="danger"
            />
          </>
        )}
        {booking.status === "pending" && role === "renter" && (
          <p className="text-sm text-stone-500">Waiting for the owner to respond.</p>
        )}

        {booking.status === "approved" && role === "renter" && (
          <BookingActionButton
            action={payBooking}
            bookingId={booking.id}
            label="Pay now (mock)"
            pendingLabel="Processing payment..."
          />
        )}
        {booking.status === "approved" && role === "owner" && (
          <p className="text-sm text-stone-500">Waiting for the renter to pay.</p>
        )}

        {booking.status === "paid" && role === "owner" && (
          <BookingActionButton
            action={markPickedUp}
            bookingId={booking.id}
            label="Mark picked up"
            pendingLabel="Updating..."
          />
        )}
        {booking.status === "paid" && role === "renter" && (
          <p className="text-sm text-stone-500">Paid — coordinate pickup with the owner.</p>
        )}

        {booking.status === "in_progress" && role === "owner" && (
          <BookingActionButton
            action={markReturned}
            bookingId={booking.id}
            label="Mark returned"
            pendingLabel="Updating..."
          />
        )}
        {booking.status === "in_progress" && role === "renter" && (
          <p className="text-sm text-stone-500">Enjoy! Return it to the owner by {booking.end_date}.</p>
        )}

        {booking.status === "rejected" && (
          <p className="text-sm text-stone-500">This request was declined.</p>
        )}
      </div>

      {booking.status === "returned" &&
        (myRating ? (
          <div className="mt-6 rounded-lg border border-stone-200 p-4">
            <p className="text-sm text-stone-500">
              You rated {counterparty.full_name || "them"}
            </p>
            <RatingStars score={myRating.score} />
            {myRating.comment && <p className="mt-1 text-sm text-stone-700">{myRating.comment}</p>}
          </div>
        ) : (
          <RatingForm bookingId={booking.id} counterpartyName={counterparty.full_name} />
        ))}

      <ChatPanel
        bookingId={booking.id}
        currentUserId={currentUser.id}
        initialMessages={messages ?? []}
        participantNames={participantNames}
      />
    </div>
  );
}
