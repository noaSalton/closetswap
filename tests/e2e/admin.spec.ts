import { test, expect } from "@playwright/test";
import { createConfirmedUser, login, logout, makeAdmin, TEST_IMAGE_PATH } from "./helpers";

test.describe("admin", () => {
  test("a non-admin cannot view the admin dashboard", async ({ page }) => {
    const user = await createConfirmedUser("Regular Visitor", "regvisitor");
    await login(page, user.email, user.password);
    await page.goto("/admin");
    await expect(page.getByText(/this page could not be found/i)).toBeVisible();
  });

  test("admin can block a user, and the block takes effect immediately", async ({ page }) => {
    const admin = await createConfirmedUser("Admin User", "admintest");
    await makeAdmin(admin.id);
    const target = await createConfirmedUser("Target User", "blocktarget");

    await login(page, admin.email, admin.password);
    await page.goto("/admin/users");
    // Users list is ordered by created_at desc, so the row we just created
    // is first - scope with .first() since full_name isn't unique across
    // repeated test runs against the same Supabase project.
    const row = page.locator("tr", { hasText: "Target User" }).first();
    await expect(row.getByText("Active")).toBeVisible();
    await row.getByRole("button", { name: "Block" }).click();
    await expect(row.getByText("Blocked")).toBeVisible();
    await logout(page);

    // The blocked user can still log in, but can't publish a listing.
    await login(page, target.email, target.password);
    await page.goto("/items/new");
    await page.getByLabel("Title").fill("Should be blocked");
    await page.getByLabel("Price per day ($)").fill("15");
    await page.locator('input[type="file"]').setInputFiles(TEST_IMAGE_PATH);
    await page.locator("main form button[type=submit]").click();
    await expect(page.locator("main").getByRole("alert")).toBeVisible();
  });
});
