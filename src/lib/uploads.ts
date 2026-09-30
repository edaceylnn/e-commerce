import { randomUUID } from "crypto";
import { mkdir, rm, writeFile } from "fs/promises";
import path from "path";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

// Served by Next straight from /public. Fine for local use and a single
// server; a multi-instance or serverless deploy needs object storage here.
const UPLOAD_SUBDIR = path.join("uploads", "products");

const SIGNATURES: { ext: string; matches: (b: Buffer) => boolean }[] = [
  { ext: "jpg", matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "png", matches: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: "gif", matches: (b) => b.subarray(0, 4).toString("ascii") === "GIF8" },
  {
    ext: "webp",
    matches: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP",
  },
];

// Decided from the file's bytes, not its name or the browser-sent type, so
// a renamed script can't be stored under /public as an "image".
export function detectImageExtension(bytes: Buffer): string | null {
  return SIGNATURES.find((s) => s.matches(bytes))?.ext ?? null;
}

// Stores an image under a random name and returns its public URL.
export async function saveProductImage(bytes: Buffer, ext: string, publicDir = path.join(process.cwd(), "public")) {
  const dir = path.join(publicDir, UPLOAD_SUBDIR);
  await mkdir(dir, { recursive: true });
  const fileName = `${randomUUID()}.${ext}`;
  await writeFile(path.join(dir, fileName), bytes);
  return `/${UPLOAD_SUBDIR.split(path.sep).join("/")}/${fileName}`;
}

// Deletes a stored upload by its public URL. Anything that isn't one of our
// uploads (a seeded /products/… image, an external URL) is left alone.
export async function removeProductImage(url: string, publicDir = path.join(process.cwd(), "public")) {
  const prefix = `/${UPLOAD_SUBDIR.split(path.sep).join("/")}/`;
  if (!url.startsWith(prefix)) return;
  const name = url.slice(prefix.length);
  if (!/^[0-9a-f-]+\.(jpg|png|gif|webp)$/.test(name)) return;
  await rm(path.join(publicDir, UPLOAD_SUBDIR, name), { force: true });
}
