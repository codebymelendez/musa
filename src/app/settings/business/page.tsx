"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useRouter } from "next/navigation";
import ImageUploader from "@/components/ui/ImageUploader";

export default function BusinessSettingsPage() {
  const { user, setUser } = useAppStore();
  const router = useRouter();

  const [name,      setName]      = useState("");
  const [city,      setCity]      = useState("");
  const [logoUrl,   setLogoUrl]   = useState("");
  const [saving,    setSaving]    = useState(false);
  const [message,   setMessage]   = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [hydrated,  setHydrated]  = useState(false);

  // Sincronizar valores del formulario cuando el store de Zustand cargue
  useEffect(() => {
    if (user !== undefined) {
      if (user) {
        setName(user.business?.name || "");
        setCity(user.business?.city || "");
        setLogoUrl((user.business as any)?.logoUrl || "");
      }
      setHydrated(true);
    }
  }, [user]);

  // Skeleton mientras el store hidrata
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-background p-6 pb-32 pt-20">
        <div className="max-w-md mx-auto space-y-8">
          <div className="space-y-2">
            <div className="h-8 w-40 bg-surface-sunken rounded-lg animate-pulse" />
            <div className="h-4 w-64 bg-surface-sunken rounded animate-pulse" />
          </div>
          <div className="bg-surface border border-outline-variant/30 p-6 rounded-xl space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="w-full aspect-video max-w-xs rounded-2xl bg-surface-sunken animate-pulse" />
            </div>
            <div className="space-y-3">
              <div className="h-4 w-32 bg-surface-sunken rounded animate-pulse" />
              <div className="h-12 w-full bg-surface-sunken rounded-xl animate-pulse" />
            </div>
            <div className="space-y-3">
              <div className="h-4 w-20 bg-surface-sunken rounded animate-pulse" />
              <div className="h-12 w-full bg-surface-sunken rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user || user.role !== "OWNER") {
    return <div className="p-8 text-center text-on-surface-muted">No autorizado</div>;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName: name, city, logoUrl: logoUrl || undefined }),
      });

      if (res.ok) {
        const data = await res.json();
        if (user) {
          setUser({ ...user, business: data.business });
        }
        setMessage({ type: 'success', text: 'Cambios guardados correctamente' });
      } else {
        setMessage({ type: 'error', text: 'Error al guardar cambios' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error de conexión' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 pb-32 pt-20">
      <div className="max-w-md mx-auto space-y-8">
        <header className="space-y-1">
          <h1 className="font-cormorant font-normal text-[28px] text-on-surface">Configuración</h1>
          <p className="text-on-surface-variant text-[15px]">Personaliza los datos públicos de tu negocio.</p>
        </header>

        <form onSubmit={handleSave} className="bg-surface border border-outline-variant/30 p-6 rounded-xl space-y-6">

          {/* Logo del negocio */}
          <div className="space-y-3">
            <p className="musa-sublabel">Logo del Negocio</p>
            <ImageUploader
              currentUrl={logoUrl || null}
              bucket="business-avatars"
              storagePath={`business/${user.business?.id ?? 'new'}/logo`}
              onUploaded={(url) => {
                setLogoUrl(url);
                setMessage({ type: 'success', text: 'Imagen cargada. Haz clic en "Guardar Cambios" para aplicar.' });
              }}
              shape="rounded"
              fallbackInitials={name ? name.slice(0,2).toUpperCase() : undefined}
              hint="Imagen de tu negocio · JPG, PNG o WebP · máx. 5 MB"
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="musa-sublabel">Nombre del Negocio</label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="musa-input"
              />
            </div>
            <div className="space-y-2">
              <label className="musa-sublabel">Ciudad</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="musa-input"
              />
            </div>
          </div>

          {message && (
            <div className={`p-4 rounded-xl font-ui text-[13px] ${message.type === 'success' ? 'bg-success-surface text-success' : 'bg-error-surface text-error'}`}>
              {message.text}
            </div>
          )}

          <button
            disabled={saving}
            className="w-full h-14 bg-primary text-on-primary font-medium rounded-full shadow-primary-sm flex items-center justify-center gap-2"
          >
            {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </form>

        <section className="bg-surface border border-outline-variant/30 p-6 rounded-xl space-y-4">
           <h2 className="font-ui font-medium text-[15px] text-on-surface">Plan Actual</h2>
           <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/10 rounded-xl">
              <div>
                <p className="font-ui font-medium text-primary">{user.business?.plan?.name || "FREE"}</p>
                <p className="text-xs text-on-surface-variant">Límite de 30 citas/mes</p>
              </div>
              <button 
                type="button"
                onClick={() => router.push("/settings/plans")}
                className="text-primary font-medium text-sm underline"
              >
                Ver Planes
              </button>
           </div>
        </section>
      </div>
    </div>
  );
}
