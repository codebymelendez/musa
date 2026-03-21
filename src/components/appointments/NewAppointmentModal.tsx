"use client";

import { useState, useEffect } from "react";
import { useServices } from "@/hooks/useServices";
import { useClients } from "@/hooks/useClients";
import { useAppointments } from "@/hooks/useAppointments";
import { formatCurrency } from "@/lib/utils";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function NewAppointmentModal({ onClose, onCreated }: Props) {
  const { services, fetchServices } = useServices();
  const { clients, fetchClients, createClient } = useClients();
  const { createAppointment } = useAppointments();

  const [step, setStep] = useState<"service" | "datetime" | "client">("service");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedTime, setSelectedTime] = useState("");
  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchServices();
    fetchClients();
  }, [fetchServices, fetchClients]);

  const selectedService = services.find((s) => s.id === selectedServiceId);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      let clientId = selectedClientId;

      // Si es clienta nueva, crearla primero
      if (clientMode === "new") {
        if (!newClientName || !newClientPhone) {
          setError("Nombre y teléfono de la clienta son obligatorios");
          setLoading(false);
          return;
        }
        const client = await createClient({
          name: newClientName,
          phone: newClientPhone,
        });
        clientId = client.id;
      }

      if (!clientId || !selectedServiceId || !selectedDate || !selectedTime) {
        setError("Por favor completa todos los campos");
        setLoading(false);
        return;
      }

      const startTime = new Date(`${selectedDate}T${selectedTime}:00`).toISOString();

      await createAppointment({ clientId, serviceId: selectedServiceId, startTime });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la cita");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-surface/95 backdrop-blur-md flex items-end sm:items-center justify-center">
      <div className="bg-surface-container-lowest w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-2xl font-bold">Nueva Cita</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {error && (
          <div className="p-4 bg-error-container rounded-xl text-on-error-container text-sm">
            {error}
          </div>
        )}

        {/* Paso 1: Seleccionar servicio */}
        <div className="space-y-3">
          <h3 className="font-semibold text-on-surface-variant text-sm uppercase tracking-wider">
            Servicio
          </h3>
          <div className="space-y-2">
            {services.map((s) => (
              <label key={s.id} className="flex items-center gap-4 p-4 rounded-xl bg-surface-container-low cursor-pointer hover:bg-surface-container transition-colors">
                <input
                  type="radio"
                  name="service"
                  value={s.id}
                  checked={selectedServiceId === s.id}
                  onChange={() => setSelectedServiceId(s.id)}
                  className="accent-primary"
                />
                <div className="flex-1">
                  <p className="font-semibold text-on-surface">{s.name}</p>
                  <p className="text-xs text-on-surface-variant">
                    {s.durationMin} min · {formatCurrency(s.price, s.currency)}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Paso 2: Fecha y hora */}
        <div className="space-y-3">
          <h3 className="font-semibold text-on-surface-variant text-sm uppercase tracking-wider">
            Fecha y Hora
          </h3>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full h-12 px-4 bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary text-on-surface"
            min={new Date().toISOString().split("T")[0]}
          />
          <input
            type="time"
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            className="w-full h-12 px-4 bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary text-on-surface"
          />
        </div>

        {/* Paso 3: Clienta */}
        <div className="space-y-3">
          <h3 className="font-semibold text-on-surface-variant text-sm uppercase tracking-wider">
            Clienta
          </h3>

          {/* Toggle existente / nueva */}
          <div className="flex bg-surface-container-low p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setClientMode("existing")}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${clientMode === "existing" ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant"}`}
            >
              Clienta existente
            </button>
            <button
              type="button"
              onClick={() => setClientMode("new")}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${clientMode === "new" ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant"}`}
            >
              Nueva clienta
            </button>
          </div>

          {clientMode === "existing" ? (
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full h-12 px-4 bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary text-on-surface"
            >
              <option value="">Seleccionar clienta...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} – {c.phone}
                </option>
              ))}
            </select>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Nombre de la clienta"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                className="w-full h-12 px-4 bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary text-on-surface placeholder:text-on-surface-variant/50"
              />
              <input
                type="tel"
                placeholder="Teléfono"
                value={newClientPhone}
                onChange={(e) => setNewClientPhone(e.target.value)}
                className="w-full h-12 px-4 bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary text-on-surface placeholder:text-on-surface-variant/50"
              />
            </div>
          )}
        </div>

        {/* Resumen */}
        {selectedService && selectedDate && selectedTime && (
          <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-1">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Resumen
            </p>
            <p className="font-semibold text-on-surface">{selectedService.name}</p>
            <p className="text-sm text-on-surface-variant">
              {selectedDate} a las {selectedTime} ·{" "}
              {formatCurrency(selectedService.price, selectedService.currency)}
            </p>
          </div>
        )}

        {/* Confirmar */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full h-14 bg-gradient-to-r from-primary to-primary-container text-white font-headline font-bold rounded-full shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading ? (
            <span className="material-symbols-outlined animate-spin">
              progress_activity
            </span>
          ) : (
            <>
              Confirmar Cita
              <span className="material-symbols-outlined">check</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
