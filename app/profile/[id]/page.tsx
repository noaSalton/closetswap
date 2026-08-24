import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RatingStars } from "@/components/RatingStars";
import type { Item, ItemImage, Profile } from "@/lib/types";

type OwnedItem = Item & { item_images: Pick<ItemImage, "url">[] };
type RatingRow = { id: string; score: number; comment: string | null; rater: { full_name: string } };

export default async function PublicProfilePage(props: PageProps<"/profile/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single<Profile>();
  if (!profile) notFound();

  const [{ data: items }, { data: ratings }] = await Promise.all([
    supabase
      .from("items")
      .select("*, item_images(url)")
      .eq("owner_id", id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .returns<OwnedItem[]>(),
    supabase
      .from("ratings")
      .select("id, score, comment, rater:profiles!ratings_rater_id_fkey(full_name)")
      .eq("ratee_id", id)
      .order("created_at", { ascending: false })
      .limit(10)
      .returns<RatingRow[]>(),
  ]);

  return (
    <div>
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-200 text-xl font-medium text-stone-600">
          {(profile.full_name || "?").slice(0, 1).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-semibold">{profile.full_name || "ClosetSwap user"}</h1>
          {profile.rating_count > 0 ? (
            <p className="flex items-center gap-2 text-sm text-stone-600">
              <RatingStars score={profile.rating_avg} />
              {profile.rating_avg.toFixed(1)} ({profile.rating_count} rating
              {profile.rating_count === 1 ? "" : "s"})
            </p>
          ) : (
            <p className="text-sm text-stone-500">No ratings yet</p>
          )}
        </div>
      </div>
      {profile.bio && <p className="mt-4 max-w-xl text-stone-700">{profile.bio}</p>}

      <h2 className="mt-8 text-lg font-medium">Listings</h2>
      {items && items.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {items.map((item) => (
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
              </div>
              <p className="truncate p-2 text-sm font-medium">{item.title}</p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-stone-500">No active listings.</p>
      )}

      {ratings && ratings.length > 0 && (
        <>
          <h2 className="mt-8 text-lg font-medium">Reviews</h2>
          <div className="mt-3 space-y-3">
            {ratings.map((r) => (
              <div key={r.id} className="rounded-lg border border-stone-200 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{r.rater.full_name || "ClosetSwap user"}</span>
                  <RatingStars score={r.score} />
                </div>
                {r.comment && <p className="mt-1 text-sm text-stone-600">{r.comment}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
