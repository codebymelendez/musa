"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ArrowRightIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import MusaLogo from "@/components/brand/MusaLogo";
import GoogleSignInButton from "@/components/GoogleSignInButton";

export default function Login() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isRegister) {
        await register({ email, name, password });
      } else {
        await login({ email, password });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsRegister((v) => !v);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-cream-100 font-ui antialiased flex flex-col items-center justify-center px-5 py-12 relative">
      {/* Subtle background texture */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, #1A0E0B 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      <main className="relative w-full max-w-[400px] space-y-8 z-10">
        {/* Brand */}
        <header className="text-center space-y-2">
          <div className="flex justify-center">
            <MusaLogo variant="combo" size="lg" />
          </div>
          <p className="font-ui text-[14px] text-on-surface-muted">
            {isRegister
              ? "Crea tu espacio de trabajo"
              : "Bienvenida de nuevo"}
          </p>
        </header>

        {/* Card */}
        <section className="bg-surface-raised border border-border-subtle rounded-2xl p-7 shadow-md space-y-6">
          {/* Google OAuth */}
          <GoogleSignInButton
            label={isRegister ? "Registrarme con Google" : "Continuar con Google"}
          />

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border-subtle" />
            <span className="font-ui text-[12px] text-on-surface-subtle">o</span>
            <div className="flex-1 h-px bg-border-subtle" />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-error-surface border border-error/20 rounded-lg px-4 py-3">
              <p className="font-ui text-[13px] text-error leading-snug">{error}</p>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            {isRegister && (
              <div className="space-y-1.5">
                <label
                  htmlFor="name"
                  className="musa-sublabel"
                >
                  Tu nombre
                </label>
                <input
                  id="name"
                  className="w-full h-11 px-3.5 bg-surface-sunken border border-border rounded-md font-ui text-[15px] text-on-surface placeholder:text-on-surface-subtle outline-none transition-all focus:border-border-focus focus:bg-surface-raised focus:shadow-[0_0_0_3px_rgba(181,89,62,0.10)]"
                  placeholder="Ana López"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={isRegister}
                  autoComplete="name"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="musa-sublabel"
              >
                Correo electrónico
              </label>
              <input
                id="email"
                className="w-full h-11 px-3.5 bg-surface-sunken border border-border rounded-md font-ui text-[15px] text-on-surface placeholder:text-on-surface-subtle outline-none transition-all focus:border-border-focus focus:bg-surface-raised focus:shadow-[0_0_0_3px_rgba(181,89,62,0.10)]"
                placeholder="tu@correo.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="musa-sublabel"
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  className="w-full h-11 pl-3.5 pr-11 bg-surface-sunken border border-border rounded-md font-ui text-[15px] text-on-surface placeholder:text-on-surface-subtle outline-none transition-all focus:border-border-focus focus:bg-surface-raised focus:shadow-[0_0_0_3px_rgba(181,89,62,0.10)]"
                  placeholder="Mínimo 6 caracteres"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={isRegister ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-subtle hover:text-on-surface-muted transition-colors"
                  aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-4 h-4" />
                  ) : (
                    <EyeIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-primary text-on-primary font-ui font-medium text-[14px] rounded-full flex items-center justify-center gap-2 shadow-primary-sm hover:bg-primary-hover transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border border-on-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {isRegister ? "Crear mi cuenta" : "Entrar a mi espacio"}
                  <ArrowRightIcon className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {!isRegister && (
            <div className="text-center">
              <Link
                href="/forgot-password"
                className="font-ui text-[13px] text-on-surface-subtle hover:text-on-surface-muted transition-colors underline underline-offset-2"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          )}

          <div className="border-t border-border-subtle pt-5 text-center">
            <p className="font-ui text-[13px] text-on-surface-muted">
              {isRegister ? "¿Ya tienes cuenta? " : "¿Nueva en Musa? "}
              <button
                type="button"
                onClick={switchMode}
                className="font-medium text-primary hover:underline underline-offset-2 transition-colors"
              >
                {isRegister ? "Iniciar sesión" : "Crear cuenta gratis"}
              </button>
            </p>
          </div>
        </section>

        {/* Trust line */}
        <p className="text-center font-ui text-[12px] text-on-surface-subtle">
          Sin contratos · Sin tarjeta · Cancela cuando quieras
        </p>
      </main>

      {/* Legal footer */}
      <footer className="absolute bottom-6 flex gap-6 font-ui text-[11px] font-medium text-on-surface-subtle/60">
        <Link href="#" className="hover:text-on-surface-muted transition-colors">
          Privacidad
        </Link>
        <Link href="#" className="hover:text-on-surface-muted transition-colors">
          Términos
        </Link>
        <Link href="#" className="hover:text-on-surface-muted transition-colors">
          Soporte
        </Link>
      </footer>
    </div>
  );
}
