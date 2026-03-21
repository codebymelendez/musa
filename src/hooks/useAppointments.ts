"use client";

import { useState, useCallback } from "react";
import { Appointment, CreateAppointmentPayload, AppointmentStatus } from "@/types";
import { useAppStore } from "@/store/useAppStore";

export function useAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { updateAppointmentInStore, setTodayAppointments } = useAppStore();

  // ── Cargar citas por fecha o rango ─────────────────────────────────────────
  const fetchByDate = useCallback(async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/appointments?date=${date}`);
      if (!res.ok) throw new Error("Error al cargar citas");
      const data: Appointment[] = await res.json();
      setAppointments(data);
      setTodayAppointments(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      return [];
    } finally {
      setLoading(false);
    }
  }, [setTodayAppointments]);

  const fetchByRange = useCallback(async (from: string, to: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/appointments?from=${from}&to=${to}`);
      if (!res.ok) throw new Error("Error al cargar citas");
      const data: Appointment[] = await res.json();
      setAppointments(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Crear cita ─────────────────────────────────────────────────────────────
  const createAppointment = useCallback(
    async (payload: CreateAppointmentPayload): Promise<Appointment> => {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al crear la cita");
      setAppointments((prev) => [...prev, data].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      ));
      return data;
    },
    []
  );

  // ── Actualizar estado de cita ──────────────────────────────────────────────
  const updateStatus = useCallback(
    async (id: string, status: AppointmentStatus): Promise<Appointment> => {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al actualizar");

      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? data : a))
      );
      updateAppointmentInStore(id, data);
      return data;
    },
    [updateAppointmentInStore]
  );

  // ── Registrar pago ─────────────────────────────────────────────────────────
  const registerPayment = useCallback(
    async (
      id: string,
      payment: { amount: number; method: string; isPaid?: boolean; notes?: string }
    ): Promise<Appointment> => {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al registrar pago");

      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? data : a))
      );
      return data;
    },
    []
  );

  return {
    appointments,
    loading,
    error,
    fetchByDate,
    fetchByRange,
    createAppointment,
    updateStatus,
    registerPayment,
  };
}
