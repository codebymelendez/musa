-- =============================================================================
-- Migración: Consolidar Role + AppRole → solo appRole con valores owner|staff|client
-- Los datos ya fueron migrados via API (professional→owner, clienta corregida).
-- Este script solo elimina la columna redundante.
-- =============================================================================

-- Los datos ya están migrados:
--   appRole 'professional' → 'owner'  (5 profesionales)
--   appRole 'client'       → 'client' (1 clienta, onboardingDone corregido a false)

-- Eliminar columna role (redundante tras la consolidación)
ALTER TABLE "User" DROP COLUMN IF EXISTS "role";

-- Asegurar que el índice en appRole exista
CREATE INDEX IF NOT EXISTS "User_appRole_idx" ON "User"("appRole");
