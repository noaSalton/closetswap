"use client";

import { useSearchParams } from "next/navigation";
import { FormError } from "@/components/FormError";

export function ConfirmErrorBanner() {
  const searchParams = useSearchParams();
  if (searchParams.get("error") !== "confirmation-failed") return null;

  return (
    <div className="mt-4">
      <FormError message="That confirmation link is invalid or has expired. Try signing up again, or log in if you already confirmed." />
    </div>
  );
}
