import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// As of Next.js 16, per-route `runtime = "edge"` is deprecated in favor of a
// single Node.js runtime for routes, with edge-level logic moved to
// `proxy.ts` (see src/proxy.ts). This route still uses jose specifically
// because it verifies the same token on both the edge-capable proxy and here.
export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }

  return NextResponse.json({ authenticated: true, ...session });
}
