import { test, expect } from "@playwright/test";
import { createConfirmedUser, login, logout, uniqueEmail } from "./helpers";

test.describe("authentication", () => {
  // The password (minLength=8) and email (type=email) inputs carry native
  // HTML5 constraints, so a real browser blocks submission before the form
  // ever reaches the server action - these two tests confirm that
  // client-side guard rail. The server-side zod rejection for the same
  // inputs (defense in depth, reachable via a direct POST) is covered by
  // tests/unit/validation.test.ts.
  test("signup's native validation blocks a weak password from submitting", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Full name").fill("Weak Password User");
    await page.getByLabel("Email").fill(uniqueEmail("weakpw"));
    const password = page.getByLabel("Password");
    await password.fill("short");
    await page.locator("main form button[type=submit]").click();
    await expect(page).toHaveURL(/\/signup$/);
    expect(await password.evaluate((el: HTMLInputElement) => el.validity.tooShort)).toBe(true);
  });

  test("signup's native validation blocks a malformed email from submitting", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Full name").fill("Bad Email User");
    const email = page.getByLabel("Email");
    await email.fill("not-an-email");
    await page.getByLabel("Password").fill("password123");
    await page.locator("main form button[type=submit]").click();
    await expect(page).toHaveURL(/\/signup$/);
    expect(await email.evaluate((el: HTMLInputElement) => el.validity.typeMismatch)).toBe(true);
  });

  test("a confirmed user can log in and out", async ({ page }) => {
    const user = await createConfirmedUser("Auth Flow User", "authflow");

    await login(page, user.email, user.password);
    await expect(page.locator("header")).toContainText("Auth Flow User");

    await logout(page);
    await expect(page.locator("header")).toContainText("Log in");
  });

  test("login rejects the wrong password", async ({ page }) => {
    const user = await createConfirmedUser("Wrong Password User", "wrongpw");

    await page.goto("/login");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill("definitely-wrong");
    await page.locator("main form button[type=submit]").click();
    await expect(page.locator("main").getByRole("alert")).toContainText(/incorrect email or password/i);
  });
});
