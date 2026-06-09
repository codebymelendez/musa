-- 1. Añadir columnas a la tabla Business
ALTER TABLE "Business" 
ADD COLUMN IF NOT EXISTS "planStatus" TEXT NOT NULL DEFAULT 'free',
ADD COLUMN IF NOT EXISTS "planExpiresAt" TIMESTAMP WITH TIME ZONE;

-- 2. Crear tabla SubscriptionPayment
CREATE TABLE IF NOT EXISTS "SubscriptionPayment" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'under_review',
    "paymentMethod" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "amountUSD" DOUBLE PRECISION NOT NULL,
    "amountBS" DOUBLE PRECISION,
    "bcvRate" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP WITH TIME ZONE,
    "rejectedAt" TIMESTAMP WITH TIME ZONE,

    CONSTRAINT "SubscriptionPayment_pkey" PRIMARY KEY ("id")
);

-- 3. Crear llaves foráneas para SubscriptionPayment
ALTER TABLE "SubscriptionPayment" 
DROP CONSTRAINT IF EXISTS "SubscriptionPayment_businessId_fkey",
ADD CONSTRAINT "SubscriptionPayment_businessId_fkey" 
FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SubscriptionPayment" 
DROP CONSTRAINT IF EXISTS "SubscriptionPayment_userId_fkey",
ADD CONSTRAINT "SubscriptionPayment_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SubscriptionPayment" 
DROP CONSTRAINT IF EXISTS "SubscriptionPayment_planId_fkey",
ADD CONSTRAINT "SubscriptionPayment_planId_fkey" 
FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. Inicializar planStatus para negocios existentes
-- Si ya tienen un plan asignado que no sea FREE, los marcamos como active
UPDATE "Business"
SET "planStatus" = 'active'
WHERE "planId" IN (
    SELECT "id" FROM "Plan" WHERE "name" <> 'FREE'
);
