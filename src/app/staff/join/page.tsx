"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAppStore();
  
  const token = searchParams.get("token");
  const [business, setBusiness] = useState<{ name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    password: "",
  });

  useEffect(() => {
    if (!token) {
      setError("Token de invitación faltante.");
      setLoading(false);
      return;
    }
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const res = await fetch(`/api/team/invite/validate?token=${token}`);
      if (res.ok) {
        const data = await res.json();
        setBusiness(data.business);
      } else {
        setError("Esta invitación no es válida o ha expirado.");
      }
    } catch (err) {
      setError("Error al validar la invitación.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, token }),
      });

      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        router.push("/onboarding"); // Staff también hace onboarding pero simplificado si queremos
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Error al crear la cuenta.");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !business) return <div className="p-12 text-center text-primary animate-pulse">Validando invitación...</div>;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 bg-surface-container-low p-8 rounded-3xl border border-outline-variant">
        <div className="text-center space-y-2">
          <h1 className="font-headline text-3xl font-extrabold text-primary">Unirte a Musâ</h1>
          {business && (
            <p className="text-on-surface-variant">
              Has sido invitado a unirte a <span className="text-primary font-bold">{business.name}</span>
            </p>
          )}
        </div>

        {error && (
          <div className="p-4 bg-error-container text-on-error-container rounded-xl text-sm">
            {error}
          </div>
        )}

        {!error && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Tu Nombre</label>
              <input
                required
                type="text"
                placeholder="Ej. María Pérez"
                className="w-full h-14 px-5 bg-surface-container-high rounded-2xl border-none focus:ring-2 focus:ring-primary"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Tu Teléfono</label>
              <input
                required
                type="tel"
                placeholder="+58 412..."
                className="w-full h-14 px-5 bg-surface-container-high rounded-2xl border-none focus:ring-2 focus:ring-primary"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Contraseña</label>
              <input
                required
                type="password"
                placeholder="Mínimo 6 caracteres"
                className="w-full h-14 px-5 bg-surface-container-high rounded-2xl border-none focus:ring-2 focus:ring-primary"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <button
              disabled={loading}
              className="w-full h-14 bg-primary text-on-primary font-bold rounded-full shadow-primary-sm flex items-center justify-center gap-2 mt-4"
            >
              {loading ? "Creando cuenta..." : "Aceptar Invitación"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <JoinContent />
    </Suspense>
  );
}
