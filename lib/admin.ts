import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BookingStatus, Profile } from "@/lib/types";

export type AdminStats = {
  totalUsers: number;
  blockedUsers: number;
  activeItems: number;
  totalItems: number;
  bookingsByStatus: Record<BookingStatus, number>;
};

const ALL_STATUSES: BookingStatus[] = [
  "pending",
  "approved",
  "rejected",
  "paid",
  "in_progress",
  "returned",
];

export async function getAdminStats(): Promise<AdminStats> {
  const admin = createAdminClient();

  const [
    { count: totalUsers },
    { count: blockedUsers },
    { count: activeItems },
    { count: totalItems },
    { data: bookings },
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("is_blocked", true),
    admin.from("items").select("id", { count: "exact", head: true }).eq("is_active", true),
    admin.from("items").select("id", { count: "exact", head: true }),
    admin.from("bookings").select("status"),
  ]);

  const bookingsByStatus = Object.fromEntries(
    ALL_STATUSES.map((status) => [
      status,
      (bookings ?? []).filter((b) => b.status === status).length,
    ]),
  ) as Record<BookingStatus, number>;

  return {
    totalUsers: totalUsers ?? 0,
    blockedUsers: blockedUsers ?? 0,
    activeItems: activeItems ?? 0,
    totalItems: totalItems ?? 0,
    bookingsByStatus,
  };
}

export async function listAllUsers(): Promise<Profile[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Profile[]>();
  return data ?? [];
}
