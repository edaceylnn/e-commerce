/**
 * @jest-environment node
 */
const requireAdmin = jest.fn();
const draftFindUnique = jest.fn();
const draftUpdate = jest.fn((args: unknown) => ({ op: "draftUpdate", args }));
const productUpdate = jest.fn((args: unknown) => ({ op: "productUpdate", args }));
const imageUpdateMany = jest.fn((args: unknown) => ({ op: "imageUpdateMany", args }));
const transaction = jest.fn();

jest.mock("../../../../../lib/auth", () => ({
  requireAdmin: (...args: unknown[]) => requireAdmin(...args),
}));

jest.mock("../../../../../lib/db", () => ({
  prisma: {
    contentDraft: {
      findUnique: (...args: unknown[]) => draftFindUnique(...args),
      update: (args: unknown) => draftUpdate(args),
    },
    product: { update: (args: unknown) => productUpdate(args) },
    productImage: { updateMany: (args: unknown) => imageUpdateMany(args) },
    $transaction: (...args: unknown[]) => transaction(...args),
  },
}));

import { NextRequest } from "next/server";
import { PATCH } from "./route";

function patch(body: unknown) {
  return PATCH(
    new NextRequest("http://localhost/api/admin/content-drafts/d1", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: "d1" }) }
  );
}

const pendingMeta = {
  id: "d1",
  productId: 7,
  kind: "META_DESCRIPTION",
  status: "PENDING",
  aiText: "AI metni",
};

beforeEach(() => {
  jest.clearAllMocks();
  requireAdmin.mockResolvedValue({ userId: "admin" });
});

describe("PATCH /api/admin/content-drafts/[id]", () => {
  it("rejects non-admins", async () => {
    requireAdmin.mockResolvedValue(null);
    const res = await patch({ action: "reject" });
    expect(res.status).toBe(403);
  });

  it("approves the edited text into only the matching product field", async () => {
    draftFindUnique.mockResolvedValue(pendingMeta);
    const res = await patch({ action: "approve", text: "  Düzeltilmiş metin " });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, edited: true });
    expect(productUpdate).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { metaDescription: "Düzeltilmiş metin" },
    });
    expect(draftUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "APPROVED", finalText: "Düzeltilmiş metin" }),
      })
    );
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it("writes short descriptions to the description field", async () => {
    draftFindUnique.mockResolvedValue({ ...pendingMeta, kind: "SHORT_DESCRIPTION" });
    await patch({ action: "approve", text: "AI metni" });
    expect(productUpdate).toHaveBeenCalledWith({ where: { id: 7 }, data: { description: "AI metni" } });
  });

  it("writes SEO titles to the metaTitle field", async () => {
    draftFindUnique.mockResolvedValue({ ...pendingMeta, kind: "META_TITLE" });
    await patch({ action: "approve", text: "Flare Tayt" });
    expect(productUpdate).toHaveBeenCalledWith({ where: { id: 7 }, data: { metaTitle: "Flare Tayt" } });
  });

  it("writes image alt text to that one photo only", async () => {
    draftFindUnique.mockResolvedValue({ ...pendingMeta, kind: "IMAGE_ALT", imageUrl: "/products/a.jpg" });
    await patch({ action: "approve", text: "Kil rengi flare tayt" });
    expect(productUpdate).not.toHaveBeenCalled();
    expect(imageUpdateMany).toHaveBeenCalledWith({
      where: { productId: 7, url: "/products/a.jpg" },
      data: { altText: "Kil rengi flare tayt" },
    });
  });

  it("rejecting never touches the product", async () => {
    draftFindUnique.mockResolvedValue(pendingMeta);
    const res = await patch({ action: "reject" });
    expect(res.status).toBe(200);
    expect(productUpdate).not.toHaveBeenCalled();
    expect(draftUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "REJECTED" }) })
    );
  });

  it("refuses to decide a draft twice", async () => {
    draftFindUnique.mockResolvedValue({ ...pendingMeta, status: "APPROVED" });
    const res = await patch({ action: "approve", text: "x" });
    expect(res.status).toBe(409);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("refuses empty approved text", async () => {
    const res = await patch({ action: "approve", text: "   " });
    expect(res.status).toBe(400);
    expect(draftFindUnique).not.toHaveBeenCalled();
  });
});
