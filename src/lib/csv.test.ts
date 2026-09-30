import { parseCsv, toCsv } from "@/lib/csv";

describe("csv", () => {
  it("reads quoted fields with commas, quotes and line breaks", () => {
    const text = '﻿Title,Description\r\n"Tayt, siyah","Yumuşak ""örme"" kumaş\nİkinci satır"\r\nSütyen,\r\n\r\n';
    expect(parseCsv(text)).toEqual([
      ["Title", "Description"],
      ["Tayt, siyah", 'Yumuşak "örme" kumaş\nİkinci satır'],
      ["Sütyen", ""],
    ]);
  });

  it("round-trips what it writes", () => {
    const rows = [
      ["a", "b,c", 'd"e', "f\ng"],
      ["1", "", "Çizgili Ev Giyim Takımı", "12.50"],
    ];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });

  it("rejects an unterminated quote", () => {
    expect(() => parseCsv('a,"b\nc')).toThrow(/tırnak/);
  });
});
