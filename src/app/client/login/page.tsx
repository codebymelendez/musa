"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ClientLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "name">("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/client/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, name }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "No pudimos verificar tu identidad");
        return;
      }

      // Guardar token en localStorage
      localStorage.setItem("musa_client_token", data.token);
      localStorage.setItem("musa_client_name", data.clientName);
      router.push("/client");
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-body flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo & back */}
        <div className="space-y-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
            Inicio
          </Link>

          <div className="space-y-2">
            <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary-sm">
              <span className="text-2xl">💅</span>
            </div>
            <h1 className="font-headline text-2xl font-extrabold tracking-tighter text-on-surface">
              Área de clientas
            </h1>
            <p className="text-sm text-on-surface-variant">
              Verifica tu identidad para ver tus citas y reservas.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 flex items-start gap-2">
              <span className="material-symbols-outlined text-sm mt-0.5 flex-shrink-0">error</span>
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Teléfono
              </label>
              <input
                className="w-full bg-surface-container-high border-none rounded-xl py-4 px-5 focus:ring-2 focus:ring-primary-container text-on-surface placeholder:text-on-surface-variant/50 text-sm"
                type="tel"
                placeholder="+58 424 000 0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoComplete="tel"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Tu nombre completo
              </label>
              <input
                className="w-full bg-surface-container-high border-none rounded-xl py-4 px-5 focus:ring-2 focus:ring-primary-container text-on-surface placeholder:text-on-surface-variant/50 text-sm"
                type="text"
                placeholder="Tu nombre completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
              <p className="text-xs text-on-surface-variant px-1">
                Usamos tu nombre para confirmar tu identidad, sin contraseña.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !phone || !name}
            className="w-full h-14 bg-primary text-white font-headline font-bold rounded-full shadow-lg shadow-primary-sm hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
            ) : (
              <>
                Acceder a mis citas
                <span className="material-symbols-outlined">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        <div className="bg-surface-container-lowest rounded-2xl p-4 text-center space-y-2 border border-outline-variant/20">
          <p className="text-xs text-on-surface-variant font-medium">
            ¿Aún no tienes cuenta?
          </p>
          <Link
            href="/client/register"
            className="inline-flex items-center gap-1 text-sm font-bold text-on-surface hover:text-primary transition-colors"
          >
            Crea tu perfil de clienta →
          </Link>
        </div>
      </div>
    </div>
  );
}
