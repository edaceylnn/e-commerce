/**
 * @jest-environment node
 */
import { currentShipmentStatus, orderStatusForShipment } from "./events";
import { nextSimulatedStatus, simulatedScan, simulatorTrackingNumber } from "./simulator";
import { signWebhookBody, verifyWebhookSignature, WebhookScanSchema } from "./webhook";
import { trackingUrl, carrierName } from "./carriers";

const at = (min: number) => new Date(Date.UTC(2026, 8, 30, 10, min));

describe("currentShipmentStatus", () => {
  it("follows the newest scan, not the order scans arrived in", () => {
    // "in transit" (10:05) arrives after "out for delivery" (10:20).
    expect(
      currentShipmentStatus([
        { status: "PICKED_UP", occurredAt: at(0) },
        { status: "OUT_FOR_DELIVERY", occurredAt: at(20) },
        { status: "IN_TRANSIT", occurredAt: at(5) },
      ])
    ).toBe("OUT_FOR_DELIVERY");
  });

  it("lets a new attempt follow a failed delivery", () => {
    expect(
      currentShipmentStatus([
        { status: "DELIVERY_FAILED", occurredAt: at(10) },
        { status: "OUT_FOR_DELIVERY", occurredAt: at(30) },
      ])
    ).toBe("OUT_FOR_DELIVERY");
  });

  it("treats delivered as final", () => {
    expect(
      currentShipmentStatus([
        { status: "DELIVERED", occurredAt: at(10) },
        { status: "IN_TRANSIT", occurredAt: at(40) },
      ])
    ).toBe("DELIVERED");
    expect(currentShipmentStatus([])).toBe("CREATED");
  });
});

describe("orderStatusForShipment", () => {
  it("ships the order once the carrier has the parcel", () => {
    expect(orderStatusForShipment("CREATED", "HAZIRLANIYOR")).toBeNull();
    expect(orderStatusForShipment("PICKED_UP", "HAZIRLANIYOR")).toBe("KARGOLANDI");
    expect(orderStatusForShipment("IN_TRANSIT", "KARGOLANDI")).toBeNull();
  });

  it("delivers the order, even if the pickup scan was missed", () => {
    expect(orderStatusForShipment("DELIVERED", "KARGOLANDI")).toBe("TESLIM_EDILDI");
    expect(orderStatusForShipment("DELIVERED", "HAZIRLANIYOR")).toBe("TESLIM_EDILDI");
  });

  it("never touches cancelled, refunded, unpaid or finished orders", () => {
    for (const order of ["IPTAL", "IADE", "PENDING_PAYMENT", "TESLIM_EDILDI"] as const) {
      expect(orderStatusForShipment("DELIVERED", order)).toBeNull();
      expect(orderStatusForShipment("PICKED_UP", order)).toBeNull();
    }
  });
});

describe("webhook signature", () => {
  const body = JSON.stringify({ eventId: "e1", status: "DELIVERED" });

  it("accepts the carrier's own signature", () => {
    expect(verifyWebhookSignature(body, signWebhookBody(body))).toBe(true);
  });

  it("rejects a changed body, a wrong or missing signature", () => {
    const sig = signWebhookBody(body);
    expect(verifyWebhookSignature(body.replace("DELIVERED", "IN_TRANSIT"), sig)).toBe(false);
    expect(verifyWebhookSignature(body, "0".repeat(64))).toBe(false);
    expect(verifyWebhookSignature(body, "short")).toBe(false);
    expect(verifyWebhookSignature(body, null)).toBe(false);
  });
});

describe("simulator", () => {
  it("issues EDT tracking numbers", () => {
    expect(simulatorTrackingNumber()).toMatch(/^EDT\d{9}$/);
  });

  it("walks a parcel to delivery", () => {
    const path = ["CREATED"] as string[];
    let s = nextSimulatedStatus("CREATED");
    while (s) {
      path.push(s);
      s = nextSimulatedStatus(s);
    }
    expect(path).toEqual(["CREATED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"]);
    expect(nextSimulatedStatus("DELIVERY_FAILED")).toBe("OUT_FOR_DELIVERY");
  });

  it("sends scans the webhook accepts", () => {
    const scan = simulatedScan("EDT000000001", "OUT_FOR_DELIVERY", "İzmir");
    expect(WebhookScanSchema.safeParse(scan).success).toBe(true);
    expect(scan.location).toBe("İzmir Şube");
  });
});

describe("carriers", () => {
  it("links only carriers with a checked tracking URL", () => {
    expect(trackingUrl("yurtici", "AB 12")).toContain("code=AB%2012");
    expect(trackingUrl("ptt", "123")).toBeNull();
    expect(carrierName("unknown")).toBe("unknown");
  });
});
