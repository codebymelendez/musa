-- =============================================================================
-- Migración: Bloqueo de Agenda + Sistema de Fidelización
-- Ejecutar en Supabase SQL Editor
-- =============================================================================

-- ─── BLOQUEO DE AGENDA ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "AvailabilityBlock" (
  id            text        PRIMARY KEY,
  "userId"      text        NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "businessId"  text        NOT NULL REFERENCES "Business"(id) ON DELETE CASCADE,
  "startTime"   timestamptz NOT NULL,
  "endTime"     timestamptz NOT NULL,
  "isAllDay"    boolean     NOT NULL DEFAULT false,
  reason        text,
  "blockType"   text        NOT NULL DEFAULT 'manual',
  -- Valores: 'manual' | 'vacation' | 'break'
  -- V2: 'recurrent'
  "recurrenceRule" text,
  -- Preparado para V2: RRULE string (ej: "FREQ=WEEKLY;BYDAY=MO")
  "createdAt"   timestamptz NOT NULL DEFAULT now(),
  "updatedAt"   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "valid_block_range" CHECK ("endTime" > "startTime")
);

CREATE INDEX IF NOT EXISTS idx_availability_block_user
  ON "AvailabilityBlock"("userId");
CREATE INDEX IF NOT EXISTS idx_availability_block_business
  ON "AvailabilityBlock"("businessId");
CREATE INDEX IF NOT EXISTS idx_availability_block_time
  ON "AvailabilityBlock"("startTime", "endTime");

-- RLS
ALTER TABLE "AvailabilityBlock" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "block_select_own" ON "AvailabilityBlock"
  FOR SELECT USING (auth.uid()::text = "userId");

CREATE POLICY "block_insert_own" ON "AvailabilityBlock"
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "block_update_own" ON "AvailabilityBlock"
  FOR UPDATE USING (auth.uid()::text = "userId");

CREATE POLICY "block_delete_own" ON "AvailabilityBlock"
  FOR DELETE USING (auth.uid()::text = "userId");

-- ─── PROGRAMA DE FIDELIZACIÓN ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "LoyaltyProgram" (
  id                   text    PRIMARY KEY,
  "businessId"         text    NOT NULL UNIQUE REFERENCES "Business"(id) ON DELETE CASCADE,
  name                 text    NOT NULL DEFAULT 'Programa de Fidelización',
  "isActive"           boolean NOT NULL DEFAULT true,
  "accumulationType"   text    NOT NULL DEFAULT 'visits',
  -- 'visits': 1 visita = pointsPerVisit puntos
  -- 'points': puntos variables por servicio (V2)
  "pointsPerVisit"     integer NOT NULL DEFAULT 1,
  "rewardThreshold"    integer NOT NULL DEFAULT 10,
  "rewardDescription"  text    NOT NULL DEFAULT '',
  "validUntil"         date,
  "createdAt"          timestamptz NOT NULL DEFAULT now(),
  "updatedAt"          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_program_business
  ON "LoyaltyProgram"("businessId");

ALTER TABLE "LoyaltyProgram" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loyalty_program_select_business" ON "LoyaltyProgram"
  FOR SELECT USING (true); -- público para booking page

CREATE POLICY "loyalty_program_write_owner" ON "LoyaltyProgram"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = auth.uid()::text
        AND u."businessId" = "LoyaltyProgram"."businessId"
    )
  );

-- ─── CUENTAS DE FIDELIZACIÓN POR CLIENTA ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS "ClientLoyaltyAccount" (
  id               text    PRIMARY KEY,
  "businessId"     text    NOT NULL REFERENCES "Business"(id) ON DELETE CASCADE,
  "clientId"       text    NOT NULL REFERENCES "Client"(id) ON DELETE CASCADE,
  "programId"      text    NOT NULL REFERENCES "LoyaltyProgram"(id) ON DELETE CASCADE,
  "totalPoints"    integer NOT NULL DEFAULT 0,
  "lifetimePoints" integer NOT NULL DEFAULT 0,
  -- totalPoints   = puntos actuales canjeables
  -- lifetimePoints = total histórico (nunca decrece)
  "qrToken"        text    NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  "createdAt"      timestamptz NOT NULL DEFAULT now(),
  "updatedAt"      timestamptz NOT NULL DEFAULT now(),
  UNIQUE("businessId", "clientId")
);

CREATE INDEX IF NOT EXISTS idx_client_loyalty_account_client
  ON "ClientLoyaltyAccount"("clientId");
CREATE INDEX IF NOT EXISTS idx_client_loyalty_account_business
  ON "ClientLoyaltyAccount"("businessId");
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_loyalty_account_qr
  ON "ClientLoyaltyAccount"("qrToken");

ALTER TABLE "ClientLoyaltyAccount" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loyalty_account_select_staff" ON "ClientLoyaltyAccount"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = auth.uid()::text
        AND u."businessId" = "ClientLoyaltyAccount"."businessId"
    )
  );

CREATE POLICY "loyalty_account_write_staff" ON "ClientLoyaltyAccount"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = auth.uid()::text
        AND u."businessId" = "ClientLoyaltyAccount"."businessId"
    )
  );

-- ─── TRANSACCIONES DE PUNTOS ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "LoyaltyTransaction" (
  id                text    PRIMARY KEY,
  "accountId"       text    NOT NULL REFERENCES "ClientLoyaltyAccount"(id) ON DELETE CASCADE,
  "businessId"      text    NOT NULL REFERENCES "Business"(id),
  "clientId"        text    NOT NULL REFERENCES "Client"(id),
  "appointmentId"   text    UNIQUE REFERENCES "Appointment"(id),
  -- UNIQUE en appointmentId previene doble sumación por la misma cita
  "pointsDelta"     integer NOT NULL,
  -- positivo: acumular | negativo: canjear | ajuste manual
  "transactionType" text    NOT NULL,
  -- 'earn' | 'redeem' | 'adjustment' | 'expiry'
  notes             text,
  "createdBy"       text    REFERENCES "User"(id),
  "createdAt"       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_transaction_account
  ON "LoyaltyTransaction"("accountId");
CREATE INDEX IF NOT EXISTS idx_loyalty_transaction_appointment
  ON "LoyaltyTransaction"("appointmentId");
CREATE INDEX IF NOT EXISTS idx_loyalty_transaction_client
  ON "LoyaltyTransaction"("clientId");

ALTER TABLE "LoyaltyTransaction" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loyalty_tx_select_staff" ON "LoyaltyTransaction"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = auth.uid()::text
        AND u."businessId" = "LoyaltyTransaction"."businessId"
    )
  );

CREATE POLICY "loyalty_tx_insert_staff" ON "LoyaltyTransaction"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = auth.uid()::text
        AND u."businessId" = "LoyaltyTransaction"."businessId"
    )
  );

-- ─── CANJES ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "LoyaltyRedemption" (
  id                  text        PRIMARY KEY,
  "accountId"         text        NOT NULL REFERENCES "ClientLoyaltyAccount"(id),
  "transactionId"     text        NOT NULL REFERENCES "LoyaltyTransaction"(id),
  "businessId"        text        NOT NULL REFERENCES "Business"(id),
  "clientId"          text        NOT NULL REFERENCES "Client"(id),
  "pointsUsed"        integer     NOT NULL,
  "rewardDescription" text        NOT NULL,
  "redeemedBy"        text        REFERENCES "User"(id),
  "redeemedAt"        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_redemption_account
  ON "LoyaltyRedemption"("accountId");
CREATE INDEX IF NOT EXISTS idx_loyalty_redemption_client
  ON "LoyaltyRedemption"("clientId");

ALTER TABLE "LoyaltyRedemption" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loyalty_redemption_select_staff" ON "LoyaltyRedemption"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = auth.uid()::text
        AND u."businessId" = "LoyaltyRedemption"."businessId"
    )
  );

CREATE POLICY "loyalty_redemption_insert_staff" ON "LoyaltyRedemption"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = auth.uid()::text
        AND u."businessId" = "LoyaltyRedemption"."businessId"
    )
  );
