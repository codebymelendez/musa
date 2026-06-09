"use client";

import { useState, useEffect } from "react";
import { Appointment, PaymentMethod } from "@/types";
import { XMarkIcon, BanknotesIcon } from "@heroicons/react/24/outline";

interface Props {
  appointment: Appointment;
  paymentMethods?: PaymentMethod[];
  onClose: () => void;
  onSaved: (payment: {
    amount: number;
    currency: string;
    method: PaymentMethod;
    isPaid: boolean;
    notes?: string;
  }) => Promise<void>;
}

const ALL_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "efectivo_usd", label: "Efectivo USD" },
  { value: "efectivo_bs",  label: "Efectivo Bs"  },
  { value: "pago_movil",  label: "Pago Móvil"   },
  { value: "zelle",       label: "Zelle"         },
  { value: "otro",        label: "Otro"          },
];

const BS_METHODS: PaymentMethod[] = ["efectivo_bs", "pago_movil"];

export default function PaymentModal({ appointment, paymentMethods, onClose, onSaved }: Props) {
  const servicePrice = appointment.service?.price ?? 0;

  const availableMethods = paymentMethods?.length
    ? ALL_METHODS.filter((m) => paymentMethods.includes(m.value))
    : ALL_METHODS;

  const [method, setMethod] = useState<PaymentMethod>(availableMethods[0]?.value ?? "efectivo_usd");
  const [usdAmount, setUsdAmount] = useState(servicePrice.toFixed(2));
  const [bsAmount,  setBsAmount]  = useState("");
  const [notes,     setNotes]     = useState("");
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const [bcvRate,    setBcvRate]    = useState<number | null>(null);
  const [bcvDate,    setBcvDate]    = useState<string | null>(null);
  const [bcvLoading, setBcvLoading] = useState(false);
  const [bcvError,   setBcvError]   = useState<string | null>(null);

  const isBs = BS_METHODS.includes(method);

  // Fetch BCV once on first Bs-method selection
  useEffect(() => {
    if (!isBs || bcvRate !== null || bcvLoading) return;
    setBcvLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
    setBcvError(null);
    fetch("/api/bcv-rate")
      .then((r) => {
        if (!r.ok) throw new Error("Error al contactar la API BCV");
        return r.json();
      })
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setBcvRate(data.usd);
        setBcvDate(data.fecha ?? null);
        const usd = parseFloat(usdAmount);
        if (!isNaN(usd) && usd > 0) {
          setBsAmount((usd * data.usd).toFixed(2));
        }
      })
      .catch((err) => {
        setBcvError(err instanceof Error ? err.message : "No se pudo obtener la tasa BCV");
      })
      .finally(() => setBcvLoading(false));
  }, [isBs]); // eslint-disable-line react-hooks/exhaustive-deps

  // When USD amount changes while a Bs method is active and rate is available,
  // keep Bs amount in sync only if the user hasn't manually edited it.
  const handleUsdChange = (val: string) => {
    setUsdAmount(val);
    if (isBs && bcvRate !== null) {
      const usd = parseFloat(val);
      if (!isNaN(usd) && usd >= 0) {
        setBsAmount((usd * bcvRate).toFixed(2));
      }
    }
  };

  const handleMethodChange = (m: PaymentMethod) => {
    setMethod(m);
    setError(null);
    // If switching to Bs and rate is already available, update display amount
    if (BS_METHODS.includes(m) && bcvRate !== null) {
      const usd = parseFloat(usdAmount);
      if (!isNaN(usd) && usd >= 0) {
        setBsAmount((usd * bcvRate).toFixed(2));
      }
    }
  };

  const handleSave = async () => {
    setError(null);

    if (isBs) {
      if (bcvLoading) {
        setError("Cargando tasa BCV, espera un momento…");
        return;
      }
      if (bcvError || bcvRate === null) {
        setError("No se pudo obtener la tasa BCV. Selecciona un método en USD o intenta de nuevo.");
        return;
      }
      const amt = parseFloat(bsAmount);
      if (isNaN(amt) || amt < 0) {
        setError("Monto inválido");
        return;
      }
      setSaving(true);
      try {
        await onSaved({ amount: amt, currency: "BS", method, isPaid: true, notes: notes || undefined });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar");
      } finally {
        setSaving(false);
      }
    } else {
      const amt = parseFloat(usdAmount);
      if (isNaN(amt) || amt < 0) {
        setError("Monto inválido");
        return;
      }
      setSaving(true);
      try {
        await onSaved({ amount: amt, currency: "USD", method, isPaid: true, notes: notes || undefined });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar");
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-surface/95 backdrop-blur-md flex items-end sm:items-center justify-center">
      <div className="bg-surface-container-lowest w-full max-w-sm rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl p-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-xl font-medium">Registrar Pago</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Info de la cita */}
        <div className="p-4 bg-surface-container-low rounded-2xl">
          <p className="font-medium text-on-surface">{appointment.client?.name}</p>
          <p className="text-sm text-on-surface-variant">
            {appointment.service?.name} · ${servicePrice.toFixed(2)} USD
          </p>
        </div>

        {/* Error general */}
        {error && (
          <div className="p-3 bg-error-container rounded-xl text-on-error-container text-sm">
            {error}
          </div>
        )}

        {/* Monto */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-on-surface-variant uppercase tracking-wider">
            Monto cobrado
          </label>

          {isBs ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2 bg-surface-container-high rounded-xl px-4 h-14">
                <span className="text-on-surface-variant font-medium text-sm shrink-0">Bs.</span>
                {bcvLoading ? (
                  <span className="flex-1 text-on-surface-variant text-sm animate-pulse">Calculando…</span>
                ) : bcvError ? (
                  <span className="flex-1 text-error text-sm">Error de tasa BCV</span>
                ) : (
                  <input
                    type="number"
                    value={bsAmount}
                    onChange={(e) => setBsAmount(e.target.value)}
                    className="flex-1 bg-transparent border-none text-on-surface font-medium text-xl focus:outline-none"
                    min="0"
                    step="0.01"
                  />
                )}
              </div>
              {bcvRate !== null && !bcvError && (
                <p className="text-xs text-on-surface-variant px-1">
                  Tasa BCV: {bcvRate.toLocaleString("es-VE", { minimumFractionDigits: 2 })} Bs/$
                  {bcvDate ? ` · ${bcvDate}` : ""}
                </p>
              )}
              {bcvError && (
                <p className="text-xs text-error px-1">{bcvError}</p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-surface-container-high rounded-xl px-4 h-14">
              <span className="text-on-surface-variant font-medium">$</span>
              <input
                type="number"
                value={usdAmount}
                onChange={(e) => handleUsdChange(e.target.value)}
                className="flex-1 bg-transparent border-none text-on-surface font-medium text-xl focus:outline-none"
                min="0"
                step="0.01"
              />
            </div>
          )}
        </div>

        {/* Método de pago */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-on-surface-variant uppercase tracking-wider">
            Método de pago
          </label>

          {availableMethods.length === 0 ? (
            <p className="text-sm text-on-surface-variant bg-surface-container-low rounded-xl p-3">
              No hay métodos configurados. Ve a Perfil → Métodos de Pago para configurarlos.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {availableMethods.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleMethodChange(value)}
                  className={`py-3 px-4 rounded-xl text-sm font-medium transition-colors ${
                    method === value
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notas opcionales */}
        <input
          type="text"
          placeholder="Nota opcional…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full h-12 px-4 bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary text-on-surface placeholder:text-on-surface-variant/50 text-sm"
        />

        {/* Guardar */}
        <button
          onClick={handleSave}
          disabled={saving || bcvLoading || availableMethods.length === 0}
          className="w-full h-14 bg-primary text-on-primary font-medium rounded-full shadow-primary-sm flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {saving ? (
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
          ) : (
            <>
              <BanknotesIcon className="w-5 h-5" />
              Guardar Pago
            </>
          )}
        </button>
      </div>
    </div>
  );
}
