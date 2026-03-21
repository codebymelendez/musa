// Middleware de Next.js – Protección de rutas privadas
// Corre en Edge Runtime: solo usa `jose` (NO Prisma, NO bcryptjs).

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// Rutas que requieren autenticación
const PRIVATE_ROUTES = ["/home", "/calendar", "/services", "/stats", "/profile", "/onboarding"];

// Rutas solo para usuarios NO autenticados
const AUTH_ROUTES = ["/login", "/register"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Ignorar archivos estáticos y API ───────────────────────────────────────
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/p/") ||   // booking público - siempre accesible
    pathname.includes(".") // archivos estáticos (.ico, .png, etc.)
  ) {
    return NextResponse.next();
  }

  const session = await getSession(req);

  // ── Usuario autenticado intenta acceder a login/register → redirigir a home
  if (session && AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL("/home", req.url));
  }

  // ── Ruta privada sin sesión → redirigir a login ───────────────────────────
  if (!session && PRIVATE_ROUTES.some((r) => pathname.startsWith(r))) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Onboarding: si el user existe pero no ha hecho onboarding ─────────────
  // (La verificación de onboardingDone se hace en la propia página de home
  //  para no hacer una query DB en el middleware Edge)

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static
     * - _next/image
     * - favicon.ico
     * - Archivos estáticos
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
