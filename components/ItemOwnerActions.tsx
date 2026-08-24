"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteItem, setItemActive } from "@/lib/actions/items";

export function ItemOwnerActions({
  itemId,
  isActive,
}: {
  itemId: string;
  isActive: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggleActive() {
    startTransition(async () => {
      await setItemActive(itemId, !isActive);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!window.confirm("Delete this listing? This can't be undone.")) return;
    startTransition(async () => {
      const result = await deleteItem(itemId);
      if (result.error) window.alert(result.error);
    });
  }

  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <Link
        href={`/items/${itemId}/edit`}
        className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
      >
        Edit
      </Link>
      <button
        type="button"
        onClick={toggleActive}
        disabled={isPending}
        className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-60"
      >
        {isActive ? "Delist" : "Relist"}
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
      >
        Delete
      </button>
    </div>
  );
}
