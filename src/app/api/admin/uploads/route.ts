import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { detectImageExtension, MAX_UPLOAD_BYTES, saveProductImage } from "@/lib/uploads";

// One product photo per request; the form uploads several files one by one.
export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: `${file.name}: 5 MB'tan büyük olamaz.` }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = detectImageExtension(bytes);
  if (!ext) {
    return NextResponse.json(
      { error: `${file.name}: yalnızca JPG, PNG, WebP veya GIF yüklenebilir.` },
      { status: 400 }
    );
  }

  const url = await saveProductImage(bytes, ext);
  return NextResponse.json({ url });
}
