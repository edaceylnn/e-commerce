// RFC 4180 CSV: fields separated by commas, quoted when they contain a
// comma, quote or line break, quotes doubled inside quotes. Spreadsheet
// exports (Excel, Shopify, Google Sheets) all speak it; Excel also puts a
// byte-order mark in front, which is dropped here.

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;

  for (; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (quoted) throw new Error("CSV'de kapanmamış bir tırnak var.");
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Blank lines (often at the end) aren't rows.
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

function cell(value: string | number | boolean | null | undefined) {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

// With a BOM so Excel opens Turkish characters correctly.
export function toCsv(rows: (string | number | boolean | null | undefined)[][]) {
  return `﻿${rows.map((r) => r.map(cell).join(",")).join("\r\n")}\r\n`;
}
