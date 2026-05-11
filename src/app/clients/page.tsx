"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MagnifyingGlassIcon,
  EyeIcon,
  EyeSlashIcon,
  PhoneIcon,
  CalendarDaysIcon,
  ClockIcon,
  PencilIcon,
  UserMinusIcon,
  CheckCircleIcon,
  UserPlusIcon,
  CakeIcon,
} from "@heroicons/react/24/outline";
import { Client } from "@/types";
import ClientModalForm from "@/components/clients/ClientModalForm";

function getInitials(name: string) {
  return name.trim().split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function formatBirthday(dateStr: string | null) {
  if (!dateStr) return null;
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-VE", { day: "numeric", month: "short" });
}

const TAG_CLASSES: Record<string, string> = {
  VIP:             "musa-tag musa-tag--gold",
  Frecuente:       "musa-tag musa-tag--success",
  Referida:        "musa-tag musa-tag--primary",
  Estudiante:      "musa-tag musa-tag--rose",
  "Nuevo cliente": "musa-tag musa-tag--neutral",
};

export default function ClientsPage() {
  const [clients,         setClients]         = useState<Client[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [search,          setSearch]          = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showInactive,    setShowInactive]    = useState(false);
  const [modalOpen,       setModalOpen]       = useState(false);
  const [editTarget,      setEditTarget]      = useState<Client | null>(null);
  const [archiving,       setArchiving]       = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (showInactive)    params.set("showInactive", "true");
      const res  = await fetch(`/api/clients?${params.toString()}`);
      const data = await res.json();
      setClients(Array.isArray(data) ? data : []);
    } catch {
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, showInactive]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const handleEdit       = (c: Client) => { setEditTarget(c); setModalOpen(true); };
  const handleNew        = () => { setEditTarget(null); setModalOpen(true); };
  const handleModalSaved = () => { setModalOpen(false); setEditTarget(null); fetchClients(); };

  const handleArchive = async (client: Client) => {
    const action = client.isActive ? "archivar" : "reactivar";
    if (!confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} a "${client.name}"?`)) return;
    setArchiving(client.id);
    try {
      const res = client.isActive
        ? await fetch(`/api/clients/${client.id}`, { method: "DELETE" })
        : await fetch(`/api/clients/${client.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: true }),
          });
      if (res.ok) fetchClients();
    } finally {
      setArchiving(null);
    }
  };

  const active   = clients.filter((c) => c.isActive);
  const inactive = clients.filter((c) => !c.isActive);

  return (
    <main className="pt-24 px-4 max-w-5xl mx-auto pb-32 animate-page">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 px-1">
        <div>
          <span className="musa-sublabel mb-1.5 block">Clientas</span>
          <h1 className="font-display font-normal text-[28px] text-on-surface leading-tight">
            {active.length > 0
              ? `${active.length} clienta${active.length !== 1 ? "s" : ""}`
              : "Gestión"}
          </h1>
          {inactive.length > 0 && (
            <p className="font-ui text-[13px] text-on-surface-subtle mt-1">
              {inactive.length} archivada{inactive.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <button
          onClick={handleNew}
          className="hidden md:flex items-center gap-2 bg-primary text-on-primary px-6 py-2.5 rounded-full font-ui font-medium text-[14px] shadow-primary-sm hover:bg-primary-hover transition-colors"
        >
          <UserPlusIcon className="w-4 h-4" />
          Añadir clienta
        </button>
      </div>

      {/* ── Search + filter ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 px-1">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-subtle pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre, teléfono o email…"
            className="musa-input pl-10"
          />
        </div>
        <button
          onClick={() => setShowInactive((v) => !v)}
          className={`flex items-center gap-2 px-5 h-[46px] rounded-xl font-ui text-[13px] font-medium transition-colors whitespace-nowrap border ${
            showInactive
              ? "bg-primary-surface text-primary border-primary-border"
              : "bg-surface-raised text-on-surface-muted border-border hover:border-border-focus"
          }`}
        >
          {showInactive ? <EyeIcon className="w-4 h-4" /> : <EyeSlashIcon className="w-4 h-4" />}
          {showInactive ? "Ver todas" : "Archivadas"}
        </button>
      </div>

      {/* ── Loading skeletons ────────────────────────────────────────── */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-surface-raised border border-border-subtle rounded-xl p-5 shadow-xs">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-full bg-surface-sunken animate-pulse shrink-0" />
                <div className="flex-1 space-y-2.5 pt-1">
                  <div
                    className="h-[14px] rounded bg-surface-sunken animate-pulse"
                    style={{ width: `${48 + (i * 19) % 32}%` }}
                  />
                  <div
                    className="h-[11px] rounded bg-surface-sunken animate-pulse"
                    style={{ width: `${30 + (i * 13) % 28}%` }}
                  />
                  <div className="h-[11px] rounded bg-surface-sunken animate-pulse w-[40%]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────── */}
      {!loading && clients.length === 0 && (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="musa-rule w-[80px] mb-8" />
          <p
            className="font-display font-light italic text-on-surface mb-2"
            style={{ fontSize: "26px" }}
          >
            {search ? "Sin resultados." : "Aún no hay clientas."}
          </p>
          <p className="font-ui text-[13px] text-on-surface-muted max-w-[240px] mb-8">
            {search
              ? `No encontramos "${search}". Prueba con otro nombre o número.`
              : "Añade tu primera clienta manualmente o espera a que reserven en tu página."}
          </p>
          {!search && (
            <button
              onClick={handleNew}
              className="inline-flex items-center gap-2 border border-primary text-primary px-6 py-2.5 rounded-full font-ui font-medium text-[13px] hover:bg-primary-surface transition-colors"
            >
              <UserPlusIcon className="w-4 h-4" />
              Añadir primera clienta
            </button>
          )}
        </div>
      )}

      {/* ── Grid ────────────────────────────────────────────────────── */}
      {!loading && clients.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-1">
          {clients.map((client) => {
            const isArchiving = archiving === client.id;
            const totalCitas  = client.appointments?.length ?? 0;
            const lastCita    = client.appointments?.[0];

            return (
              <div
                key={client.id}
                className={`relative musa-card p-5 ${!client.isActive ? "opacity-60" : ""}`}
              >
                {!client.isActive && (
                  <span className="absolute top-3 right-3 musa-sublabel bg-surface-sunken px-2.5 py-1 rounded-full">
                    Archivada
                  </span>
                )}

                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center font-ui font-medium text-[15px] shrink-0"
                    style={{ background: "var(--color-rose-100)", color: "var(--color-sienna-700)" }}
                  >
                    {getInitials(client.name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-ui font-medium text-[15px] text-on-surface truncate">
                        {client.name}
                      </h3>
                      {client.birthday && (
                        <span className="flex items-center gap-0.5 font-ui text-[11px] text-on-surface-subtle">
                          <CakeIcon className="w-3 h-3" />
                          {formatBirthday(client.birthday)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 font-ui text-[12px] text-on-surface-muted mt-0.5">
                      <PhoneIcon className="w-3 h-3 shrink-0" />
                      <span>{client.phone}</span>
                      {client.email && (
                        <>
                          <span className="mx-1 opacity-30">·</span>
                          <span className="truncate">{client.email}</span>
                        </>
                      )}
                    </div>

                    {client.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {client.tags.map((tag) => (
                          <span
                            key={tag}
                            className={TAG_CLASSES[tag] ?? "musa-tag musa-tag--neutral"}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-2.5 font-ui text-[11px] text-on-surface-subtle">
                      <span className="flex items-center gap-1">
                        <CalendarDaysIcon className="w-3 h-3" />
                        {totalCitas} cita{totalCitas !== 1 ? "s" : ""}
                      </span>
                      {lastCita && (
                        <span className="flex items-center gap-1">
                          <ClockIcon className="w-3 h-3" />
                          Últ: {new Date(lastCita.startTime).toLocaleDateString("es-VE", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {(client.preferences || client.notes) && (
                  <div className="mt-3 pt-3 border-t border-border-subtle">
                    {client.preferences && (
                      <p className="font-ui text-[12px] text-on-surface-muted line-clamp-1">
                        <span className="font-medium">Pref:</span> {client.preferences}
                      </p>
                    )}
                    {client.notes && (
                      <p className="font-ui text-[12px] text-on-surface-subtle line-clamp-1 mt-0.5">
                        <span className="font-medium">Nota:</span> {client.notes}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border-subtle">
                  <button
                    onClick={() => handleEdit(client)}
                    className="flex-1 flex items-center justify-center gap-1.5 h-9 bg-surface-sunken text-on-surface-muted font-ui text-[12px] font-medium rounded-lg hover:bg-primary-surface hover:text-primary transition-colors"
                  >
                    <PencilIcon className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleArchive(client)}
                    disabled={isArchiving}
                    className={`flex-1 flex items-center justify-center gap-1.5 h-9 font-ui text-[12px] font-medium rounded-lg transition-colors disabled:opacity-40 ${
                      client.isActive
                        ? "bg-surface-sunken text-on-surface-muted hover:bg-error-surface hover:text-error"
                        : "bg-surface-sunken text-on-surface-muted hover:bg-success-surface hover:text-success"
                    }`}
                  >
                    {isArchiving ? (
                      <div className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
                    ) : client.isActive ? (
                      <><UserMinusIcon className="w-3.5 h-3.5" /> Archivar</>
                    ) : (
                      <><CheckCircleIcon className="w-3.5 h-3.5" /> Reactivar</>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── FAB mobile ──────────────────────────────────────────────── */}
      <button
        onClick={handleNew}
        className="md:hidden fixed bottom-28 right-5 w-14 h-14 rounded-full bg-primary text-on-primary shadow-primary-md flex items-center justify-center active:scale-90 transition-transform z-50 hover:bg-primary-hover musa-fab"
        aria-label="Añadir clienta"
      >
        <UserPlusIcon className="w-5 h-5" />
      </button>

      {modalOpen && (
        <ClientModalForm
          client={editTarget}
          onClose={() => { setModalOpen(false); setEditTarget(null); }}
          onSaved={handleModalSaved}
        />
      )}
    </main>
  );
}
