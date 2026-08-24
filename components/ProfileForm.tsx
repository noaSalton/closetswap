"use client";

import { useActionState } from "react";
import { updateProfile } from "@/lib/actions/profile";
import { initialActionState } from "@/lib/actions/action-state";
import { SubmitButton } from "@/components/SubmitButton";
import { FormError } from "@/components/FormError";
import { inputClass, labelClass } from "@/components/form-styles";

export function ProfileForm({ fullName, bio }: { fullName: string; bio: string }) {
  const [state, action] = useActionState(updateProfile, initialActionState);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="fullName" className={labelClass}>
          Full name
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          defaultValue={fullName}
          required
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="bio" className={labelClass}>
          Bio
        </label>
        <textarea id="bio" name="bio" defaultValue={bio} rows={3} maxLength={500} className={inputClass} />
      </div>
      <FormError message={state.error} />
      <SubmitButton pendingText="Saving...">Save changes</SubmitButton>
    </form>
  );
}
