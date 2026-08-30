import type { BookingStatus } from "@/lib/types";

const LABELS: Record<BookingStatus, string> = {
  pending: "Pending approval",
  approved: "Approved — awaiting payment",
  rejected: "Rejected",
  paid: "Paid — awaiting pickup",
  in_progress: "Rental in progress",
  returned: "Returned",
};

const COLORS: Record<BookingStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-blue-100 text-blue-800",
  rejected: "bg-red-100 text-red-700",
  paid: "bg-sky-100 text-sky-700",
  in_progress: "bg-purple-100 text-purple-700",
  returned: "bg-green-100 text-green-700",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${COLORS[status]}`}>
      {LABELS[status]}
    </span>
  );
}
