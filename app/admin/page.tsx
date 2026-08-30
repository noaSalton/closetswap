import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAdminStats } from "@/lib/admin";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") notFound();

  const stats = await getAdminStats();

  const cards = [
    { label: "Total users", value: stats.totalUsers },
    { label: "Blocked users", value: stats.blockedUsers },
    { label: "Active listings", value: stats.activeItems },
    { label: "Total listings", value: stats.totalItems },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <Link href="/admin/users" className="text-sm font-medium text-stone-900 hover:text-stone-800">
          Manage users →
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-stone-200 p-4">
            <p className="text-2xl font-semibold">{c.value}</p>
            <p className="text-sm text-stone-500">{c.label}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-lg font-medium">Bookings by status</h2>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Object.entries(stats.bookingsByStatus).map(([status, count]) => (
          <div key={status} className="rounded-lg border border-stone-200 p-4">
            <p className="text-2xl font-semibold">{count}</p>
            <p className="text-sm capitalize text-stone-500">{status.replace("_", " ")}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
