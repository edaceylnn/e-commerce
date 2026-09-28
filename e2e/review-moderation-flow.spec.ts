import { test, expect } from "@playwright/test";
import { adminCredentials } from "./helpers";

const { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } = adminCredentials();

test("a submitted review is hidden until an admin approves it", async ({ page }) => {
  const comment = `Moderation test ${Date.now()}`;

  await page.goto("/products/3");
  await page.getByPlaceholder("Yorumun", { exact: true }).fill(comment);
  const [submitResponse] = await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes("/api/graphql") && res.request().method() === "POST"
    ),
    page.getByRole("button", { name: "Yorumu Gönder" }).click(),
  ]);
  expect(submitResponse.ok()).toBeTruthy();
  await expect(page.getByText(comment)).not.toBeVisible();

  // Approve it as admin.
  await page.goto("/account");
  await page.getByLabel("E-posta").fill(ADMIN_EMAIL);
  await page.getByLabel("Parola").fill(ADMIN_PASSWORD);
  await page.locator("form").getByRole("button", { name: "Giriş Yap" }).click();
  await expect(page.getByRole("heading", { name: /Tekrar hoş geldin,/ })).toBeVisible();

  await page.goto("/admin/reviews");
  const card = page.locator("div.rounded-2xl", { hasText: comment });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Onayla" }).click();
  await expect(page.getByText(comment)).not.toBeVisible();

  // Now publicly visible on the product page.
  await page.goto("/products/3");
  await expect(page.getByText(comment)).toBeVisible();
});
