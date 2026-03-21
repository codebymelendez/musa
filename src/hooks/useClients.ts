"use client";

import { useState, useCallback } from "react";
import { Client, CreateClientPayload } from "@/types";

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async (search?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = search
        ? `/api/clients?search=${encodeURIComponent(search)}`
        : "/api/clients";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Error al cargar clientas");
      const data: Client[] = await res.json();
      setClients(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createClient = useCallback(
    async (payload: CreateClientPayload): Promise<Client> => {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al crear clienta");
      setClients((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      return data;
    },
    []
  );

  const updateClient = useCallback(
    async (id: string, payload: Partial<CreateClientPayload>): Promise<Client> => {
      const res = await fetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al actualizar");
      setClients((prev) => prev.map((c) => (c.id === id ? data : c)));
      return data;
    },
    []
  );

  return { clients, loading, error, fetchClients, createClient, updateClient };
}
