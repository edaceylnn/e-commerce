import { readFile } from "fs/promises";
import path from "path";

export type ImageMimeType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

export type LoadedImage = { url: string; mimeType: ImageMimeType; data: string };

const MAX_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 8000;

const MIME_BY_EXT: Record<string, ImageMimeType> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

const PUBLIC_DIR = path.join(process.cwd(), "public");

// Loads a product image so the model can describe what is actually in it.
// Accepts the same refs the product form does: root-relative /public paths
// (read from disk, never outside /public) or http(s) URLs (size- and
// time-limited). Returns null for anything unreadable — the caller simply
// skips alt-text drafts for that image.
export async function loadImage(url: string): Promise<LoadedImage | null> {
  try {
    if (url.startsWith("/")) {
      const filePath = path.normalize(path.join(PUBLIC_DIR, decodeURIComponent(url.split("?")[0])));
      if (!filePath.startsWith(PUBLIC_DIR + path.sep)) return null;
      const mimeType = MIME_BY_EXT[path.extname(filePath).toLowerCase()];
      if (!mimeType) return null;
      const buffer = await readFile(filePath);
      if (buffer.length > MAX_BYTES) return null;
      return { url, mimeType, data: buffer.toString("base64") };
    }

    if (!/^https?:\/\//.test(url)) return null;
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return null;
    const mimeType = res.headers.get("content-type")?.split(";")[0].trim() as ImageMimeType | undefined;
    if (!mimeType || !Object.values(MIME_BY_EXT).includes(mimeType)) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > MAX_BYTES) return null;
    return { url, mimeType, data: buffer.toString("base64") };
  } catch {
    return null;
  }
}
