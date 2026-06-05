-- =============================================================================
-- Migración: Habilitar RLS en tablas principales y definir políticas de acceso
-- Fecha: 2026-06-05
-- =============================================================================

-- ─── 1. HABILITAR RLS EN TODAS LAS TABLAS ─────────────────────────────────────
ALTER TABLE "Plan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Business" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invitation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Service" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Appointment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PushSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProfessionalSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PasswordResetToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Promotion" ENABLE ROW LEVEL SECURITY;

-- ─── 2. TABLA: Plan ──────────────────────────────────────────────────────────
CREATE POLICY "plan_select_public" ON "Plan" 
  FOR SELECT USING (true);

-- ─── 3. TABLA: Business ──────────────────────────────────────────────────────
CREATE POLICY "business_select_public" ON "Business" 
  FOR SELECT USING (true);

CREATE POLICY "business_write_staff" ON "Business" 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "User" u 
      WHERE u.id = auth.uid()::text AND u."businessId" = "Business".id
    )
  );

-- ─── 4. TABLA: User ──────────────────────────────────────────────────────────
CREATE POLICY "user_select_public" ON "User" 
  FOR SELECT USING (true);

CREATE POLICY "user_update_self" ON "User" 
  FOR UPDATE USING (auth.uid()::text = id);

-- ─── 5. TABLA: Invitation ───────────────────────────────────────────────────
CREATE POLICY "invitation_all_staff" ON "Invitation" 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "User" u 
      WHERE u.id = auth.uid()::text AND u."businessId" = "Invitation"."businessId"
    )
  );

-- ─── 6. TABLA: Client ────────────────────────────────────────────────────────
CREATE POLICY "client_all_staff" ON "Client" 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "User" u 
      WHERE u.id = auth.uid()::text AND u."businessId" = "Client"."businessId"
    )
  );

-- ─── 7. TABLA: Service ───────────────────────────────────────────────────────
CREATE POLICY "service_select_public" ON "Service" 
  FOR SELECT USING (true);

CREATE POLICY "service_all_staff" ON "Service" 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "User" u 
      WHERE u.id = auth.uid()::text AND u."businessId" = "Service"."businessId"
    )
  );

-- ─── 8. TABLA: Appointment ───────────────────────────────────────────────────
CREATE POLICY "appointment_all_staff" ON "Appointment" 
  FOR ALL USING (
    auth.uid()::text = "userId"
    OR EXISTS (
      SELECT 1 FROM "User" u 
      WHERE u.id = auth.uid()::text 
        AND u."businessId" = (SELECT p."businessId" FROM "User" p WHERE p.id = "Appointment"."userId")
    )
  );

-- ─── 9. TABLA: Notification ──────────────────────────────────────────────────
CREATE POLICY "notification_all_owner" ON "Notification" 
  FOR ALL USING (
    auth.uid()::text = "userId"
  );

-- ─── 10. TABLA: PushSubscription ─────────────────────────────────────────────
CREATE POLICY "push_sub_all_owner" ON "PushSubscription" 
  FOR ALL USING (
    auth.uid()::text = "userId"
  );

-- ─── 11. TABLA: Payment ──────────────────────────────────────────────────────
CREATE POLICY "payment_all_staff" ON "Payment" 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "User" u 
      JOIN "Appointment" a ON a."userId" = u.id
      WHERE u.id = auth.uid()::text AND a.id = "Payment"."appointmentId"
    )
  );

-- ─── 12. TABLA: ProfessionalSettings ─────────────────────────────────────────
CREATE POLICY "settings_select_public" ON "ProfessionalSettings" 
  FOR SELECT USING (true);

CREATE POLICY "settings_all_owner" ON "ProfessionalSettings" 
  FOR ALL USING (
    auth.uid()::text = "userId"
  );

-- ─── 13. TABLA: Promotion ────────────────────────────────────────────────────
CREATE POLICY "promotion_select_public" ON "Promotion" 
  FOR SELECT USING (true);

CREATE POLICY "promotion_all_staff" ON "Promotion" 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "User" u 
      WHERE u.id = auth.uid()::text AND u."businessId" = "Promotion"."businessId"
    )
  );
