import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";

const ALLOWED_BUCKETS = ["business-avatars", "staff-avatars", "service-images"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const bucket = formData.get("bucket") as string | null;
    const path   = formData.get("path")   as string | null;

    if (!file || !bucket || !path) {
      return NextResponse.json({ error: "Faltan parámetros: file, bucket, path" }, { status: 400 });
    }

    // Whitelist de buckets permitidos
    if (!ALLOWED_BUCKETS.includes(bucket)) {
      return NextResponse.json({ error: "Bucket no permitido" }, { status: 400 });
    }

    // Verificar tamaño
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "El archivo supera 5 MB" }, { status: 400 });
    }

    // Verificar tipo MIME
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return NextResponse.json({ error: "Tipo de archivo no permitido" }, { status: 400 });
    }

    const supabase = await createClient();

    const arrayBuffer = await file.arrayBuffer();
    const buffer      = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType: file.type,
        upsert:      true,
      });

    if (uploadError) {
      console.error("[storage upload error]", uploadError);
      return NextResponse.json({ error: "Error al subir la imagen" }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (err) {
    console.error("[storage upload POST]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
