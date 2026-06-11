// POST /api/storage/delete
// Borra una foto de galería: el objeto de Storage y su fila de BusinessPhoto.
// Solo acepta rutas dentro del prefijo {businessId}/ del usuario autenticado.

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { rateLimit } from "@/lib/rateLimit";

const BUCKET = "business-photos";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!rateLimit(`storage:delete:${session.userId}`, { limit: 30, windowMs: 60_000 })) {
      return NextResponse.json({ error: "Demasiadas peticiones" }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    const kind = body?.kind;
    const path = typeof body?.path === "string" ? body.path : "";

    if (kind !== "gallery") {
      return NextResponse.json({ error: "kind inválido" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: user } = await admin
      .from("User")
      .select("businessId")
      .eq("id", session.userId)
      .single();

    if (!user?.businessId) {
      return NextResponse.json({ error: "Sin negocio asociado" }, { status: 403 });
    }

    // El path debe vivir dentro del prefijo del negocio del usuario; nada de
    // traversal, rutas absolutas ni saltos a otros negocios.
    if (
      !path.startsWith(`${user.businessId}/`) ||
      path.includes("..") ||
      path.startsWith("/") ||
      path.includes("\\")
    ) {
      return NextResponse.json({ error: "Ruta no permitida" }, { status: 403 });
    }

    // Best-effort en ambos lados: cada borrado se intenta aunque el otro falle.
    const { data: removed, error: storageError } = await admin.storage
      .from(BUCKET)
      .remove([path]);
    const storageDeleted = !storageError && (removed?.length ?? 0) > 0;
    if (storageError) {
      console.error("[storage/delete] storage:", storageError.message);
    }

    const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(path);
    const { data: deletedRows, error: rowError } = await admin
      .from("BusinessPhoto")
      .delete()
      .eq("businessId", user.businessId)
      .eq("url", publicUrl)
      .select("id");
    const rowDeleted = !rowError && (deletedRows?.length ?? 0) > 0;
    if (rowError) {
      console.error("[storage/delete] row:", rowError.message);
    }

    if (storageError && rowError) {
      return NextResponse.json({ error: "No se pudo eliminar la foto" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, storageDeleted, rowDeleted });
  } catch (error) {
    console.error("[storage/delete]", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
