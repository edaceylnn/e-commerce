import {
  esc,
  orderCancelledEmail,
  orderConfirmedEmail,
  orderShippedEmail,
  passwordResetEmail,
  refundEmail,
  type OrderEmailData,
} from "@/lib/email/templates";

const order: OrderEmailData = {
  customerName: "Ayşe Yılmaz",
  orderNumber: "BS-20260930-ABC123",
  orderUrl: "https://edacey.example/account/orders/BS-20260930-ABC123",
  items: [
    { title: "Yüksek Bel Tayt", detail: "Siyah / M", quantity: 1, lineTotal: 1290 },
    { title: "Spor Sütyen", detail: null, quantity: 2, lineTotal: 1380 },
  ],
  subtotal: 2670,
  discount: 267,
  shipping: 0,
  total: 2403,
  address: "Ayşe Yılmaz, Atatürk Cad. No:12, Konak / İzmir",
};

describe("email templates", () => {
  it("escapes everything a person typed", () => {
    expect(esc(`<script>alert("x")</script> & 'y'`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;"
    );
    const email = orderConfirmedEmail({
      ...order,
      customerName: "<img src=x onerror=alert(1)>",
      items: [{ title: "<b>Tayt</b>", detail: null, quantity: 1, lineTotal: 10 }],
    });
    expect(email.html).not.toContain("<img src=x");
    expect(email.html).not.toContain("<b>Tayt</b>");
    expect(email.html).toContain("&lt;b&gt;Tayt&lt;/b&gt;");
  });

  it("confirms the order with its lines, totals and a link", () => {
    const email = orderConfirmedEmail(order);
    expect(email.subject).toBe("Siparişin alındı — #BS-20260930-ABC123");
    expect(email.html).toContain("Merhaba Ayşe,");
    expect(email.html).toContain("Siyah / M");
    expect(email.html).toContain("Ücretsiz"); // free shipping
    expect(email.html).toContain(order.orderUrl);
    expect(email.text).toContain("Toplam: ₺2.403,00");
    expect(email.text).toContain("İndirim: −₺267,00");
  });

  it("gives tracking and the invoice when shipped", () => {
    const email = orderShippedEmail({
      ...order,
      carrier: "Yurtiçi Kargo",
      trackingNumber: "123456",
      trackingUrl: "https://kargo.example/123456",
      invoiceUrl: "https://edacey.example/fatura/inv1",
    });
    expect(email.html).toContain("https://kargo.example/123456");
    expect(email.html).toContain("https://edacey.example/fatura/inv1");
    expect(email.text).toContain("Takip numarası: 123456");
  });

  it("only promises a refund for a paid order", () => {
    expect(orderCancelledEmail({ ...order, paid: true }).text).toContain("iadesi başlatıldığında");
    expect(orderCancelledEmail({ ...order, paid: false }).text).toContain("herhangi bir tutar çekilmedi");
  });

  it("names the refunded items and amount", () => {
    const partial = refundEmail({ ...order, refundedItems: ["Spor Sütyen"], amount: 1242, full: false });
    expect(partial.text).toContain("Şu ürünler: Spor Sütyen");
    expect(partial.text).toContain("₺1.242,00");
    expect(refundEmail({ ...order, refundedItems: [], amount: 2403, full: true }).text).toContain("Siparişinin tamamı");
  });

  it("sends the reset link with its lifetime", () => {
    const email = passwordResetEmail({ name: "Ayşe", resetUrl: "https://x/account/sifre-sifirla?token=abc", validMinutes: 30 });
    expect(email.html).toContain("https://x/account/sifre-sifirla?token=abc");
    expect(email.text).toContain("30 dakika");
  });
});
