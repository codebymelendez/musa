-- 1. Añadir columna isAdmin a la tabla User
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- 2. Establecer correo del fundador como administrador por defecto
UPDATE "User" 
SET "isAdmin" = true 
WHERE "email" = 'rmelendez30@gmail.com';
