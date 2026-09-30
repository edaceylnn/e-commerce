import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requestPasswordReset } from "@/lib/password-reset";

const schema = z.object({ email: z.string().trim().email("Geçerli bir e-posta adresi girin.") });

// Same answer whether or not the address has an account.
export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Geçersiz istek." }, { status: 400 });
  }
  await requestPasswordReset(parsed.data.email);
  return NextResponse.json({ ok: true });
}
