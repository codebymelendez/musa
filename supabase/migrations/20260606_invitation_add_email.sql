-- Add email column to Invitation table for mobile invite flow
ALTER TABLE "Invitation" ADD COLUMN IF NOT EXISTS "email" TEXT;
