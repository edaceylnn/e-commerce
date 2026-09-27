import crypto from "node:crypto";

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = {
    ...ORIGINAL_ENV,
    IYZICO_API_KEY: "sandbox-test-api-key",
    IYZICO_SECRET_KEY: "sandbox-test-secret-key",
    IYZICO_BASE_URL: "https://sandbox-api.iyzipay.com",
  };
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  jest.restoreAllMocks();
});

describe("verifyResponseSignature", () => {
  it("accepts a signature computed the same way iyzico computes it", async () => {
    const { verifyResponseSignature } = await import("./iyzico");
    const fields = ["SUCCESS", "12345", "TRY", "basket-1", "conv-1", "10.0", "10.0", "token-1"];
    const signature = crypto
      .createHmac("sha256", "sandbox-test-secret-key")
      .update(fields.join(":"))
      .digest("hex");

    expect(verifyResponseSignature(fields, signature)).toBe(true);
  });

  it("rejects a signature if any field was tampered with", async () => {
    const { verifyResponseSignature } = await import("./iyzico");
    const fields = ["SUCCESS", "12345", "TRY", "basket-1", "conv-1", "10.0", "10.0", "token-1"];
    const signature = crypto
      .createHmac("sha256", "sandbox-test-secret-key")
      .update(fields.join(":"))
      .digest("hex");

    const tamperedFields = [...fields];
    tamperedFields[5] = "999.0"; // e.g. paidPrice tampered

    expect(verifyResponseSignature(tamperedFields, signature)).toBe(false);
  });

  it("rejects a missing signature", async () => {
    const { verifyResponseSignature } = await import("./iyzico");
    expect(verifyResponseSignature(["a", "b"], undefined)).toBe(false);
  });
});

describe("initializeCheckoutForm", () => {
  it("signs the exact request body and sends the IYZWSv2 header", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "success", token: "tok_123" }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { initializeCheckoutForm } = await import("./iyzico");
    const request = {
      conversationId: "order_1",
      price: "100.00",
      paidPrice: "100.00",
      currency: "TRY" as const,
      basketId: "order_1",
      paymentGroup: "PRODUCT" as const,
      callbackUrl: "https://example.com/checkout/callback",
      buyer: {
        id: "user_1",
        name: "Eda",
        surname: "Ceylan",
        identityNumber: "11111111111",
        email: "eda@example.com",
        gsmNumber: "+905000000000",
        registrationAddress: "Adres",
        city: "Istanbul",
        country: "Turkey",
        ip: "127.0.0.1",
      },
      shippingAddress: {
        address: "Adres",
        contactName: "Eda Ceylan",
        city: "Istanbul",
        country: "Turkey",
      },
      billingAddress: {
        address: "Adres",
        contactName: "Eda Ceylan",
        city: "Istanbul",
        country: "Turkey",
      },
      basketItems: [
        { id: "1", price: "100.00", name: "Ürün", category1: "Kozmetik", itemType: "PHYSICAL" as const },
      ],
    };

    const result = await initializeCheckoutForm(request);

    expect(result).toMatchObject({ status: "success", token: "tok_123" });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://sandbox-api.iyzipay.com/payment/iyzipos/checkoutform/initialize/auth/ecom"
    );
    expect(options.method).toBe("POST");
    expect(options.headers["x-iyzi-rnd"]).toBeTruthy();
    expect(options.headers.Authorization).toMatch(/^IYZWSv2 /);
    expect(JSON.parse(options.body)).toMatchObject({ conversationId: "order_1" });

    // Decode the authorization header and re-derive the signature the same
    // way iyzico's own SDK does, to confirm our implementation matches.
    const randomKey = options.headers["x-iyzi-rnd"];
    const decoded = Buffer.from(
      options.headers.Authorization.replace("IYZWSv2 ", ""),
      "base64"
    ).toString("utf-8");
    const expectedSignature = crypto
      .createHmac("sha256", "sandbox-test-secret-key")
      .update(randomKey + "/payment/iyzipos/checkoutform/initialize/auth/ecom" + options.body)
      .digest("hex");
    expect(decoded).toBe(
      `apiKey:sandbox-test-api-key&randomKey:${randomKey}&signature:${expectedSignature}`
    );
  });

  it("throws a clear error when iyzico credentials are not configured", async () => {
    process.env.IYZICO_API_KEY = "";
    const { initializeCheckoutForm } = await import("./iyzico");
    await expect(
      initializeCheckoutForm({} as never)
    ).rejects.toThrow(/iyzico yapılandırması eksik/);
  });
});

describe("refundPayment", () => {
  it("posts to the refund endpoint with the transaction id and amount", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "success", paymentTransactionId: "txn_1" }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { refundPayment } = await import("./iyzico");
    const result = await refundPayment({
      paymentTransactionId: "txn_1",
      price: "38.84",
      currency: "TRY",
      ip: "127.0.0.1",
      conversationId: "order_1",
    });

    expect(result).toMatchObject({ status: "success", paymentTransactionId: "txn_1" });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://sandbox-api.iyzipay.com/payment/refund");
    expect(JSON.parse(options.body)).toMatchObject({
      paymentTransactionId: "txn_1",
      price: "38.84",
      currency: "TRY",
      ip: "127.0.0.1",
      conversationId: "order_1",
    });
  });
});

describe("retrieveCheckoutForm", () => {
  it("posts to the CF-Retrieve endpoint with the token", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "success", paymentStatus: "SUCCESS" }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { retrieveCheckoutForm } = await import("./iyzico");
    const result = await retrieveCheckoutForm({ token: "tok_123", conversationId: "order_1" });

    expect(result).toMatchObject({ status: "success", paymentStatus: "SUCCESS" });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://sandbox-api.iyzipay.com/payment/iyzipos/checkoutform/auth/ecom/detail"
    );
    expect(JSON.parse(options.body)).toMatchObject({ token: "tok_123", conversationId: "order_1" });
  });
});
