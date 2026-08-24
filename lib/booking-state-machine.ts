import type { BookingStatus } from "@/lib/types";

export type BookingRole = "renter" | "owner";

export type BookingAction = "approve" | "reject" | "pay" | "markPickedUp" | "markReturned";

type Transition = { role: BookingRole; next: BookingStatus };

// The single source of truth for which status transitions are legal, who is
// allowed to make them, and what status they lead to. Row-level access
// (can you see/touch this booking at all) is enforced by Postgres RLS;
// which *transition* is legal for which *role* lives here instead, because
// it's much easier to unit test a pure function than a SQL policy.
const TRANSITIONS: Record<BookingStatus, Partial<Record<BookingAction, Transition>>> = {
  pending: {
    approve: { role: "owner", next: "approved" },
    reject: { role: "owner", next: "rejected" },
  },
  approved: {
    pay: { role: "renter", next: "paid" },
  },
  rejected: {},
  paid: {
    markPickedUp: { role: "owner", next: "in_progress" },
  },
  in_progress: {
    markReturned: { role: "owner", next: "returned" },
  },
  returned: {},
};

export type TransitionResult =
  | { ok: true; next: BookingStatus }
  | { ok: false; reason: string };

export function canTransition(
  current: BookingStatus,
  action: BookingAction,
  role: BookingRole,
): TransitionResult {
  const transition = TRANSITIONS[current]?.[action];
  if (!transition) {
    return { ok: false, reason: `This booking is ${current} and can't be ${actionLabel(action)} now.` };
  }
  if (transition.role !== role) {
    return { ok: false, reason: `Only the ${transition.role} can ${actionLabel(action)} this booking.` };
  }
  return { ok: true, next: transition.next };
}

function actionLabel(action: BookingAction): string {
  switch (action) {
    case "approve":
      return "approved";
    case "reject":
      return "rejected";
    case "pay":
      return "paid";
    case "markPickedUp":
      return "marked picked up";
    case "markReturned":
      return "marked returned";
  }
}
