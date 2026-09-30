import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/auth";
import { demoBlockReason, isDemoMode } from "@/lib/demo";

const SEGMENT_COOKIE = "store_segment";

// Runs on every matched request before rendering. Demonstrates two patterns
// common in retail e-commerce: (1) legacy/deep-link URL rewriting so old
// marketing or app-generated links keep working, and (2) lightweight A/B
// segmentation via a cookie, without touching page code. On the public
// demo it also refuses the few actions that would spoil the demo (see
// src/lib/demo.ts) — in one place, before any route handler runs.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isDemoMode() && pathname.startsWith("/api/")) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await verifySession(token) : null;
    const reason = demoBlockReason(request.method, pathname, session?.email);
    if (reason) return NextResponse.json({ error: reason }, { status: 403 });
  }

  const legacyMatch = pathname.match(/^\/urun\/(\d+)$/);
  if (legacyMatch) {
    return NextResponse.redirect(
      new URL(`/products/${legacyMatch[1]}`, request.url)
    );
  }

  const response = NextResponse.next();

  if (!request.cookies.get(SEGMENT_COOKIE)) {
    const segment = Math.random() < 0.5 ? "a" : "b";
    response.cookies.set(SEGMENT_COOKIE, segment, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json).*)",
  ],
};
