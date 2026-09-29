import { test, expect } from "@playwright/test";
import { addCurrentProductToBag } from "./helpers";

test("browsing, category filtering and the cart badge", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("banner").getByRole("link", { name: "EDACEY" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: /Gün içinde rahatlık/ })).toBeVisible();

  await page.getByRole("navigation").getByRole("link", { name: "Pijama" }).click();
  await expect(page).toHaveURL(/category=pijama/);

  await expect(page.getByRole("heading", { level: 1, name: "Pijama" })).toBeVisible();
});

test("adding a product to the cart updates the badge and cart page", async ({ page }) => {
  await page.goto("/products");
  await page.locator("a[href^='/products/']").first().click();
  await page.waitForURL(/\/products\/\d+$/);

  // textContent (not innerText) so CSS text-transform: uppercase on the
  // heading doesn't change the string we later search for.
  const productTitle = (await page.locator("h1").textContent())?.trim() ?? "";
  await addCurrentProductToBag(page);
  await expect(page.getByRole("button", { name: /Sepete eklendi/ })).toBeVisible();

  await page.getByRole("banner").getByRole("link", { name: "Sepet" }).click();
  await expect(page).toHaveURL("/cart");
  await expect(page.locator("main").getByRole("link", { name: productTitle }).first()).toBeVisible();
});

test("GraphQL review submission goes into moderation, not straight to the list", async ({
  page,
}) => {
  await page.goto("/products/2");

  const comment = `E2E test yorumu ${Date.now()}`;
  await page.getByPlaceholder("Yorumun", { exact: true }).fill(comment);

  const [response] = await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes("/api/graphql") && res.request().method() === "POST"
    ),
    page.getByRole("button", { name: "Yorumu Gönder" }).click(),
  ]);
  expect(response.ok()).toBeTruthy();

  await expect(
    page.getByText("Yorumun alındı. Onaylandıktan sonra burada görünecek.")
  ).toBeVisible();
  await expect(page.getByText(comment)).not.toBeVisible();
});

test("legacy /urun/:id links are redirected via proxy", async ({ page }) => {
  const response = await page.goto("/urun/1");
  await expect(page).toHaveURL(/\/products\/1$/);
  expect(response?.status()).toBeLessThan(400);
});

test("search ignores Turkish characters and case", async ({ page }) => {
  await page.goto("/products?q=sort%20takimi");
  await expect(page.getByRole("heading", { level: 1, name: /sort takimi/ })).toBeVisible();
  await expect(page.locator("a[href^='/products/']", { hasText: "Yumuşak Şort Takımı" }).first()).toBeVisible();
});
