"use client";

import { useState, useCallback } from "react";
import { LoyaltyProgram, ClientLoyaltyAccount, LoyaltyTransaction, LoyaltyRedemption } from "@/types";

export function useLoyaltyProgram() {
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProgram = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/loyalty/program");
      const data = await res.json();
      setProgram(data.program ?? null);
      return data.program;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveProgram = useCallback(async (payload: Partial<LoyaltyProgram>) => {
    const res = await fetch("/api/loyalty/program", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Error al guardar programa");
    setProgram(data.program);
    return data.program as LoyaltyProgram;
  }, []);

  return { program, loading, fetchProgram, saveProgram };
}

export function useLoyaltyAccounts() {
  const [accounts, setAccounts] = useState<ClientLoyaltyAccount[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAccounts = useCallback(async (search?: string) => {
    setLoading(true);
    try {
      const url = search
        ? `/api/loyalty/accounts?search=${encodeURIComponent(search)}`
        : "/api/loyalty/accounts";
      const res = await fetch(url);
      const data = await res.json();
      setAccounts(data.accounts ?? []);
      return data.accounts ?? [];
    } finally {
      setLoading(false);
    }
  }, []);

  return { accounts, loading, fetchAccounts };
}

export interface AccountDetail {
  account: ClientLoyaltyAccount;
  transactions: LoyaltyTransaction[];
  redemptions: LoyaltyRedemption[];
}

export function useLoyaltyAccountDetail() {
  const [detail, setDetail] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDetail = useCallback(async (accountId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/loyalty/accounts/${accountId}`);
      const data = await res.json();
      setDetail(data);
      return data as AccountDetail;
    } finally {
      setLoading(false);
    }
  }, []);

  const redeem = useCallback(async (accountId: string) => {
    const res = await fetch("/api/loyalty/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Error al canjear");
    return data;
  }, []);

  const addPoints = useCallback(
    async (accountId: string, pointsDelta: number, notes?: string) => {
      const res = await fetch("/api/loyalty/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, pointsDelta, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al ajustar puntos");
      return data;
    },
    []
  );

  const scanQR = useCallback(async (token: string) => {
    const res = await fetch(`/api/loyalty/scan/${token}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Código no encontrado");
    return data.account as ClientLoyaltyAccount;
  }, []);

  return { detail, loading, fetchDetail, redeem, addPoints, scanQR };
}
