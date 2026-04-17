"use client";

import Link from "next/link";
import { ClientLoyaltyAccount } from "@/types";

interface Props {
  account: ClientLoyaltyAccount;
  onRedeem?: (accountId: string) => void;
}

export default function ClientLoyaltyCard({ account, onRedeem }: Props) {
  const program = account.program;
  const threshold = program?.rewardThreshold ?? 10;
  const progress = Math.min((account.totalPoints / threshold) * 100, 100);
  const canRedeem = account.totalPoints >= threshold;

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/10 space-y-4">
      {/* Client info */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {account.client?.name?.charAt(0).toUpperCase() ?? "?"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-on-surface text-sm truncate">
            {account.client?.name ?? "Clienta"}
          </p>
          <p className="text-xs text-on-surface-variant">{account.client?.phone}</p>
        </div>
        {canRedeem && (
          <span className="flex-shrink-0 text-[10px] font-bold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
            ¡Recompensa lista!
          </span>
        )}
      </div>

      {/* Points */}
      <div className="space-y-2">
        <div className="flex items-end justify-between">
          <span className="text-2xl font-headline font-extrabold text-on-surface">
            {account.totalPoints}
          </span>
          <span className="text-xs text-on-surface-variant mb-0.5">/ {threshold}</span>
        </div>
        <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${canRedeem ? "bg-green-500" : "bg-gradient-to-r from-primary to-primary-container"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-on-surface-variant">
          {canRedeem
            ? `Puede canjear: ${program?.rewardDescription ?? "recompensa"}`
            : `Faltan ${threshold - account.totalPoints} para la recompensa`}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Link
          href={`/loyalty/${account.id}`}
          className="flex-1 h-9 bg-surface-container text-on-surface-variant text-xs font-bold rounded-xl flex items-center justify-center gap-1 hover:bg-surface-container-high transition-colors"
        >
          <span className="material-symbols-outlined text-sm">history</span>
          Historial
        </Link>
        {canRedeem && onRedeem && (
          <button
            onClick={() => onRedeem(account.id)}
            className="flex-1 h-9 bg-green-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 hover:bg-green-600 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">redeem</span>
            Canjear
          </button>
        )}
      </div>
    </div>
  );
}
