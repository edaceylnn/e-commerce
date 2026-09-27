import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

// jose works identically on the Node.js and Edge runtimes, which is what lets
// the /api/auth/me route below run as a Vercel Edge Function while still
// verifying the same token minted by the Node.js login route.
const SESSION_COOKIE = "store_session";
const SESSION_TTL_SECONDS = 60 * 60 * 2; // 2 hours

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

export type Role = "CUSTOMER" | "ADMIN";

export type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  role: Role;
};

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySession(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
export const SESSION_MAX_AGE = SESSION_TTL_SECONDS;

// Reads and verifies the session cookie for the current request. Safe to
// call from any Server Component or Route Handler (cookies() resolves via
// Next's request-scoped context, not just from page/route files directly).
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

// For /admin pages and /api/admin/* route handlers to gate on.
export async function requireAdmin(): Promise<SessionPayload | null> {
  const session = await getSession();
  return session?.role === "ADMIN" ? session : null;
}
