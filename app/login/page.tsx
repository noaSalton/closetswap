"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn } from "@/lib/actions/auth";
import { initialActionState } from "@/lib/actions/action-state";
import { SubmitButton } from "@/components/SubmitButton";
import { FormError } from "@/components/FormError";
import { inputClass, labelClass } from "@/components/form-styles";

export default function LoginPage() {
  const [state, action] = useActionState(signIn, initialActionState);

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold">Log in</h1>
      <form action={action} className="mt-6 space-y-4">
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
            autoComplete="current-password"
            className={inputClass}
          />
        </div>
        <FormError message={state.error} />
        <SubmitButton pendingText="Logging in..." className="w-full">
          Log in
        </SubmitButton>
      </form>
      <p className="mt-4 text-sm text-stone-600">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-indigo-600 hover:text-indigo-700">
          Sign up
        </Link>
      </p>
    </div>
  );
}
