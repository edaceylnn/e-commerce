/**
 * @jest-environment node
 */
import { mkdtemp, readFile, rm } from "fs/promises";
import os from "os";
import path from "path";
import { detectImageExtension, saveProductImage } from "./uploads";

describe("detectImageExtension", () => {
  it("recognises images by their bytes", () => {
    expect(detectImageExtension(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpg");
    expect(detectImageExtension(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("png");
    expect(detectImageExtension(Buffer.from("GIF89a"))).toBe("gif");
    expect(detectImageExtension(Buffer.from("RIFF\x00\x00\x00\x00WEBPVP8 ", "latin1"))).toBe("webp");
  });

  it("rejects anything else, whatever it is called", () => {
    expect(detectImageExtension(Buffer.from("<script>alert(1)</script>"))).toBeNull();
    expect(detectImageExtension(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"))).toBeNull();
    expect(detectImageExtension(Buffer.alloc(0))).toBeNull();
  });
});

describe("saveProductImage", () => {
  it("writes under a random name and returns a public URL", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "uploads-"));
    try {
      const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const url = await saveProductImage(bytes, "jpg", dir);
      expect(url).toMatch(/^\/uploads\/products\/[0-9a-f-]{36}\.jpg$/);
      expect(await readFile(path.join(dir, url))).toEqual(bytes);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
