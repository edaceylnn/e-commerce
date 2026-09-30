import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { plan } from "@/lib/shopify-import";
import { readImportRequest } from "@/lib/shopify-import-request";

// What importing this CSV would do — nothing is written.
export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  const input = await readImportRequest(request);
  if ("error" in input) return NextResponse.json({ error: input.error }, { status: 400 });
  return NextResponse.json(await plan(input.products, input.fileErrors, input.options));
}
