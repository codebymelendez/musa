"use client";

import { useState, useCallback } from "react";
import { Service, CreateServicePayload } from "@/types";

export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/services");
      if (!res.ok) throw new Error("Error al cargar servicios");
      const data: Service[] = await res.json();
      setServices(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createService = useCallback(
    async (payload: CreateServicePayload): Promise<Service> => {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al crear servicio");
      setServices((prev) => [...prev, data]);
      return data;
    },
    []
  );

  const updateService = useCallback(
    async (id: string, payload: Partial<CreateServicePayload>): Promise<Service> => {
      const res = await fetch(`/api/services/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al actualizar");
      setServices((prev) => prev.map((s) => (s.id === id ? data : s)));
      return data;
    },
    []
  );

  const deleteService = useCallback(async (id: string) => {
    const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Error al eliminar");
    }
    setServices((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return {
    services,
    loading,
    error,
    fetchServices,
    createService,
    updateService,
    deleteService,
  };
}
