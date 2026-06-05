-- =============================================================================
-- Migración: Índices de Rendimiento para el Mercado Venezolano
-- Objetivo: Acelerar consultas de calendario, reservas y perfiles públicos
-- Fecha: 2026-06-05
-- =============================================================================

-- ─── 1. OPTIMIZACIÓN DE CITAS (CALENDARIO DE PROFESIONALES) ──────────────────
-- Optimiza la consulta GET /api/appointments por rango de fecha
CREATE INDEX IF NOT EXISTS "Appointment_userId_startTime_idx" 
  ON "Appointment"("userId", "startTime" ASC);

-- Optimiza la búsqueda de citas asociadas a una clienta (Historial de citas)
CREATE INDEX IF NOT EXISTS "Appointment_clientId_idx" 
  ON "Appointment"("clientId");

-- ─── 2. OPTIMIZACIÓN DE CLIENTES (GESTIÓN DE CLIENTAS) ────────────────────────
-- Optimiza listados de clientes dentro de un negocio
CREATE INDEX IF NOT EXISTS "Client_businessId_idx" 
  ON "Client"("businessId");

-- Optimiza la vinculación de cuentas de usuario con registros de clientas
CREATE INDEX IF NOT EXISTS "Client_userId_idx" 
  ON "Client"("userId");

-- ─── 3. OPTIMIZACIÓN DE SERVICIOS (BOOKING PÚBLICO) ──────────────────────────
-- Optimiza el listado de servicios en el perfil de reservas pública (/p/[slug])
CREATE INDEX IF NOT EXISTS "Service_businessId_idx" 
  ON "Service"("businessId");

CREATE INDEX IF NOT EXISTS "Service_userId_idx" 
  ON "Service"("userId");

-- ─── 4. OPTIMIZACIÓN DE PROMOCIONES (OFERTAS ACTIVAS) ────────────────────────
-- Optimiza el banner de promociones activas y la sección de ofertas de la landing
CREATE INDEX IF NOT EXISTS "Promotion_businessId_idx" 
  ON "Promotion"("businessId");
