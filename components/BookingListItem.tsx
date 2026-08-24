import Link from "next/link";
import { BookingStatusBadge } from "@/components/BookingStatusBadge";
import type { BookingStatus } from "@/lib/types";

export function BookingListItem({
  bookingId,
  itemTitle,
  startDate,
  endDate,
  status,
  counterpartyLabel,
  counterpartyName,
}: {
  bookingId: string;
  itemTitle: string;
  startDate: string;
  endDate: string;
  status: BookingStatus;
  counterpartyLabel: string;
  counterpartyName: string;
}) {
  return (
    <Link
      href={`/bookings/${bookingId}`}
      className="flex items-center justify-between rounded-lg border border-stone-200 p-4 hover:bg-stone-50"
    >
      <div>
        <p className="font-medium text-stone-900">{itemTitle}</p>
        <p className="text-sm text-stone-500">
          {startDate} → {endDate} · {counterpartyLabel} {counterpartyName || "ClosetSwap user"}
        </p>
      </div>
      <BookingStatusBadge status={status} />
    </Link>
  );
}
