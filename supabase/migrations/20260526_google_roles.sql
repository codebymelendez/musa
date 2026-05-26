-- =============================================================================
-- Migración: Google Sign-In con roles (professional / client)
-- Ejecutar en Supabase SQL Editor
-- =============================================================================

-- ─── 1. Columna appRole en User ───────────────────────────────────────────────
-- Distingue entre usuarios profesionales y clientas dentro de la tabla User.
-- 'professional' = perfil de negocio (dashboard de agenda, onboarding, etc.)
-- 'client'       = clienta que usa Google Sign-In para su portal personal

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "appRole" text NOT NULL DEFAULT 'professional';

-- Todos los registros existentes son profesionales
UPDATE "User" SET "appRole" = 'professional' WHERE "appRole" IS NULL OR "appRole" = '';

-- Índice para búsquedas por rol
CREATE INDEX IF NOT EXISTS "User_appRole_idx" ON "User"("appRole");

-- ─── 2. Campo reminder_sent en Appointment ────────────────────────────────────
-- Usado por el job de recordatorios de WhatsApp (TAREA 4)

ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "reminderSent" boolean NOT NULL DEFAULT false;

-- Índice para el cron de recordatorios
CREATE INDEX IF NOT EXISTS "Appointment_reminderSent_idx" ON "Appointment"("reminderSent", "startTime");
