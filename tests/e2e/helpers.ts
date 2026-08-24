import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Page } from "@playwright/test";

function loadEnv(): Record<string, string> {
  const envPath = path.resolve(__dirname, "../../.env.local");
  const content = fs.readFileSync(envPath, "utf8");
  return Object.fromEntries(
    content
      .split("\n")
      .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      }),
  );
}

const env = loadEnv();

// Service-role client for test setup/teardown only - never used to exercise
// the app itself, so it can't hide RLS bugs in the tests that follow.
export const adminClient = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const TEST_PASSWORD = "TestPassword123!";

export function uniqueEmail(tag: string): string {
  return `noa.salton+cs${tag}${Date.now()}${Math.floor(Math.random() * 1000)}@gmail.com`;
}

// Uses admin.createUser with email_confirm:true so tests never depend on a
// real inbox - mirrors how a confirmed user looks in production, just
// without the email round-trip.
export async function createConfirmedUser(fullName: string, tag: string) {
  const email = uniqueEmail(tag);
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw error;
  return { id: data.user!.id, email, password: TEST_PASSWORD, fullName };
}

export async function makeAdmin(userId: string) {
  const { error } = await adminClient.from("profiles").update({ role: "admin" }).eq("id", userId);
  if (error) throw error;
}

export async function deleteUser(userId: string) {
  await adminClient.auth.admin.deleteUser(userId);
}

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.locator("main form button[type=submit]").click();
  await page.waitForURL("/");
}

export async function logout(page: Page) {
  await page.locator('header form button:has-text("Sign out")').click();
}

export const TEST_IMAGE_PATH = path.resolve(__dirname, "./fixtures/test-image.png");
