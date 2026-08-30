import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { ItemOwnerActions } from "@/components/ItemOwnerActions";
import { BookingRequestForm } from "@/components/BookingRequestForm";
import type { Item, ItemImage, Profile } from "@/lib/types";

type ItemDetail = Item & {
  item_images: ItemImage[];
  owner: Pick<Profile, "id" | "full_name" | "avatar_url" | "rating_avg" | "rating_count">;
};

export default async function ItemDetailPage(props: PageProps<"/items/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();
  const currentUser = await getCurrentUser();

  const { data: item } = await supabase
    .from("items")
    .select(
      "*, item_images(id,url,sort_order), owner:profiles!items_owner_id_fkey(id,full_name,avatar_url,rating_avg,rating_count)",
    )
    .eq("id", id)
    .order("sort_order", { referencedTable: "item_images" })
    .single<ItemDetail>();

  if (!item) notFound();

  const isOwner = currentUser?.id === item.owner_id;

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        {item.item_images.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {item.item_images.map((img, i) => (
              <div
                key={img.id}
                className={`relative aspect-square overflow-hidden rounded-lg border border-stone-200 ${
                  i === 0 ? "col-span-2" : ""
                }`}
              >
                <Image
                  src={img.url}
                  alt={item.title}
                  fill
                  sizes="(min-width: 768px) 400px, 100vw"
                  className="object-cover"
                  priority={i === 0}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-stone-300 text-sm text-stone-400">
            No photos yet
          </div>
        )}
      </div>

      <div>
        {!item.is_active && (
          <p className="mb-3 inline-block rounded-full bg-stone-200 px-3 py-1 text-xs font-medium text-stone-600">
            Delisted
          </p>
        )}
        <h1 className="text-2xl font-semibold">{item.title}</h1>
        <p className="mt-1 text-sm text-stone-500">
          {item.category} · Size {item.size}
        </p>
        <p className="mt-4 text-2xl font-semibold text-stone-900">
          ${item.price_per_day.toFixed(2)}
          <span className="text-sm font-normal text-stone-500"> / day</span>
        </p>
        <p className="mt-4 whitespace-pre-wrap text-stone-700">{item.description}</p>

        <div className="mt-6 rounded-lg border border-stone-200 p-4">
          <p className="text-sm text-stone-500">Listed by</p>
          <Link
            href={`/profile/${item.owner.id}`}
            className="font-medium text-stone-900 hover:text-stone-600"
          >
            {item.owner.full_name || "ClosetSwap user"}
          </Link>
          <p className="text-sm text-stone-500">
            {item.owner.rating_count > 0
              ? `★ ${item.owner.rating_avg.toFixed(1)} (${item.owner.rating_count} rating${item.owner.rating_count === 1 ? "" : "s"})`
              : "No ratings yet"}
          </p>
        </div>

        {isOwner ? (
          <ItemOwnerActions itemId={item.id} isActive={item.is_active} />
        ) : !currentUser ? (
          <p className="mt-6 text-sm text-stone-600">
            <Link href="/login" className="font-medium text-stone-900 hover:text-stone-800">
              Log in
            </Link>{" "}
            to request this item.
          </p>
        ) : item.is_active ? (
          <BookingRequestForm itemId={item.id} pricePerDay={item.price_per_day} />
        ) : (
          <p className="mt-6 text-sm text-stone-500">This item isn&apos;t available right now.</p>
        )}
      </div>
    </div>
  );
}
