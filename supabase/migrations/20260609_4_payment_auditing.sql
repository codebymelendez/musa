-- Add auditing columns to SubscriptionPayment
ALTER TABLE "SubscriptionPayment" ADD COLUMN IF NOT EXISTS "approvedBy" TEXT;
ALTER TABLE "SubscriptionPayment" ADD COLUMN IF NOT EXISTS "rejectedBy" TEXT;

-- Setup foreign keys pointing to User table
ALTER TABLE "SubscriptionPayment" 
DROP CONSTRAINT IF EXISTS "SubscriptionPayment_approvedBy_fkey",
ADD CONSTRAINT "SubscriptionPayment_approvedBy_fkey" 
FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SubscriptionPayment" 
DROP CONSTRAINT IF EXISTS "SubscriptionPayment_rejectedBy_fkey",
ADD CONSTRAINT "SubscriptionPayment_rejectedBy_fkey" 
FOREIGN KEY ("rejectedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
