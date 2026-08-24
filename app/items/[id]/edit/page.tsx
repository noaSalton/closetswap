import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { ItemForm } from "@/components/ItemForm";
import type { Item, ItemCategory, ItemImage, ItemSize } from "@/lib/types";

type EditableItem = Item & { item_images: ItemImage[] };

export default async function EditItemPage(props: PageProps<"/items/[id]/edit">) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: item } = await supabase
    .from("items")
    .select("*, item_images(id,url,sort_order)")
    .eq("id", id)
    .order("sort_order", { referencedTable: "item_images" })
    .single<EditableItem>();

  if (!item) notFound();
  if (item.owner_id !== user.id) redirect(`/items/${id}`);

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold">Edit listing</h1>
      <div className="mt-6">
        <ItemForm
          mode="edit"
          userId={user.id}
          itemId={item.id}
          defaultValues={{
            title: item.title,
            description: item.description,
            category: item.category as ItemCategory,
            size: item.size as ItemSize,
            pricePerDay: item.price_per_day,
          }}
          existingImages={item.item_images}
        />
      </div>
    </div>
  );
}
