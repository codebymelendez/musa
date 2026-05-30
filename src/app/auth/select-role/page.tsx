"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MusaLogo from "@/components/brand/MusaLogo";

export default function SelectRolePage() {
  const router = useRouter();
  const [loading, setLoading] = useState<"owner" | "client" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = async (appRole: "owner" | "client") => {
    setLoading(appRole);
    setError(null);

    try {
      const res = await fetch("/api/auth/google-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Error al guardar tu elección");
        return;
      }

      // Redirigir según el rol elegido
      if (appRole === "client") {
        router.push("/client");
      } else {
        router.push(data.onboardingDone ? "/home" : "/onboarding");
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(null);
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

      <main className="relative w-full max-w-[440px] space-y-8 z-10">
        {/* Brand */}
        <header className="text-center space-y-3">
          <div className="flex justify-center">
            <MusaLogo variant="combo" size="lg" />
          </div>
          <div className="space-y-1">
            <p className="font-display font-normal italic text-on-surface text-[22px]" style={{ letterSpacing: "-0.01em" }}>
              ¿Cómo quieres usar MUSA?
            </p>
            <p className="font-ui text-[14px] text-on-surface-muted">
              Elige tu perfil para personalizar tu experiencia.
            </p>
          </div>
        </header>

        {/* Error */}
        {error && (
          <div className="bg-error-surface border border-error/20 rounded-lg px-4 py-3">
            <p className="font-ui text-[13px] text-error leading-snug">{error}</p>
          </div>
        )}

        {/* Role cards */}
        <div className="space-y-3">
          {/* Clienta */}
          <button
            onClick={() => handleSelect("client")}
            disabled={loading !== null}
            className="w-full group relative overflow-hidden rounded-2xl p-7 text-left transition-all duration-200 hover:shadow-md active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: "rgba(237,229,223,0.90)",
              border: "1px solid rgba(181,89,62,0.10)",
            }}
          >
            {/* Decorative corner */}
            <div
              className="absolute top-4 right-4 w-[40px] h-[40px] pointer-events-none"
              style={{
                borderTop:   "1.5px solid rgba(181,89,62,0.25)",
                borderRight: "1.5px solid rgba(181,89,62,0.25)",
              }}
            />
            <div className="relative">
              <p className="font-ui text-[11px] font-medium uppercase tracking-[0.10em] text-on-surface-subtle mb-3">
                Para clientas
              </p>
              <h2
                className="font-display font-normal text-on-surface mb-2"
                style={{ fontSize: "26px", letterSpacing: "-0.015em", lineHeight: "1.1" }}
              >
                Soy clienta
                <br />
                <em className="font-light italic text-primary">quiero reservar citas</em>
              </h2>
              <p className="font-ui text-[13px] text-on-surface-muted leading-relaxed mt-3">
                Encuentra profesionales de belleza en tu ciudad y gestiona tus citas desde un solo lugar.
              </p>

              {loading === "client" && (
                <div className="absolute inset-0 bg-surface/60 rounded-2xl flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </button>

          {/* Profesional */}
          <button
            onClick={() => handleSelect("owner")}
            disabled={loading !== null}
            className="w-full group relative overflow-hidden rounded-2xl p-7 text-left transition-all duration-200 hover:shadow-xl active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: "#1A0E0B" }}
          >
            {/* Decorative corner */}
            <div
              className="absolute top-4 right-4 w-[40px] h-[40px] pointer-events-none"
              style={{
                borderTop:   "1.5px solid rgba(196,153,106,0.28)",
                borderRight: "1.5px solid rgba(196,153,106,0.28)",
              }}
            />
            <div className="relative">
              <p
                className="font-ui text-[11px] font-medium uppercase tracking-[0.10em] mb-3"
                style={{ color: "#6B5040" }}
              >
                Para profesionales
              </p>
              <h2
                className="font-display font-normal leading-[1.1] mb-2"
                style={{
                  fontSize: "26px",
                  letterSpacing: "-0.015em",
                  color: "#F2EBE0",
                }}
              >
                Soy profesional
                <br />
                <em className="font-light italic" style={{ color: "#C4996A" }}>
                  quiero gestionar mi agenda
                </em>
              </h2>
              <p
                className="font-ui text-[13px] leading-relaxed mt-3"
                style={{ color: "#8B7060" }}
              >
                Agenda digital, gestión de clientas y estadísticas. Todo pensado para tu negocio de belleza.
              </p>

              {loading === "owner" && (
                <div className="absolute inset-0 rounded-2xl flex items-center justify-center" style={{ background: "rgba(26,14,11,0.6)" }}>
                  <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#C4996A", borderTopColor: "transparent" }} />
                </div>
              )}
            </div>
          </button>
        </div>

        <p className="text-center font-ui text-[12px] text-on-surface-subtle">
          Puedes cambiar tu configuración más adelante desde tu perfil.
        </p>
      </main>
    </div>
  );
}
