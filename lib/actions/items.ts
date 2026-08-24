"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createItemSchema, updateItemSchema } from "@/lib/validation/items";
import { firstIssueMessage } from "@/lib/validation/utils";
import type { ActionState } from "@/lib/actions/action-state";
import type { CreateItemInput, UpdateItemInput } from "@/lib/validation/items";

export async function createItem(input: CreateItemInput): Promise<ActionState> {
  const parsed = createItemSchema.safeParse(input);
  if (!parsed.success) {
    return { error: firstIssueMessage(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in to list an item." };
  }

  const { imageUrls, pricePerDay, ...rest } = parsed.data;
  const { data: item, error } = await supabase
    .from("items")
    .insert({ ...rest, price_per_day: pricePerDay, owner_id: user.id })
    .select("id")
    .single();
  if (error || !item) {
    return { error: error?.message ?? "Could not create the listing." };
  }

  const { error: imagesError } = await supabase
    .from("item_images")
    .insert(imageUrls.map((url, sort_order) => ({ item_id: item.id, url, sort_order })));
  if (imagesError) {
    return { error: imagesError.message };
  }

  revalidatePath("/");
  redirect(`/items/${item.id}`);
}

export async function updateItem(
  itemId: string,
  input: UpdateItemInput,
): Promise<ActionState> {
  const parsed = updateItemSchema.safeParse(input);
  if (!parsed.success) {
    return { error: firstIssueMessage(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  const { pricePerDay, ...rest } = parsed.data;
  const { error } = await supabase
    .from("items")
    .update({ ...rest, price_per_day: pricePerDay })
    .eq("id", itemId)
    .eq("owner_id", user.id);
  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/items/${itemId}`);
  revalidatePath("/dashboard");
  redirect(`/items/${itemId}`);
}

export async function addItemImages(itemId: string, urls: string[]): Promise<ActionState> {
  if (urls.length === 0) return { error: null };

  const supabase = await createClient();
  const { count } = await supabase
    .from("item_images")
    .select("id", { count: "exact", head: true })
    .eq("item_id", itemId);
  const startOrder = count ?? 0;

  const { error } = await supabase
    .from("item_images")
    .insert(urls.map((url, i) => ({ item_id: itemId, url, sort_order: startOrder + i })));
  if (error) return { error: error.message };

  revalidatePath(`/items/${itemId}`);
  revalidatePath(`/items/${itemId}/edit`);
  return { error: null };
}

export async function deleteItemImage(imageId: string, itemId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("item_images").delete().eq("id", imageId);
  if (error) return { error: error.message };

  revalidatePath(`/items/${itemId}`);
  revalidatePath(`/items/${itemId}/edit`);
  return { error: null };
}

export async function setItemActive(itemId: string, isActive: boolean): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { error } = await supabase
    .from("items")
    .update({ is_active: isActive })
    .eq("id", itemId)
    .eq("owner_id", user.id);
  if (error) return { error: error.message };

  revalidatePath(`/items/${itemId}`);
  revalidatePath("/dashboard");
  return { error: null };
}

export async function deleteItem(itemId: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { count } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("item_id", itemId);
  if (count && count > 0) {
    return {
      error: "This item has booking history and can't be deleted. Delist it instead.",
    };
  }

  const { error } = await supabase
    .from("items")
    .delete()
    .eq("id", itemId)
    .eq("owner_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
