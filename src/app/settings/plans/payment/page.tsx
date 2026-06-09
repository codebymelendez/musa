"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircleIcon,
  MinusIcon,
  PlusIcon,
  CreditCardIcon,
  ExclamationCircleIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";

type PaymentMethod = "pagomovil" | "zelle";

interface BcvData {
  usd: number;
  fecha: string;
  stale?: boolean;
}

/** Formatea un número en formato venezolano: 2618.35 → "2.618,35" */
function formatVE(n: number, decimals = 2): string {
  return n.toLocaleString("es-VE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Formatea fecha ISO "2026-05-21" → "21/05/2026" */
function formatFecha(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planName = searchParams.get("plan") || "FREE";

  const [professionalsCount, setProfessionalsCount] = useState(1);
  const [selectedMethod, setSelectedMethod]         = useState<PaymentMethod | null>(null);
  const [referenceNumber, setReferenceNumber]       = useState("");
  const [loading, setLoading]                       = useState(false);
  const [error, setError]                           = useState<string | null>(null);
  const [success, setSuccess]                       = useState(false);

  // BCV rate state (Bug 11)
  const [bcv, setBcv]           = useState<BcvData | null>(null);
  const [bcvLoading, setBcvLoading] = useState(false);
  const [bcvError, setBcvError] = useState(false);

  // Precios según el plan
  const planData = {
    FREE: { price: 0, currency: "Bs", isTeam: false },
    PRO:  { price: 8, currency: "USD", isTeam: false },
    TEAM: { price: 5, currency: "USD", isTeam: true },
  }[planName as "FREE" | "PRO" | "TEAM"] ?? { price: 0, currency: "USD", isTeam: false };

  const totalUSD = planData.isTeam ? planData.price * professionalsCount : planData.price;

  // Calcula monto en Bs usando tasa BCV real
  const totalBS = bcv ? Math.round(totalUSD * bcv.usd * 100) / 100 : null;

  // Obtiene la tasa BCV al seleccionar Pago Móvil (Bug 11)
  useEffect(() => {
    if (selectedMethod !== "pagomovil" || bcv || bcvLoading) return;
    setBcvLoading(true);
    setBcvError(false);
    fetch("/api/bcv-rate")
      .then((r) => r.json())
      .then((data: BcvData & { error?: string }) => {
        if (data.error || !data.usd) throw new Error(data.error ?? "Sin datos");
        setBcv(data);
      })
      .catch(() => setBcvError(true))
      .finally(() => setBcvLoading(false));
  }, [selectedMethod, bcv, bcvLoading]);

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
          paymentMethod:  selectedMethod,
          referenceNumber: referenceNumber || undefined,
          amountUSD:  totalUSD,
          amountBS:   totalBS ?? undefined,
          bcvRate:    bcv?.usd ?? undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al activar el plan");

      setSuccess(true);
      setTimeout(() => {
        router.push("/home");
        window.location.reload();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  // El botón se habilita solo si: hay método seleccionado
  // + referenceNumber obligatorio y no vacío
  const canActivate =
    !!selectedMethod &&
    referenceNumber.trim().length > 0 &&
    !loading;

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 space-y-5">
        <div className="w-20 h-20 bg-success-surface rounded-full flex items-center justify-center mx-auto">
          <CheckCircleSolid className="w-10 h-10 text-success" />
        </div>
        <h2 className="font-display font-normal text-[32px] text-on-surface">¡Pago Registrado!</h2>
        <p className="font-ui text-[14px] text-on-surface-muted max-w-xs leading-relaxed">
          Tu pago para el plan{" "}
          <span className="font-semibold text-primary">{planName}</span> ha sido enviado a revisión manual.
        </p>
        <p className="font-ui text-[12px] text-[#8F6B00] bg-[#FFF9EB] border border-[#FFE7B3] p-4 rounded-2xl max-w-xs leading-normal">
          El plan gratis se mantendrá activo mientras verificamos tu pago en las próximas horas.
        </p>
        <p className="font-ui text-[12px] text-on-surface-subtle animate-pulse mt-4">
          Redirigiendo a planes…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Cabecera */}
      <header className="space-y-3">
        <Link
          href="/settings/plans"
          className="inline-flex items-center gap-2 font-ui text-[13px] font-medium text-primary"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Volver a planes
        </Link>
        <h1 className="font-display font-normal text-[30px] text-on-surface">Datos de Pago</h1>
        <p className="font-ui text-[14px] text-on-surface-muted">
          Completa la información para registrar tu plan.
        </p>
      </header>

      {/* Resumen del Plan */}
      <section className="bg-surface border border-outline-variant/30 p-6 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-28 h-28 bg-primary/5 rounded-full -mr-8 -mt-8 pointer-events-none" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="space-y-0.5">
            <span className="font-ui text-[10px] font-semibold text-primary uppercase tracking-widest">
              Plan Seleccionado
            </span>
            <p className="font-display font-normal text-[26px] text-on-surface leading-tight">
              {planName}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-display font-normal text-[30px] text-primary leading-tight">
              ${totalUSD}
            </p>
            <p className="font-ui text-[11px] text-on-surface-muted font-medium">/ mes</p>
          </div>
        </div>

        {/* Bug 8 — Selector de profesionales para Plan TEAM */}
        {planData.isTeam && (
          <div className="mt-6 pt-5 border-t border-border-subtle space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-ui text-[14px] font-medium text-on-surface">
                Número de profesionales
              </label>
              <div className="flex items-center gap-3 bg-surface-raised border border-border rounded-full px-1 py-1">
                <button
                  type="button"
                  onClick={() => setProfessionalsCount((p) => Math.max(1, p - 1))}
                  disabled={professionalsCount <= 1}
                  className="w-9 h-9 rounded-full bg-surface flex items-center justify-center text-on-surface hover:bg-surface-sunken transition-colors disabled:opacity-30"
                  aria-label="Reducir"
                >
                  <MinusIcon className="w-4 h-4" />
                </button>
                <span className="font-mono-num text-[16px] font-semibold text-on-surface w-6 text-center select-none">
                  {professionalsCount}
                </span>
                <button
                  type="button"
                  onClick={() => setProfessionalsCount((p) => Math.min(10, p + 1))}
                  disabled={professionalsCount >= 10}
                  className="w-9 h-9 rounded-full bg-surface flex items-center justify-center text-on-surface hover:bg-surface-sunken transition-colors disabled:opacity-30"
                  aria-label="Aumentar"
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="font-ui text-[11px] text-on-surface-muted">
              Mínimo 1 profesional · máximo 10
            </p>
          </div>
        )}
      </section>

      {/* Métodos de pago */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5">
          <CreditCardIcon className="w-5 h-5 text-primary" />
          <h3 className="font-ui font-semibold text-[15px] text-on-surface">
            Selecciona tu método de pago
          </h3>
        </div>

        <div className="space-y-3">
          {/* Pago Móvil */}
          <button
            type="button"
            onClick={() => { setSelectedMethod("pagomovil"); setReferenceNumber(""); }}
            className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-150 ${
              selectedMethod === "pagomovil"
                ? "border-primary bg-primary-surface shadow-primary-sm"
                : "border-border bg-surface hover:border-primary-border"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="font-ui text-[11px] font-semibold text-on-surface-muted uppercase tracking-wider">
                Pago Móvil (Bs)
              </p>
              {selectedMethod === "pagomovil" && (
                <CheckCircleSolid className="w-5 h-5 text-primary flex-shrink-0" />
              )}
            </div>

            <div className="font-ui text-[13px] text-on-surface space-y-0.5">
              <p>Banco: <span className="font-semibold">BNC · Banco Nacional de Crédito</span></p>
              <p>C.I.: <span className="font-semibold">14.544.945</span></p>
              <p>Teléfono: <span className="font-semibold">0422-012.5754</span></p>
            </div>

            {selectedMethod === "pagomovil" && (
              <div className="mt-4 pt-4 border-t border-primary/20">
                {bcvLoading && (
                  <div className="flex items-center gap-2 text-on-surface-muted">
                    <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    <span className="font-ui text-[12px]">Obteniendo tasa BCV…</span>
                  </div>
                )}

                {bcvError && (
                  <div className="flex items-start gap-2 text-on-surface-muted">
                    <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5 text-on-surface-muted" />
                    <p className="font-ui text-[12px] leading-snug">
                      No se pudo obtener la tasa BCV. Contacta a soporte para conocer el monto en Bs.
                    </p>
                  </div>
                )}

                {bcv && !bcvLoading && (
                  <>
                    <p className="font-ui text-[11px] text-on-surface-muted mb-1">
                      Monto a transferir:
                    </p>
                    <p className="font-display font-normal text-[28px] text-primary leading-tight">
                      Bs. {formatVE(totalBS!)}
                    </p>
                    <p className="font-ui text-[11px] text-on-surface-muted mt-1.5">
                      Equivalente a ${totalUSD} USD · Tasa BCV:{" "}
                      <span className="font-semibold">{formatVE(bcv.usd)} Bs/$</span>
                      {" · "}
                      {formatFecha(bcv.fecha)}
                      {bcv.stale && " (caché)"}
                    </p>
                  </>
                )}
              </div>
            )}
          </button>

          {/* Zelle */}
          <button
            type="button"
            onClick={() => { setSelectedMethod("zelle"); setReferenceNumber(""); }}
            className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-150 ${
              selectedMethod === "zelle"
                ? "border-primary bg-primary-surface shadow-primary-sm"
                : "border-border bg-surface hover:border-primary-border"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="font-ui text-[11px] font-semibold text-on-surface-muted uppercase tracking-wider">
                Zelle (USD)
              </p>
              {selectedMethod === "zelle" && (
                <CheckCircleSolid className="w-5 h-5 text-primary flex-shrink-0" />
              )}
            </div>
            <div className="font-ui text-[13px] text-on-surface space-y-0.5">
              <p>Correo: <span className="font-semibold">duran6910@gmail.com</span></p>
              <p>Celular: <span className="font-semibold">+1 (786) 322-0620</span></p>
            </div>
            {selectedMethod === "zelle" && (
              <div className="mt-4 pt-4 border-t border-primary/20">
                <p className="font-ui text-[11px] text-on-surface-muted mb-1">Monto a transferir:</p>
                <p className="font-display font-normal text-[28px] text-primary leading-tight">
                  ${totalUSD.toFixed(2)} USD
                </p>
              </div>
            )}
          </button>
        </div>
      </section>

      {/* Campo de detalles del pago */}
      {selectedMethod && (
        <section className="space-y-2">
          <label className="font-ui text-[13px] font-medium text-on-surface block">
            {selectedMethod === "pagomovil" ? (
              <>Número de referencia del pago <span className="text-primary">*</span></>
            ) : (
              <>Correo o nombre del remitente (Zelle) <span className="text-primary">*</span></>
            )}
          </label>
          {selectedMethod === "pagomovil" ? (
            <input
              type="number"
              inputMode="numeric"
              maxLength={20}
              placeholder="Ej: 00123456789"
              value={referenceNumber}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 20);
                setReferenceNumber(v);
              }}
              className="musa-input font-mono-num animate-fade-in"
            />
          ) : (
            <input
              type="text"
              placeholder="Ej: pedro.gonzalez@zelle.com o Pedro González"
              value={referenceNumber}
              onChange={(e) => {
                setReferenceNumber(e.target.value.slice(0, 100));
              }}
              className="musa-input animate-fade-in"
            />
          )}
          <p className="font-ui text-[11px] text-on-surface-muted">
            {selectedMethod === "pagomovil"
              ? "Ingresa el número de referencia de la operación Pago Móvil."
              : "Ingresa el correo electrónico o el nombre del remitente desde el cual realizaste el pago Zelle."}
          </p>
        </section>
      )}

      {/* Estado y acción */}
      <div className="space-y-4 pb-2">
        {!selectedMethod && (
          <p className="font-ui text-[12px] text-on-surface-muted text-center">
            Selecciona un método de pago para continuar.
          </p>
        )}

        {selectedMethod && (
          <p className="font-ui text-[12px] text-on-surface-muted text-center">
            Realiza el pago y luego pulsa el botón de abajo para enviar los datos para revisión.
          </p>
        )}

        {error && (
          <div className="flex items-start gap-2.5 bg-error-surface text-error border border-error/20 p-4 rounded-xl">
            <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="font-ui text-[13px]">{error}</p>
          </div>
        )}

        <button
          onClick={handleActivate}
          disabled={!canActivate}
          className="w-full h-14 bg-primary text-on-primary font-ui font-semibold text-[15px] rounded-full shadow-primary-sm flex items-center justify-center gap-2.5 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-on-primary/50 border-t-on-primary rounded-full animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <CheckBadgeIcon className="w-5 h-5" />
              Enviar Pago para Revisión
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <main className="min-h-screen bg-background px-5 pb-32 pt-20">
      <div className="max-w-md mx-auto">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <PaymentContent />
        </Suspense>
      </div>
    </main>
  );
}
