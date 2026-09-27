// ProductCard only needs the `Product` type/helpers from "@/lib/products",
// never the DB itself — mock it out so this component test doesn't need a
// live Postgres connection (see also src/lib/products.test.ts).
jest.mock("../lib/db", () => ({ prisma: {} }));

// WishlistButton (rendered inside ProductCard) calls useRouter() for the
// logged-out redirect — RTL's plain render() has no App Router context.
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

import { render, screen } from "@testing-library/react";
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

describe("ProductCard", () => {
  it("renders the title and discounted price", () => {
    render(<ProductCard product={product} />);

    expect(screen.getByText(product.title)).toBeInTheDocument();
    expect(screen.getByText("₺9")).toBeInTheDocument();
    expect(screen.getByText("₺10")).toBeInTheDocument();
  });

  it("shows the rating only when there are reviews", () => {
    const { rerender } = render(<ProductCard product={product} />);
    expect(screen.queryByLabelText("4.5 / 5")).not.toBeInTheDocument();

    rerender(<ProductCard product={{ ...product, ratingCount: 12 }} />);
    expect(screen.getByLabelText("4.5 / 5")).toBeInTheDocument();
    expect(screen.getByText("(12)")).toBeInTheDocument();
  });

  it("links to the product detail page", () => {
    render(<ProductCard product={product} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/products/1");
  });

  it("hides the strikethrough price when there is no discount", () => {
    const { container } = render(
      <ProductCard product={{ ...product, discountPercentage: 0 }} />
    );
    expect(container.querySelector(".line-through")).not.toBeInTheDocument();
  });
});
