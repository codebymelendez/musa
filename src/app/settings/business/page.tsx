"use client";

import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useRouter } from "next/navigation";
import ImageUploader from "@/components/ui/ImageUploader";

export default function BusinessSettingsPage() {
  const { user, setUser } = useAppStore();
  const router = useRouter();
  
  const [name,      setName]      = useState(user?.business?.name || "");
  const [city,      setCity]      = useState(user?.business?.city || "");
  const [logoUrl,   setLogoUrl]   = useState(user?.business?.logoUrl || "");
  const [saving,    setSaving]    = useState(false);
  const [message,   setMessage]   = useState<{ type: 'success' | 'error', text: string } | null>(null);

  if (user?.role !== "OWNER") {
    return <div className="p-8 text-center">No autorizado</div>;
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
              storagePath={`business/${user?.business?.id ?? 'new'}/logo`}
              onUploaded={(url) => setLogoUrl(url)}
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
