"use client";

import { useState } from "react";
import { ClientLoyaltyAccount } from "@/types";

interface Props {
  account: ClientLoyaltyAccount;
  onClose: () => void;
  onRedeemed: () => void;
}

export default function RedeemModal({ account, onClose, onRedeemed }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const program = account.program;
  const threshold = program?.rewardThreshold ?? 0;

  const handleRedeem = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/loyalty/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: account.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al canjear");
        return;
      }
      setConfirmed(true);
      setTimeout(() => {
        onRedeemed();
        onClose();
      }, 2000);
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-sm bg-white rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl p-6 space-y-5">
        {confirmed ? (
          <div className="text-center space-y-4 py-4">
            <span className="material-symbols-outlined text-5xl text-green-500" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
            <h3 className="font-headline font-bold text-on-surface">¡Canje registrado!</h3>
            <p className="text-sm text-on-surface-variant">{program?.rewardDescription}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-headline font-bold text-on-surface text-lg">Canjear recompensa</h2>
              <button onClick={onClose} className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="bg-green-50 rounded-2xl p-4 space-y-2">
              <p className="text-sm font-bold text-green-800">
                {account.client?.name}
              </p>
              <p className="text-sm text-green-700">{program?.rewardDescription ?? "Recompensa"}</p>
              <p className="text-xs text-green-600">
                Se descontarán {threshold} puntos. Saldo actual: {account.totalPoints}
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 h-12 bg-surface-container-high text-on-surface-variant font-bold rounded-full"
              >
                Cancelar
              </button>
              <button
                onClick={handleRedeem}
                disabled={loading}
                className="flex-1 h-12 bg-green-500 text-white font-bold rounded-full flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? (
                  <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                ) : (
                  "Confirmar canje"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
