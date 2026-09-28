const findMany = jest.fn();
const findFirst = jest.fn();

jest.mock("./db", () => ({
  prisma: {
    product: {
      findMany: (...args: unknown[]) => findMany(...args),
      findFirst: (...args: unknown[]) => findFirst(...args),
    },
  },
}));

import {
  getProductById,
  getProductsByCategory,
  isNewProduct,
  searchProducts,
  selectNewArrivals,
  NEW_ARRIVAL_COUNT,
  type Product,
} from "./products";

const row = {
  id: 1,
  title: "Uzun Kollu Ev Takımı",
  description: "Fırfır kenarlı ribana üst ve geniş paça alt.",
  categoryId: "cat_1",
  category: { id: "cat_1", slug: "loungewear", label: "Loungewear" },
  price: 10,
  discountPercentage: 10,
  stock: 50,
  brandId: "brand_1",
  brand: { id: "brand_1", name: "EDACEY", slug: "edacey" },
  tags: ["loungewear"],
  ratingAvg: 4.5,
  ratingCount: 3,
  isNew: true,
  thumbnail: "/products/uzun-kollu-ev-takimi.webp",
  images: [
    {
      url: "/products/uzun-kollu-ev-takimi.webp",
      position: 0,
      colorId: null,
      altText: null,
    },
  ],
  variants: [],
};

beforeEach(() => {
  findMany.mockReset();
  findFirst.mockReset();
});

describe("products", () => {
  it("maps a DB row to the Product shape callers expect", async () => {
    findMany.mockResolvedValue([row]);

    const [product] = await getProductsByCategory("loungewear");

    expect(product).toMatchObject({
      id: 1,
      title: row.title,
      category: "loungewear",
      price: 10,
      discountPercentage: 10,
      rating: 4.5,
      isNew: true,
      brand: "EDACEY",
      images: [{ url: row.images[0].url, colorId: null, altText: null }],
      variants: [],
    });
  });

  it("scopes getProductsByCategory to the given category slug and active status", async () => {
    findMany.mockResolvedValue([]);

    await getProductsByCategory("pijama");

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { category: { slug: "pijama" }, status: "ACTIVE" },
      })
    );
  });

  it("throws when a product id does not exist", async () => {
    findFirst.mockResolvedValue(null);

    await expect(getProductById(999)).rejects.toThrow("Product not found: 999");
  });

  it("searches by title/description, not by category, and stays active-only", async () => {
    findMany.mockResolvedValue([row]);

    const results = await searchProducts("takım");

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: "ACTIVE",
          OR: [
            { title: { contains: "takım", mode: "insensitive" } },
            { description: { contains: "takım", mode: "insensitive" } },
          ],
        },
      })
    );
    expect(results).toHaveLength(1);
  });

  it("isNewProduct reads the product's own isNew flag", () => {
    expect(
      isNewProduct({
        id: 1,
        title: row.title,
        description: row.description,
        category: "loungewear",
        price: 10,
        discountPercentage: 10,
        rating: 4.5,
        ratingCount: 0,
        stock: 50,
        tags: ["loungewear"],
        brand: "EDACEY",
        thumbnail: row.thumbnail,
        images: [],
        isNew: true,
        variants: [],
        volumeLabel: null,
        skinTypes: [],
      })
    ).toBe(true);
  });
});

describe("selectNewArrivals", () => {
  const product = (id: number, isNew = false): Product => ({
    id,
    title: `Ürün ${id}`,
    description: "",
    category: "loungewear",
    price: 100,
    discountPercentage: 0,
    rating: 0,
    ratingCount: 0,
    stock: 5,
    tags: [],
    thumbnail: `/products/${id}.webp`,
    images: [],
    isNew,
    variants: [],
    volumeLabel: null,
    skinTypes: [],
  });

  it("puts flagged-new products first, then tops up with the newest ids", () => {
    const products = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((id) => product(id, id === 2 || id === 4));
    const ids = selectNewArrivals(products).map((p) => p.id);

    expect(ids).toHaveLength(NEW_ARRIVAL_COUNT);
    expect(ids.slice(0, 2)).toEqual([4, 2]);
    expect(ids.slice(2)).toEqual([10, 9, 8, 7, 6, 5]);
  });

  it("returns everything when there are fewer products than the rail holds", () => {
    expect(selectNewArrivals([product(1), product(3, true)]).map((p) => p.id)).toEqual([3, 1]);
  });
});
