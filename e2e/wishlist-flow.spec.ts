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
  await expect(page.getByRole("heading", { name: /Tekrar hoş geldin,/ })).toBeVisible();

  await page.goto("/products");
  // Product cards are div.group/card: a hidden image link, the name link,
  // price and the wishlist heart.
  const firstCard = page.locator("main div.group\\/card").first();
  const productTitle = (await firstCard.getByRole("link").textContent())?.trim() ?? "";

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
