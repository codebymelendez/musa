"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="material-symbols-outlined text-primary animate-spin text-4xl">progress_activity</span>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!token) setError("Enlace inválido. Por favor solicita uno nuevo.");
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al restablecer la contraseña");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant">link_off</span>
          <h2 className="font-headline text-xl font-bold text-on-surface">Enlace inválido</h2>
          <Link href="/forgot-password" className="text-primary font-bold hover:underline text-sm">
            Solicitar nuevo enlace →
          </Link>
        </div>
      </div>
    );
  }

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
              key
            </span>
          </div>
          <h1 className="font-headline text-2xl font-extrabold tracking-tighter text-on-surface">
            Nueva Contraseña
          </h1>
          <p className="text-sm text-on-surface-variant">
            Elige una contraseña segura para tu cuenta.
          </p>
        </div>

        {success ? (
          <div className="bg-tertiary-fixed/30 rounded-2xl p-6 text-center space-y-3">
            <span
              className="material-symbols-outlined text-4xl text-tertiary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
            <h2 className="font-headline text-lg font-bold text-on-surface">
              ¡Contraseña actualizada!
            </h2>
            <p className="text-sm text-on-surface-variant">
              Serás redirigida al inicio de sesión en unos segundos...
            </p>
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
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  className="w-full bg-surface-container-high border-none rounded-xl py-4 pl-5 pr-14 focus:ring-2 focus:ring-primary-container text-on-surface placeholder:text-on-surface-variant/50"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant"
                >
                  <span className="material-symbols-outlined text-lg">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Confirmar contraseña
              </label>
              <input
                className="w-full bg-surface-container-high border-none rounded-xl py-4 px-5 focus:ring-2 focus:ring-primary-container text-on-surface placeholder:text-on-surface-variant/50"
                type={showPassword ? "text" : "password"}
                placeholder="Repite la contraseña"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            {/* Indicador de fortaleza */}
            {password.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        password.length >= i * 3
                          ? password.length >= 12
                            ? "bg-green-500"
                            : password.length >= 8
                            ? "bg-yellow-400"
                            : "bg-red-400"
                          : "bg-surface-container-high"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-on-surface-variant">
                  {password.length < 6
                    ? "Muy corta"
                    : password.length < 8
                    ? "Débil"
                    : password.length < 12
                    ? "Aceptable"
                    : "Fuerte"}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password || !confirm}
              className="w-full h-14 bg-primary text-white font-headline font-bold rounded-full shadow-lg shadow-primary-sm hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
              ) : (
                "Guardar nueva contraseña"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
