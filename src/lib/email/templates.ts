// Transactional email content. Pure: data in, { subject, html, text } out.
// Email clients ignore most CSS, so the HTML is table-based with inline
// styles; every email also has a plain-text version. Everything that came
// from a person (names, addresses, product titles) is escaped.

export type RenderedEmail = { subject: string; html: string; text: string };

export type OrderEmailData = {
  customerName: string;
  orderNumber: string;
  orderUrl: string;
  items: { title: string; detail: string | null; quantity: number; lineTotal: number }[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  address: string;
};

const BRAND = "EDACEY";
const INK = "#1c1a17";
const MUTED = "#6f6559";
const LINE = "#e4e0d8";

export function esc(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export const money = (lira: number) => lira.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });

function button(label: string, href: string) {
  return `<a href="${esc(href)}" style="display:inline-block;background:${INK};color:#ffffff;text-decoration:none;padding:12px 24px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase">${esc(label)}</a>`;
}

function layout({ preheader, heading, body }: { preheader: string; heading: string; body: string }) {
  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(heading)}</title></head>
<body style="margin:0;padding:0;background:#f4f2ee;font-family:Helvetica,Arial,sans-serif;color:${INK}">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ee;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff">
<tr><td style="padding:28px 32px;border-bottom:1px solid ${LINE};font-size:18px;letter-spacing:0.2em;font-weight:bold">${BRAND}</td></tr>
<tr><td style="padding:32px">
<h1 style="margin:0 0 16px;font-size:22px;font-weight:normal;line-height:1.3">${esc(heading)}</h1>
${body}
</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid ${LINE};font-size:12px;line-height:1.6;color:${MUTED}">
Bu e-posta, ${BRAND} hesabındaki bir işlem hakkında bilgi vermek için gönderildi.<br>Sorun mu var? Bu e-postayı yanıtlayabilirsin.
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

const p = (html: string) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6">${html}</p>`;

function orderTable(d: OrderEmailData) {
  const row = (label: string, value: string, strong = false) =>
    `<tr><td style="padding:4px 0;font-size:14px;color:${strong ? INK : MUTED}${strong ? ";font-weight:bold" : ""}">${label}</td><td align="right" style="padding:4px 0;font-size:14px${strong ? ";font-weight:bold" : ""}">${value}</td></tr>`;
  const items = d.items
    .map(
      (i) =>
        `<tr><td style="padding:10px 0;border-bottom:1px solid ${LINE};font-size:14px">${esc(i.title)}${
          i.detail ? `<br><span style="color:${MUTED};font-size:12px">${esc(i.detail)}</span>` : ""
        }<br><span style="color:${MUTED};font-size:12px">Adet: ${i.quantity}</span></td><td align="right" valign="top" style="padding:10px 0;border-bottom:1px solid ${LINE};font-size:14px;white-space:nowrap">${money(i.lineTotal)}</td></tr>`
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 16px">
${items}
${row("Ara toplam", money(d.subtotal))}
${d.discount > 0 ? row("İndirim", `−${money(d.discount)}`) : ""}
${row("Kargo", d.shipping > 0 ? money(d.shipping) : "Ücretsiz")}
${row("Toplam", money(d.total), true)}
</table>
<p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:${MUTED}">Teslimat adresi: ${esc(d.address)}</p>`;
}

function orderText(d: OrderEmailData) {
  return [
    ...d.items.map((i) => `- ${i.title}${i.detail ? ` (${i.detail})` : ""} × ${i.quantity}: ${money(i.lineTotal)}`),
    `Ara toplam: ${money(d.subtotal)}`,
    ...(d.discount > 0 ? [`İndirim: −${money(d.discount)}`] : []),
    `Kargo: ${d.shipping > 0 ? money(d.shipping) : "Ücretsiz"}`,
    `Toplam: ${money(d.total)}`,
    `Teslimat adresi: ${d.address}`,
  ].join("\n");
}

const hello = (name: string) => `Merhaba ${name.split(" ")[0] || name},`;

export function orderConfirmedEmail(d: OrderEmailData): RenderedEmail {
  const heading = "Siparişin alındı";
  return {
    subject: `Siparişin alındı — #${d.orderNumber}`,
    html: layout({
      preheader: `#${d.orderNumber} numaralı siparişin hazırlanıyor.`,
      heading,
      body:
        p(esc(hello(d.customerName))) +
        p(`Ödemen onaylandı, <strong>#${esc(d.orderNumber)}</strong> numaralı siparişini hazırlamaya başladık. Kargoya verdiğimizde takip numarasıyla birlikte haber vereceğiz.`) +
        orderTable(d) +
        button("Siparişi görüntüle", d.orderUrl),
    }),
    text: `${hello(d.customerName)}\n\nÖdemen onaylandı, #${d.orderNumber} numaralı siparişini hazırlamaya başladık. Kargoya verdiğimizde haber vereceğiz.\n\n${orderText(d)}\n\nSiparişi görüntüle: ${d.orderUrl}`,
  };
}

export function orderShippedEmail(
  d: OrderEmailData & { carrier: string; trackingNumber: string; trackingUrl: string | null; invoiceUrl: string | null }
): RenderedEmail {
  const tracking = d.trackingUrl
    ? `<a href="${esc(d.trackingUrl)}" style="color:${INK}">${esc(d.trackingNumber)}</a>`
    : esc(d.trackingNumber);
  return {
    subject: `Siparişin kargoda — #${d.orderNumber}`,
    html: layout({
      preheader: `${d.carrier} ile yola çıktı. Takip no: ${d.trackingNumber}`,
      heading: "Siparişin kargoya verildi",
      body:
        p(esc(hello(d.customerName))) +
        p(`<strong>#${esc(d.orderNumber)}</strong> numaralı siparişin yola çıktı.`) +
        p(`Kargo firması: <strong>${esc(d.carrier)}</strong><br>Takip numarası: <strong>${tracking}</strong>`) +
        (d.invoiceUrl ? p(`Faturana <a href="${esc(d.invoiceUrl)}" style="color:${INK}">buradan</a> ulaşabilirsin.`) : "") +
        orderTable(d) +
        button("Kargonu takip et", `${d.orderUrl}#kargo`),
    }),
    text: `${hello(d.customerName)}\n\n#${d.orderNumber} numaralı siparişin yola çıktı.\nKargo firması: ${d.carrier}\nTakip numarası: ${d.trackingNumber}${d.trackingUrl ? `\nTakip: ${d.trackingUrl}` : ""}${d.invoiceUrl ? `\nFatura: ${d.invoiceUrl}` : ""}\n\n${orderText(d)}\n\nSipariş: ${d.orderUrl}`,
  };
}

export function orderDeliveredEmail(d: OrderEmailData): RenderedEmail {
  return {
    subject: `Siparişin teslim edildi — #${d.orderNumber}`,
    html: layout({
      preheader: "Ürünlerini beğendin mi? Yorumunu bekliyoruz.",
      heading: "Siparişin teslim edildi",
      body:
        p(esc(hello(d.customerName))) +
        p(`<strong>#${esc(d.orderNumber)}</strong> numaralı siparişin teslim edildi. Umarız ürünleri seversin.`) +
        p("Bir sorun olursa bu e-postayı yanıtlaman yeterli; teslimattan itibaren 14 gün cayma hakkın var. Ürünleri beğendiysen yorumun diğer müşterilere çok yardımcı olur.") +
        button("Siparişi görüntüle", d.orderUrl),
    }),
    text: `${hello(d.customerName)}\n\n#${d.orderNumber} numaralı siparişin teslim edildi. Bir sorun olursa bu e-postayı yanıtlaman yeterli; 14 gün cayma hakkın var.\n\nSipariş: ${d.orderUrl}`,
  };
}

export function orderCancelledEmail(d: OrderEmailData & { paid: boolean }): RenderedEmail {
  const money_ = d.paid
    ? "Ödemenin iadesi başlatıldığında ayrıca bilgilendireceğiz. İade tutarı bankana bağlı olarak birkaç iş günü içinde kartına yansır."
    : "Siparişin için ödeme alınmamıştı; kartından herhangi bir tutar çekilmedi.";
  return {
    subject: `Siparişin iptal edildi — #${d.orderNumber}`,
    html: layout({
      preheader: `#${d.orderNumber} numaralı sipariş iptal edildi.`,
      heading: "Siparişin iptal edildi",
      body:
        p(esc(hello(d.customerName))) +
        p(`<strong>#${esc(d.orderNumber)}</strong> numaralı siparişin iptal edildi.`) +
        p(money_) +
        orderTable(d) +
        button("Siparişi görüntüle", d.orderUrl),
    }),
    text: `${hello(d.customerName)}\n\n#${d.orderNumber} numaralı siparişin iptal edildi.\n${money_}\n\n${orderText(d)}\n\nSipariş: ${d.orderUrl}`,
  };
}

export function refundEmail(
  d: OrderEmailData & { refundedItems: string[]; amount: number; full: boolean }
): RenderedEmail {
  const what = d.full ? "Siparişinin tamamı" : `Şu ürünler: ${d.refundedItems.join(", ")}`;
  return {
    subject: `İaden tamamlandı — #${d.orderNumber}`,
    html: layout({
      preheader: `${money(d.amount)} tutarındaki iaden kartına gönderildi.`,
      heading: "İaden tamamlandı",
      body:
        p(esc(hello(d.customerName))) +
        p(`<strong>#${esc(d.orderNumber)}</strong> numaralı siparişin için iade işlemini tamamladık.`) +
        p(`${esc(what)}<br>İade tutarı: <strong>${money(d.amount)}</strong>`) +
        p("Tutar, bankana bağlı olarak birkaç iş günü içinde kartına yansır.") +
        button("Siparişi görüntüle", d.orderUrl),
    }),
    text: `${hello(d.customerName)}\n\n#${d.orderNumber} numaralı siparişin için iade işlemini tamamladık.\n${what}\nİade tutarı: ${money(d.amount)}\nTutar birkaç iş günü içinde kartına yansır.\n\nSipariş: ${d.orderUrl}`,
  };
}

export function passwordResetEmail(d: { name: string; resetUrl: string; validMinutes: number }): RenderedEmail {
  return {
    subject: "Şifre sıfırlama bağlantın",
    html: layout({
      preheader: `Bağlantı ${d.validMinutes} dakika geçerli.`,
      heading: "Şifreni sıfırla",
      body:
        p(esc(hello(d.name))) +
        p(`Şifreni sıfırlamak için aşağıdaki düğmeye tıkla. Bağlantı <strong>${d.validMinutes} dakika</strong> geçerli ve yalnızca bir kez kullanılabilir.`) +
        `<p style="margin:0 0 24px">${button("Şifremi sıfırla", d.resetUrl)}</p>` +
        p(`<span style="color:${MUTED};font-size:13px">Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin; şifren değişmez.</span>`),
    }),
    text: `${hello(d.name)}\n\nŞifreni sıfırlamak için bu bağlantıyı aç (${d.validMinutes} dakika geçerli, tek kullanımlık):\n${d.resetUrl}\n\nBu isteği sen yapmadıysan bu e-postayı yok sayabilirsin.`,
  };
}
