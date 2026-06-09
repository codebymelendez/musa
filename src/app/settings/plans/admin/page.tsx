"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import {
  CheckIcon,
  XMarkIcon,
  ArrowLeftIcon,
  CreditCardIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

interface PaymentItem {
  id: string;
  businessId: string;
  userId: string;
  planId: string;
  status: "under_review" | "approved" | "rejected";
  paymentMethod: "pagomovil" | "zelle";
  referenceNumber: string | null;
  amountUSD: number;
  amountBS: number | null;
  bcvRate: number | null;
  notes: string | null;
  createdAt: string;
  business?: { name: string; slug: string } | null;
  user?: { name: string; email: string } | null;
  plan?: { name: string } | null;
}

export default function AdminPaymentsPage() {
  const { user } = useAppStore();
  const { loadUser } = useAuth();
  const router = useRouter();

  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State for Reject Action
  const [selectedPay, setSelectedPay] = useState<PaymentItem | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    // Restringir acceso al cliente
    if (user && !user.isAdmin) {
      router.push("/home");
      return;
    }
    if (user && user.isAdmin) {
      fetchPayments();
    }
  }, [user, router]);

  const fetchPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/plan-payments");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error al obtener pagos");
      }
      const data = await res.json();
      setPayments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (payId: string) => {
    if (!confirm("¿Estás seguro de que deseas APROBAR este pago? Esto activará inmediatamente el plan del negocio por 30 días.")) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/plan-payments/${payId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al aprobar el pago");
      
      // Update local state
      setPayments((prev) =>
        prev.map((p) =>
          p.id === payId ? { ...p, status: "approved" as const, approvedAt: new Date().toISOString() } : p
        )
      );
      alert("Pago aprobado y plan activado exitosamente.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setProcessing(false);
    }
  };

  const openRejectModal = (pay: PaymentItem) => {
    setSelectedPay(pay);
    setRejectNotes("");
  };

  const handleReject = async () => {
    if (!selectedPay) return;
    if (rejectNotes.trim().length === 0) {
      alert("Por favor, ingresa el motivo del rechazo.");
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/plan-payments/${selectedPay.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", notes: rejectNotes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al rechazar el pago");

      // Update local state
      setPayments((prev) =>
        prev.map((p) =>
          p.id === selectedPay.id ? { ...p, status: "rejected" as const, notes: rejectNotes, rejectedAt: new Date().toISOString() } : p
        )
      );
      setSelectedPay(null);
      alert("Pago rechazado correctamente.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setProcessing(false);
    }
  };

  const formatFecha = (isoString: string) => {
    return new Date(isoString).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Filtrar pagos por pendientes
  const pendingPayments = payments.filter((p) => p.status === "under_review");
  const processedPayments = payments.filter((p) => p.status !== "under_review");

  return (
    <main className="min-h-screen bg-background px-6 pb-32 pt-20">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Cabecera */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Link
              href="/settings/plans"
              className="inline-flex items-center gap-2 font-ui text-[13px] font-medium text-primary hover:underline"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Volver a Planes
            </Link>
            <h1 className="font-cormorant font-normal text-[36px] italic text-on-surface">
              Revisión de Pagos Manuales
            </h1>
            <p className="font-ui text-[14px] text-on-surface-variant font-medium">
              Aprueba o rechaza los comprobantes de Pago Móvil (Bs) y transferencias Zelle (USD).
            </p>
          </div>
          <div>
            <button
              onClick={fetchPayments}
              className="px-5 py-2.5 bg-surface border border-outline-variant/30 rounded-full text-xs font-semibold hover:bg-surface-sunken transition-colors"
            >
              🔄 Actualizar Lista
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-error-surface border border-error/20 p-5 rounded-2xl flex items-center gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-error shrink-0" />
            <p className="font-ui text-[14px] text-error">{error}</p>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Pagos Pendientes */}
            <section className="space-y-4">
              <h2 className="font-ui font-bold text-[16px] text-on-surface flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-warning animate-pulse" />
                Pendientes de Aprobación ({pendingPayments.length})
              </h2>

              {pendingPayments.length === 0 ? (
                <div className="bg-surface border border-outline-variant/20 p-8 rounded-2xl text-center">
                  <p className="font-ui text-[14px] text-on-surface-variant">No hay pagos pendientes por revisar. ¡Todo al día! 🎉</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {pendingPayments.map((pay) => (
                    <div
                      key={pay.id}
                      className="bg-surface border border-outline-variant/30 rounded-2xl p-6 flex flex-col justify-between space-y-5 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="px-3 py-1 bg-warning/10 text-warning rounded-full font-ui text-[11px] font-semibold uppercase tracking-wider">
                            En revisión
                          </span>
                          <span className="font-mono text-[11px] text-on-surface-variant">
                            {formatFecha(pay.createdAt)}
                          </span>
                        </div>

                        <div>
                          <p className="font-ui font-semibold text-[15px] text-on-surface">
                            {pay.business?.name || "Negocio sin nombre"}
                          </p>
                          <p className="font-ui text-[12px] text-on-surface-variant font-medium">
                            Dueño: {pay.user?.name} · {pay.user?.email}
                          </p>
                        </div>

                        <div className="p-4 bg-background rounded-xl space-y-2 border border-outline-variant/10">
                          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase">
                            <CreditCardIcon className="w-4 h-4" />
                            {pay.paymentMethod === "pagomovil" ? "Pago Móvil (VES)" : "Zelle (USD)"}
                          </div>
                          <p className="font-display text-[22px] text-on-surface leading-none mt-1">
                            {pay.amountBS ? `Bs. ${pay.amountBS.toLocaleString("es-VE")}` : `$${pay.amountUSD.toFixed(2)} USD`}
                          </p>
                          {pay.bcvRate && (
                            <p className="font-ui text-[11px] text-on-surface-variant">
                              Tasa BCV: {pay.bcvRate} Bs/$ · Base: ${pay.amountUSD} USD
                            </p>
                          )}
                          <div className="pt-2 border-t border-outline-variant/10 flex items-start gap-1">
                            <span className="font-ui text-[11px] text-on-surface-variant font-medium">Ref / Remitente:</span>
                            <span className="font-mono text-[12px] font-bold text-on-surface break-all">{pay.referenceNumber || "S/N"}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
                          <CalendarDaysIcon className="w-4 h-4 text-on-surface-variant" />
                          Plan Solicitado: <span className="font-bold text-primary">{pay.plan?.name}</span>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => handleApprove(pay.id)}
                          disabled={processing}
                          className="flex-1 h-11 bg-[#2E7D32] hover:bg-[#1B5E20] text-white rounded-full font-ui font-semibold text-[13px] flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all disabled:opacity-50"
                        >
                          <CheckIcon className="w-4 h-4" />
                          Aprobar
                        </button>
                        <button
                          onClick={() => openRejectModal(pay)}
                          disabled={processing}
                          className="flex-1 h-11 bg-[#C62828] hover:bg-[#B71C1C] text-white rounded-full font-ui font-semibold text-[13px] flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all disabled:opacity-50"
                        >
                          <XMarkIcon className="w-4 h-4" />
                          Rechazar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Historial de Pagos Procesados */}
            <section className="space-y-4 pt-4">
              <h2 className="font-ui font-bold text-[16px] text-on-surface">Historial Procesados ({processedPayments.length})</h2>

              {processedPayments.length === 0 ? (
                <p className="font-ui text-[12px] text-on-surface-variant italic">No hay registros de pagos procesados.</p>
              ) : (
                <div className="bg-surface border border-outline-variant/30 rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-ui text-[13px]">
                      <thead className="bg-background text-on-surface-variant font-bold border-b border-outline-variant/20 uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="p-4">Negocio</th>
                          <th className="p-4">Fecha</th>
                          <th className="p-4">Método / Ref</th>
                          <th className="p-4">Monto</th>
                          <th className="p-4">Estado</th>
                          <th className="p-4">Notas / Auditoría</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/10 text-on-surface">
                        {processedPayments.map((pay) => (
                          <tr key={pay.id} className="hover:bg-surface-sunken transition-colors">
                            <td className="p-4">
                              <div className="font-semibold">{pay.business?.name}</div>
                              <div className="text-[11px] text-on-surface-variant">Plan: {pay.plan?.name}</div>
                            </td>
                            <td className="p-4 text-[12px] text-on-surface-variant whitespace-nowrap">
                              {formatFecha(pay.createdAt)}
                            </td>
                            <td className="p-4">
                              <span className="font-semibold text-primary text-xs uppercase block">
                                {pay.paymentMethod === "pagomovil" ? "Pago Móvil" : "Zelle"}
                              </span>
                              <span className="font-mono text-xs text-on-surface break-all">{pay.referenceNumber || "S/N"}</span>
                            </td>
                            <td className="p-4 whitespace-nowrap">
                              <div className="font-semibold">
                                {pay.amountBS ? `Bs. ${pay.amountBS.toLocaleString("es-VE")}` : `$${pay.amountUSD.toFixed(2)}`}
                              </div>
                              {pay.bcvRate && <div className="text-[10px] text-on-surface-variant">BCV: {pay.bcvRate} Bs/$</div>}
                            </td>
                            <td className="p-4 whitespace-nowrap">
                              {pay.status === "approved" ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E8F5E9] text-[#2E7D32] font-semibold text-[11px] uppercase">
                                  Aprobado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FDF0EC] text-[#C62828] font-semibold text-[11px] uppercase">
                                  Rechazado
                                </span>
                              )}
                            </td>
                            <td className="p-4 max-w-xs truncate text-on-surface-variant text-[12px]">
                              {pay.notes ? (
                                <span className="flex items-center gap-1 text-[#C62828]">
                                  <ChatBubbleLeftRightIcon className="w-4 h-4 shrink-0" />
                                  {pay.notes}
                                </span>
                              ) : (
                                <span className="text-on-surface-variant/40">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* Modal de Rechazo */}
      {selectedPay && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-surface border border-outline-variant/30 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-xl">
            <div className="space-y-1">
              <h3 className="font-display font-semibold text-[20px] text-on-surface">Rechazar Registro de Pago</h3>
              <p className="font-ui text-[12px] text-on-surface-variant">
                Indica la razón por la cual se rechaza el pago de {selectedPay.business?.name}. Esta nota será visible para el profesional.
              </p>
            </div>

            <textarea
              className="musa-input min-h-[100px] py-3 text-[14px]"
              placeholder="Ej: Número de referencia no concuerda en cuenta bancaria, monto incompleto, etc."
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
            />

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setSelectedPay(null)}
                disabled={processing}
                className="px-5 py-2.5 bg-surface border border-outline-variant/30 text-on-surface rounded-full text-xs font-semibold hover:bg-surface-sunken transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={processing}
                className="px-5 py-2.5 bg-[#C62828] hover:bg-[#B71C1C] text-white rounded-full text-xs font-semibold transition-all disabled:opacity-50"
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
