/**
 * @jest-environment node
 */
const getSession = jest.fn();
const findMany = jest.fn();
const findFirst = jest.fn();
const create = jest.fn();
const productFindUnique = jest.fn();

jest.mock("../../../lib/auth", () => ({
  getSession: (...args: unknown[]) => getSession(...args),
}));

jest.mock("../../../lib/db", () => ({
  prisma: {
    wishlistItem: {
      findMany: (...args: unknown[]) => findMany(...args),
      findFirst: (...args: unknown[]) => findFirst(...args),
      create: (...args: unknown[]) => create(...args),
    },
    product: {
      findUnique: (...args: unknown[]) => productFindUnique(...args),
    },
  },
}));

import { NextRequest } from "next/server";
import { GET, POST } from "./route";

function postRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/wishlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  getSession.mockReset();
  findMany.mockReset();
  findFirst.mockReset();
  create.mockReset();
  productFindUnique.mockReset();
  productFindUnique.mockResolvedValue({ price: 100, discountPercentage: 10 });
});

describe("GET /api/wishlist", () => {
  it("returns an empty list for a guest", async () => {
    getSession.mockResolvedValue(null);
    const res = await GET();
    const data = await res.json();
    expect(data).toEqual({ productIds: [] });
    expect(findMany).not.toHaveBeenCalled();
  });

  it("returns the signed-in user's wishlisted product ids", async () => {
    getSession.mockResolvedValue({ userId: "user_1" });
    findMany.mockResolvedValue([{ productId: 1 }, { productId: 4 }]);

    const res = await GET();
    const data = await res.json();

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user_1" } })
    );
    expect(data).toEqual({ productIds: [1, 4] });
  });
});

describe("POST /api/wishlist", () => {
  it("rejects a guest", async () => {
    getSession.mockResolvedValue(null);
    const res = await POST(postRequest({ productId: 1 }));
    expect(res.status).toBe(401);
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects a non-numeric productId", async () => {
    getSession.mockResolvedValue({ userId: "user_1" });
    const res = await POST(postRequest({ productId: "not-a-number" }));
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("creates the wishlist row for a signed-in user when it doesn't exist yet", async () => {
    getSession.mockResolvedValue({ userId: "user_1" });
    findFirst.mockResolvedValue(null);

    const res = await POST(postRequest({ productId: 7 }));

    expect(res.status).toBe(200);
    expect(findFirst).toHaveBeenCalledWith({
      where: { userId: "user_1", productId: 7, variantId: null },
    });
    expect(create).toHaveBeenCalledWith({
      data: { userId: "user_1", productId: 7, priceAtAdd: 90 },
    });
  });

  it("does not create a duplicate wishlist row if one already exists", async () => {
    getSession.mockResolvedValue({ userId: "user_1" });
    findFirst.mockResolvedValue({ id: "existing" });

    const res = await POST(postRequest({ productId: 7 }));

    expect(res.status).toBe(200);
    expect(create).not.toHaveBeenCalled();
  });
});
