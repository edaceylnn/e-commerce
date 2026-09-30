import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { detectImageExtension, MAX_UPLOAD_BYTES } from "@/lib/uploads";

// Downloads an image from a URL someone typed (a CSV import). The server
// fetching arbitrary URLs is a classic SSRF hole — "https://169.254.169.254/"
// reads the cloud provider's metadata, "https://localhost:5432" pokes the
// database — so: https only, default port, every address the name resolves
// to must be public, redirects re-checked the same way, size- and
// time-limited, and the bytes must really be an image.
//
// Residual risk: the name is resolved again when connecting (DNS
// rebinding). Pinning the checked address would close it; acceptable here
// because only admins can import.

export class RemoteImageError extends Error {}

const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

function ipv4Public(ip: string) {
  const [a, b] = ip.split(".").map(Number);
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

export function isPublicAddress(ip: string) {
  const version = isIP(ip);
  if (version === 4) return ipv4Public(ip);
  if (version !== 6) return false;
  const v6 = ip.toLowerCase();
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v6);
  if (mapped) return ipv4Public(mapped[1]);
  return !(
    v6 === "::" ||
    v6 === "::1" ||
    /^f[cd]/.test(v6) || // fc00::/7 unique local
    /^fe[89ab]/.test(v6) || // fe80::/10 link local
    /^ff/.test(v6) // multicast
  );
}

async function checkUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new RemoteImageError("Geçersiz görsel adresi.");
  }
  if (url.protocol !== "https:") throw new RemoteImageError("Görsel adresi https:// ile başlamalı.");
  if (url.username || url.password || (url.port && url.port !== "443")) {
    throw new RemoteImageError("Görsel adresinde kullanıcı adı ya da özel port olamaz.");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (addresses.length === 0) throw new RemoteImageError(`Görsel sunucusu bulunamadı: ${host}`);
  if (!addresses.every((a) => isPublicAddress(a.address))) {
    throw new RemoteImageError(`Görsel adresi iç ağa işaret ediyor, indirilmedi: ${host}`);
  }
  return url;
}

export async function downloadImage(raw: string): Promise<{ bytes: Buffer; ext: string }> {
  let url = await checkUrl(raw);
  for (let hop = 0; ; hop++) {
    const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(TIMEOUT_MS) }).catch(() => {
      throw new RemoteImageError(`Görsel indirilemedi: ${url.hostname}`);
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location || hop >= MAX_REDIRECTS) throw new RemoteImageError("Görsel adresi çok fazla yönlendirme yapıyor.");
      url = await checkUrl(new URL(location, url).toString());
      continue;
    }
    if (!res.ok || !res.body) throw new RemoteImageError(`Görsel indirilemedi (HTTP ${res.status}).`);
    if (Number(res.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES) {
      throw new RemoteImageError("Görsel 5 MB'tan büyük.");
    }

    // Read with a cap: a missing or lying Content-Length can't fill memory.
    const chunks: Uint8Array[] = [];
    let size = 0;
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_UPLOAD_BYTES) {
        await reader.cancel();
        throw new RemoteImageError("Görsel 5 MB'tan büyük.");
      }
      chunks.push(value);
    }
    const bytes = Buffer.concat(chunks);
    const ext = detectImageExtension(bytes);
    if (!ext) throw new RemoteImageError("İndirilen dosya bir görsel değil (JPEG, PNG, WebP ya da GIF olmalı).");
    return { bytes, ext };
  }
}
