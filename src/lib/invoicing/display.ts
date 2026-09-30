// How an invoice line is shown on the document. We compute gross-first
// (the VAT-inclusive price the customer paid, then net and VAT from it),
// but the e-Arşiv layout shows prices without VAT: Miktar × Birim Fiyat −
// İskonto = Mal Hizmet Tutarı (net). With a discount, the net unit price is
// rounded to the kuruş and the discount takes up the rounding; without one,
// the unit price keeps up to 4 decimals (as e-Arşiv documents do) so no
// phantom 1-kuruş discount appears. Either way each row adds up to the
// stored net. Amounts in kuruş (unitNet may be fractional).

export function displayLine(line: { quantity: number; unitPrice: number; discount: number; vatRate: number; net: number }) {
  if (line.discount > 0) {
    const bp = Math.round(line.vatRate * 100);
    const unitNet = Math.round((line.unitPrice * 10000) / (10000 + bp));
    const amount = unitNet * line.quantity;
    if (amount >= line.net) return { unitNet, amount, discount: amount - line.net };
  }
  return { unitNet: line.net / line.quantity, amount: line.net, discount: 0 };
}

const ONES = ["", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"];
const TENS = ["", "on", "yirmi", "otuz", "kırk", "elli", "altmış", "yetmiş", "seksen", "doksan"];
const SCALES = ["", "bin", "milyon", "milyar", "trilyon"];

function below1000(n: number) {
  const h = Math.floor(n / 100);
  const words = [h === 0 ? "" : h === 1 ? "yüz" : `${ONES[h]} yüz`, TENS[Math.floor((n % 100) / 10)], ONES[n % 10]];
  return words.filter(Boolean).join(" ");
}

// Turkish number words: 1000 is "bin", not "bir bin".
export function numberToWords(n: number): string {
  if (n === 0) return "sıfır";
  const groups: string[] = [];
  for (let scale = 0; n > 0; scale++, n = Math.floor(n / 1000)) {
    const g = n % 1000;
    if (g === 0) continue;
    const words = scale === 1 && g === 1 ? "" : below1000(g);
    groups.unshift([words, SCALES[scale]].filter(Boolean).join(" "));
  }
  return groups.join(" ");
}

// The "Yalnız: …" line printed under the totals.
export function amountInWords(kurus: number) {
  const lira = Math.floor(kurus / 100);
  const k = kurus % 100;
  const text = `${numberToWords(lira)} Türk lirası${k ? ` ${numberToWords(k)} kuruş` : ""}`;
  return text.charAt(0).toLocaleUpperCase("tr-TR") + text.slice(1);
}
