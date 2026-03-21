"use client";

import { useState, useCallback } from "react";
import { MonthlyStats } from "@/types";

export function useStats() {
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (year?: number, month?: number) => {
    setLoading(true);
    setError(null);
    const now = new Date();
    const y = year ?? now.getFullYear();
    const m = month ?? now.getMonth() + 1;

    try {
      const res = await fetch(`/api/stats?year=${y}&month=${m}`);
      if (!res.ok) throw new Error("Error al cargar estadísticas");
      const data = await res.json();
      setStats(data);
      return data as MonthlyStats & { yearlyRevenue: number };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { stats, loading, error, fetchStats };
}
