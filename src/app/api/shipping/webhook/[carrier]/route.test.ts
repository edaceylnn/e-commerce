/**
 * @jest-environment node
 */
const shipmentFindUnique = jest.fn();
const recordShipmentScan = jest.fn();

jest.mock("../../../../../lib/db", () => ({
  prisma: {
    shipment: { findUnique: (...args: unknown[]) => shipmentFindUnique(...args) },
    $transaction: (cb: (tx: object) => unknown) => cb({}),
  },
}));
jest.mock("../../../../../lib/shipping/events", () => ({
  recordShipmentScan: (...args: unknown[]) => recordShipmentScan(...args),
}));

import { NextRequest } from "next/server";
import { signWebhookBody } from "../../../../../lib/shipping/webhook";
import { POST } from "./route";

const scan = {
  eventId: "EDT1-DELIVERED-1",
  trackingNumber: "EDT000000001",
  status: "DELIVERED",
  description: "Alıcıya teslim edildi",
  location: "İzmir",
  occurredAt: "2026-09-30T10:00:00.000Z",
};

function post(carrier: string, body: string, signature?: string) {
  return POST(
    new NextRequest(`http://localhost/api/shipping/webhook/${carrier}`, {
      method: "POST",
      body,
      headers: signature ? { "x-shipping-signature": signature } : {},
    }),
    { params: Promise.resolve({ carrier }) }
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  shipmentFindUnique.mockResolvedValue({ id: "ship_1" });
  recordShipmentScan.mockResolvedValue({ recorded: true, shipmentStatus: "DELIVERED", orderStatus: "TESLIM_EDILDI" });
});

describe("POST /api/shipping/webhook/[carrier]", () => {
  it("records a correctly signed scan", async () => {
    const body = JSON.stringify(scan);
    const res = await post("simulator", body, signWebhookBody(body));
    expect(res.status).toBe(200);
    expect(recordShipmentScan).toHaveBeenCalledWith({}, "ship_1", {
      externalId: "EDT1-DELIVERED-1",
      status: "DELIVERED",
      description: "Alıcıya teslim edildi",
      location: "İzmir",
      occurredAt: new Date("2026-09-30T10:00:00.000Z"),
    });
  });

  it("rejects unsigned or tampered scans before touching the database", async () => {
    const body = JSON.stringify(scan);
    expect((await post("simulator", body)).status).toBe(401);
    const tampered = body.replace("İzmir", "Ankara");
    expect((await post("simulator", tampered, signWebhookBody(body))).status).toBe(401);
    expect(shipmentFindUnique).not.toHaveBeenCalled();
  });

  it("only listens for integrated carriers", async () => {
    const body = JSON.stringify(scan);
    expect((await post("yurtici", body, signWebhookBody(body))).status).toBe(404);
  });

  it("rejects malformed payloads", async () => {
    const body = JSON.stringify({ ...scan, status: "TELEPORTED" });
    expect((await post("simulator", body, signWebhookBody(body))).status).toBe(400);
  });

  it("acknowledges unknown tracking numbers so the carrier stops retrying", async () => {
    shipmentFindUnique.mockResolvedValue(null);
    const body = JSON.stringify(scan);
    const res = await post("simulator", body, signWebhookBody(body));
    expect(res.status).toBe(202);
    expect(recordShipmentScan).not.toHaveBeenCalled();
  });
});
