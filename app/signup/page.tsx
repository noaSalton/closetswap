"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp } from "@/lib/actions/auth";
import { initialActionState } from "@/lib/actions/action-state";
import { SubmitButton } from "@/components/SubmitButton";
import { FormError } from "@/components/FormError";
import { inputClass, labelClass } from "@/components/form-styles";

export default function SignUpPage() {
  const [state, action] = useActionState(signUp, initialActionState);

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold">Create an account</h1>
      <form action={action} className="mt-6 space-y-4">
        <div>
          <label htmlFor="fullName" className={labelClass}>
            Full name
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            autoComplete="name"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-stone-500">At least 8 characters.</p>
        </div>
        <FormError message={state.error} />
        <SubmitButton pendingText="Creating account..." className="w-full">
          Sign up
        </SubmitButton>
      </form>
      <p className="mt-4 text-sm text-stone-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-stone-900 hover:text-stone-800">
          Log in
        </Link>
      </p>
    </div>
  );
}
