import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve"), text: z.string().trim().min(1, "Onaylanacak metin boş olamaz.") }),
  z.object({ action: z.literal("reject") }),
]);

// Approving is the only path by which AI text reaches a product: the
// admin's (possibly edited) text is copied into the one matching field.
// The product's own status is untouched, so a DRAFT product stays DRAFT.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Geçersiz istek." },
      { status: 400 }
    );
  }

  const { id } = await params;
  const draft = await prisma.contentDraft.findUnique({ where: { id } });
  if (!draft) {
    return NextResponse.json({ error: "Taslak bulunamadı." }, { status: 404 });
  }
  if (draft.status !== "PENDING") {
    return NextResponse.json({ error: "Bu taslak zaten sonuçlandırılmış." }, { status: 409 });
  }

  const decidedAt = new Date();
  if (parsed.data.action === "reject") {
    await prisma.contentDraft.update({ where: { id }, data: { status: "REJECTED", decidedAt } });
    return NextResponse.json({ ok: true });
  }

  const text = parsed.data.text;
  const approve = prisma.contentDraft.update({
    where: { id },
    data: { status: "APPROVED", finalText: text, decidedAt },
  });
  const where = { id: draft.productId };

  // The first approved AI description would overwrite the only copy of the
  // admin's own text if facts are still empty — keep it as the facts.
  let preservedFacts: { facts: string } | undefined;
  if (draft.kind === "SHORT_DESCRIPTION") {
    const product = await prisma.product.findUnique({ where, select: { description: true, facts: true } });
    const oldDescription = product?.description.trim();
    if (product && !product.facts?.trim() && oldDescription && oldDescription !== text) {
      preservedFacts = { facts: oldDescription };
    }
  }

  const apply =
    draft.kind === "IMAGE_ALT"
      ? // Matches by URL: a photo only added in the unsaved form isn't in the
        // DB yet, so this touches no rows and the form's own save carries it.
        prisma.productImage.updateMany({
          where: { productId: draft.productId, url: draft.imageUrl ?? "" },
          data: { altText: text },
        })
      : prisma.product.update({
          where,
          data:
            draft.kind === "SHORT_DESCRIPTION"
              ? { description: text, ...preservedFacts }
              : draft.kind === "META_TITLE"
                ? { metaTitle: text }
                : { metaDescription: text },
        });
  await prisma.$transaction([approve, apply]);

  return NextResponse.json({
    ok: true,
    edited: text !== draft.aiText,
    facts: preservedFacts?.facts,
  });
}
