// Minimal iyzico "Checkout Form" (redirect-based) client — plain fetch plus
// a hand-rolled implementation of iyzico's IYZWSv2 HMACSHA256 request
// signing, rather than the official `iyzipay` SDK (which is CommonJS,
// callback-based, and awkward inside Next.js Route Handlers).
//
// The signing algorithm below was verified directly against iyzico's own
// Node SDK source (lib/utils.js: generateHashV2 / calculateHmacSHA256Signature)
// and their official sample requests, not just the prose docs:
// https://github.com/iyzico/iyzipay-node
import crypto from "node:crypto";

const CF_INITIALIZE_PATH = "/payment/iyzipos/checkoutform/initialize/auth/ecom";
const CF_RETRIEVE_PATH = "/payment/iyzipos/checkoutform/auth/ecom/detail";
const REFUND_PATH = "/payment/refund";

// Without iyzico keys (the public demo) payments go to the built-in
// simulator (src/lib/payment-simulator.ts), which speaks the same API: the
// rest of the store can't tell the difference and runs the same code.
export function isPaymentSimulated() {
  return !process.env.IYZICO_API_KEY || !process.env.IYZICO_SECRET_KEY;
}

// The simulator's signing secret; kept here so this module doesn't import
// the simulator (and its database access) unless it's actually used.
const SIMULATOR_SECRET = "edacey-payment-simulator";

function getConfig() {
  if (isPaymentSimulated()) return { simulated: true as const, apiKey: "", secretKey: SIMULATOR_SECRET, baseUrl: "" };
  const apiKey = process.env.IYZICO_API_KEY!;
  const secretKey = process.env.IYZICO_SECRET_KEY!;
  const baseUrl = process.env.IYZICO_BASE_URL;
  if (!baseUrl) {
    throw new Error("iyzico yapılandırması eksik: IYZICO_BASE_URL ortam değişkenini ayarlayın.");
  }
  return { simulated: false as const, apiKey, secretKey, baseUrl };
}

function generateRandomKey(): string {
  return `${Date.now()}${crypto.randomBytes(8).toString("hex")}`;
}

// IYZWSv2 authorization header:
//   signature = HMACSHA256(randomKey + uriPath + bodyString, secretKey)  [hex]
//   header    = "IYZWSv2 " + base64("apiKey:{apiKey}&randomKey:{randomKey}&signature:{signature}")
function generateAuthorizationHeader(
  apiKey: string,
  secretKey: string,
  uriPath: string,
  bodyString: string,
  randomKey: string
): string {
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(randomKey + uriPath + bodyString)
    .digest("hex");

  const authorizationParams = [
    `apiKey:${apiKey}`,
    `randomKey:${randomKey}`,
    `signature:${signature}`,
  ].join("&");

  return `IYZWSv2 ${Buffer.from(authorizationParams).toString("base64")}`;
}

async function iyzicoRequest<TResponse>(
  uriPath: string,
  body: unknown
): Promise<TResponse> {
  const config = getConfig();
  if (config.simulated) {
    const { simulateIyzico } = await import("@/lib/payment-simulator");
    return simulateIyzico(uriPath, JSON.parse(JSON.stringify(body))) as Promise<TResponse>;
  }
  const { apiKey, secretKey, baseUrl } = config;
  // Sign the exact string we send — never re-serialize separately, since
  // that could reorder keys and produce a signature mismatch.
  const bodyString = JSON.stringify(body);
  const randomKey = generateRandomKey();
  const authorization = generateAuthorizationHeader(
    apiKey,
    secretKey,
    uriPath,
    bodyString,
    randomKey
  );

  const res = await fetch(`${baseUrl}${uriPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authorization,
      "x-iyzi-rnd": randomKey,
    },
    body: bodyString,
  });

  if (!res.ok) {
    throw new Error(`iyzico isteği başarısız oldu: ${uriPath} (${res.status})`);
  }

  return res.json() as Promise<TResponse>;
}

// Verifies a response's `signature` field against the fields iyzico says it
// was derived from (order matters — see their docs per endpoint). This is
// defense-in-depth on top of the fact that we only ever call CF-Retrieve
// ourselves, server-to-server, over our own signed+authenticated request.
export function verifyResponseSignature(
  fields: Array<string | undefined>,
  signature: string | undefined
): boolean {
  if (!signature) return false;
  const { secretKey } = getConfig();
  const expected = crypto
    .createHmac("sha256", secretKey)
    .update(fields.map((f) => f ?? "").join(":"))
    .digest("hex");

  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
}

export type IyzicoAddress = {
  address: string;
  contactName: string;
  city: string;
  country: string;
  zipCode?: string;
};

export type IyzicoBuyer = {
  id: string;
  name: string;
  surname: string;
  identityNumber: string;
  email: string;
  gsmNumber: string;
  registrationAddress: string;
  city: string;
  country: string;
  ip: string;
  zipCode?: string;
};

export type IyzicoBasketItem = {
  id: string;
  price: string;
  name: string;
  category1: string;
  itemType: "PHYSICAL" | "VIRTUAL";
};

export type CheckoutFormInitializeRequest = {
  locale?: "tr" | "en";
  conversationId: string;
  price: string;
  paidPrice: string;
  currency: "TRY";
  basketId: string;
  paymentGroup: "PRODUCT";
  callbackUrl: string;
  buyer: IyzicoBuyer;
  shippingAddress: IyzicoAddress;
  billingAddress: IyzicoAddress;
  basketItems: IyzicoBasketItem[];
};

export type CheckoutFormInitializeResponse = {
  status: "success" | "failure";
  locale?: string;
  systemTime?: number;
  conversationId?: string;
  token?: string;
  checkoutFormContent?: string;
  paymentPageUrl?: string;
  tokenExpireTime?: number;
  signature?: string;
  errorCode?: string;
  errorMessage?: string;
};

export function initializeCheckoutForm(
  request: CheckoutFormInitializeRequest
): Promise<CheckoutFormInitializeResponse> {
  return iyzicoRequest<CheckoutFormInitializeResponse>(
    CF_INITIALIZE_PATH,
    request
  );
}

// One per basket item — a refund is issued against a transaction, not the
// top-level payment, so these have to be captured at confirmation time to
// be able to refund anything later (see refundPayment below).
export type IyzicoItemTransaction = {
  itemId?: string;
  paymentTransactionId: string;
  price?: string;
  paidPrice?: string;
};

export type CheckoutFormRetrieveResponse = {
  status: "success" | "failure";
  paymentStatus?: "SUCCESS" | "FAILURE" | "INIT_THREEDS" | "CALLBACK_THREEDS";
  paymentId?: string;
  token?: string;
  price?: string;
  paidPrice?: string;
  currency?: string;
  basketId?: string;
  conversationId?: string;
  fraudStatus?: number;
  signature?: string;
  errorCode?: string;
  errorMessage?: string;
  itemTransactions?: IyzicoItemTransaction[];
};

export function retrieveCheckoutForm(params: {
  token: string;
  conversationId?: string;
  locale?: "tr" | "en";
}): Promise<CheckoutFormRetrieveResponse> {
  return iyzicoRequest<CheckoutFormRetrieveResponse>(CF_RETRIEVE_PATH, {
    locale: params.locale ?? "tr",
    token: params.token,
    conversationId: params.conversationId,
  });
}

export type RefundRequest = {
  paymentTransactionId: string;
  price: string;
  currency: "TRY";
  ip: string;
  conversationId?: string;
  reason?: "double_payment" | "buyer_request" | "fraud" | "other";
};

export type RefundResponse = {
  status: "success" | "failure";
  paymentId?: string;
  paymentTransactionId?: string;
  price?: string;
  currency?: string;
  conversationId?: string;
  errorCode?: string;
  errorMessage?: string;
};

// Refunds a single item transaction (not the top-level payment — see
// IyzicoItemTransaction above). A multi-item order needs one call per
// stored transaction to refund in full.
export function refundPayment(request: RefundRequest): Promise<RefundResponse> {
  return iyzicoRequest<RefundResponse>(REFUND_PATH, {
    locale: "tr",
    ...request,
  });
}

// Sandbox placeholder used across iyzico's own official sample requests
// (e.g. their Node SDK test suite). We deliberately do not collect a real
// government identity number from customers for a portfolio demo.
export const IYZICO_SANDBOX_IDENTITY_NUMBER = "11111111111";
