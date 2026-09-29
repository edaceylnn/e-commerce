import { test, expect } from "@playwright/test";
import { rm } from "fs/promises";
import path from "path";
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

  test("sidebar shows the everyday screens and tucks the rest away", async ({ page }) => {
    const aside = page.locator("aside");
    for (const label of ["Genel Bakış", "Ürünler", "Siparişler"]) {
      await expect(aside.getByRole("link", { name: label, exact: true })).toBeVisible();
    }
    await expect(aside.getByRole("link", { name: "Kampanyalar" })).not.toBeVisible();
    await aside.getByRole("button", { name: "Diğer" }).click();
    await expect(aside.getByRole("link", { name: "Kampanyalar" })).toBeVisible();
  });

  test("new product lands on the editor with live completeness warnings", async ({ page }) => {
    const title = `E2E Spor Tayt ${Date.now()}`;

    await page.goto("/admin/products/new");
    await page.getByPlaceholder("örn. Yüksek Bel Toparlayıcı Spor Tayt").fill(title);
    await page.getByLabel("Fiyat (₺)").fill("49.90");
    await page.locator('input[type="file"]').setInputFiles("public/products/green-legging.jpg");
    const uploaded = page.locator('img[src^="/uploads/products/"]').first();
    await expect(uploaded).toBeVisible();
    // The stored file is actually served back, not just referenced.
    await expect.poll(() => uploaded.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    const uploadedUrl = (await uploaded.getAttribute("src"))!;

    const audit = page.locator("aside").filter({ hasText: "Kart kontrolü" });
    await expect(audit.getByText("Açıklama yok", { exact: true })).toBeVisible();
    await expect(audit.getByText("Görsel alt metni yok (1/1 görselde)")).toBeVisible();

    await page.getByRole("button", { name: "Ürünü oluştur" }).click();
    await expect(page).toHaveURL(/\/admin\/products\/\d+\/edit$/);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();

    // Fixing a field clears its warning immediately, before saving.
    await page.getByPlaceholder(/Alt metin/).fill("Yeşil spor tayt, önden görünüm");
    await expect(audit.getByText(/Görsel alt metni yok/)).not.toBeVisible();
    await expect(audit.getByText("Açıklama yok", { exact: true })).toBeVisible();

    const productId = page.url().match(/products\/(\d+)\/edit/)![1];
    const res = await page.request.delete(`/api/admin/products/${productId}`);
    expect(res.ok()).toBe(true);
    await rm(path.join("public", uploadedUrl), { force: true });
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
