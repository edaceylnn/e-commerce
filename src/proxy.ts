import { NextRequest, NextResponse } from "next/server";

const SEGMENT_COOKIE = "store_segment";

// Runs on every matched request before rendering. Demonstrates two patterns
// common in retail e-commerce: (1) legacy/deep-link URL rewriting so old
// marketing or app-generated links keep working, and (2) lightweight A/B
// segmentation via a cookie, without touching page code.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
