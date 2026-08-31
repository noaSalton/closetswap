import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase's email templates (confirm signup, magic link, password
// reset, email change) all link here by default:
// {{ .SiteURL }}/auth/confirm?token_hash=...&type=...&next=...
// This route exchanges that one-time token for a real session (setting
// the auth cookies) and then redirects into the app. Without it, every
// confirmation link 404s - Supabase never had a page to send the user to
// on our end, only a token to hand off.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=confirmation-failed", origin));
}
