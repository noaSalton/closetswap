"use client";

import { useMemo, useState, useTransition } from "react";
import { createBooking } from "@/lib/actions/bookings";
import { rentalDays, rentalTotal } from "@/lib/pricing";
import { inputClass, labelClass } from "@/components/form-styles";
import { FormError } from "@/components/FormError";

export function BookingRequestForm({
  itemId,
  pricePerDay,
}: {
  itemId: string;
  pricePerDay: number;
}) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const valid = startDate && endDate && endDate >= startDate;
  const days = valid ? rentalDays(startDate, endDate) : 0;
  const total = valid ? rentalTotal(startDate, endDate, pricePerDay) : 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createBooking({ itemId, startDate, endDate });
      if (result.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-lg border border-stone-200 p-4">
      <h2 className="font-medium text-stone-900">Request to rent</h2>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="startDate" className={labelClass}>
            From
          </label>
          <input
            id="startDate"
            type="date"
            min={today}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="endDate" className={labelClass}>
            To
          </label>
          <input
            id="endDate"
            type="date"
            min={startDate || today}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
            className={inputClass}
          />
        </div>
      </div>
      {valid && (
        <p className="text-sm text-stone-600">
          {days} day{days === 1 ? "" : "s"} · <span className="font-medium">${total.toFixed(2)}</span> total
        </p>
      )}
      <FormError message={error} />
      <button
        type="submit"
        disabled={!valid || isPending}
        className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Sending request..." : "Request to rent"}
      </button>
    </form>
  );
}
