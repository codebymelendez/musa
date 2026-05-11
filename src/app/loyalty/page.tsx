"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { LoyaltyProgram, ClientLoyaltyAccount } from "@/types";
import LoyaltyProgramForm from "@/components/loyalty/LoyaltyProgramForm";
import ClientLoyaltyCard from "@/components/loyalty/ClientLoyaltyCard";
import RedeemModal from "@/components/loyalty/RedeemModal";

type Tab = "clients" | "config";

export default function LoyaltyPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("clients");
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [accounts, setAccounts] = useState<ClientLoyaltyAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [redeemAccount, setRedeemAccount] = useState<ClientLoyaltyAccount | null>(null);
  const [scanToken, setScanToken] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const fetchProgram = useCallback(async () => {
    const res = await fetch("/api/loyalty/program");
    const data = await res.json();
    setProgram(data.program ?? null);
  }, []);

  const fetchAccounts = useCallback(async (q = "") => {
    setLoading(true);
    try {
      const url = q
        ? `/api/loyalty/accounts?search=${encodeURIComponent(q)}`
        : "/api/loyalty/accounts";
      const res = await fetch(url);
      const data = await res.json();
      setAccounts(data.accounts ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProgram();
    fetchAccounts();
  }, [fetchProgram, fetchAccounts]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => fetchAccounts(search), 300);
    return () => clearTimeout(t);
  }, [search, fetchAccounts]);

  const handleScan = async () => {
    if (!scanToken.trim()) return;
    setScanning(true);
    setScanError(null);
    try {
      const res = await fetch(`/api/loyalty/scan/${encodeURIComponent(scanToken.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setScanError(data.error ?? "Código no encontrado");
        return;
      }
      // Navegar al detalle de la cuenta
      window.location.href = `/loyalty/${data.account.id}`;
    } catch {
      setScanError("Error de conexión");
    } finally {
      setScanning(false);
    }
  };

  const totalReady = accounts.filter(
    (a) => a.program && a.totalPoints >= a.program.rewardThreshold
  ).length;

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-nav border-b border-border-subtle px-5 py-3 flex items-center gap-3">
        <Link
          href="/home"
          className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-sunken transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
        </Link>
        <div className="flex-1">
          <h1 className="font-headline text-lg font-bold text-on-surface">Fidelización</h1>
          <p className="text-xs text-on-surface-variant">
            {program?.name ?? "Sin programa activo"}
          </p>
        </div>
        {program && (
          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
              program.isActive
                ? "bg-green-100 text-green-700"
                : "bg-surface-container-high text-on-surface-variant"
            }`}
          >
            {program.isActive ? "Activo" : "Inactivo"}
          </span>
        )}
      </header>

      <main className="px-4 pt-4 max-w-2xl mx-auto space-y-4">
        {/* Stats */}
        {program && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-surface-container-lowest rounded-2xl p-4 text-center shadow-sm">
              <p className="text-2xl font-headline font-extrabold text-on-surface">{accounts.length}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">Clientas</p>
            </div>
            <div className="bg-surface-container-lowest rounded-2xl p-4 text-center shadow-sm">
              <p className="text-2xl font-headline font-extrabold text-on-surface">{totalReady}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">Con recompensa</p>
            </div>
            <div className="bg-surface-container-lowest rounded-2xl p-4 text-center shadow-sm">
              <p className="text-2xl font-headline font-extrabold text-on-surface">
                {program.rewardThreshold}
              </p>
              <p className="text-xs text-on-surface-variant mt-0.5">Umbral</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-surface-container-high rounded-2xl p-1">
          {(["clients", "config"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                tab === t
                  ? "bg-white text-on-surface shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {t === "clients" ? "Clientas" : "Configuración"}
            </button>
          ))}
        </div>

        {/* ─── TAB CLIENTAS ─── */}
        {tab === "clients" && (
          <div className="space-y-4">
            {!program ? (
              <div className="text-center py-16 space-y-4">
                <span
                  className="material-symbols-outlined text-5xl text-on-surface-variant"
                  style={{ fontVariationSettings: "'FILL' 0" }}
                >
                  loyalty
                </span>
                <div>
                  <h3 className="font-headline font-bold text-on-surface">Sin programa activo</h3>
                  <p className="text-sm text-on-surface-variant mt-1">
                    Configura tu programa de fidelización para empezar.
                  </p>
                </div>
                <button
                  onClick={() => setTab("config")}
                  className="mx-auto flex items-center gap-2 text-sm font-bold text-primary hover:underline"
                >
                  <span className="material-symbols-outlined text-sm">settings</span>
                  Configurar programa
                </button>
              </div>
            ) : (
              <>
                {/* Buscar por QR / código */}
                <div className="bg-surface-container-lowest rounded-2xl p-4 space-y-3 shadow-sm border border-outline-variant/10">
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    Escanear / buscar por código QR
                  </p>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 bg-surface-container-high rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-container border-none outline-none font-mono"
                      placeholder="Pega o escribe el código QR..."
                      value={scanToken}
                      onChange={(e) => {
                        setScanToken(e.target.value);
                        setScanError(null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleScan()}
                    />
                    <button
                      onClick={handleScan}
                      disabled={scanning || !scanToken.trim()}
                      className="w-12 h-10 bg-primary text-white rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-50"
                    >
                      {scanning ? (
                        <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                      ) : (
                        <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
                      )}
                    </button>
                  </div>
                  {scanError && (
                    <p className="text-xs text-red-600">{scanError}</p>
                  )}
                </div>

                {/* Search */}
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">
                    search
                  </span>
                  <input
                    className="w-full bg-surface-container-high rounded-2xl pl-9 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary-container border-none outline-none"
                    placeholder="Buscar clienta..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                {/* List */}
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-32 bg-surface-container-high rounded-2xl animate-pulse" />
                    ))}
                  </div>
                ) : accounts.length === 0 ? (
                  <div className="text-center py-12 text-on-surface-variant">
                    <span className="material-symbols-outlined text-4xl">person_off</span>
                    <p className="text-sm mt-2">
                      {search ? "Sin resultados" : "Aún no hay clientas en el programa"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {accounts.map((account) => (
                      <ClientLoyaltyCard
                        key={account.id}
                        account={account}
                        onRedeem={(id) => {
                          const a = accounts.find((x) => x.id === id);
                          if (a) setRedeemAccount(a);
                        }}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ─── TAB CONFIGURACIÓN ─── */}
        {tab === "config" && (
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/10">
            <LoyaltyProgramForm
              program={program}
              onSaved={(p) => {
                setProgram(p);
                toast("Programa actualizado", "success");
              }}
            />
          </div>
        )}
      </main>

      {/* Redeem Modal */}
      {redeemAccount && (
        <RedeemModal
          account={redeemAccount}
          onClose={() => setRedeemAccount(null)}
          onRedeemed={() => {
            fetchAccounts(search);
            toast("¡Canje registrado exitosamente!", "success");
          }}
        />
      )}

    </div>
  );
}
