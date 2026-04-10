"use client";

import { useRef, useState } from "react";
import Image from "next/image";

interface Props {
  /** URL actual de la imagen (para mostrar preview antes de subir) */
  currentUrl?: string | null;
  /** Bucket de Supabase donde se subirá el archivo */
  bucket: string;
  /** Prefijo de ruta dentro del bucket, ej: "business/biz123" */
  storagePath: string;
  /** Callback con la URL pública tras subir con éxito */
  onUploaded: (url: string) => void;
  /** Texto de ayuda opcional */
  hint?: string;
  /** Forma de la previsualización */
  shape?: "circle" | "rounded";
  /** Iniciales fallback si no hay imagen */
  fallbackInitials?: string;
}

const MAX_MB = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Comprime una imagen en el cliente usando canvas. */
async function compressImage(file: File, maxDimension = 1080, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) { height = Math.round((height * maxDimension) / width); width = maxDimension; }
        else { width = Math.round((width * maxDimension) / height); height = maxDimension; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => { if (blob) resolve(blob); else reject(new Error("Error al comprimir")); },
        "image/webp", quality
      );
    };
    img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
    img.src = url;
  });
}

export default function ImageUploader({
  currentUrl,
  bucket,
  storagePath,
  onUploaded,
  hint = "JPG, PNG o WebP · máx. 5 MB",
  shape = "rounded",
  fallbackInitials,
}: Props) {
  const inputRef              = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const displayUrl = preview ?? currentUrl;

  const handleFile = async (file: File) => {
    setError(null);

    // Validación de tipo
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Solo se aceptan imágenes JPG, PNG o WebP.");
      return;
    }
    // Validación de tamaño antes de comprimir
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`La imagen supera los ${MAX_MB} MB. Elige una más pequeña.`);
      return;
    }

    setLoading(true);
    setProgress(20);

    try {
      // 1) Comprimir en el cliente
      const compressed = await compressImage(file);
      setProgress(50);

      // 2) Previsualizar localmente
      const localUrl = URL.createObjectURL(compressed);
      setPreview(localUrl);
      setProgress(60);

      // 3) Subir al route handler seguro del servidor
      const formData = new FormData();
      formData.append("file", compressed, `image-${Date.now()}.webp`);
      formData.append("bucket", bucket);
      formData.append("path", `${storagePath}-${Date.now()}.webp`);

      setProgress(70);
      const res  = await fetch("/api/storage/upload", { method: "POST", body: formData });
      const data = await res.json();
      setProgress(95);

      if (!res.ok || data.error) {
        setError(data.error ?? "Error al subir la imagen");
        setPreview(null);
        return;
      }

      onUploaded(data.url);
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 800);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const isCircle = shape === "circle";

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Preview / Drop zone */}
      <div
        onClick={() => !loading && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className={`relative overflow-hidden cursor-pointer group transition-all duration-300 ${
          isCircle
            ? "w-28 h-28 rounded-full"
            : "w-full aspect-video max-w-xs rounded-2xl"
        } ${loading ? "opacity-70" : "hover:ring-2 hover:ring-primary"} bg-surface-container-high`}
      >
        {displayUrl ? (
          <Image
            src={displayUrl}
            alt="Foto"
            fill
            className="object-cover"
            unoptimized={!!preview} // preview es blob URL
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-on-surface-variant/40">
            {fallbackInitials ? (
              <span className="text-4xl font-bold text-primary/60">{fallbackInitials}</span>
            ) : (
              <span className="material-symbols-outlined text-5xl">add_photo_alternate</span>
            )}
          </div>
        )}

        {/* Overlay hover */}
        {!loading && (
          <div className={`absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${isCircle ? "rounded-full" : "rounded-2xl"}`}>
            <span className="material-symbols-outlined text-white text-3xl">photo_camera</span>
            <span className="text-white text-xs mt-1 font-semibold">Cambiar</span>
          </div>
        )}

        {/* Progress bar */}
        {loading && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Loading spinner */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <span className="material-symbols-outlined text-white animate-spin text-3xl">progress_activity</span>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-error bg-error-container px-3 py-1.5 rounded-xl max-w-xs text-center">
          {error}
        </p>
      )}

      {/* Hint */}
      <p className="text-xs text-on-surface-variant/60 text-center">{hint}</p>

      {/* Input oculto */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
