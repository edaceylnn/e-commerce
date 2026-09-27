import { test, expect, type Page } from "@playwright/test";

// The mode-switch tab and the form's submit button show the same label
// ("Giriş Yap" / "Kayıt Ol"), so scope to the <form> to target the submit
// button unambiguously.
function submitButton(page: Page, name: string) {
  return page.locator("form").getByRole("button", { name });
}

test("register, log out, log back in, and reject a wrong password", async ({
  page,
}) => {
  const email = `e2e-${Date.now()}@example.com`;
  const password = "correct-horse-battery";

  await page.goto("/account");
  await page.getByRole("button", { name: "Kayıt Ol", exact: true }).click();
  await page.getByLabel("İsim").fill("E2E Test");
  await page.getByLabel("E-posta").fill(email);
  await page.getByLabel("Parola").fill(password);
  await submitButton(page, "Kayıt Ol").click();

  await expect(page.getByText("Merhaba,")).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();

  // The sidebar renders both a desktop and a mobile logout button (only one
  // is visible per viewport, but both exist in the DOM) — scope to the first
  // (desktop) match to avoid a Playwright strict-mode violation.
  await page.getByRole("button", { name: "Çıkış Yap" }).first().click();
  // Logging out remounts the login/register form fresh, which always
  // defaults to login mode — no need to switch tabs.
  await expect(submitButton(page, "Giriş Yap")).toBeVisible();

  // Wrong password is rejected.
  await page.getByLabel("E-posta").fill(email);
  await page.getByLabel("Parola").fill("not-the-right-password");
  await submitButton(page, "Giriş Yap").click();
  await expect(page.getByText("E-posta veya parola hatalı.")).toBeVisible();

  // Correct password logs back in.
  await page.getByLabel("Parola").fill(password);
  await submitButton(page, "Giriş Yap").click();
  await expect(page.getByText("Merhaba,")).toBeVisible();
});

test("a signed-in customer cannot reach /admin", async ({ page }) => {
  const email = `e2e-customer-${Date.now()}@example.com`;

  await page.goto("/account");
  await page.getByRole("button", { name: "Kayıt Ol", exact: true }).click();
  await page.getByLabel("İsim").fill("Sadece Müşteri");
  await page.getByLabel("E-posta").fill(email);
  await page.getByLabel("Parola").fill("some-password");
  await submitButton(page, "Kayıt Ol").click();
  await expect(page.getByText("Merhaba,")).toBeVisible();

  // The admin back-office is a separate, admin-only area — a signed-in
  // customer is sent to the admin login screen, not the customer /account
  // page, since the two portals are intentionally independent.
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("admin login rejects a valid non-admin account", async ({ page }) => {
  const email = `e2e-customer-${Date.now()}@example.com`;

  await page.goto("/account");
  await page.getByRole("button", { name: "Kayıt Ol", exact: true }).click();
  await page.getByLabel("İsim").fill("Sadece Müşteri");
  await page.getByLabel("E-posta").fill(email);
  await page.getByLabel("Parola").fill("some-password");
  await submitButton(page, "Kayıt Ol").click();
  await expect(page.getByText("Merhaba,")).toBeVisible();
  await page.request.post("/api/auth/logout");

  await page.goto("/admin/login");
  await page.getByLabel("E-posta").fill(email);
  await page.getByLabel("Parola").fill("some-password");
  await submitButton(page, "Giriş Yap").click();
  await expect(page.getByText("yönetici paneline erişim yetkisi yok")).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/login$/);
});
