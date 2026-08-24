"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { createItem, updateItem, addItemImages, deleteItemImage } from "@/lib/actions/items";
import { uploadItemImages } from "@/lib/supabase/storage";
import { ITEM_CATEGORIES, ITEM_SIZES, type ItemCategory, type ItemSize } from "@/lib/types";
import { inputClass, labelClass } from "@/components/form-styles";
import { FormError } from "@/components/FormError";

type ExistingImage = { id: string; url: string };

export function ItemForm({
  mode,
  userId,
  itemId,
  defaultValues,
  existingImages = [],
}: {
  mode: "create" | "edit";
  userId: string;
  itemId?: string;
  defaultValues?: {
    title: string;
    description: string;
    category: ItemCategory;
    size: ItemSize;
    pricePerDay: number;
  };
  existingImages?: ExistingImage[];
}) {
  const [title, setTitle] = useState(defaultValues?.title ?? "");
  const [description, setDescription] = useState(defaultValues?.description ?? "");
  const [category, setCategory] = useState<ItemCategory>(
    defaultValues?.category ?? ITEM_CATEGORIES[0],
  );
  const [size, setSize] = useState<ItemSize>(defaultValues?.size ?? ITEM_SIZES[0]);
  const [price, setPrice] = useState(defaultValues?.pricePerDay?.toString() ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [images, setImages] = useState(existingImages);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const totalPhotos = images.length + files.length;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        let imageUrls: string[] = [];
        if (files.length > 0) {
          imageUrls = await uploadItemImages(userId, files);
        }

        const fields = {
          title,
          description,
          category,
          size,
          pricePerDay: Number(price),
        };

        if (mode === "create") {
          const result = await createItem({ ...fields, imageUrls });
          if (result.error) setError(result.error);
        } else {
          const result = await updateItem(itemId!, fields);
          if (result.error) {
            setError(result.error);
            return;
          }
          if (imageUrls.length > 0) {
            await addItemImages(itemId!, imageUrls);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  function handleDeleteImage(imageId: string) {
    if (!itemId) return;
    setImages((prev) => prev.filter((img) => img.id !== imageId));
    startTransition(async () => {
      const result = await deleteItemImage(imageId, itemId);
      if (result.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="title" className={labelClass}>
          Title
        </label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={120}
          className={inputClass}
          placeholder="Emerald green silk evening dress"
        />
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          maxLength={2000}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="category" className={labelClass}>
            Category
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as ItemCategory)}
            className={inputClass}
          >
            {ITEM_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="size" className={labelClass}>
            Size
          </label>
          <select
            id="size"
            value={size}
            onChange={(e) => setSize(e.target.value as ItemSize)}
            className={inputClass}
          >
            {ITEM_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="price" className={labelClass}>
          Price per day ($)
        </label>
        <input
          id="price"
          type="number"
          min="1"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
          className={inputClass}
        />
      </div>

      <div>
        <span className={labelClass}>Photos</span>
        {images.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-3">
            {images.map((img) => (
              <div key={img.id} className="relative h-20 w-20 overflow-hidden rounded-md border border-stone-200">
                <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
                <button
                  type="button"
                  onClick={() => handleDeleteImage(img.id)}
                  className="absolute right-0 top-0 rounded-bl bg-black/60 px-1 text-xs text-white"
                  aria-label="Remove photo"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 6 - images.length))}
          className="mt-2 block w-full text-sm"
        />
        <p className="mt-1 text-xs text-stone-500">
          {totalPhotos}/6 photos {mode === "create" && "· add at least 1"}
        </p>
      </div>

      <FormError message={error} />

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending
          ? mode === "create"
            ? "Publishing..."
            : "Saving..."
          : mode === "create"
            ? "Publish listing"
            : "Save changes"}
      </button>
    </form>
  );
}
