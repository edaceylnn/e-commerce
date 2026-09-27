import { test, expect } from "@playwright/test";

test("wishlist: add from a product card and see it on /account/favoriler", async ({
  page,
}) => {
  const email = `e2e-wishlist-${Date.now()}@example.com`;

  await page.goto("/account");
  await page.getByRole("button", { name: "Kayıt Ol", exact: true }).click();
  await page.getByLabel("İsim").fill("Wishlist Test");
  await page.getByLabel("E-posta").fill(email);
  await page.getByLabel("Parola").fill("some-password");
  await page.locator("form").getByRole("button", { name: "Kayıt Ol" }).click();
  await expect(page.getByText("Merhaba,")).toBeVisible();

  await page.goto("/products");
  const firstCard = page.locator("a[href^='/products/']").first();
  const productTitle = (await firstCard.locator("h3").textContent())?.trim() ?? "";

  const [response] = await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes("/api/wishlist") && res.request().method() === "POST"
    ),
    firstCard.getByRole("button", { name: "Favorilere ekle" }).click(),
  ]);
  expect(response.ok()).toBeTruthy();

  await page.goto("/account/favoriler");
  await expect(page.getByText(productTitle)).toBeVisible();
});
