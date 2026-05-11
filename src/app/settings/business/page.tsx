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
          <h1 className="font-headline text-3xl font-extrabold text-on-surface">Configuración</h1>
          <p className="text-on-surface-variant">Personaliza los datos públicos de tu negocio.</p>
        </header>

        <form onSubmit={handleSave} className="bg-surface-container-low p-6 rounded-3xl space-y-6">

          {/* Logo del negocio */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest ml-1">Logo del Negocio</p>
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
              <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Nombre del Negocio</label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-14 px-5 bg-surface-container-high rounded-2xl border-none focus:ring-2 focus:ring-primary text-on-surface font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Ciudad</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full h-14 px-5 bg-surface-container-high rounded-2xl border-none focus:ring-2 focus:ring-primary text-on-surface"
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
            className="w-full h-14 bg-primary text-on-primary font-bold rounded-full shadow-primary-sm flex items-center justify-center gap-2"
          >
            {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </form>

        <section className="bg-surface-container-low p-6 rounded-3xl space-y-4">
           <h2 className="font-bold text-on-surface">Plan Actual</h2>
           <div className="flex items-center justify-between p-4 bg-primary/10 rounded-2xl">
              <div>
                <p className="font-bold text-primary">{user.business?.plan?.name || "FREE"}</p>
                <p className="text-xs text-on-surface-variant">Límite de 30 citas/mes</p>
              </div>
              <button 
                type="button"
                onClick={() => router.push("/settings/plans")}
                className="text-primary font-bold text-sm underline"
              >
                Ver Planes
              </button>
           </div>
        </section>
      </div>
    </div>
  );
}
