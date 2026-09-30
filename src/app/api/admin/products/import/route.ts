import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { run } from "@/lib/shopify-import";
import { readImportRequest } from "@/lib/shopify-import-request";

// Imports the CSV the admin previewed. Products with errors are skipped;
// each product is written in its own transaction.
export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  const input = await readImportRequest(request);
  if ("error" in input) return NextResponse.json({ error: input.error }, { status: 400 });
  return NextResponse.json({ results: await run(input.products, input.fileErrors, input.options) });
}
