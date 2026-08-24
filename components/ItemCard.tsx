import Image from "next/image";
import Link from "next/link";
import type { Item, ItemImage } from "@/lib/types";

export function ItemCard({ item }: { item: Item & { item_images: Pick<ItemImage, "url">[] } }) {
  const coverUrl = item.item_images[0]?.url;

  return (
    <Link
      href={`/items/${item.id}`}
      className="group block overflow-hidden rounded-lg border border-stone-200 bg-white transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square bg-stone-100">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={item.title}
            fill
            sizes="(min-width: 1024px) 320px, (min-width: 640px) 45vw, 90vw"
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-stone-400">
            No photo
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="truncate font-medium text-stone-900">{item.title}</p>
        <p className="text-sm text-stone-500">
          {item.category} · Size {item.size}
        </p>
        <p className="mt-1 font-medium text-indigo-600">
          ${item.price_per_day.toFixed(2)} <span className="text-sm text-stone-500">/ day</span>
        </p>
      </div>
    </Link>
  );
}
