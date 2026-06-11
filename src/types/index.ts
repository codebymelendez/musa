// ─── Tipos compartidos de Musa ────────────────────────────────────────────────
// Estos tipos reflejan los modelos de Prisma y son usados en toda la app.

export type ServiceCategory = "nails" | "hair" | "brows" | "makeup" | "other";

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "no_show"
  | "cancelled"
  | "reprogrammed"
  | "rescheduled";

export interface Notification {
  id: string;
  userId: string | null;
  clientId: string | null;
  appointmentId: string | null;
  type: string | null;
  title: string;
  body: string;
  url: string | null;
  read: boolean;
  createdAt: string;
}

export type PaymentMethod =
  | "efectivo_bs"
  | "efectivo_usd"
  | "pago_movil"
  | "zelle"
  | "transferencia"
  | "otro";

export type PlanName = "FREE" | "PRO" | "TEAM";

export type PlanStatus =
  | "free"
  | "pending_payment"
  | "under_review"
  | "active"
  | "payment_rejected"
  | "expired";

// ─── Entidades ────────────────────────────────────────────────────────────────

export interface Business {
  id: string;
  name: string;
  slug: string;
  slugChangedAt?: string | null;
  category: string | null;
  phone: string | null;
  city: string | null;
  logoUrl: string | null;
  planId: string;
  timezone?: string | null;
  plan?: PlanDef;
  planStatus?: PlanStatus;
  planExpiresAt?: string | null;
}

export interface PlanDef {
  id: string;
  name: string;
  price: number;
  currency: string;
  limits: any;
}

export interface SubscriptionPayment {
  id: string;
  businessId: string;
  userId: string;
  planId: string;
  status: "under_review" | "approved" | "rejected";
  paymentMethod: "pagomovil" | "zelle";
  referenceNumber: string | null;
  amountUSD: number;
  amountBS: number | null;
  bcvRate: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  approvedBy?: string | null;
  rejectedBy?: string | null;
}

export interface User {
  id: string;
  phone: string;
  email: string | null;
  name: string;
  slug: string; // DEPRECATED: canónico en Business.slug desde 2026-06
  appRole: "owner" | "staff" | "client";
  businessId: string | null;
  serviceType: string | null;
  bio: string | null;
  avatarUrl: string | null;
  whatsapp: string | null;
  instagram: string | null;
  onboardingDone: boolean;
  slugChangedAt?: string | null;
  createdAt: string;
  settings?: ProfessionalSettings | null;
  business?: Business | null;
  latestPayment?: SubscriptionPayment | null;
  isAdmin?: boolean;
}

export interface Client {
  id: string;
  userId: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  preferences: string | null;
  birthday: string | null;
  tags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  appointments?: Appointment[];
}

export interface Service {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  category: ServiceCategory;
  durationMin: number;
  price: number;
  currency: string;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  userId: string;
  clientId: string;
  serviceId: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  client?: Client;
  service?: Service;
  payment?: Payment | null;
}

export interface Payment {
  id: string;
  appointmentId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  isPaid: boolean;
  paidAt: string | null;
  notes: string | null;
}

export interface ProfessionalSettings {
  id: string;
  userId: string;
  workDays: number[];   // [1,2,3,4,5] = Lun-Vie
  startHour: number;   // 9 = 09:00
  endHour: number;     // 18 = 18:00
  slotDuration: number; // 30 = 30 min
  currency: string;
  bookingEnabled: boolean;
  paymentMethods?: PaymentMethod[];
}


// ─── Stats ────────────────────────────────────────────────────────────────────

export interface MonthlyStats {
  monthlyRevenue: number;
  completedAppointments: number;
  currency: string;
  topServices: { serviceName: string; count: number }[];
  totalClients: number;
  avgTicket: number;
}

// ─── API Payloads ─────────────────────────────────────────────────────────────

export interface CreateAppointmentPayload {
  clientId: string;
  serviceId: string;
  startTime: string; // ISO
  notes?: string;
}

export interface CreateClientPayload {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  preferences?: string;
  birthday?: string;
  tags?: string[];
  isActive?: boolean;
}

export interface CreateServicePayload {
  name: string;
  description?: string;
  category: ServiceCategory;
  durationMin: number;
  price: number;
  currency?: string;
}

export interface UpdateAppointmentStatusPayload {
  status: AppointmentStatus;
}

export interface RegisterPayload {
  email: string;
  name: string;
  password: string;
  phone?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface PublicBookingPayload {
  serviceId: string;
  startTime: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
}

export interface SettingsUpdatePayload {
  name?: string;
  bio?: string;
  whatsapp?: string;
  instagram?: string;
  avatarUrl?: string;
  settings?: {
    workDays?: number[];
    startHour?: number;
    endHour?: number;
    slotDuration?: number;
    currency?: string;
    bookingEnabled?: boolean;
  };
}

// ─── Bloqueo de Agenda ────────────────────────────────────────────────────────

export type BlockType = "manual" | "vacation" | "break";

export interface AvailabilityBlock {
  id: string;
  userId: string;
  businessId: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  reason: string | null;
  blockType: BlockType;
  recurrenceRule: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBlockPayload {
  startTime: string;   // ISO
  endTime: string;     // ISO
  isAllDay?: boolean;
  reason?: string;
  blockType?: BlockType;
}

// ─── Sistema de Fidelización ──────────────────────────────────────────────────

export type LoyaltyAccumulationType = "visits" | "points";
export type LoyaltyTransactionType = "earn" | "redeem" | "adjustment" | "expiry";

export interface LoyaltyProgram {
  id: string;
  businessId: string;
  name: string;
  isActive: boolean;
  accumulationType: LoyaltyAccumulationType;
  pointsPerVisit: number;
  rewardThreshold: number;
  rewardDescription: string;
  validUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClientLoyaltyAccount {
  id: string;
  businessId: string;
  clientId: string;
  programId: string;
  totalPoints: number;
  lifetimePoints: number;
  qrToken: string;
  createdAt: string;
  updatedAt: string;
  client?: Client;
  program?: LoyaltyProgram;
}

export interface LoyaltyTransaction {
  id: string;
  accountId: string;
  businessId: string;
  clientId: string;
  appointmentId: string | null;
  pointsDelta: number;
  transactionType: LoyaltyTransactionType;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface LoyaltyRedemption {
  id: string;
  accountId: string;
  transactionId: string;
  businessId: string;
  clientId: string;
  pointsUsed: number;
  rewardDescription: string;
  redeemedBy: string | null;
  redeemedAt: string;
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  details?: string;
}
