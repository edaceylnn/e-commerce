/**
 * @jest-environment node
 */
const ORIGINAL_ENV = process.env;

const payload = {
  event: "order.created" as const,
  eventVersion: "1.0" as const,
  requestId: "order.created.order_1",
  order: {
    id: "order_1",
    orderNumber: "BS-20260918-ABC123",
    status: "HAZIRLANIYOR",
    total: 4250,
    currency: "TRY" as const,
    createdAt: "2026-09-18T11:30:00.000Z",
    paidAt: "2026-09-18T11:32:00.000Z",
  },
  customer: {
    id: "user_1",
    name: "Demo User",
    email: "demo@example.com",
  },
  items: [
    {
      productId: "100",
      variantId: null,
      sku: null,
      name: "Example Product",
      quantity: 2,
      unitPrice: 2125,
    },
  ],
};

const lowStockPayload = {
  event: "product.low_stock" as const,
  eventVersion: "1.0" as const,
  requestId: "product.low_stock.100.order_1",
  product: {
    id: 100,
    title: "Example Product",
    remainingStock: 3,
    threshold: 10,
  },
  detectedAt: "2026-09-18T11:32:00.000Z",
};

beforeEach(() => {
  jest.resetModules();
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  process.env = {
    ...ORIGINAL_ENV,
    N8N_AUTOMATION_ENABLED: "true",
    N8N_BASE_URL: "https://n8n.example.com/",
    N8N_ORDER_WEBHOOK_PATH: "/webhook/order-created",
    N8N_LOW_STOCK_WEBHOOK_PATH: "/webhook/low-stock",
    N8N_WEBHOOK_SECRET: "secret_123",
    N8N_WEBHOOK_TIMEOUT_MS: "3000",
  };
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  jest.restoreAllMocks();
});

describe("emitOrderCreatedAutomationEvent", () => {
  it("skips dispatch when automation is disabled", async () => {
    process.env.N8N_AUTOMATION_ENABLED = "false";
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const { emitOrderCreatedAutomationEvent } = await import("./automation");
    const result = await emitOrderCreatedAutomationEvent(payload);

    expect(result).toEqual({
      ok: false,
      skipped: true,
      reason: "automation disabled",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the order event with bearer authentication", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { emitOrderCreatedAutomationEvent } = await import("./automation");
    const result = await emitOrderCreatedAutomationEvent(payload);

    expect(result).toEqual({ ok: true, status: 200 });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://n8n.example.com/webhook/order-created",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer secret_123",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
    );
  });

  it("does not throw when n8n returns an error", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "workflow failed",
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { emitOrderCreatedAutomationEvent } = await import("./automation");
    const result = await emitOrderCreatedAutomationEvent(payload);

    expect(result).toEqual({
      ok: false,
      status: 500,
      error: "workflow failed",
    });
    expect(console.error).toHaveBeenCalledWith(
      "n8n automation event failed",
      expect.objectContaining({
        requestId: "order.created.order_1",
        status: 500,
      })
    );
  });

  it("skips and logs when enabled configuration is incomplete", async () => {
    process.env.N8N_WEBHOOK_SECRET = "";
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const { emitOrderCreatedAutomationEvent } = await import("./automation");
    const result = await emitOrderCreatedAutomationEvent(payload);

    expect(result).toEqual({
      ok: false,
      skipped: true,
      reason: "missing configuration",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(
      "n8n automation is enabled but missing webhook configuration"
    );
  });
});

describe("emitLowStockAutomationEvent", () => {
  it("posts the low-stock event with bearer authentication", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { emitLowStockAutomationEvent } = await import("./automation");
    const result = await emitLowStockAutomationEvent(lowStockPayload);

    expect(result).toEqual({ ok: true, status: 200 });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://n8n.example.com/webhook/low-stock",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer secret_123",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(lowStockPayload),
      })
    );
  });

  it("skips dispatch when automation is disabled", async () => {
    process.env.N8N_AUTOMATION_ENABLED = "false";
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const { emitLowStockAutomationEvent } = await import("./automation");
    const result = await emitLowStockAutomationEvent(lowStockPayload);

    expect(result).toEqual({
      ok: false,
      skipped: true,
      reason: "automation disabled",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
