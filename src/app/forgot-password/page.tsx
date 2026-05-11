"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al enviar el correo");
        return;
      }

      setSent(true);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-primary-sm">
            <span
              className="material-symbols-outlined text-white text-3xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              lock_reset
            </span>
          </div>
          <h1 className="font-headline text-2xl font-extrabold tracking-tighter text-on-surface">
            Recuperar Contraseña
          </h1>
          <p className="text-sm text-on-surface-variant">
            Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
          </p>
        </div>

        {sent ? (
          <div className="bg-tertiary-fixed/30 rounded-2xl p-6 text-center space-y-3">
            <span
              className="material-symbols-outlined text-4xl text-tertiary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              mark_email_read
            </span>
            <h2 className="font-headline text-lg font-bold text-on-surface">¡Correo enviado!</h2>
            <p className="text-sm text-on-surface-variant">
              Si existe una cuenta con ese email, recibirás un enlace en los próximos minutos.
              Revisa tu bandeja de spam si no aparece.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-sm font-bold text-primary mt-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">error</span>
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Email
              </label>
              <input
                className="w-full bg-surface-container-high border-none rounded-xl py-4 px-5 focus:ring-2 focus:ring-primary-container text-on-surface placeholder:text-on-surface-variant/50"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full h-14 bg-primary text-white font-headline font-bold rounded-full shadow-lg shadow-primary-sm hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
              ) : (
                "Enviar enlace de recuperación"
              )}
            </button>

            <p className="text-center text-sm text-on-surface-variant">
              ¿Recuerdas tu contraseña?{" "}
              <Link href="/login" className="text-primary font-bold hover:underline">
                Iniciar sesión
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
