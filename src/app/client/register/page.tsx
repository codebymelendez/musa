"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MusaLogo from "@/components/brand/MusaLogo";
import GoogleSignInButton from "@/components/GoogleSignInButton";

export default function ClientRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    birthday: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fullName = [form.firstName.trim(), form.lastName.trim()].filter(Boolean).join(" ");

    try {
      const res = await fetch("/api/client/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName,
          phone: form.phone,
          email: form.email,
          birthday: form.birthday || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al registrarse");

      // Guardar sesión en localStorage
      localStorage.setItem("musa_client_name", fullName);
      localStorage.setItem("musa_client_phone", form.phone);
      if (form.email) localStorage.setItem("musa_client_email", form.email);
      if (data.token) localStorage.setItem("musa_client_token", data.token);

      router.push("/client");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al registrarse");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-100 font-ui antialiased flex flex-col items-center justify-center px-5 py-12 relative">
      {/* Subtle background */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, #1A0E0B 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      <main className="relative w-full max-w-[400px] space-y-8 z-10">
        {/* Brand + back */}
        <header className="space-y-4">
          <Link
            href="/client"
            className="flex items-center gap-1.5 font-ui text-[13px] text-on-surface-subtle hover:text-on-surface-muted transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Volver
          </Link>
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <MusaLogo variant="combo" size="md" />
            </div>
            <p className="font-display font-normal italic text-on-surface text-[22px]" style={{ letterSpacing: "-0.01em" }}>
              Crea tu perfil
            </p>
            <p className="font-ui text-[14px] text-on-surface-muted">
              Guarda tus datos para gestionar tus citas más rápido.
            </p>
          </div>
        </header>

        {/* Card */}
        <section className="bg-surface-raised border border-border-subtle rounded-2xl p-7 shadow-md space-y-5">
          {error && (
            <div className="bg-error-surface border border-error/20 rounded-lg px-4 py-3">
              <p className="font-ui text-[13px] text-error leading-snug">{error}</p>
            </div>
          )}

          {/* Google — rápido y sin formulario */}
          <GoogleSignInButton
            label="Registrarme con Google"
            defaultRole="client"
            onError={(msg) => setError(msg)}
          />

          {/* Separador */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border-subtle" />
            <span className="font-ui text-[11px] text-on-surface-subtle">o con tu teléfono</span>
            <div className="flex-1 h-px bg-border-subtle" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nombre + Apellido en fila */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="firstName" className="musa-sublabel">Nombre *</label>
                <input
                  id="firstName"
                  className="w-full h-11 px-3.5 bg-surface-sunken border border-border rounded-md font-ui text-[15px] text-on-surface placeholder:text-on-surface-subtle outline-none transition-all focus:border-border-focus focus:bg-surface-raised focus:shadow-[0_0_0_3px_rgba(181,89,62,0.10)]"
                  placeholder="Ana"
                  type="text"
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  required
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="lastName" className="musa-sublabel">Apellido *</label>
                <input
                  id="lastName"
                  className="w-full h-11 px-3.5 bg-surface-sunken border border-border rounded-md font-ui text-[15px] text-on-surface placeholder:text-on-surface-subtle outline-none transition-all focus:border-border-focus focus:bg-surface-raised focus:shadow-[0_0_0_3px_rgba(181,89,62,0.10)]"
                  placeholder="López"
                  type="text"
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                  required
                  autoComplete="family-name"
                />
              </div>
            </div>

            {/* Teléfono */}
            <div className="space-y-1.5">
              <label htmlFor="phone" className="musa-sublabel">Teléfono *</label>
              <input
                id="phone"
                className="w-full h-11 px-3.5 bg-surface-sunken border border-border rounded-md font-ui text-[15px] text-on-surface placeholder:text-on-surface-subtle outline-none transition-all focus:border-border-focus focus:bg-surface-raised focus:shadow-[0_0_0_3px_rgba(181,89,62,0.10)]"
                placeholder="+58 424 000 0000"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                required
                autoComplete="tel"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="musa-sublabel">
                Email <span className="text-on-surface-subtle font-normal normal-case">(opcional)</span>
              </label>
              <input
                id="email"
                className="w-full h-11 px-3.5 bg-surface-sunken border border-border rounded-md font-ui text-[15px] text-on-surface placeholder:text-on-surface-subtle outline-none transition-all focus:border-border-focus focus:bg-surface-raised focus:shadow-[0_0_0_3px_rgba(181,89,62,0.10)]"
                placeholder="Para recibir confirmaciones"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                autoComplete="email"
              />
            </div>

            {/* Cumpleaños */}
            <div className="space-y-1.5">
              <label htmlFor="birthday" className="musa-sublabel">
                Fecha de cumpleaños <span className="text-on-surface-subtle font-normal normal-case">(opcional)</span>
              </label>
              <input
                id="birthday"
                className="w-full h-11 px-3.5 bg-surface-sunken border border-border rounded-md font-ui text-[15px] text-on-surface placeholder:text-on-surface-subtle outline-none transition-all focus:border-border-focus focus:bg-surface-raised focus:shadow-[0_0_0_3px_rgba(181,89,62,0.10)]"
                type="date"
                value={form.birthday}
                onChange={(e) => setForm((f) => ({ ...f, birthday: e.target.value }))}
                autoComplete="bday"
              />
            </div>

            <button
              type="submit"
              disabled={!form.firstName || !form.phone || loading}
              className="w-full h-11 bg-primary text-on-primary font-ui font-medium text-[14px] rounded-full flex items-center justify-center gap-2 shadow-primary-sm hover:bg-primary-hover transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border border-on-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                "Crear mi perfil"
              )}
            </button>
          </form>
        </section>

        <p className="text-center font-ui text-[12px] text-on-surface-subtle">
          Tus datos se guardan de forma segura para gestionar tus reservas.
        </p>
      </main>
    </div>
  );
}
