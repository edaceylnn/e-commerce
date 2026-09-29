// Carriers an order can ship with. There is no carrier contract yet, so
// every real carrier is "manual": the admin enters the tracking number the
// carrier gave them. The simulator stands in for an API-integrated carrier
// (it issues numbers and reports scans by webhook) until a real one exists.
//
// Tracking links are only given where the URL format was checked to open
// the carrier's tracking page (2026-09-30). The rest show carrier + number.

export type CarrierCode = "yurtici" | "aras" | "surat" | "mng" | "ptt" | "hepsijet" | "diger" | "simulator";

type Carrier = {
  code: CarrierCode;
  name: string;
  trackingUrl?: (trackingNumber: string) => string;
  // Integrated carriers issue tracking numbers and send scans themselves;
  // manual ones are updated by the admin.
  integrated: boolean;
};

const enc = encodeURIComponent;

export const CARRIERS: Carrier[] = [
  {
    code: "yurtici",
    name: "Yurtiçi Kargo",
    integrated: false,
    trackingUrl: (n) => `https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=${enc(n)}`,
  },
  {
    code: "aras",
    name: "Aras Kargo",
    integrated: false,
    trackingUrl: (n) => `https://kargotakip.araskargo.com.tr/mainpage.aspx?code=${enc(n)}`,
  },
  {
    code: "surat",
    name: "Sürat Kargo",
    integrated: false,
    trackingUrl: (n) => `https://suratkargo.com.tr/KargoTakip/?kargotakipno=${enc(n)}`,
  },
  { code: "mng", name: "DHL eCommerce (MNG)", integrated: false },
  { code: "ptt", name: "PTT Kargo", integrated: false },
  { code: "hepsijet", name: "HepsiJET", integrated: false },
  { code: "diger", name: "Diğer", integrated: false },
  { code: "simulator", name: "EDACEY Test Kargo (simülatör)", integrated: true },
];

export function getCarrier(code: string): Carrier | undefined {
  return CARRIERS.find((c) => c.code === code);
}

export function carrierName(code: string) {
  return getCarrier(code)?.name ?? code;
}

export function trackingUrl(code: string, trackingNumber: string) {
  return getCarrier(code)?.trackingUrl?.(trackingNumber) ?? null;
}

export const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  CREATED: "Kargo kaydı oluşturuldu",
  PICKED_UP: "Kargoya teslim edildi",
  IN_TRANSIT: "Transfer merkezinde",
  OUT_FOR_DELIVERY: "Dağıtımda",
  DELIVERY_FAILED: "Teslim edilemedi",
  DELIVERED: "Teslim edildi",
};
