import { DEMO_ACCOUNTS, demoBlockReason } from "@/lib/demo";

describe("demo mode guard", () => {
  it("lets visitors try the flows", () => {
    expect(demoBlockReason("POST", "/api/admin/orders/x/shipments")).toBeNull();
    expect(demoBlockReason("POST", "/api/admin/orders/x/invoices")).toBeNull();
    expect(demoBlockReason("PATCH", "/api/admin/products/1")).toBeNull();
    expect(demoBlockReason("GET", "/api/admin/users/x")).toBeNull();
  });

  it("blocks what would spoil the demo for the next visitor", () => {
    expect(demoBlockReason("DELETE", "/api/admin/products/1")).toMatch(/silme/);
    expect(demoBlockReason("DELETE", "/api/admin/coupons/x")).toMatch(/silme/);
    expect(demoBlockReason("PATCH", "/api/admin/users/x")).toMatch(/kullanıcılar/);
    expect(demoBlockReason("PATCH", "/api/admin/settings")).toMatch(/ayarları/);
    expect(demoBlockReason("POST", "/api/auth/password-reset")).toMatch(/şifre sıfırlama/);
    expect(demoBlockReason("POST", "/api/auth/password-reset/confirm")).toMatch(/şifre sıfırlama/);
  });

  it("protects only the shared accounts' credentials", () => {
    expect(demoBlockReason("PATCH", "/api/account/password", DEMO_ACCOUNTS.admin.email)).toMatch(/Demo hesabının/);
    expect(demoBlockReason("PATCH", "/api/account/profile", DEMO_ACCOUNTS.customer.email)).toMatch(/Demo hesabının/);
    expect(demoBlockReason("PATCH", "/api/account/password", "someone@example.com")).toBeNull();
  });
});
