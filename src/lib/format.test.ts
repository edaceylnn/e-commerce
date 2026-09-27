import { formatDeliveryWindow } from "./format";

// ICU separates the range with thin/narrow no-break spaces around the dash;
// normalize them so the expectations can be written with plain spaces.
const deliveryRange = (from: Date, min: number, max: number) =>
  formatDeliveryWindow(from, min, max).replace(/\s/g, " ");

describe("formatDeliveryWindow", () => {
  it("keeps both months when the window crosses a month", () => {
    expect(deliveryRange(new Date(2026, 8, 27), 2, 4)).toBe("29 Eylül – 1 Ekim");
  });

  it("shows the month once when the window stays inside it", () => {
    expect(deliveryRange(new Date(2026, 9, 2), 3, 6)).toBe("5 – 8 Ekim");
  });

  it("adds the years when the window crosses a year", () => {
    expect(deliveryRange(new Date(2026, 11, 28), 2, 5)).toBe(
      "30 Aralık 2026 – 2 Ocak 2027"
    );
  });
});
