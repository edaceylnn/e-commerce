import { test, expect } from "@playwright/test";
import { registerNewCustomer, fillAndSaveAddress, adminCredentials } from "./helpers";

const { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } = adminCredentials();

test("coupon: admin-created code applies a discount at checkout review", async ({
  page,
}) => {
  const couponCode = `E2ECOUPON${Date.now()}`;

  // Create the coupon as admin.
  await page.goto("/account");
  await page.getByLabel("E-posta").fill(ADMIN_EMAIL);
  await page.getByLabel("Parola").fill(ADMIN_PASSWORD);
  await page.locator("form").getByRole("button", { name: "Giriş Yap" }).click();
  await expect(page.getByText("Merhaba,")).toBeVisible();

  await page.goto("/admin/campaigns");
  await page.getByPlaceholder("Kod (örn. HOSGELDIN10)").fill(couponCode);
  await page.getByPlaceholder("Değer (%)").fill("10");
  await page.getByRole("button", { name: "Kupon Oluştur" }).click();
  await expect(page.getByText(couponCode)).toBeVisible();

  await page.goto("/account");
  await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes("/api/auth/logout") && res.request().method() === "POST"
    ),
    page.getByRole("button", { name: "Çıkış Yap" }).first().click(),
  ]);

  // Register a fresh customer, add a product, and reach checkout review.
  await registerNewCustomer(page, {
    name: "Coupon Test",
    email: `e2e-coupon-${Date.now()}@example.com`,
  });

  await page.goto("/products");
  await page.locator("a[href^='/products/']").first().click();
  await page.waitForURL(/\/products\/\d+$/);
  await page.getByRole("button", { name: "Sepete Ekle" }).click();

  await page.goto("/cart");
  await page.getByRole("link", { name: "Ödemeye Geç" }).click();
  await fillAndSaveAddress(page);
  await page.getByRole("button", { name: "Devam Et" }).click();
  await expect(page).toHaveURL(/\/checkout\/review\?shippingAddressId=/);

  // Apply the coupon and confirm the discount line shows up.
  await page.getByPlaceholder("Kupon kodu").fill(couponCode);
  await page.getByRole("button", { name: "Uygula" }).click();

  await expect(page.getByText("İndirim")).toBeVisible();
  await expect(page.getByText(`Kupon uygulandı: ${couponCode}`)).toBeVisible();
});

test("coupon: an unknown code is rejected", async ({ page }) => {
  await registerNewCustomer(page, {
    name: "Coupon Test",
    email: `e2e-coupon-bad-${Date.now()}@example.com`,
  });

  await page.goto("/products");
  await page.locator("a[href^='/products/']").first().click();
  await page.waitForURL(/\/products\/\d+$/);
  await page.getByRole("button", { name: "Sepete Ekle" }).click();

  await page.goto("/cart");
  await page.getByRole("link", { name: "Ödemeye Geç" }).click();
  await fillAndSaveAddress(page);
  await page.getByRole("button", { name: "Devam Et" }).click();
  await expect(page).toHaveURL(/\/checkout\/review\?shippingAddressId=/);

  await page.getByPlaceholder("Kupon kodu").fill("OLMAYAN-KOD");
  await page.getByRole("button", { name: "Uygula" }).click();

  await expect(page.getByText("Geçersiz kupon kodu.")).toBeVisible();
});
