"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitRating } from "@/lib/actions/ratings";
import { FormError } from "@/components/FormError";

export function RatingForm({
  bookingId,
  counterpartyName,
}: {
  bookingId: string;
  counterpartyName: string;
}) {
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await submitRating({ bookingId, score, comment });
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-3 rounded-lg border border-stone-200 p-4">
      <h2 className="font-medium text-stone-900">Rate {counterpartyName || "your counterpart"}</h2>
      <div className="flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setScore(n)}
            aria-pressed={n <= score}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            className={`text-2xl ${n <= score ? "text-amber-500" : "text-stone-300"}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional comment"
        rows={2}
        maxLength={1000}
        className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
      />
      <FormError message={error} />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Submitting..." : "Submit rating"}
      </button>
    </form>
  );
}
