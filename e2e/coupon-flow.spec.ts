import { test, expect } from "@playwright/test";
import { registerNewCustomer, adminCredentials, addCurrentProductToBag } from "./helpers";

const { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } = adminCredentials();

test("coupon: applied in the cart, carried to checkout", async ({
  page,
}) => {
  const couponCode = `E2ECOUPON${Date.now()}`;

  // Create the coupon as admin.
  await page.goto("/account");
  await page.getByLabel("E-posta").fill(ADMIN_EMAIL);
  await page.getByLabel("Parola").fill(ADMIN_PASSWORD);
  await page.locator("form").getByRole("button", { name: "Giriş Yap" }).click();
  await expect(page.getByRole("heading", { name: /Tekrar hoş geldin,/ })).toBeVisible();

  await page.goto("/admin/campaigns");
  await page.getByLabel("Kupon kodu").fill(couponCode);
  await page.getByLabel("İndirim oranı (%)").fill("10");
  await page.getByRole("button", { name: "Kupon Oluştur" }).click();
  await expect(page.getByText(couponCode)).toBeVisible();

  await page.goto("/account");
  await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes("/api/auth/logout") && res.request().method() === "POST"
    ),
    page.getByRole("button", { name: "Çıkış Yap" }).first().click(),
  ]);

  // A fresh customer applies it in the cart; checkout keeps it.
  await registerNewCustomer(page, {
    name: "Coupon Test",
    email: `e2e-coupon-${Date.now()}@example.com`,
  });

  await page.goto("/products");
  await page.locator("a[href^='/products/']").first().click();
  await page.waitForURL(/\/products\/\d+$/);
  await addCurrentProductToBag(page);

  await page.goto("/cart");
  await page.getByRole("button", { name: "İndirim kodun var mı?" }).click();
  await page.getByLabel("İndirim kodu").fill(couponCode);
  await page.getByRole("button", { name: "Uygula" }).click();
  await expect(page.locator("main").getByText("İndirim", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Ödemeye Geç" }).first().click();
  await expect(page).toHaveURL("/checkout");
  const summary = page.locator("aside");
  await expect(summary.getByText(couponCode).first()).toBeVisible();
  await expect(summary.getByText("İndirim")).toBeVisible();
});

test("coupon: an unknown code is rejected at checkout", async ({ page }) => {
  await registerNewCustomer(page, {
    name: "Coupon Test",
    email: `e2e-coupon-bad-${Date.now()}@example.com`,
  });

  await page.goto("/products");
  await page.locator("a[href^='/products/']").first().click();
  await page.waitForURL(/\/products\/\d+$/);
  await addCurrentProductToBag(page);

  await page.goto("/checkout");
  await page.getByPlaceholder("İndirim kodu").fill("OLMAYAN-KOD");
  await page.getByRole("button", { name: "Uygula" }).click();

  await expect(page.getByText("Geçersiz kupon kodu.")).toBeVisible();
});
