import { type Page, expect } from "@playwright/test";
import { config } from "dotenv";

// Admin e2e flows log in with the seeded admin account. Its credentials live
// only in .env.local (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD, same values
// prisma/seed.ts uses) — never hardcoded here, so they don't end up in git.
config({ path: ".env.local", quiet: true });

export function adminCredentials(): { email: string; password: string } {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set (e.g. in .env.local) to run the admin e2e flows."
    );
  }
  return { email, password };
}

export async function registerNewCustomer(
  page: Page,
  { name, email, password = "some-password" }: { name: string; email: string; password?: string }
) {
  await page.goto("/account");
  await page.getByRole("button", { name: "Kayıt Ol", exact: true }).click();
  await page.getByLabel("İsim").fill(name);
  await page.getByLabel("E-posta").fill(email);
  await page.getByLabel("Parola").fill(password);
  await page.locator("form").getByRole("button", { name: "Kayıt Ol" }).click();
  await expect(page.getByRole("heading", { name: /Tekrar hoş geldin,/ })).toBeVisible();
}

// Fills whichever AddressForm is currently on screen (shipping or billing —
// only one is visible at a time on /checkout/address) and saves it. Does
// NOT click the outer "Devam Et" continue button.
export async function fillAndSaveAddress(
  page: Page,
  overrides: Partial<{
    fullName: string;
    phone: string;
    line1: string;
    district: string;
    city: string;
    postalCode: string;
  }> = {}
) {
  // Scoped to the most-recently-opened <AddressForm> (a <form> element) —
  // on the checkout page two AddressPicker instances (shipping + billing)
  // can each have their own open form at once, so an unscoped page-wide
  // locator is ambiguous. The last address form in DOM order is whichever
  // one was just revealed by a "Yeni adres ekle" click. (Not just the last
  // <form>: the header's search form can mount after it and take that spot.)
  //
  // Required fields render their label as "Label *" (see FormField) — exact
  // matches need the asterisk; substring matches ("Telefon", "İlçe", ...)
  // are safe as long as they aren't a prefix of another field's label,
  // which is why "Adres" and "İl" need exact + the literal "*" here.
  const form = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Adresi Kaydet" }) })
    .last();
  await form.getByLabel("Ad Soyad").fill(overrides.fullName ?? "Checkout Test");
  await form.getByLabel("Telefon").fill(overrides.phone ?? "05551234567");
  await form.getByLabel("Adres *", { exact: true }).fill(overrides.line1 ?? "Test Sokak No:1");
  await form.getByLabel("İlçe").fill(overrides.district ?? "Kadıköy");
  await form.getByLabel("İl *", { exact: true }).selectOption(overrides.city ?? "İstanbul");
  await form.getByLabel("Posta Kodu").fill(overrides.postalCode ?? "34710");
  await form.getByRole("button", { name: "Adresi Kaydet" }).click();
}

// On a product page: pick the first available size (products with variants
// require one — the button otherwise shows "Lütfen bir beden seç.") and
// press the main "Sepete ekle" button. Scoped to the first match in <main>
// because product cards further down ("Kombini tamamla") have their own
// quick-add buttons with the same label.
export async function addCurrentProductToBag(page: Page) {
  const sizes = page.locator("main").getByRole("button", { name: /^\S+ beden$/ });
  if ((await sizes.count()) > 0) await sizes.first().click();
  await page.locator("main").getByRole("button", { name: "Sepete ekle", exact: true }).first().click();
}
