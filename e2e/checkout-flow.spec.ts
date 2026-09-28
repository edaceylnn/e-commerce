import { test, expect } from "@playwright/test";
import { registerNewCustomer, fillAndSaveAddress, addCurrentProductToBag } from "./helpers";

// Stops at the review step, before "Ödemeyi Başlat" — that click triggers a
// real server-to-server call to iyzico's sandbox, which this suite
// deliberately never does (see src/lib/iyzico.test.ts and
// src/app/checkout/callback/route.test.ts for the payment-logic coverage).
test("checkout: address form leads to a review page with the right total", async ({
  page,
}) => {
  await registerNewCustomer(page, {
    name: "Checkout Test",
    email: `e2e-checkout-${Date.now()}@example.com`,
  });

  await page.goto("/products");
  await page.locator("a[href^='/products/']").first().click();
  await page.waitForURL(/\/products\/\d+$/);
  const productTitle = (await page.locator("h1").textContent())?.trim() ?? "";
  await addCurrentProductToBag(page);

  await page.goto("/cart");
  await page.getByRole("link", { name: "Ödemeye Geç" }).click();
  await expect(page).toHaveURL("/checkout/address");

  // Shipping address — "Fatura adresim teslimat adresimle aynı" stays
  // checked by default, so saving one address is enough to continue.
  await fillAndSaveAddress(page);
  await page.getByRole("button", { name: "Devam Et" }).click();

  await expect(page).toHaveURL(/\/checkout\/review\?shippingAddressId=/);
  await expect(page.getByText(productTitle)).toBeVisible();
  await expect(page.getByText("Toplam", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Ödemeyi Başlat" })
  ).toBeVisible();
});

test("checkout: a different billing address is recorded separately", async ({
  page,
}) => {
  await registerNewCustomer(page, {
    name: "Billing Test",
    email: `e2e-billing-${Date.now()}@example.com`,
  });

  await page.goto("/products");
  await page.locator("a[href^='/products/']").first().click();
  await page.waitForURL(/\/products\/\d+$/);
  await addCurrentProductToBag(page);

  await page.goto("/cart");
  await page.getByRole("link", { name: "Ödemeye Geç" }).click();

  await fillAndSaveAddress(page, { fullName: "Ev Adresim" });

  await page
    .getByText("Fatura adresim teslimat adresimle aynı")
    .click();
  // Wait for the billing section to actually mount before touching its
  // controls — clicking too early can hit the shipping picker's own "Yeni
  // adres ekle" instead (only one match at that point) and reopen its form.
  await expect(page.getByRole("heading", { name: "Fatura Adresi", exact: true })).toBeVisible();
  // The billing picker shows the saved shipping address as a reusable
  // option first — reveal the "add new" form to create a distinct one.
  // (Two "Yeni adres ekle" buttons exist now — shipping's and billing's —
  // the billing section is the one rendered last.)
  await page.getByRole("button", { name: "Yeni adres ekle" }).last().click();
  await fillAndSaveAddress(page, {
    fullName: "Şirket Adresim",
    line1: "Ofis Sokak No:2",
  });

  await page.getByRole("button", { name: "Devam Et" }).click();
  await page.waitForURL(/\/checkout\/review\?/);

  const [, shippingId, billingId] =
    page.url().match(/shippingAddressId=([^&]+)&billingAddressId=([^&]+)/) ?? [];
  expect(shippingId).toBeTruthy();
  expect(billingId).toBeTruthy();
  expect(shippingId).not.toBe(billingId);

  await expect(page.getByText("Şirket Adresim")).toBeVisible();
  await expect(page.getByText("Ev Adresim")).toBeVisible();
});
