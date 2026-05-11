"use client";

import { useState } from "react";
import { Appointment, PaymentMethod } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { XMarkIcon, BanknotesIcon } from "@heroicons/react/24/outline";

interface Props {
  appointment: Appointment;
  onClose: () => void;
  onSaved: (payment: {
    amount: number;
    method: PaymentMethod;
    isPaid: boolean;
    notes?: string;
  }) => Promise<void>;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "efectivo_usd", label: "Efectivo USD" },
  { value: "efectivo_bs", label: "Efectivo Bs" },
  { value: "pago_movil", label: "Pago Móvil" },
  { value: "zelle", label: "Zelle" },
  { value: "otro", label: "Otro" },
];

export default function PaymentModal({ appointment, onClose, onSaved }: Props) {
  const [amount, setAmount] = useState(
    appointment.service?.price?.toString() ?? ""
  );
  const [method, setMethod] = useState<PaymentMethod>("efectivo_usd");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 0) {
      setError("Monto inválido");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onSaved({ amount: amt, method, isPaid: true, notes: notes || undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setLoading(false);
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
            {formatCurrency(
              appointment.service?.price ?? 0,
              appointment.service?.currency
            )}
          </p>
        </div>

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
          <div className="flex items-center gap-2 bg-surface-container-high rounded-xl px-4 h-14">
            <span className="text-on-surface-variant font-medium">$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-transparent border-none text-on-surface font-medium text-xl focus:outline-none"
              min="0"
              step="0.01"
            />
          </div>
        </div>

        {/* Método de pago */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-on-surface-variant uppercase tracking-wider">
            Método de pago
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setMethod(value)}
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
        </div>

        {/* Notas opcionales */}
        <input
          type="text"
          placeholder="Nota opcional..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full h-12 px-4 bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary text-on-surface placeholder:text-on-surface-variant/50 text-sm"
        />

        {/* Guardar */}
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full h-14 bg-primary text-on-primary shadow-primary-sm font-medium rounded-full shadow-primary-sm flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading ? (
            <span className="material-symbols-outlined animate-spin">
              progress_activity
            </span>
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
