"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "@heroicons/react/24/outline";

interface UsageStatus {
  planName: string;
  appointments: { used: number; limit: number };
  clients: { used: number; limit: number };
}

function UsageBar({
  used,
  limit,
  label,
}: {
  used: number;
  limit: number;
  label: string;
}) {
  const pct = Math.min(used / limit, 1);
  const isOver = pct >= 1;
  const isNear = pct >= 0.7;

  const fillColor = isOver
    ? "bg-error"
    : isNear
    ? "bg-warning"
    : "bg-primary";

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <p className="musa-sublabel text-on-surface-subtle">{label}</p>
        <span
          className="font-mono-num text-[12px]"
          style={{
            color: isOver
              ? "var(--color-error)"
              : isNear
              ? "var(--color-warning)"
              : "var(--color-on-surface-muted)",
          }}
        >
          {used} / {limit}
        </span>
      </div>
      <div className="h-1.5 bg-surface-sunken rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${fillColor}`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  );
}

export default function PlanUsageWidget() {
  const [status, setStatus] = useState<UsageStatus | null>(null);

  useEffect(() => {
    fetch("/api/limits/usage")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setStatus(d); })
      .catch(() => {});
  }, []);

  if (!status || status.planName !== "FREE") return null;

  const aptPct = status.appointments.used / status.appointments.limit;
  const clientPct = status.clients.used / status.clients.limit;
  const showWidget = aptPct >= 0.7 || clientPct >= 0.7;

  if (!showWidget) return null;

  const isAtLimit =
    status.appointments.used >= status.appointments.limit ||
    status.clients.used >= status.clients.limit;

  return (
    <div
      className="rounded-xl border p-4 space-y-3"
      style={{
        background: isAtLimit
          ? "var(--color-primary-surface)"
          : "var(--color-surface-raised)",
        borderColor: isAtLimit
          ? "var(--color-primary-border)"
          : "var(--color-border-subtle)",
      }}
    >
      <div className="flex items-center justify-between">
        <p className="musa-sublabel text-on-surface-subtle">
          Plan Free
        </p>
        {isAtLimit && (
          <span className="musa-tag musa-tag--primary">Límite alcanzado</span>
        )}
      </div>

      <UsageBar
        label="Citas este mes"
        used={status.appointments.used}
        limit={status.appointments.limit}
      />
      <UsageBar
        label="Clientas activas"
        used={status.clients.used}
        limit={status.clients.limit}
      />

      <Link
        href="/settings/plans"
        className="inline-flex items-center gap-1.5 font-ui text-[13px] font-medium text-primary hover:opacity-75 transition-opacity"
      >
        Mejorar a PRO
        <ArrowRightIcon className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
