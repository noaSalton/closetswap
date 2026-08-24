"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setUserBlocked } from "@/lib/actions/admin";
import type { Profile } from "@/lib/types";

export function AdminUserRow({ user }: { user: Profile }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    startTransition(async () => {
      await setUserBlocked(user.id, !user.is_blocked);
      router.refresh();
    });
  }

  return (
    <tr className="border-b border-stone-100">
      <td className="py-2 pr-4">{user.full_name || "—"}</td>
      <td className="py-2 pr-4 text-stone-500">{user.role}</td>
      <td className="py-2 pr-4 text-stone-500">
        {user.rating_count > 0 ? `${user.rating_avg.toFixed(1)} (${user.rating_count})` : "—"}
      </td>
      <td className="py-2 pr-4">
        {user.is_blocked ? (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            Blocked
          </span>
        ) : (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            Active
          </span>
        )}
      </td>
      <td className="py-2 text-right">
        {user.role !== "admin" && (
          <button
            type="button"
            onClick={toggle}
            disabled={isPending}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-60"
          >
            {user.is_blocked ? "Unblock" : "Block"}
          </button>
        )}
      </td>
    </tr>
  );
}
