"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planName = searchParams.get("plan") || "FREE";

  const [professionalsCount, setProfessionalsCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Precios y datos según el plan
  const planData = {
    FREE: { price: 0, currency: "Bs", isTeam: false },
    PRO: { price: 8, currency: "USD", isTeam: false },
    TEAM: { price: 5, currency: "USD", isTeam: true },
  }[planName as "FREE" | "PRO" | "TEAM"] || { price: 0, currency: "USD", isTeam: false };

  const totalPrice = planData.isTeam 
    ? planData.price * professionalsCount 
    : planData.price;

  const handleActivate = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/settings/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planName,
          professionalsCount: planData.isTeam ? professionalsCount : 1,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al activar el plan");

      setSuccess(true);
      setTimeout(() => {
        router.push("/home");
        // Forzar recarga de usuario para ver el nuevo plan
        window.location.reload();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6">
          <span className="material-symbols-outlined text-5xl font-bold">check_circle</span>
        </div>
        <h2 className="text-3xl font-black text-on-surface mb-2">¡Plan Activado!</h2>
        <p className="text-on-surface-variant max-w-xs">
          Tu configuración ha sido actualizada al plan <span className="font-bold text-primary">{planName}</span>.
        </p>
        <p className="text-xs text-on-surface-variant mt-8 animate-pulse">Redirigiendo al home...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <header className="space-y-4">
        <Link href="/settings/plans" className="inline-flex items-center gap-2 text-primary font-bold text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
          Volver a planes
        </Link>
        <h1 className="font-headline text-3xl font-extrabold text-on-surface">Datos de Pago</h1>
        <p className="text-on-surface-variant">Completa la información para activar tu plan.</p>
      </header>

      {/* Resumen del Plan */}
      <section className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-10 -mt-10"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Plan Seleccionado</span>
            <h2 className="text-2xl font-black text-on-surface">{planName}</h2>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-primary">
              {planData.currency === "USD" ? "$" : ""}{totalPrice}{planData.currency === "Bs" ? " Bs" : ""}
            </p>
            <p className="text-xs text-on-surface-variant font-bold">Pago Mensual</p>
          </div>
        </div>

        {planData.isTeam && (
          <div className="mt-8 pt-6 border-t border-outline-variant/10 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-on-surface">Número de Profesionales</label>
              <div className="flex items-center gap-4 bg-white rounded-full p-1 border border-outline-variant/20">
                <button 
                  onClick={() => setProfessionalsCount(p => Math.max(1, p - 1))}
                  className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center active:scale-90 transition-transform"
                >
                  <span className="material-symbols-outlined text-sm">remove</span>
                </button>
                <span className="text-lg font-black w-6 text-center">{professionalsCount}</span>
                <button 
                  onClick={() => setProfessionalsCount(p => Math.min(10, p + 1))}
                  className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center active:scale-90 transition-transform"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                </button>
              </div>
            </div>
            <p className="text-[10px] text-on-surface-variant italic">Mínimo 1 profesional, máximo 10.</p>
          </div>
        )}
      </section>

      {/* Instrucciones de Pago */}
      <section className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/20 space-y-6">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
            <span className="material-symbols-outlined text-lg">payments</span>
          </span>
          <h3 className="font-bold text-on-surface">Métodos Disponibles</h3>
        </div>

        <div className="grid gap-4">
          <div className="p-4 bg-surface-container-low rounded-2xl space-y-2">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Pago Móvil (Bs)</p>
            <div className="text-sm text-on-surface space-y-1">
              <p>Banco: <span className="font-bold">Mercantil (0105)</span></p>
              <p>CI: <span className="font-bold">V-12.345.678</span></p>
              <p>Tlf: <span className="font-bold">0412-1234567</span></p>
            </div>
          </div>
          <div className="p-4 bg-surface-container-low rounded-2xl space-y-2">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Zelle (USD)</p>
            <div className="text-sm text-on-surface">
              <p>Correo: <span className="font-bold">pagos@musa-app.com</span></p>
              <p>Nombre: <span className="font-bold">Musa Tech LLC</span></p>
            </div>
          </div>
        </div>

        <div className="pt-4 space-y-4">
          <p className="text-xs text-on-surface-variant text-center opacity-70">
            Una vez realizado el pago, haz click en el botón de abajo para validar y activar tu plan inmediatamente (Versión demo).
          </p>

          {error && (
            <div className="bg-error-container text-on-error-container p-4 rounded-xl text-xs font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              {error}
            </div>
          )}

          <button 
            onClick={handleActivate}
            disabled={loading}
            className="w-full h-16 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary-sm flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
            ) : (
              <>
                <span className="material-symbols-outlined">verified</span>
                Validar y Activar Plan
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <main className="min-h-screen bg-background p-6 pb-32 pt-20">
      <div className="max-w-md mx-auto">
        <Suspense fallback={<div>Cargando...</div>}>
          <PaymentContent />
        </Suspense>
      </div>
    </main>
  );
}
