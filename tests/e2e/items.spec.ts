import { test, expect } from "@playwright/test";
import { createConfirmedUser, login, TEST_IMAGE_PATH } from "./helpers";

test.describe("item listings", () => {
  test("owner can create a listing and it appears on browse + detail pages", async ({ page }) => {
    const owner = await createConfirmedUser("Listing Owner", "listowner");
    const title = `E2E Test Jacket ${Date.now()}`;

    await login(page, owner.email, owner.password);
    await page.goto("/items/new");

    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Description").fill("A warm wool jacket for winter events.");
    await page.getByLabel("Category").selectOption("Outerwear");
    await page.getByLabel("Size").selectOption("L");
    await page.getByLabel("Price per day ($)").fill("30");
    await page.locator('input[type="file"]').setInputFiles(TEST_IMAGE_PATH);

    await page.locator("main form button[type=submit]").click();
    await page.waitForURL(/\/items\/[0-9a-f-]+$/);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.getByText("$30.00")).toBeVisible();

    await page.goto("/");
    await page.getByPlaceholder("Search listings...").fill(title);
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByText(title)).toBeVisible();
  });

  test("listing without a photo is rejected", async ({ page }) => {
    const owner = await createConfirmedUser("No Photo Owner", "nophoto");

    await login(page, owner.email, owner.password);
    await page.goto("/items/new");
    await page.getByLabel("Title").fill("No Photo Item");
    await page.getByLabel("Price per day ($)").fill("10");
    await page.locator("main form button[type=submit]").click();

    await expect(page.locator("main").getByRole("alert")).toContainText(/at least one photo/i);
  });

  test("owner cannot rent their own item", async ({ page }) => {
    const owner = await createConfirmedUser("Self Rent Owner", "selfrent");

    await login(page, owner.email, owner.password);
    await page.goto("/items/new");
    await page.getByLabel("Title").fill(`Self Rent Test ${Date.now()}`);
    await page.getByLabel("Price per day ($)").fill("20");
    await page.locator('input[type="file"]').setInputFiles(TEST_IMAGE_PATH);
    await page.locator("main form button[type=submit]").click();
    await page.waitForURL(/\/items\/[0-9a-f-]+$/);

    // The owner viewing their own item sees Edit/Delist/Delete, not a
    // booking request form.
    await expect(page.getByRole("button", { name: "Delist" })).toBeVisible();
    await expect(page.getByRole("button", { name: /request to rent/i })).toHaveCount(0);
  });
});
