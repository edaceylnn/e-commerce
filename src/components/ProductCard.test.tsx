// ProductCard only needs the `Product` type/helpers from "@/lib/products",
// never the DB itself — mock it out so this component test doesn't need a
// live Postgres connection (see also src/lib/products.test.ts).
jest.mock("../lib/db", () => ({ prisma: {} }));

// WishlistButton (rendered inside ProductCard) calls useRouter() for the
// logged-out redirect — RTL's plain render() has no App Router context.
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

import { fireEvent, render, screen } from "@testing-library/react";
import { ProductCard } from "./ProductCard";
import type { Product } from "@/lib/products";

const product: Product = {
  id: 1,
  title: "Uzun Kollu Ev Takımı",
  description: "Fırfır kenarlı ribana üst ve geniş paça alt.",
  category: "loungewear",
  price: 10,
  discountPercentage: 10,
  rating: 4.5,
  ratingCount: 0,
  stock: 50,
  tags: ["loungewear"],
  brand: "EDACEY",
  thumbnail: "/products/uzun-kollu-ev-takimi.webp",
  images: [],
  isNew: false,
  variants: [],
  volumeLabel: null,
  skinTypes: [],
};

const variant = (id: string, size: string, colorId: string, colorName: string, stock = 5) => ({
  id,
  label: `${size} / ${colorName}`,
  colorId,
  colorName,
  colorHex: colorId === "c1" ? "#ede9e0" : "#16150f",
  sizeLabel: size,
  sku: `SKU-${id}`,
  stock,
  price: null,
});

describe("ProductCard", () => {
  it("renders the title and discounted price", () => {
    render(<ProductCard product={product} />);

    expect(screen.getByText(product.title)).toBeInTheDocument();
    expect(screen.getByText("₺9")).toBeInTheDocument();
    expect(screen.getByText("₺10")).toBeInTheDocument();
  });

  it("links to the product detail page", () => {
    render(<ProductCard product={product} />);
    // The image link is a hidden duplicate; the name is the one real link.
    expect(screen.getByRole("link")).toHaveAttribute("href", "/products/1");
  });

  it("hides the strikethrough price when there is no discount", () => {
    const { container } = render(
      <ProductCard product={{ ...product, discountPercentage: 0 }} />
    );
    expect(container.querySelector(".line-through")).not.toBeInTheDocument();
  });

  it("shows a sold-out label instead of quick-add when stock is 0", () => {
    render(<ProductCard product={{ ...product, stock: 0 }} />);

    expect(screen.queryByLabelText("Sepete ekle")).not.toBeInTheDocument();
    expect(screen.getByText("Tükendi")).toBeInTheDocument();
    // The wishlist action should still be available for an out-of-stock item.
    expect(screen.getByLabelText("Favorilere ekle")).toBeInTheDocument();
  });

  it("renders a swatch per distinct variant colour", () => {
    render(
      <ProductCard
        product={{
          ...product,
          variants: [
            variant("v1", "M", "c1", "Krem"),
            variant("v2", "L", "c1", "Krem"),
            variant("v3", "M", "c2", "Siyah"),
          ],
        }}
      />
    );

    expect(screen.getByLabelText("Krem")).toBeInTheDocument();
    expect(screen.getByLabelText("Siyah")).toBeInTheDocument();
  });

  it("strikes through sizes that are unavailable in the selected colour", () => {
    render(
      <ProductCard
        product={{
          ...product,
          variants: [
            variant("v1", "M", "c1", "Krem"),
            variant("v2", "L", "c1", "Krem", 0),
            variant("v3", "S", "c2", "Siyah"),
          ],
        }}
      />
    );

    // Krem (first colour) is selected by default: M in stock, L sold out,
    // S doesn't exist in Krem at all.
    expect(screen.getByLabelText("M beden sepete ekle")).toBeEnabled();
    expect(screen.getByLabelText("L beden tükendi")).toBeDisabled();
    expect(screen.getByLabelText("S beden tükendi")).toBeDisabled();

    fireEvent.click(screen.getByLabelText("Siyah"));
    expect(screen.getByLabelText("S beden sepete ekle")).toBeEnabled();
    expect(screen.getByLabelText("M beden tükendi")).toBeDisabled();
  });
});
