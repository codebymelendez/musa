// Single source of truth for all React Query keys in MUSA Pro.
// Invalidation contract:
//   keys.appointments.all  → every appointment list/detail (date, range, upcoming, detail)
//   keys.dashboard         → home dashboard payload (includes today's appointments)
//   keys.stats.all         → every stats period
export const keys = {
  dashboard: ['dashboard'] as const,
  settings: ['settings'] as const,
  appointments: {
    all: ['appointments'] as const,
    byDate: (date: string) => ['appointments', 'date', date] as const,
    range: (from: string, to: string) => ['appointments', 'range', from, to] as const,
    upcoming: ['appointments', 'upcoming'] as const,
    detail: (id: string) => ['appointments', 'detail', id] as const,
  },
  clients: {
    all: ['clients'] as const,
    detail: (id: string) => ['clients', 'detail', id] as const,
  },
  services: ['services'] as const,
  stats: {
    all: ['stats'] as const,
    byMonth: (year: number, month: number) => ['stats', year, month] as const,
  },
  promotions: ['promotions'] as const,
  loyalty: {
    all: ['loyalty'] as const,
    program: ['loyalty', 'program'] as const,
    accounts: ['loyalty', 'accounts'] as const,
  },
  bcvRate: ['bcv-rate'] as const,
  businessInfo: ['business-info'] as const,
  businessDay: (businessId: string | null, date: string) => ['businessDay', businessId, date] as const,
  availableSlots: (businessId: string | undefined, date: string, serviceId: string | undefined) =>
    ['availableSlots', businessId, date, serviceId] as const,
}

// Everything that renders appointment data, in one list — mutations that
// touch appointments invalidate all of these.
export const appointmentRelatedKeys = [
  keys.appointments.all,
  keys.dashboard,
  keys.stats.all,
] as const
