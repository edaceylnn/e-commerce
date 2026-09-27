export type OrderCreatedAutomationEvent = {
  event: "order.created";
  eventVersion: "1.0";
  requestId: string;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    currency: "TRY";
    createdAt: string;
    paidAt: string;
  };
  customer: {
    id: string;
    name: string;
    email: string;
  };
  items: Array<{
    productId: string;
    variantId: string | null;
    sku: string | null;
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
};

export type LowStockAutomationEvent = {
  event: "product.low_stock";
  eventVersion: "1.0";
  requestId: string;
  product: {
    id: number;
    title: string;
    remainingStock: number;
    threshold: number;
  };
  detectedAt: string;
};

export type AutomationDispatchResult =
  | { ok: true; status: number }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped?: false; status?: number; error: string };

const DEFAULT_TIMEOUT_MS = 3000;

function isAutomationEnabled() {
  return process.env.N8N_AUTOMATION_ENABLED === "true";
}

function joinUrl(baseUrl: string, path: string) {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

async function postAutomationEvent<
  T extends OrderCreatedAutomationEvent | LowStockAutomationEvent
>(path: string | undefined, payload: T): Promise<AutomationDispatchResult> {
  if (!isAutomationEnabled()) {
    return { ok: false, skipped: true, reason: "automation disabled" };
  }

  const baseUrl = process.env.N8N_BASE_URL;
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!baseUrl || !path || !secret) {
    console.warn("n8n automation is enabled but missing webhook configuration");
    return { ok: false, skipped: true, reason: "missing configuration" };
  }

  const timeoutMs = Number(process.env.N8N_WEBHOOK_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS
  );

  try {
    const response = await fetch(joinUrl(baseUrl, path), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      const error = text || `n8n webhook returned ${response.status}`;
      console.error("n8n automation event failed", {
        requestId: payload.requestId,
        status: response.status,
        error,
      });
      return { ok: false, status: response.status, error };
    }

    return { ok: true, status: response.status };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown automation error";
    console.error("n8n automation event failed", {
      requestId: payload.requestId,
      error,
    });
    return { ok: false, error };
  } finally {
    clearTimeout(timeout);
  }
}

export async function emitOrderCreatedAutomationEvent(
  payload: OrderCreatedAutomationEvent
) {
  return postAutomationEvent(process.env.N8N_ORDER_WEBHOOK_PATH, payload);
}

export async function emitLowStockAutomationEvent(
  payload: LowStockAutomationEvent
) {
  return postAutomationEvent(process.env.N8N_LOW_STOCK_WEBHOOK_PATH, payload);
}
