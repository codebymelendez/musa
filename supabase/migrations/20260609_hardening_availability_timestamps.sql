-- =============================================================================
-- Migración: Hardening de Esquema - Timestamps y Deprecaciones (Fase 3)
-- Ejecutar en Supabase SQL Editor o aplicar mediante supabase CLI
-- =============================================================================

-- 1. DEPRECACIÓN DE COLUMNAS EN ProfessionalSettings (Se quita la restricción NOT NULL)
ALTER TABLE "ProfessionalSettings" ALTER COLUMN "workDays" DROP NOT NULL;
ALTER TABLE "ProfessionalSettings" ALTER COLUMN "startHour" DROP NOT NULL;
ALTER TABLE "ProfessionalSettings" ALTER COLUMN "endHour" DROP NOT NULL;

COMMENT ON COLUMN "ProfessionalSettings"."workDays" IS 'DEPRECADO - Usar la tabla BusinessHours como fuente de verdad para días laborables.';
COMMENT ON COLUMN "ProfessionalSettings"."startHour" IS 'DEPRECADO - Usar la tabla BusinessHours como fuente de verdad para la hora de inicio.';
COMMENT ON COLUMN "ProfessionalSettings"."endHour" IS 'DEPRECADO - Usar la tabla BusinessHours como fuente de verdad para la hora de cierre.';

-- 2. CONVERSIÓN DE TIMESTAMPS AMBIGUOS A TIMESTAMPTZ (TIMESTAMP WITH TIME ZONE)
-- Convertimos interpretando los datos existentes como UTC para evitar desplazamientos por la zona horaria del servidor.

-- Tabla: Business
ALTER TABLE "Business" ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "Business" ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'UTC';

-- Tabla: Plan
ALTER TABLE "Plan" ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "Plan" ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'UTC';

-- Tabla: User
ALTER TABLE "User" ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "User" ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'UTC';

-- Tabla: Invitation
ALTER TABLE "Invitation" ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "Invitation" ALTER COLUMN "expiresAt" TYPE timestamptz USING "expiresAt" AT TIME ZONE 'UTC';
ALTER TABLE "Invitation" ALTER COLUMN "usedAt" TYPE timestamptz USING "usedAt" AT TIME ZONE 'UTC';

-- Tabla: Client
-- NOTA: "birthday" se mantiene como DATE (sin zona horaria) ya que representa una fecha calendario de nacimiento fija.
ALTER TABLE "Client" ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "Client" ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'UTC';

-- Tabla: Service
ALTER TABLE "Service" ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "Service" ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'UTC';

-- Tabla: Appointment
ALTER TABLE "Appointment" ALTER COLUMN "startTime" TYPE timestamptz USING "startTime" AT TIME ZONE 'UTC';
ALTER TABLE "Appointment" ALTER COLUMN "endTime" TYPE timestamptz USING "endTime" AT TIME ZONE 'UTC';
ALTER TABLE "Appointment" ALTER COLUMN "oldStartTime" TYPE timestamptz USING "oldStartTime" AT TIME ZONE 'UTC';
ALTER TABLE "Appointment" ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "Appointment" ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'UTC';

-- Tabla: Notification
ALTER TABLE "Notification" ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "Notification" ALTER COLUMN "readAt" TYPE timestamptz USING "readAt" AT TIME ZONE 'UTC';

-- Tabla: PushSubscription
ALTER TABLE "PushSubscription" ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';

-- Tabla: Payment
ALTER TABLE "Payment" ALTER COLUMN "paidAt" TYPE timestamptz USING "paidAt" AT TIME ZONE 'UTC';
ALTER TABLE "Payment" ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "Payment" ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'UTC';

-- Tabla: ProfessionalSettings
ALTER TABLE "ProfessionalSettings" ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "ProfessionalSettings" ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'UTC';

-- Tabla: PasswordResetToken
ALTER TABLE "PasswordResetToken" ALTER COLUMN "expiresAt" TYPE timestamptz USING "expiresAt" AT TIME ZONE 'UTC';
ALTER TABLE "PasswordResetToken" ALTER COLUMN "usedAt" TYPE timestamptz USING "usedAt" AT TIME ZONE 'UTC';
ALTER TABLE "PasswordResetToken" ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';

-- Tabla: Promotion
ALTER TABLE "Promotion" ALTER COLUMN "validFrom" TYPE timestamptz USING "validFrom" AT TIME ZONE 'UTC';
ALTER TABLE "Promotion" ALTER COLUMN "validUntil" TYPE timestamptz USING "validUntil" AT TIME ZONE 'UTC';
ALTER TABLE "Promotion" ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "Promotion" ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'UTC';
