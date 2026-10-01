import { readFile } from "fs/promises";
import path from "path";
import { downloadImage } from "@/lib/remote-image";

export type ImageMimeType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

export type LoadedImage = { url: string; mimeType: ImageMimeType; data: string };

const MAX_BYTES = 5 * 1024 * 1024;

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
// (read from disk, never outside /public) or https URLs (downloaded through
// the SSRF guard in src/lib/remote-image.ts). Returns null for anything
// unreadable — the caller simply skips alt-text drafts for that image.
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

    // Remote: through the SSRF guard (https only, public addresses, size
    // and time limits, bytes must be an image).
    const { bytes, ext } = await downloadImage(url);
    return { url, mimeType: MIME_BY_EXT[`.${ext}`], data: bytes.toString("base64") };
  } catch {
    return null;
  }
}
