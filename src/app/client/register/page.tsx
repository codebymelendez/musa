"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const CATEGORIES = [
  { key: "nails",  label: "Uñas",       emoji: "💅" },
  { key: "hair",   label: "Cabello",     emoji: "💇" },
  { key: "brows",  label: "Cejas",       emoji: "✨" },
  { key: "makeup", label: "Maquillaje",  emoji: "💄" },
  { key: "other",  label: "Otros",       emoji: "🌸" },
];

export default function ClientRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    city: "",
    preferences: [] as string[],
  });

  const togglePreference = (key: string) => {
    setForm((f) => ({
      ...f,
      preferences: f.preferences.includes(key)
        ? f.preferences.filter((p) => p !== key)
        : [...f.preferences, key],
    }));
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Create user in DB to allow immediate login
      const res = await fetch("/api/client/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email,
          city: form.city,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al registrarse");
      }

      // Save to localStorage
      localStorage.setItem("musa_client_name", form.name);
      localStorage.setItem("musa_client_phone", form.phone);
      if (form.email) localStorage.setItem("musa_client_email", form.email);
      if (form.city) localStorage.setItem("musa_client_city", form.city);
      if (form.preferences.length > 0)
        localStorage.setItem("musa_client_preferences", JSON.stringify(form.preferences));
      if (data.token) localStorage.setItem("musa_client_token", data.token);

      router.push("/client");
    } catch (err: any) {
      setError(err.message || "Error al registrarse");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-body antialiased px-6 py-8">
      <div className="max-w-sm mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <Link
            href="/client"
            className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Volver
          </Link>
          <div className="space-y-2">
            <div className="text-3xl">✨</div>
            <h1 className="font-headline text-2xl font-extrabold tracking-tighter text-on-surface">
              Crea tu perfil
            </h1>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Guarda tus preferencias para encontrar tu profesional ideal más rápido.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nombre */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Nombre completo *
            </label>
            <input
              className="w-full bg-surface-container-high border-none rounded-xl py-4 px-5 focus:ring-2 focus:ring-primary-container text-on-surface placeholder:text-on-surface-variant/50 text-sm"
              placeholder="Tu nombre"
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              autoComplete="name"
            />
          </div>

          {/* Teléfono */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Teléfono *
            </label>
            <input
              className="w-full bg-surface-container-high border-none rounded-xl py-4 px-5 focus:ring-2 focus:ring-primary-container text-on-surface placeholder:text-on-surface-variant/50 text-sm"
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
            <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Email (opcional)
            </label>
            <input
              className="w-full bg-surface-container-high border-none rounded-xl py-4 px-5 focus:ring-2 focus:ring-primary-container text-on-surface placeholder:text-on-surface-variant/50 text-sm"
              placeholder="Para recibir confirmaciones"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              autoComplete="email"
            />
          </div>

          {/* Ciudad */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Ciudad (opcional)
            </label>
            <input
              className="w-full bg-surface-container-high border-none rounded-xl py-4 px-5 focus:ring-2 focus:ring-primary-container text-on-surface placeholder:text-on-surface-variant/50 text-sm"
              placeholder="¿Dónde buscas servicios?"
              type="text"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              autoComplete="address-level2"
            />
          </div>

          {/* Preferencias */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              ¿Qué servicios te interesan?
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(({ key, label, emoji }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => togglePreference(key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-bold transition-colors ${
                    form.preferences.includes(key)
                      ? "bg-primary text-white shadow-sm"
                      : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container"
                  }`}
                >
                  <span>{emoji}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-error-container text-on-error-container p-3 rounded-xl text-sm font-semibold">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!form.name || !form.phone || loading}
            className="w-full h-14 bg-gradient-to-r from-primary to-primary-container text-white font-headline font-bold rounded-full shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? "Registrando..." : "Confirmar y buscar profesionales"}
            <span className="material-symbols-outlined">
              {loading ? "hourglass_empty" : "arrow_forward"}
            </span>
          </button>

          <p className="text-xs text-on-surface-variant text-center leading-relaxed">
            Tus datos se guardarán de forma segura para que puedas ver y gestionar tus reservas fácilmente.
          </p>
        </form>
      </div>
    </div>
  );
}
