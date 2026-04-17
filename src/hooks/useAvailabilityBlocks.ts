"use client";

import { useState, useCallback } from "react";
import { AvailabilityBlock, CreateBlockPayload } from "@/types";

export function useAvailabilityBlocks() {
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBlocks = useCallback(async (from?: string, to?: string) => {
    setLoading(true);
    setError(null);
    try {
      let url = "/api/availability-blocks";
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("Error al cargar bloqueos");
      const data: AvailabilityBlock[] = await res.json();
      setBlocks(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createBlock = useCallback(
    async (
      payload: CreateBlockPayload & { force?: boolean }
    ): Promise<{ block?: AvailabilityBlock; conflict?: { message: string; conflicts: unknown[] } }> => {
      const res = await fetch("/api/availability-blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.status === 409 && data.error === "conflict") {
        return { conflict: { message: data.message, conflicts: data.conflicts } };
      }
      if (!res.ok) throw new Error(data.error ?? "Error al crear bloqueo");

      setBlocks((prev) =>
        [...prev, data].sort(
          (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        )
      );
      return { block: data };
    },
    []
  );

  const deleteBlock = useCallback(async (id: string) => {
    const res = await fetch(`/api/availability-blocks/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Error al eliminar bloqueo");
    }
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const updateBlock = useCallback(
    async (id: string, payload: Partial<CreateBlockPayload>): Promise<AvailabilityBlock> => {
      const res = await fetch(`/api/availability-blocks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al actualizar bloqueo");
      setBlocks((prev) => prev.map((b) => (b.id === id ? data : b)));
      return data;
    },
    []
  );

  return { blocks, loading, error, fetchBlocks, createBlock, deleteBlock, updateBlock };
}
