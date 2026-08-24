import { z } from "zod";
import { ITEM_CATEGORIES, ITEM_SIZES } from "@/lib/types";

export const createItemSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(120),
  description: z.string().trim().max(2000, "Description is too long").default(""),
  category: z.enum(ITEM_CATEGORIES, { error: "Choose a category" }),
  size: z.enum(ITEM_SIZES, { error: "Choose a size" }),
  pricePerDay: z.coerce
    .number({ error: "Enter a price" })
    .positive("Price must be greater than 0")
    .max(100000, "Price is too high"),
  imageUrls: z
    .array(z.string().url())
    .min(1, "Add at least one photo")
    .max(6, "You can add up to 6 photos"),
});

export const updateItemSchema = createItemSchema.omit({ imageUrls: true });

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
