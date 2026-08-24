import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ItemCard } from "@/components/ItemCard";
import { ITEM_CATEGORIES, ITEM_SIZES } from "@/lib/types";
import type { Item, ItemImage } from "@/lib/types";

const PAGE_SIZE = 12;

type BrowseItem = Item & { item_images: Pick<ItemImage, "url">[] };

export default async function HomePage(props: PageProps<"/">) {
  const params = await props.searchParams;
  const q = typeof params.q === "string" ? params.q.trim().replace(/[,()%]/g, "") : "";
  const category = typeof params.category === "string" ? params.category : "";
  const size = typeof params.size === "string" ? params.size : "";
  const page = Math.max(1, Number(params.page) || 1);

  const supabase = await createClient();
  let query = supabase
    .from("items")
    .select("*, item_images(url)", { count: "exact" })
    .eq("is_active", true);

  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  if (category) query = query.eq("category", category);
  if (size) query = query.eq("size", size);

  const from = (page - 1) * PAGE_SIZE;
  const { data: items, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1)
    .returns<BrowseItem[]>();

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">
        Rent clothes for the moment. Not the closet.
      </h1>
      <p className="mt-3 max-w-2xl text-stone-600">
        Browse pieces from people near you instead of buying something you&apos;ll wear once.
      </p>

      <form method="get" className="mt-6 flex flex-wrap gap-3">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search listings..."
          className="min-w-[200px] flex-1 rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <select
          name="category"
          defaultValue={category}
          className="rounded-md border border-stone-300 px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {ITEM_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          name="size"
          defaultValue={size}
          className="rounded-md border border-stone-300 px-3 py-2 text-sm"
        >
          <option value="">All sizes</option>
          {ITEM_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Search
        </button>
      </form>

      {items && items.length > 0 ? (
        <>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-4 text-sm">
              <PageLink
                params={params}
                page={page - 1}
                disabled={page <= 1}
                label="Previous"
              />
              <span className="text-stone-500">
                Page {page} of {totalPages}
              </span>
              <PageLink
                params={params}
                page={page + 1}
                disabled={page >= totalPages}
                label="Next"
              />
            </div>
          )}
        </>
      ) : (
        <p className="mt-12 text-center text-stone-500">No listings match your search yet.</p>
      )}
    </div>
  );
}

function PageLink({
  params,
  page,
  disabled,
  label,
}: {
  params: Record<string, string | string[] | undefined>;
  page: number;
  disabled: boolean;
  label: string;
}) {
  if (disabled) {
    return <span className="text-stone-300">{label}</span>;
  }
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "page" || !value) continue;
    search.set(key, Array.isArray(value) ? value[0] : value);
  }
  search.set("page", String(page));
  return (
    <Link href={`/?${search.toString()}`} className="font-medium text-indigo-600 hover:text-indigo-700">
      {label}
    </Link>
  );
}
