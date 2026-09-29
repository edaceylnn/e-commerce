/**
 * @jest-environment node
 */
// The SDKs ship ESM-only builds Jest can't load; these tests never call them.
jest.mock("@google/genai", () => ({ GoogleGenAI: jest.fn(), ApiError: class extends Error {} }));
jest.mock("@anthropic-ai/sdk", () => jest.fn());
jest.mock("@anthropic-ai/sdk/helpers/beta/zod", () => ({ betaZodOutputFormat: jest.fn() }));

import { mapImageAlts } from "./product-copy";

describe("mapImageAlts", () => {
  const images = [{ url: "/a.jpg" }, { url: "/b.jpg" }];

  it("maps 1-based image numbers back to URLs", () => {
    expect(
      mapImageAlts(
        [
          { imageNumber: 2, altText: " Arkadan görünüm " },
          { imageNumber: 1, altText: "Önden görünüm" },
        ],
        images
      )
    ).toEqual([
      { imageUrl: "/b.jpg", altText: "Arkadan görünüm" },
      { imageUrl: "/a.jpg", altText: "Önden görünüm" },
    ]);
  });

  it("drops out-of-range numbers, duplicates and empty texts", () => {
    expect(
      mapImageAlts(
        [
          { imageNumber: 0, altText: "x" },
          { imageNumber: 3, altText: "x" },
          { imageNumber: 1, altText: "  " },
          { imageNumber: 2, altText: "ilk" },
          { imageNumber: 2, altText: "ikinci" },
        ],
        images
      )
    ).toEqual([{ imageUrl: "/b.jpg", altText: "ilk" }]);
  });
});
