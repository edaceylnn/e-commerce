import { test, expect, type Page } from "@playwright/test";
import { registerNewCustomer, fillAndSaveAddress, addCurrentProductToBag } from "./helpers";

// One-page checkout, cart to confirmation. Payment is completed only when
// the store runs its built-in payment simulator (no iyzico keys — the
// usual dev/test setup); with real keys the test stops before "Ödemeyi
// Başlat" and never calls iyzico.
async function payIfSimulated(page: Page) {
  const simulated = await page.getByText(/ödeme bir simülatörle yapılır/).isVisible();
  if (!simulated) return false;
  await page.getByRole("button", { name: "Ödemeyi Başlat" }).click();
  await expect(page.getByRole("heading", { name: "Test ödemesi" })).toBeVisible();
  await page.getByRole("button", { name: "Ödemeyi tamamla" }).click();
  await page.waitForURL(/\/checkout\/confirmation\//);
  return true;
}

async function startCheckout(page: Page, name: string) {
  await registerNewCustomer(page, { name, email: `e2e-checkout-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com` });
  await page.goto("/products");
  await page.locator("a[href^='/products/']").first().click();
  await page.waitForURL(/\/products\/\d+$/);
  const productTitle = (await page.locator("h1").textContent())?.trim() ?? "";
  await addCurrentProductToBag(page);
  await page.goto("/cart");
  await page.getByRole("link", { name: "Ödemeye Geç" }).first().click();
  await expect(page).toHaveURL("/checkout");
  return productTitle;
}

test("checkout: one page from cart to a paid order", async ({ page }) => {
  const productTitle = await startCheckout(page, "Checkout Test");

  // No address yet: nothing to pay with.
  const pay = page.getByRole("button", { name: "Ödemeyi Başlat" });
  await expect(pay).toBeDisabled();
  await expect(page.getByText("Teslimat adresini seç ya da ekle.")).toBeVisible();

  // "Fatura adresim teslimat adresimle aynı" is checked by default, so one
  // saved address is enough.
  await fillAndSaveAddress(page);
  await expect(pay).toBeEnabled();
  await expect(page.locator("aside").getByText(productTitle)).toBeVisible();
  await expect(page.locator("aside").getByText("Toplam", { exact: true })).toBeVisible();

  if (await payIfSimulated(page)) {
    await expect(page.getByText(productTitle).first()).toBeVisible();
    await expect(page.getByRole("banner").getByRole("link", { name: /Sepet \(0\)/ })).toBeVisible();
  }
});

test("checkout: a different billing address is recorded separately", async ({ page }) => {
  await startCheckout(page, "Billing Test");
  await fillAndSaveAddress(page, { fullName: "Ev Adresim" });
  // Saved and selected before the billing picker mounts (it opens straight
  // to its form while there are no saved addresses yet).
  await expect(page.getByRole("radio", { name: /Ev Adresim/ })).toBeChecked();

  await page.getByText("Fatura adresim teslimat adresimle aynı").click();
  // The billing picker offers the saved address too; add a distinct one
  // with its own "Yeni adres ekle" (the second one on the page).
  const addNew = page.getByRole("button", { name: "Yeni adres ekle" });
  await expect(addNew).toHaveCount(2);
  await addNew.last().click();
  await fillAndSaveAddress(page, { fullName: "Şirket Adresim", line1: "Ofis Sokak No:2" });
  await expect(page.getByRole("button", { name: "Ödemeyi Başlat" })).toBeEnabled();

  if (await payIfSimulated(page)) {
    // The order keeps both: shipping and billing are separate fields.
    await expect(page.getByText("Fatura Adresi", { exact: true })).toBeVisible();
    await expect(page.getByText("Şirket Adresim")).toBeVisible();
    await expect(page.getByText("Ev Adresim")).toBeVisible();
  }
});
