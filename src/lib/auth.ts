// Helpers de autenticación usando `jose` (compatible con Edge Runtime)
// Se usa en middleware.ts (Edge) y en API routes (Node.js).

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const COOKIE_NAME = "musa_session";
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-change-in-production"
);
const EXPIRES_IN = "30d";

export interface JWTPayload {
  userId: string;
  phone: string;
  slug: string;
}

// ─── Crear token JWT ──────────────────────────────────────────────────────────
export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(JWT_SECRET);
}

// ─── Verificar token JWT ──────────────────────────────────────────────────────
export async function verifyToken(
  token: string
): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

// ─── Obtener sesión desde cookies (en API routes de Node.js) ─────────────────
export async function getSession(
  req?: NextRequest
): Promise<JWTPayload | null> {
  let token: string | undefined;

  if (req) {
    // Desde middleware o API route con Request
    token = req.cookies.get(COOKIE_NAME)?.value;
  } else {
    // Desde Server Component o API route con next/headers
    const cookieStore = await cookies();
    token = cookieStore.get(COOKIE_NAME)?.value;
  }

  if (!token) return null;
  return verifyToken(token);
}

// ─── Opciones de cookie HTTP-only ─────────────────────────────────────────────
export function sessionCookieOptions(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 días
  };
}

export function clearSessionCookieOptions() {
  return {
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}
