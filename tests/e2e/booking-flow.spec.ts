import fs from "node:fs";
import { test, expect } from "@playwright/test";
import { adminClient, createConfirmedUser, login, logout, TEST_IMAGE_PATH } from "./helpers";

// Uploads a real file to the item-images bucket so the seeded row satisfies
// next.config.ts's remotePatterns (Supabase Storage only) the same way a
// real listing does - an external placeholder URL would 500 every page
// that renders it.
async function seedItem(ownerId: string, title: string) {
  const path = `${ownerId}/${crypto.randomUUID()}-seed.png`;
  const { error: uploadError } = await adminClient.storage
    .from("item-images")
    .upload(path, fs.readFileSync(TEST_IMAGE_PATH), { contentType: "image/png" });
  if (uploadError) throw uploadError;
  const { data: pub } = adminClient.storage.from("item-images").getPublicUrl(path);

  const { data: item, error } = await adminClient
    .from("items")
    .insert({
      owner_id: ownerId,
      title,
      description: "Seeded for e2e testing.",
      category: "Dresses",
      size: "M",
      price_per_day: 40,
    })
    .select("id")
    .single();
  if (error) throw error;
  await adminClient
    .from("item_images")
    .insert({ item_id: item.id, url: pub.publicUrl, sort_order: 0 });
  return item.id as string;
}

test.describe("booking lifecycle", () => {
  test("full pending -> approved -> paid -> in_progress -> returned flow", async ({ page }) => {
    const owner = await createConfirmedUser("Flow Owner", "flowowner");
    const renter = await createConfirmedUser("Flow Renter", "flowrenter");
    const itemId = await seedItem(owner.id, `E2E Flow Item ${Date.now()}`);

    // Renter requests a booking.
    await login(page, renter.email, renter.password);
    await page.goto(`/items/${itemId}`);
    const today = new Date();
    const start = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const end = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await page.locator("#startDate").fill(start);
    await page.locator("#endDate").fill(end);
    await page.getByRole("button", { name: "Request to rent" }).click();
    await page.waitForURL(/\/bookings\/[0-9a-f-]+$/);
    const bookingUrl = page.url();
    await expect(page.getByText("Pending approval")).toBeVisible();

    // Renter cannot approve their own request.
    await expect(page.getByRole("button", { name: "Approve" })).toHaveCount(0);
    await logout(page);

    // Owner approves.
    await login(page, owner.email, owner.password);
    await page.goto(bookingUrl);
    await page.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByText("Approved — awaiting payment")).toBeVisible();

    // Owner cannot pay their own booking.
    await expect(page.getByRole("button", { name: /pay now/i })).toHaveCount(0);
    await logout(page);

    // Renter pays.
    await login(page, renter.email, renter.password);
    await page.goto(bookingUrl);
    await page.getByRole("button", { name: /pay now/i }).click();
    await expect(page.getByText("Paid — awaiting pickup")).toBeVisible();
    await logout(page);

    // Owner marks picked up, then returned.
    await login(page, owner.email, owner.password);
    await page.goto(bookingUrl);
    await page.getByRole("button", { name: "Mark picked up" }).click();
    await expect(page.getByText("Rental in progress")).toBeVisible();
    await page.getByRole("button", { name: "Mark returned" }).click();
    await expect(page.getByText("Returned", { exact: true })).toBeVisible();

    // Owner rates the renter.
    await page.getByRole("button", { name: "5 stars" }).click();
    await page.getByRole("button", { name: "Submit rating" }).click();
    await expect(page.getByText(`You rated ${renter.fullName}`)).toBeVisible();
  });

  test("owner rejects a pending request", async ({ page }) => {
    const owner = await createConfirmedUser("Reject Owner", "rejowner");
    const renter = await createConfirmedUser("Reject Renter", "rejrenter");
    const itemId = await seedItem(owner.id, `E2E Reject Item ${Date.now()}`);

    await login(page, renter.email, renter.password);
    await page.goto(`/items/${itemId}`);
    const start = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await page.locator("#startDate").fill(start);
    await page.locator("#endDate").fill(start);
    await page.getByRole("button", { name: "Request to rent" }).click();
    await page.waitForURL(/\/bookings\/[0-9a-f-]+$/);
    const bookingUrl = page.url();
    await logout(page);

    await login(page, owner.email, owner.password);
    await page.goto(bookingUrl);
    await page.getByRole("button", { name: "Reject" }).click();
    await expect(page.getByText("Rejected", { exact: true })).toBeVisible();
  });

  test("overlapping dates are rejected", async ({ page }) => {
    const owner = await createConfirmedUser("Overlap Owner", "ovowner");
    const renter = await createConfirmedUser("Overlap Renter", "ovrenter");
    const itemId = await seedItem(owner.id, `E2E Overlap Item ${Date.now()}`);

    const start = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const end = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // First booking gets approved.
    await login(page, renter.email, renter.password);
    await page.goto(`/items/${itemId}`);
    await page.locator("#startDate").fill(start);
    await page.locator("#endDate").fill(end);
    await page.getByRole("button", { name: "Request to rent" }).click();
    await page.waitForURL(/\/bookings\/[0-9a-f-]+$/);
    await logout(page);

    await login(page, owner.email, owner.password);
    await page.goto("/dashboard");
    // The dashboard shows this item's title twice - once as a listing link
    // (/items/:id) and once as a booking-request link (/bookings/:id).
    // Scope by href so we land on the booking, not the item page.
    await page.locator('a[href^="/bookings/"]', { hasText: "Overlap Item" }).click();
    await page.getByRole("button", { name: "Approve" }).click();
    // Wait for the transition to actually land before navigating away -
    // otherwise logout()'s own POST can race and cancel this one in flight.
    await expect(page.getByText("Approved — awaiting payment")).toBeVisible();
    await logout(page);

    // A second renter tries to book overlapping dates.
    const renter2 = await createConfirmedUser("Overlap Renter Two", "ovrenter2");
    await login(page, renter2.email, renter2.password);
    await page.goto(`/items/${itemId}`);
    await page.locator("#startDate").fill(start);
    await page.locator("#endDate").fill(end);
    await page.getByRole("button", { name: "Request to rent" }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText(/already booked/i);
  });
});
