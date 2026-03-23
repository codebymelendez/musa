// Autenticación ligera para clientas (sin contraseña).
// Usa phone + name para verificar identidad → devuelve JWT almacenado en localStorage.

import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  (process.env.JWT_SECRET ?? "dev-secret-change-in-production") + "_client"
);
const EXPIRES_IN = "30d";

export interface ClientJWTPayload {
  clientPhone: string;
  clientName: string;
}

export async function signClientToken(payload: ClientJWTPayload): Promise<string> {
  return new SignJWT({ ...payload, purpose: "client" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(JWT_SECRET);
}

export async function verifyClientToken(token: string): Promise<ClientJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.purpose !== "client") return null;
    return payload as unknown as ClientJWTPayload;
  } catch {
    return null;
  }
}

// ── Lee el token del header Authorization: Bearer <token> ─────────────────────
export async function getClientSession(
  authHeader: string | null
): Promise<ClientJWTPayload | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  return verifyClientToken(token);
}
