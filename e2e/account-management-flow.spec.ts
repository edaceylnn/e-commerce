import { test, expect } from "@playwright/test";
import { registerNewCustomer } from "./helpers";

test("address book: add, edit, and delete a saved address", async ({ page }) => {
  await registerNewCustomer(page, {
    name: "Address Book Test",
    email: `e2e-addressbook-${Date.now()}@example.com`,
  });

  await page.goto("/account/adresler");
  await page.getByRole("button", { name: "+ Yeni Adres Ekle" }).click();
  await page.getByLabel("Ad Soyad").fill("Ev Adresim");
  await page.getByLabel("Telefon").fill("05551234567");
  await page.getByLabel("Adres *", { exact: true }).fill("Test Sokak No:1");
  await page.getByLabel("İlçe").fill("Kadıköy");
  await page.getByLabel("İl *", { exact: true }).selectOption("İstanbul");
  await page.getByLabel("Posta Kodu").fill("34710");
  await page.getByRole("button", { name: "Adresi Kaydet" }).click();

  // Only one address exists at this point, so unscoped role locators are
  // unambiguous.
  await expect(page.getByText("Ev Adresim")).toBeVisible();

  await page.getByRole("button", { name: "Düzenle" }).click();
  await page.getByLabel("Ad Soyad").fill("Ev Adresim (Güncellendi)");
  await page.getByRole("button", { name: "Güncelle" }).click();
  await expect(page.getByText("Ev Adresim (Güncellendi)")).toBeVisible();

  // Delete goes through a custom confirmation modal, not window.confirm.
  await page.getByRole("button", { name: "Sil", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Sil" }).click();
  await expect(page.getByText("Ev Adresim (Güncellendi)")).not.toBeVisible();
});

test("profile: update name/email and change password", async ({ page }) => {
  const email = `e2e-profile-${Date.now()}@example.com`;
  const oldPassword = "Some-password1";
  const newPassword = "A-new-password1";

  await registerNewCustomer(page, { name: "Profile Test", email, password: oldPassword });

  await page.goto("/account/profil");
  await expect(page.getByLabel("Soyad")).toHaveValue("Test");
  await page.getByLabel("Soyad").fill("Test Updated");
  await page.getByRole("button", { name: "Değişiklikleri Kaydet" }).click();
  await expect(page.getByText("Bilgileriniz başarıyla güncellendi.")).toBeVisible();

  await page.goto("/account/sifre-degistir");
  await page.getByLabel("Mevcut Şifre").fill(oldPassword);
  await page.getByLabel("Yeni Şifre *", { exact: true }).fill(newPassword);
  await page.getByLabel("Yeni Şifre (Tekrar)").fill(newPassword);
  await page.getByRole("button", { name: "Şifremi Değiştir" }).click();
  await expect(page.getByText("Şifreniz başarıyla değiştirildi.")).toBeVisible();

  await page.goto("/account");
  await expect(page.getByRole("heading", { name: /Tekrar hoş geldin, Profile/ })).toBeVisible();
  await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes("/api/auth/logout") && res.request().method() === "POST"
    ),
    page.getByRole("button", { name: "Çıkış Yap" }).first().click(),
  ]);

  // Old password no longer works, new one does.
  await page.getByLabel("E-posta").fill(email);
  await page.getByLabel("Parola").fill(oldPassword);
  await page.locator("form").getByRole("button", { name: "Giriş Yap" }).click();
  await expect(page.getByText("E-posta veya parola hatalı.")).toBeVisible();

  await page.getByLabel("Parola").fill(newPassword);
  await page.locator("form").getByRole("button", { name: "Giriş Yap" }).click();
  await expect(page.getByRole("heading", { name: /Tekrar hoş geldin,/ })).toBeVisible();
});
