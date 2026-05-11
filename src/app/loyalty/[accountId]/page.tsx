"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { use } from "react";
import { useToast } from "@/components/ui/Toast";
import { ClientLoyaltyAccount, LoyaltyTransaction, LoyaltyRedemption } from "@/types";
import QRDisplay from "@/components/loyalty/QRDisplay";
import RedeemModal from "@/components/loyalty/RedeemModal";

interface Detail {
  account: ClientLoyaltyAccount;
  transactions: LoyaltyTransaction[];
  redemptions: LoyaltyRedemption[];
}

const TX_LABELS: Record<string, { label: string; color: string }> = {
  earn:       { label: "Visita completada",    color: "text-green-600"          },
  redeem:     { label: "Recompensa canjeada",  color: "text-primary"         },
  adjustment: { label: "Ajuste manual",        color: "text-blue-600"           },
  expiry:     { label: "Puntos expirados",     color: "text-on-surface-variant" },
};

export default function LoyaltyAccountPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = use(params);
  const { toast } = useToast();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [showRedeem, setShowRedeem] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [adjustDelta, setAdjustDelta] = useState(0);
  const [adjustNotes, setAdjustNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/loyalty/accounts/${accountId}`);
      const data = await res.json();
      setDetail(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [accountId]);

  const handleAdjust = async () => {
    if (adjustDelta === 0) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/loyalty/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          pointsDelta: adjustDelta,
          notes: adjustNotes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al ajustar");
        return;
      }
      toast(`Puntos ajustados: ${adjustDelta > 0 ? "+" : ""}${adjustDelta}`, "success");
      setAdjusting(false);
      setAdjustDelta(0);
      setAdjustNotes("");
      fetchDetail();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="material-symbols-outlined text-primary animate-spin text-3xl">progress_activity</span>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-on-surface-variant">Cuenta no encontrada</p>
        <Link href="/loyalty" className="text-primary font-bold text-sm">
          Volver a fidelización
        </Link>
      </div>
    );
  }

  const { account, transactions, redemptions } = detail;
  const program = account.program;
  const threshold = program?.rewardThreshold ?? 10;
  const progress = Math.min((account.totalPoints / threshold) * 100, 100);
  const canRedeem = account.totalPoints >= threshold && program?.isActive;

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-nav border-b border-border-subtle px-5 py-3 flex items-center gap-3">
        <Link
          href="/loyalty"
          className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-sunken transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-headline text-base font-bold text-on-surface truncate">
            {account.client?.name ?? "Clienta"}
          </h1>
          <p className="text-xs text-on-surface-variant">{account.client?.phone}</p>
        </div>
        <button
          onClick={() => setShowQR(true)}
          className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
        >
          <span className="material-symbols-outlined text-sm">qr_code</span>
        </button>
      </header>

      <main className="px-4 pt-4 max-w-2xl mx-auto space-y-4">
        {/* Points card */}
        <div className="bg-primary rounded-3xl p-6 text-on-primary space-y-4 shadow-primary-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/70 text-xs font-medium uppercase tracking-wider">
                {program?.name ?? "Programa de fidelización"}
              </p>
              <p className="font-headline text-5xl font-extrabold mt-1">{account.totalPoints}</p>
              <p className="text-white/70 text-sm">puntos actuales</p>
            </div>
            <div className="text-right">
              <p className="text-white/70 text-xs">Total histórico</p>
              <p className="font-headline font-bold text-xl">{account.lifetimePoints}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-white/70 text-xs">
              {canRedeem
                ? `¡Recompensa disponible! ${program?.rewardDescription}`
                : `Faltan ${threshold - account.totalPoints} puntos para la recompensa`}
            </p>
          </div>
        </div>

        {/* Acciones */}
        <div className="grid grid-cols-2 gap-3">
          {canRedeem && (
            <button
              onClick={() => setShowRedeem(true)}
              className="flex items-center justify-center gap-2 h-12 bg-green-500 text-white font-bold rounded-2xl col-span-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">redeem</span>
              Canjear recompensa
            </button>
          )}
          <button
            onClick={() => setAdjusting(true)}
            className="flex items-center justify-center gap-2 h-12 bg-surface-container-lowest text-on-surface-variant font-bold rounded-2xl shadow-sm border border-outline-variant/10 text-sm"
          >
            <span className="material-symbols-outlined text-sm">tune</span>
            Ajustar puntos
          </button>
          <button
            onClick={() => setShowQR(true)}
            className="flex items-center justify-center gap-2 h-12 bg-surface-container-lowest text-on-surface-variant font-bold rounded-2xl shadow-sm border border-outline-variant/10 text-sm"
          >
            <span className="material-symbols-outlined text-sm">qr_code</span>
            Ver QR
          </button>
        </div>

        {/* Ajuste de puntos */}
        {adjusting && (
          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-headline font-bold text-on-surface text-sm">Ajuste manual</h3>
              <button onClick={() => setAdjusting(false)} className="text-on-surface-variant">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                Puntos (positivo para sumar, negativo para restar)
              </label>
              <input
                type="number"
                value={adjustDelta}
                onChange={(e) => setAdjustDelta(Number(e.target.value))}
                className="mt-1 w-full bg-surface-container-high rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-container border-none outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                Motivo (opcional)
              </label>
              <input
                type="text"
                placeholder="Ej: Corrección por error, bonus especial..."
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                className="mt-1 w-full bg-surface-container-high rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-container border-none outline-none placeholder:text-on-surface-variant/40"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              onClick={handleAdjust}
              disabled={saving || adjustDelta === 0}
              className="w-full h-11 bg-primary text-white font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
              ) : (
                "Aplicar ajuste"
              )}
            </button>
          </div>
        )}

        {/* Historial de transacciones */}
        <div className="space-y-2">
          <h2 className="font-headline font-bold text-on-surface text-sm px-1">
            Historial de puntos
          </h2>
          {transactions.length === 0 ? (
            <p className="text-sm text-on-surface-variant text-center py-6">
              Sin transacciones registradas
            </p>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => {
                const meta = TX_LABELS[tx.transactionType] ?? TX_LABELS.adjustment;
                return (
                  <div
                    key={tx.id}
                    className="bg-surface-container-lowest rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm border border-outline-variant/10"
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold ${meta.color}`}>{meta.label}</p>
                      {tx.notes && (
                        <p className="text-xs text-on-surface-variant truncate">{tx.notes}</p>
                      )}
                      <p className="text-[10px] text-on-surface-variant mt-0.5">
                        {new Date(tx.createdAt).toLocaleDateString("es-VE", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <span
                      className={`font-headline font-extrabold text-base ${
                        tx.pointsDelta > 0 ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {tx.pointsDelta > 0 ? "+" : ""}
                      {tx.pointsDelta}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Historial de canjes */}
        {redemptions.length > 0 && (
          <div className="space-y-2">
            <h2 className="font-headline font-bold text-on-surface text-sm px-1">Canjes</h2>
            <div className="space-y-2">
              {redemptions.map((r) => (
                <div
                  key={r.id}
                  className="bg-surface-container-lowest rounded-xl px-4 py-3 shadow-sm border border-outline-variant/10"
                >
                  <p className="text-xs font-bold text-primary">Recompensa canjeada</p>
                  <p className="text-sm text-on-surface">{r.rewardDescription}</p>
                  <p className="text-[10px] text-on-surface-variant mt-0.5">
                    {new Date(r.redeemedAt).toLocaleDateString("es-VE", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    · {r.pointsUsed} puntos
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowQR(false)}
          />
          <div className="relative bg-white rounded-[2rem] p-8 shadow-2xl space-y-4 flex flex-col items-center mx-4">
            <div className="flex items-center justify-between w-full">
              <h3 className="font-headline font-bold text-on-surface">QR de {account.client?.name}</h3>
              <button
                onClick={() => setShowQR(false)}
                className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            <QRDisplay token={account.qrToken} size={220} label={account.qrToken.slice(0, 12) + "..."} />
            <p className="text-xs text-on-surface-variant text-center max-w-xs">
              La clienta puede mostrar este QR para que el personal lo escanee o copie el código.
            </p>
          </div>
        </div>
      )}

      {/* Redeem Modal */}
      {showRedeem && (
        <RedeemModal
          account={account}
          onClose={() => setShowRedeem(false)}
          onRedeemed={() => {
            fetchDetail();
            toast("¡Canje registrado!", "success");
          }}
        />
      )}

    </div>
  );
}
