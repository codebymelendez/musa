"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";

const SERVICE_TYPES = [
  { value: "nails", label: "Uñas", icon: "✨" },
  { value: "hair", label: "Cabello", icon: "💇" },
  { value: "brows", label: "Cejas & Pestañas", icon: "👁️" },
  { value: "makeup", label: "Maquillaje", icon: "💄" },
  { value: "other", label: "Otro / Varios", icon: "🌟" },
];

const DAY_NAMES = [
  { key: 1, label: "Lun" },
  { key: 2, label: "Mar" },
  { key: 3, label: "Mié" },
  { key: 4, label: "Jue" },
  { key: 5, label: "Vie" },
  { key: 6, label: "Sáb" },
  { key: 0, label: "Dom" },
];

const DEFAULT_SERVICES: Record<
  string,
  { name: string; durationMin: number; price: number }[]
> = {
  nails: [
    { name: "Manicura básica", durationMin: 45, price: 15 },
    { name: "Manicura con gel", durationMin: 60, price: 25 },
    { name: "Pedicura spa", durationMin: 60, price: 30 },
  ],
  hair: [
    { name: "Corte y secado", durationMin: 60, price: 30 },
    { name: "Tinte completo", durationMin: 120, price: 60 },
    { name: "Balayage", durationMin: 180, price: 120 },
  ],
  brows: [
    { name: "Cejas con hilo", durationMin: 30, price: 12 },
    { name: "Lifting de pestañas", durationMin: 60, price: 35 },
    { name: "Extensión de pestañas", durationMin: 90, price: 55 },
  ],
  makeup: [
    { name: "Maquillaje natural", durationMin: 60, price: 35 },
    { name: "Maquillaje de noche", durationMin: 75, price: 50 },
    { name: "Maquillaje novia", durationMin: 120, price: 100 },
  ],
  other: [
    { name: "Consulta", durationMin: 30, price: 0 },
    { name: "Servicio básico", durationMin: 60, price: 25 },
    { name: "Servicio premium", durationMin: 90, price: 50 },
  ],
};

type Step = "type" | "hours" | "services" | "done";

export default function Onboarding() {
  const router = useRouter();
  const { user, setUser } = useAppStore();

  const [step, setStep] = useState<Step>("type");
  const [serviceType, setServiceType] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [workDays, setWorkDays] = useState([1, 2, 3, 4, 5]);
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(18);
  const [whatsapp, setWhatsapp] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleDay = (day: number) => {
    setWorkDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleFinish = async () => {
    setSaving(true);
    setError(null);
    try {
      // 1. Actualizar perfil, horarios y CREAR NEGOCIO
      const settingsRes = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          city,
          serviceType,
          whatsapp: whatsapp || undefined,
          settings: {
            workDays,
            startHour,
            endHour,
            slotDuration: 30,
            bookingEnabled: true,
          },
        }),
      });

      if (!settingsRes.ok) {
        const errData = await settingsRes.json().catch(() => ({}));
        throw new Error(errData.error || "Error al guardar configuración");
      }

      const settingsData = await settingsRes.json();

      if (!settingsData?.businessId) {
        throw new Error("No se pudo crear el negocio. Por favor intenta de nuevo.");
      }

      // 2. Crear servicios iniciales (ya tenemos el businessId confirmado en settingsData)
      const defaultSvcs = DEFAULT_SERVICES[serviceType] ?? DEFAULT_SERVICES.other;
      const serviceResults = await Promise.allSettled(
        defaultSvcs.map((svc) =>
          fetch("/api/services", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...svc,
              category: serviceType,
              currency: "USD",
            }),
          })
        )
      );
      // Log errores de servicios sin bloquear
      serviceResults.forEach((r, i) => {
        if (r.status === "rejected") console.error(`[onboarding svc ${i}]`, r.reason);
      });

      // 3. Refrescar el usuario desde el servidor para actualizar el store
      const meRes = await fetch("/api/auth/me", { method: "GET" });
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData?.id) setUser(meData);
      }

      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al configurar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start p-6 pt-12">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="font-headline font-extrabold text-4xl tracking-tighter text-primary">
            Musa
          </h1>
          <p className="text-on-surface-variant">
            Configuremos tu perfil profesional
          </p>
        </div>

        {/* Progress */}
        <div className="flex gap-2">
          {(["type", "hours", "services"] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                (step === "type" && i === 0) ||
                (step === "hours" && i <= 1) ||
                (step === "services" && i <= 2) ||
                step === "done"
                  ? "bg-primary"
                  : "bg-surface-container-high"
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="p-4 bg-error-container rounded-xl text-on-error-container text-sm">
            {error}
          </div>
        )}

        {/* ── Paso 1: Datos del negocio ────────────────────────────────── */}
        {step === "type" && (
          <div className="space-y-6">
            <div>
              <h2 className="font-headline text-2xl font-bold text-on-surface">
                Cuéntanos de tu negocio
              </h2>
              <p className="text-on-surface-variant mt-1 text-sm">
                Configura tu identidad profesional
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider">
                  Nombre del Negocio (ej. Aurora Atelier)
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Nombre de tu salón o marca"
                  className="w-full h-14 px-5 bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary text-on-surface font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider">
                  Ciudad
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ej. Caracas"
                  className="w-full h-14 px-5 bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary text-on-surface"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider">
                  ¿En qué te especializas?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {SERVICE_TYPES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setServiceType(t.value)}
                      className={`p-4 rounded-2xl text-left transition-all ${
                        serviceType === t.value
                          ? "bg-primary text-on-primary shadow-lg"
                          : "bg-surface-container-lowest text-on-surface hover:bg-surface-container"
                      }`}
                    >
                      <div className="text-xl mb-1">{t.icon}</div>
                      <p className="font-bold text-xs">{t.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              disabled={!serviceType || !businessName}
              onClick={() => setStep("hours")}
              className="w-full h-14 bg-primary text-white font-bold rounded-full disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
            >
              Continuar
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        )}

        {/* ── Paso 2: Horarios ──────────────────────────────────────────── */}
        {step === "hours" && (
          <div className="space-y-6">
            <div>
              <h2 className="font-headline text-2xl font-bold text-on-surface">
                ¿Cuándo atiendes?
              </h2>
              <p className="text-on-surface-variant mt-1 text-sm">
                Tu disponibilidad para reservas online
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider">
                Días disponibles
              </label>
              <div className="flex gap-2 flex-wrap">
                {DAY_NAMES.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => toggleDay(key)}
                    className={`flex-1 min-w-[40px] py-2 rounded-xl text-sm font-bold transition-colors ${
                      workDays.includes(key)
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container-low text-on-surface-variant"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider">
                  Hora inicio
                </label>
                <input
                  type="number"
                  value={startHour}
                  onChange={(e) => setStartHour(parseInt(e.target.value))}
                  min={6}
                  max={20}
                  className="w-full h-14 px-4 bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary text-on-surface text-lg font-bold"
                />
                <p className="text-xs text-on-surface-variant text-center">
                  {startHour}:00 hs
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider">
                  Hora cierre
                </label>
                <input
                  type="number"
                  value={endHour}
                  onChange={(e) => setEndHour(parseInt(e.target.value))}
                  min={7}
                  max={24}
                  className="w-full h-14 px-4 bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary text-on-surface text-lg font-bold"
                />
                <p className="text-xs text-on-surface-variant text-center">
                  {endHour}:00 hs
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider">
                WhatsApp (opcional)
              </label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+58 412 000 0000"
                className="w-full h-14 px-5 bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary text-on-surface"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep("type")}
                className="h-14 px-6 bg-surface-container-low text-on-surface font-bold rounded-full"
              >
                Atrás
              </button>
              <button
                onClick={() => setStep("services")}
                className="flex-1 h-14 bg-primary text-white font-bold rounded-full flex items-center justify-center gap-2"
              >
                Continuar
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Paso 3: Servicios iniciales ───────────────────────────────── */}
        {step === "services" && (
          <div className="space-y-6">
            <div>
              <h2 className="font-headline text-2xl font-bold text-on-surface">
                Servicios sugeridos
              </h2>
              <p className="text-on-surface-variant mt-1 text-sm">
                Estos servicios se agregarán a tu menú. Puedes editarlos después.
              </p>
            </div>

            <div className="space-y-3">
              {(DEFAULT_SERVICES[serviceType] ?? DEFAULT_SERVICES.other).map(
                (svc, i) => (
                  <div
                    key={i}
                    className="p-4 bg-surface-container-lowest rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-on-surface">{svc.name}</p>
                      <p className="text-xs text-on-surface-variant">
                        {svc.durationMin} min
                      </p>
                    </div>
                    <span className="text-primary font-bold">
                      ${svc.price}
                    </span>
                  </div>
                )
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep("hours")}
                className="h-14 px-6 bg-surface-container-low text-on-surface font-bold rounded-full"
              >
                Atrás
              </button>
              <button
                onClick={handleFinish}
                disabled={saving}
                className="flex-1 h-14 bg-primary text-white font-bold rounded-full flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {saving ? (
                  <span className="material-symbols-outlined animate-spin">
                    progress_activity
                  </span>
                ) : (
                  <>
                    ¡Empezar!
                    <span className="material-symbols-outlined">rocket_launch</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── Done ─────────────────────────────────────────────────────── */}
        {step === "done" && (
          <div className="text-center space-y-8 py-8">
            <div className="w-24 h-24 bg-tertiary-fixed rounded-full flex items-center justify-center mx-auto">
              <span
                className="material-symbols-outlined text-4xl text-tertiary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
            </div>
            <div className="space-y-2">
              <h2 className="font-headline text-3xl font-extrabold text-on-surface">
                ¡Todo listo!
              </h2>
              <p className="text-on-surface-variant">
                Tu perfil está configurado. Ahora puedes gestionar tu agenda.
              </p>
            </div>
            <button
              onClick={() => router.push("/home")}
              className="w-full h-14 bg-primary text-white font-bold rounded-full shadow-lg flex items-center justify-center gap-2"
            >
              Ir a mi Agenda
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
