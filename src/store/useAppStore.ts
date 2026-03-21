// Store global de Musa con Zustand
// Solo guarda estado verdaderamente global: sesión, UI state compartido.
// Los datos de la API (citas, servicios, etc.) se manejan en los custom hooks.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User, Appointment } from "@/types";

interface AppState {
  // ─── Auth ──────────────────────────────────────────────────────────────────
  user: User | null;
  isHydrated: boolean;
  setUser: (user: User | null) => void;
  clearUser: () => void;

  // ─── UI - Fecha seleccionada (agenda / calendario) ─────────────────────────
  selectedDate: string; // ISO date string (YYYY-MM-DD)
  setSelectedDate: (date: string) => void;

  // ─── UI - Modal de nueva cita ──────────────────────────────────────────────
  newAppointmentModalOpen: boolean;
  setNewAppointmentModalOpen: (open: boolean) => void;

  // ─── Citas del día en home (caché ligero) ─────────────────────────────────
  todayAppointments: Appointment[];
  setTodayAppointments: (appointments: Appointment[]) => void;
  updateAppointmentInStore: (id: string, patch: Partial<Appointment>) => void;
}

const today = () => new Date().toISOString().split("T")[0];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ── Auth ────────────────────────────────────────────────────────────────
      user: null,
      isHydrated: false,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),

      // ── Fecha seleccionada ──────────────────────────────────────────────────
      selectedDate: today(),
      setSelectedDate: (date) => set({ selectedDate: date }),

      // ── Modal nueva cita ────────────────────────────────────────────────────
      newAppointmentModalOpen: false,
      setNewAppointmentModalOpen: (open) =>
        set({ newAppointmentModalOpen: open }),

      // ── Citas hoy ───────────────────────────────────────────────────────────
      todayAppointments: [],
      setTodayAppointments: (appointments) =>
        set({ todayAppointments: appointments }),
      updateAppointmentInStore: (id, patch) =>
        set((state) => ({
          todayAppointments: state.todayAppointments.map((a) =>
            a.id === id ? { ...a, ...patch } : a
          ),
        })),
    }),
    {
      name: "musa-store",
      // Solo persistir usuario y fecha seleccionada
      partialize: (state) => ({
        user: state.user,
        selectedDate: state.selectedDate,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.isHydrated = true;
      },
    }
  )
);
