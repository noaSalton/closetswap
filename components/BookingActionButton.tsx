"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FormError } from "@/components/FormError";
import type { ActionState } from "@/lib/actions/action-state";

const VARIANTS = {
  primary: "bg-stone-900 text-white hover:bg-stone-800",
  secondary: "border border-stone-300 text-stone-700 hover:bg-stone-100",
  danger: "border border-red-200 text-red-600 hover:bg-red-50",
};

export function BookingActionButton({
  action,
  bookingId,
  label,
  pendingLabel,
  variant = "primary",
}: {
  action: (bookingId: string) => Promise<ActionState>;
  bookingId: string;
  label: string;
  pendingLabel: string;
  variant?: keyof typeof VARIANTS;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await action(bookingId);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={`rounded-md px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]}`}
      >
        {isPending ? pendingLabel : label}
      </button>
      <FormError message={error} />
    </div>
  );
}
