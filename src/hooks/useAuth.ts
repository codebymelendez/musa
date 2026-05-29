"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { User, LoginPayload, RegisterPayload } from "@/types";

export function useAuth() {
  const { user, setUser, clearUser, isHydrated } = useAppStore();
  const router = useRouter();

  // Cargar usuario desde /api/auth/me al montar
  const loadUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data: User = await res.json();
        setUser(data);
        return data;
      } else {
        clearUser();
        return null;
      }
    } catch {
      clearUser();
      return null;
    }
  }, [setUser, clearUser]);

  // Login
  const login = useCallback(
    async (payload: LoginPayload) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Error al iniciar sesión");
      }

      setUser(data.user);

      // Redirigir según onboarding
      if (!data.user.onboardingDone) {
        router.push("/onboarding");
      } else {
        router.push("/home");
      }

      return data.user as User;
    },
    [setUser, router]
  );

  // Register
  const register = useCallback(
    async (payload: RegisterPayload) => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Error al registrarse");
      }

      setUser(data.user);
      router.push("/onboarding");
      return data.user as User;
    },
    [setUser, router]
  );

  // Logout — hard redirect so middleware re-evaluates cleared cookies
  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    clearUser();
    window.location.href = "/";
  }, [clearUser]);

  return { user, isHydrated, login, register, logout, loadUser };
}
