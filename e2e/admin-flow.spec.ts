import { test, expect } from "@playwright/test";
import { adminCredentials } from "./helpers";

// Requires the seed admin account to exist (npx prisma db seed — see README).
const { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } = adminCredentials();

test.describe("admin panel", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("E-posta").fill(ADMIN_EMAIL);
    await page.getByLabel("Parola").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Giriş Yap" }).click();
    await expect(page).toHaveURL(/\/admin$/);
  });

  test("dashboard links to every admin section", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Genel Bakış" })).toBeVisible();
    for (const label of [
      "Ürün Yönetimi",
      "Markalar",
      "Stok Takibi",
      "Siparişler",
      "Müşteriler",
      "Kategoriler",
      "Koleksiyonlar",
      "İçerikler",
      "Kampanyalar",
      "Analitik",
      "Yorumlar",
      "Bildirimler",
    ]) {
      await expect(
        page.locator("aside").getByRole("link", { name: label })
      ).toBeVisible();
    }
  });

  test("can create and delete a product", async ({ page }) => {
    const title = `E2E Ürün ${Date.now()}`;

    await page.goto("/admin/products/new");
    // The editor is split into sections (Ürün Bilgileri/Medya/.../Stok/...) —
    // only the active one is visible, so the test switches sections the same
    // way a real admin would before filling each section's fields.
    await page.getByPlaceholder("Başlık").fill(title);
    await page.getByPlaceholder("Açıklama").fill("E2E test açıklaması.");

    await page.getByRole("button", { name: "Fiyatlandırma" }).click();
    await page.getByPlaceholder("Fiyat (₺)").fill("49.90");

    await page.getByRole("button", { name: "Stok" }).click();
    await page.getByPlaceholder("Stok").fill("5");

    await page.getByRole("button", { name: "Medya" }).click();
    await page
      .getByPlaceholder("Kapak görseli URL")
      .fill(
        "https://cdn.dummyjson.com/product-images/beauty/red-lipstick/thumbnail.webp"
      );
    await page
      .getByPlaceholder("Görsel URL'leri (her satıra bir tane)")
      .fill(
        "https://cdn.dummyjson.com/product-images/beauty/red-lipstick/thumbnail.webp"
      );
    await page.getByRole("button", { name: "Oluştur" }).click();

    await expect(page).toHaveURL("/admin/products");
    await expect(page.getByText(title)).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await page
      .locator("tr", { hasText: title })
      .getByRole("button", { name: "Sil" })
      .click();
    await expect(page.getByText(title)).not.toBeVisible();
  });

  test("can create, deactivate, and delete a coupon", async ({ page }) => {
    // Unique per run — a fixed code would collide with a leftover row from
    // a previous run (the coupon code column has a unique DB constraint).
    const code = `E2ETEST${Date.now()}`;

    await page.goto("/admin/campaigns");
    await page.getByPlaceholder("Kod (örn. HOSGELDIN10)").fill(code);
    await page.getByPlaceholder("Değer (%)").fill("15");
    await page.getByRole("button", { name: "Kupon Oluştur" }).click();

    const row = page.locator("tr", { hasText: code });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Pasifleştir" }).click();
    await expect(row.getByText("Pasif")).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await row.getByRole("button", { name: "Sil" }).click();
    await expect(page.getByText(code)).not.toBeVisible();
  });

  test("orders screen shows the status filters", async ({ page }) => {
    await page.goto("/admin/orders");
    await expect(page.getByRole("link", { name: "Tümü" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Hazırlanıyor" })).toBeVisible();
  });
});
