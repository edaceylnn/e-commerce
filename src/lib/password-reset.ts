import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { isDemoAccount } from "@/lib/demo";
import { deliverSoon, queueEmail, siteUrl } from "@/lib/email/outbox";
import { passwordResetEmail } from "@/lib/email/templates";
import { hashPassword } from "@/lib/password";

// "Şifremi unuttum". The emailed token is 32 random bytes; the database
// keeps only its SHA-256, so neither a leaked backup nor the admin outbox
// (the link is redacted there once sent) yields a working link.

export const RESET_VALID_MINUTES = 30;
const MAX_REQUESTS_PER_HOUR = 3;

export const hashResetToken = (token: string) => createHash("sha256").update(token).digest("hex");

// Always "done" to the caller: whether the address has an account isn't
// something a stranger should be able to find out here.
export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.trim() } });
  if (!user || isDemoAccount(user.email)) return;

  const recent = await prisma.passwordResetToken.count({
    where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 60 * 60_000) } },
  });
  if (recent >= MAX_REQUESTS_PER_HOUR) return;

  const token = randomBytes(32).toString("base64url");
  await prisma.$transaction(async (tx) => {
    const row = await tx.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashResetToken(token),
        expiresAt: new Date(Date.now() + RESET_VALID_MINUTES * 60_000),
      },
    });
    await queueEmail(tx, {
      dedupeKey: `password-reset:${row.id}`,
      template: "password-reset",
      to: user.email,
      ...passwordResetEmail({
        name: user.name,
        resetUrl: siteUrl(`/account/sifre-sifirla?token=${token}`),
        validMinutes: RESET_VALID_MINUTES,
      }),
    });
  });
  deliverSoon();
}

export type ResetResult = { ok: true } | { ok: false; error: string };

export async function resetPassword(token: string, newPassword: string): Promise<ResetResult> {
  const invalid = { ok: false as const, error: "Bu bağlantı geçersiz ya da süresi dolmuş. Yeni bir bağlantı iste." };
  const tokenHash = hashResetToken(token);
  const passwordHash = await hashPassword(newPassword);

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    // Check and use in one statement: two tabs submitting the same link
    // can't both succeed.
    const { count } = await tx.passwordResetToken.updateMany({
      where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (count === 0) return invalid;
    const row = await tx.passwordResetToken.findUniqueOrThrow({ where: { tokenHash } });
    await tx.user.update({ where: { id: row.userId }, data: { passwordHash } });
    // Any other links still out there stop working too.
    await tx.passwordResetToken.updateMany({ where: { userId: row.userId, usedAt: null }, data: { usedAt: now } });
    return { ok: true as const };
  });
}
