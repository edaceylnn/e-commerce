import { test, expect } from "@playwright/test";
import { rm } from "fs/promises";
import path from "path";
import { adminCredentials } from "./helpers";

// Requires the seed admin account to exist (npx prisma db seed — see README).
const { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } = adminCredentials();

test.describe("admin panel", () => {
  // Products and uploads a test created, removed even when it fails
  // halfway — otherwise a failed run leaves "E2E …" products in the store.
  let createdProductIds: string[] = [];
  let uploadedUrls: string[] = [];
  test.afterEach(async ({ page }) => {
    for (const id of createdProductIds) await page.request.delete(`/api/admin/products/${id}`);
    for (const url of uploadedUrls) await rm(path.join("public", url), { force: true });
    createdProductIds = [];
    uploadedUrls = [];
  });

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

    // A sub-page highlights only itself, not its parent entry too.
    await page.goto("/admin/stock/movements");
    await expect(aside.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(aside.locator('[aria-current="page"]')).toHaveText("Stok Hareketleri");
  });

  test("new product lands on the editor with live completeness warnings", async ({ page }) => {
    const title = `E2E Spor Tayt ${Date.now()}`;
    // The newest product before ours: ours must be listed above it. (Not
    // "first row" — another test may be creating a product in parallel.)
    await page.goto("/admin/products");
    const previousNewest = (await page.locator("tbody tr").first().getByRole("link").first().textContent())!.trim();

    await page.goto("/admin/products/new");
    await page.getByPlaceholder("örn. Yüksek Bel Toparlayıcı Spor Tayt").fill(title);
    await page.getByLabel("Fiyat (₺)").fill("49.90");
    await page.locator('input[type="file"]').setInputFiles("public/products/green-legging.jpg");
    const uploaded = page.locator('img[src^="/uploads/products/"]').first();
    await expect(uploaded).toBeVisible();
    // The stored file is actually served back, not just referenced.
    await expect.poll(() => uploaded.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    uploadedUrls.push((await uploaded.getAttribute("src"))!);

    const audit = page.locator("aside").filter({ hasText: "Kart kontrolü" });
    await expect(audit.getByText("Açıklama yok", { exact: true })).toBeVisible();
    await expect(audit.getByText("Görsel alt metni yok (1/1 görselde)")).toBeVisible();

    await page.getByRole("button", { name: "Ürünü oluştur" }).click();
    await expect(page).toHaveURL(/\/admin\/products\/\d+\/edit$/);
    createdProductIds.push(page.url().match(/products\/(\d+)\/edit/)![1]);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();

    // Fixing a field clears its warning immediately, before saving.
    await page.getByPlaceholder(/Alt metin/).fill("Yeşil spor tayt, önden görünüm");
    await expect(audit.getByText(/Görsel alt metni yok/)).not.toBeVisible();
    await expect(audit.getByText("Açıklama yok", { exact: true })).toBeVisible();

    const editUrl = page.url();

    // From the list: the name opens the editor, the trash icon deletes
    // (after a confirmation).
    await page.goto("/admin/products");
    // Newest first: the product just created is above the previous newest.
    await expect(page.getByRole("link", { name: title, exact: true })).toBeVisible();
    const listed = await page.locator("tbody tr").evaluateAll((rows) =>
      rows.map((r) => r.querySelector("a")?.textContent?.trim() ?? "")
    );
    expect(listed.indexOf(title)).toBeLessThan(listed.indexOf(previousNewest));
    await page.getByRole("link", { name: title, exact: true }).click();
    await expect(page).toHaveURL(editUrl);

    await page.goto("/admin/products");
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: `${title} ürününü sil` }).click();
    await expect(page.getByRole("link", { name: title, exact: true })).not.toBeVisible();
  });

  test("variant stock drives the storefront's availability", async ({ page }) => {
    const title = `E2E Varyant ${Date.now()}`;

    await page.goto("/admin/products/new");
    await page.getByPlaceholder("örn. Yüksek Bel Toparlayıcı Spor Tayt").fill(title);
    await page.getByLabel("Fiyat (₺)").fill("100");
    await page.getByLabel("Yayın durumu").selectOption("ACTIVE");
    await page.locator('input[type="file"]').setInputFiles("public/products/green-legging.jpg");
    const uploaded = page.locator('img[src^="/uploads/products/"]').first();
    await expect(uploaded).toBeVisible();
    uploadedUrls.push((await uploaded.getAttribute("src"))!);

    // Picking a color and two sizes lists both combinations.
    await page.getByRole("button", { name: "Kil", exact: true }).click();
    await page.getByRole("button", { name: "S", exact: true }).click();
    await page.getByRole("button", { name: "M", exact: true }).click();
    await expect(page.getByLabel("Kil S stok")).toBeVisible();
    await expect(page.getByLabel("Kil M stok")).toBeVisible();

    await page.getByLabel("Tüm varyantlara uygulanacak stok").fill("7");
    await page.getByRole("button", { name: "Hepsine uygula" }).click();
    await expect(page.getByLabel("Kil M stok")).toHaveValue("7");
    await expect(page.getByText("Toplam stok: 14")).toBeVisible();

    await page.getByRole("button", { name: "Ürünü oluştur" }).click();
    await expect(page).toHaveURL(/\/admin\/products\/\d+\/edit$/);
    const editUrl = page.url();
    const productId = editUrl.match(/products\/(\d+)\/edit/)![1];
    createdProductIds.push(productId);
    // Blank SKUs were generated from the product id, color and size.
    await expect(page.getByLabel("Kil M SKU")).toHaveValue(`ED-${productId}-KIL-M`);

    // Only the variant has stock — the product must still be buyable.
    await page.goto(`/products/${productId}`);
    await expect(page.getByRole("button", { name: /Sepete ekle/ }).first()).toBeEnabled();

    await page.goto(editUrl);
    await page.getByLabel("Tüm varyantlara uygulanacak stok").fill("0");
    await page.getByRole("button", { name: "Hepsine uygula" }).click();
    await page.getByRole("button", { name: "Kaydet" }).click();
    await expect(page.getByText("Kaydedildi.")).toBeVisible();
    await page.goto(`/products/${productId}`);
    await expect(page.getByRole("button", { name: "Tükendi" }).first()).toBeDisabled();

    const res = await page.request.delete(`/api/admin/products/${productId}`);
    expect(res.ok()).toBe(true);
  });

  test("order page saves the internal note without touching the status", async ({ page }) => {
    await page.goto("/admin/orders");
    await page.locator('a[href^="/admin/orders/"]').first().click();
    await expect(page.getByLabel("Sipariş durumu")).toBeVisible();

    const status = page.getByLabel("Sipariş durumu");
    const statusBefore = await status.inputValue();
    const note = page.getByLabel("İç not");
    const noteBefore = await note.inputValue();
    const noteCard = page.locator("div.rounded-2xl", { has: page.getByText("İç not", { exact: true }) });

    // Wait for the PATCH itself: the button is also disabled while saving.
    const saveNote = async () => {
      const saved = page.waitForResponse(
        (r) => r.url().includes("/api/admin/orders/") && r.request().method() === "PATCH"
      );
      await noteCard.getByRole("button", { name: "Kaydet" }).click();
      expect((await saved).ok()).toBe(true);
    };

    await note.fill(`E2E not ${Date.now()}`);
    await saveNote();
    await page.reload();
    await expect(page.getByLabel("İç not")).toHaveValue(/^E2E not \d+$/);
    await expect(page.getByLabel("Sipariş durumu")).toHaveValue(statusBefore);

    // Leave the order as we found it.
    await page.getByLabel("İç not").fill(noteBefore);
    await saveNote();
  });

  test("can create, deactivate, and delete a coupon", async ({ page }) => {
    // Unique per run — a fixed code would collide with a leftover row from
    // a previous run (the coupon code column has a unique DB constraint).
    const code = `E2ETEST${Date.now()}`;

    await page.goto("/admin/campaigns");
    await page.getByLabel("Kupon kodu").fill(code);
    await page.getByLabel("İndirim oranı (%)").fill("15");
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
