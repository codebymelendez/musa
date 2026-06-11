-- =============================================================================
-- Migración: UUID por defecto para evitar errores de null value en inserción
-- Evita errores como: null value in column "id" violates not-null constraint
-- =============================================================================

-- 1. BusinessPhoto
ALTER TABLE "BusinessPhoto" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- 2. Appointment
ALTER TABLE "Appointment" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- 3. AvailabilityBlock
ALTER TABLE "AvailabilityBlock" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- 4. Business
ALTER TABLE "Business" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- 5. BusinessException
ALTER TABLE "BusinessException" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- 6. BusinessHours
ALTER TABLE "BusinessHours" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- 7. Client
ALTER TABLE "Client" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- 8. ClientLoyaltyAccount
ALTER TABLE "ClientLoyaltyAccount" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- 9. Invitation
ALTER TABLE "Invitation" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- 10. LoyaltyProgram
ALTER TABLE "LoyaltyProgram" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- 11. LoyaltyRedemption
ALTER TABLE "LoyaltyRedemption" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- 12. LoyaltyTransaction
ALTER TABLE "LoyaltyTransaction" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- 13. Notification
ALTER TABLE "Notification" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- 14. PasswordResetToken
ALTER TABLE "PasswordResetToken" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- 15. Payment
ALTER TABLE "Payment" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- 16. Plan
ALTER TABLE "Plan" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- 17. ProfessionalSettings
ALTER TABLE "ProfessionalSettings" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- 18. Promotion
ALTER TABLE "Promotion" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- 19. PushSubscription
ALTER TABLE "PushSubscription" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- 20. Service
ALTER TABLE "Service" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- 21. SubscriptionPayment
ALTER TABLE "SubscriptionPayment" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- 22. User
ALTER TABLE "User" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
