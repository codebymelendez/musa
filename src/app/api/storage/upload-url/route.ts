// POST /api/storage/upload-url
// Emite signed upload URLs para Supabase Storage. El móvil no escribe en
// Storage directamente (su cliente no adjunta la sesión y choca con RLS);
// la autorización de escritura vive aquí, igual que el proxy de Google.
// El servidor construye SIEMPRE la ruta — nunca acepta una ruta del cliente.

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { rateLimit } from "@/lib/rateLimit";

const ALLOWED_EXTS = ["jpg", "jpeg", "png", "webp"] as const;
const BUSINESS_KINDS = ["logo", "cover", "gallery"] as const;

type Kind = "logo" | "cover" | "gallery" | "avatar";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!rateLimit(`storage:upload-url:${session.userId}`, { limit: 30, windowMs: 60_000 })) {
      return NextResponse.json({ error: "Demasiadas peticiones" }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    const kind = body?.kind as Kind | undefined;
    const fileExt = String(body?.fileExt ?? "").toLowerCase();

    if (!kind || !([...BUSINESS_KINDS, "avatar"] as string[]).includes(kind)) {
      return NextResponse.json({ error: "kind inválido" }, { status: 400 });
    }
    if (!(ALLOWED_EXTS as readonly string[]).includes(fileExt)) {
      return NextResponse.json({ error: "Extensión no permitida" }, { status: 400 });
    }

    const admin = createAdminClient();

    let bucket: string;
    let path: string;

    if (kind === "avatar") {
      bucket = "staff-avatars";
      path = `avatars/${session.userId}-${Date.now()}.${fileExt}`;
    } else {
      const { data: user } = await admin
        .from("User")
        .select("businessId")
        .eq("id", session.userId)
        .single();

      if (!user?.businessId) {
        return NextResponse.json({ error: "Sin negocio asociado" }, { status: 403 });
      }
      bucket = "business-photos";
      path = `${user.businessId}/${kind}_${Date.now()}.${fileExt}`;
    }

    const { data: signed, error: signError } = await admin.storage
      .from(bucket)
      .createSignedUploadUrl(path);

    if (signError || !signed) {
      console.error("[storage/upload-url]", signError?.message ?? "sin respuesta");
      return NextResponse.json({ error: "No se pudo firmar la subida" }, { status: 502 });
    }

    const { data: { publicUrl } } = admin.storage.from(bucket).getPublicUrl(path);

    return NextResponse.json({
      bucket,
      path,
      token: signed.token,
      signedUrl: signed.signedUrl,
      publicUrl,
    });
  } catch (error) {
    console.error("[storage/upload-url]", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
