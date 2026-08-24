import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { BookingListItem } from "@/components/BookingListItem";
import type { Booking, Item, ItemImage } from "@/lib/types";

type OwnedItem = Item & { item_images: Pick<ItemImage, "url">[] };
type BookingRow = Booking & {
  item: { title: string };
  renter: { full_name: string };
  owner: { full_name: string };
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();

  const [{ data: myItems }, { data: incomingRequests }, { data: myRentals }] = await Promise.all([
    supabase
      .from("items")
      .select("*, item_images(url)")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .returns<OwnedItem[]>(),
    supabase
      .from("bookings")
      .select(
        "*, item:items(title), renter:profiles!bookings_renter_id_fkey(full_name), owner:profiles!bookings_owner_id_fkey(full_name)",
      )
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .returns<BookingRow[]>(),
    supabase
      .from("bookings")
      .select(
        "*, item:items(title), renter:profiles!bookings_renter_id_fkey(full_name), owner:profiles!bookings_owner_id_fkey(full_name)",
      )
      .eq("renter_id", user.id)
      .order("created_at", { ascending: false })
      .returns<BookingRow[]>(),
  ]);

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">My listings</h2>
          <Link href="/items/new" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
            + New listing
          </Link>
        </div>
        {myItems && myItems.length > 0 ? (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {myItems.map((item) => (
              <Link
                key={item.id}
                href={`/items/${item.id}`}
                className="overflow-hidden rounded-lg border border-stone-200 hover:shadow-sm"
              >
                <div className="relative aspect-square bg-stone-100">
                  {item.item_images[0] && (
                    <Image
                      src={item.item_images[0].url}
                      alt={item.title}
                      fill
                      sizes="200px"
                      className="object-cover"
                    />
                  )}
                  {!item.is_active && (
                    <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-stone-600">
                      Delisted
                    </span>
                  )}
                </div>
                <p className="truncate p-2 text-sm font-medium">{item.title}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-stone-500">You haven&apos;t listed anything yet.</p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-medium">Requests to review</h2>
        {incomingRequests && incomingRequests.length > 0 ? (
          <div className="mt-3 space-y-2">
            {incomingRequests.map((b) => (
              <BookingListItem
                key={b.id}
                bookingId={b.id}
                itemTitle={b.item.title}
                startDate={b.start_date}
                endDate={b.end_date}
                status={b.status}
                counterpartyLabel="from"
                counterpartyName={b.renter.full_name}
              />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-stone-500">No rental requests yet.</p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-medium">My rentals</h2>
        {myRentals && myRentals.length > 0 ? (
          <div className="mt-3 space-y-2">
            {myRentals.map((b) => (
              <BookingListItem
                key={b.id}
                bookingId={b.id}
                itemTitle={b.item.title}
                startDate={b.start_date}
                endDate={b.end_date}
                status={b.status}
                counterpartyLabel="from"
                counterpartyName={b.owner.full_name}
              />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-stone-500">You haven&apos;t requested to rent anything yet.</p>
        )}
      </section>
    </div>
  );
}
