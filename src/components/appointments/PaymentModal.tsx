"use client";

import { useState, useEffect, useRef } from "react";
import { Appointment, Business, PaymentMethod } from "@/types";
import { applyPromotionDiscount, promotionPaymentNote } from "@/lib/promotions";
import { isDualCurrency, formatPrice, currencySymbol } from "@/lib/currency";
import { XMarkIcon, BanknotesIcon, TagIcon } from "@heroicons/react/24/outline";

interface Props {
  appointment: Appointment;
  /** Negocio (currency + country) — decide si aplica el flujo dual USD/Bs (BCV). */
  business?: Pick<Business, "currency" | "country"> | null;
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

export default function PaymentModal({ appointment, business, paymentMethods, onClose, onSaved }: Props) {
  const servicePrice = appointment.service?.price ?? 0;

  // Negocio venezolano cobrando en USD → flujo dual USD + Bs/BCV (comportamiento histórico).
  // Cualquier otro caso → un solo monto en la moneda del negocio, sin conversión.
  const dual = isDualCurrency(business);
  const bizCurrency = (business?.currency ?? "USD").toUpperCase();

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

  // Promoción activa del negocio en el momento de la cita → precio sugerido con descuento
  const [appliedPromo, setAppliedPromo] = useState<{ id: string; title: string; discount: number } | null>(null);
  const usdEditedRef = useRef(false);

  const isBs = dual && BS_METHODS.includes(method);

  useEffect(() => {
    if (servicePrice <= 0) return;
    const at = appointment.startTime ? `?at=${encodeURIComponent(appointment.startTime)}` : "";
    fetch(`/api/promotions/active${at}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const promo = data?.promotion;
        if (!promo) return;
        setAppliedPromo(promo);
        // Solo prefijar si el staff no ha tocado el monto todavía
        if (!usdEditedRef.current) {
          const discounted = applyPromotionDiscount(servicePrice, promo.discount);
          setUsdAmount(discounted.toFixed(2));
          setBsAmount((prev) => {
            if (!prev) return prev;
            const rate = parseFloat(prev) / servicePrice;
            return isFinite(rate) && rate > 0 ? (discounted * rate).toFixed(2) : prev;
          });
        }
      })
      .catch(() => { /* sin promo — se mantiene el precio del servicio */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointment.id]);

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
    usdEditedRef.current = true;
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
    if (dual && BS_METHODS.includes(m) && bcvRate !== null) {
      const usd = parseFloat(usdAmount);
      if (!isNaN(usd) && usd >= 0) {
        setBsAmount((usd * bcvRate).toFixed(2));
      }
    }
  };

  // Notas finales: registra la promo aplicada + nota manual del staff
  const buildNotes = (): string | undefined => {
    const parts: string[] = [];
    if (appliedPromo) parts.push(promotionPaymentNote(appliedPromo));
    if (notes.trim()) parts.push(notes.trim());
    return parts.length > 0 ? parts.join(" · ") : undefined;
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
        await onSaved({ amount: amt, currency: "BS", method, isPaid: true, notes: buildNotes() });
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
        await onSaved({ amount: amt, currency: dual ? "USD" : bizCurrency, method, isPaid: true, notes: buildNotes() });
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
            {appointment.service?.name} ·{" "}
            {appliedPromo ? (
              <>
                <span className="line-through">
                  {dual ? `$${servicePrice.toFixed(2)}` : formatPrice(servicePrice, bizCurrency)}
                </span>{" "}
                <span className="text-primary font-medium">
                  {dual
                    ? `$${applyPromotionDiscount(servicePrice, appliedPromo.discount).toFixed(2)}`
                    : formatPrice(applyPromotionDiscount(servicePrice, appliedPromo.discount), bizCurrency)}
                </span>
                {dual && " USD"}
              </>
            ) : (
              <>{dual ? `$${servicePrice.toFixed(2)} USD` : formatPrice(servicePrice, bizCurrency)}</>
            )}
          </p>
          {appliedPromo && (
            <p className="text-xs text-primary mt-1 flex items-center gap-1">
              <TagIcon className="w-3.5 h-3.5 flex-shrink-0" />
              {appliedPromo.title} · -{appliedPromo.discount}%
            </p>
          )}
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
              <span className="text-on-surface-variant font-medium">
                {dual ? "$" : currencySymbol(bizCurrency)}
              </span>
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
