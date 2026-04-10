-- 1. Actualizar tabla de Client
ALTER TABLE "Client"
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "preferences" TEXT,
ADD COLUMN IF NOT EXISTS "birthday" DATE,
ADD COLUMN IF NOT EXISTS "tags" JSONB DEFAULT '[]'::jsonb;

-- 2. Actualizar índices de Client para evitar duplicados en el mismo negocio
DROP INDEX IF EXISTS "Client_userId_phone_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Client_businessId_phone_key" ON "Client"("businessId", "phone");

-- 3. Actualizar tabla Business
ALTER TABLE "Business"
ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;

-- 4. Actualizar tabla Service
ALTER TABLE "Service"
ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

-- 5. Crear Buckets de almacenamiento en Supabase (si no existen)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('business-avatars', 'business-avatars', true, 5242880, '{"image/png", "image/jpeg", "image/webp"}'),
  ('staff-avatars', 'staff-avatars', true, 5242880, '{"image/png", "image/jpeg", "image/webp"}'),
  ('service-images', 'service-images', true, 5242880, '{"image/png", "image/jpeg", "image/webp"}')
ON CONFLICT (id) DO NOTHING;

-- 6. Configurar Políticas RLS para lectura pública

CREATE POLICY "Lectura pública de logos de negocio" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'business-avatars');

CREATE POLICY "Lectura pública de fotos de staff" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'staff-avatars');

CREATE POLICY "Lectura pública de imagenes de servicio" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'service-images');

-- 7. Configurar Políticas RLS para la subida de imágenes
-- IMPORTANTE: Aquí se obliga a que el usuario esté autenticado para poder subir fotos
CREATE POLICY "Inserción autenticada para logos" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'business-avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Actualización autenticada para logos" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'business-avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Inserción autenticada para staff" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'staff-avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Actualización autenticada para staff" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'staff-avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Inserción autenticada para servicios" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'service-images' AND auth.role() = 'authenticated');

CREATE POLICY "Actualización autenticada para servicios" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'service-images' AND auth.role() = 'authenticated');
