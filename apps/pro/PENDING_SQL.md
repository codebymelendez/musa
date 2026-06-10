# PENDING_SQL — Verificaciones y políticas RLS pendientes (NO ejecutado)

> Generado en FASE 4 (2026-06-10). **Nada de esto fue ejecutado.** Ejecutar en el SQL Editor de Supabase tras revisar contra las políticas ya existentes. Contexto: el cliente móvil (`apps/pro`) accede a estas tablas **directamente con la anon key** — su seguridad depende de RLS (ver `SECURITY_AUDIT.md` C-1).

## 1 · Diagnóstico: ¿qué tablas tienen RLS activo y qué políticas existen?

```sql
-- RLS habilitado por tabla
select c.relname as tabla, c.relrowsecurity as rls_activo
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in ('Business','BusinessHours','BusinessException','BusinessPhoto',
                    'ProfessionalSettings','Service','User','Appointment','Client')
order by 1;

-- Políticas existentes
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

Si **todas** las tablas ya tienen RLS activo con políticas equivalentes a las de abajo, no hay nada que hacer. Si alguna tiene `rls_activo = false`, ese es el hallazgo **CRÍTICO C-1**.

## 2 · Helper: negocio del usuario autenticado

Las políticas siguientes asumen que `public."User".id = auth.uid()::text` (ajustar cast si `User.id` es uuid) y que `User.businessId` enlaza al negocio.

```sql
create or replace function public.current_business_id()
returns text
language sql stable security definer
set search_path = public
as $$
  select "businessId" from "User" where id = auth.uid()::text limit 1;
$$;
```

## 3 · Políticas mínimas requeridas por el cliente móvil

> Lectura pública donde el flujo de reserva pública (web `/p/[slug]`) también lee con anon **sin sesión** — verificar antes de restringir a `authenticated`, o se rompe la reserva pública.

```sql
-- Business: el dueño/staff puede leer y SOLO su negocio puede actualizarse
alter table "Business" enable row level security;
create policy "business_select_own_or_public"
  on "Business" for select
  using (true);  -- ⚠️ la web pública lee Business por slug sin sesión; restringir columnas vía vista si se quiere
create policy "business_update_own"
  on "Business" for update
  using (id = public.current_business_id())
  with check (id = public.current_business_id());

-- BusinessHours: lectura pública (slots de reserva), escritura solo del propio negocio
alter table "BusinessHours" enable row level security;
create policy "hours_select_all" on "BusinessHours" for select using (true);
create policy "hours_write_own" on "BusinessHours" for insert
  with check ("businessId" = public.current_business_id());
create policy "hours_update_own" on "BusinessHours" for update
  using ("businessId" = public.current_business_id())
  with check ("businessId" = public.current_business_id());

-- BusinessException: ídem
alter table "BusinessException" enable row level security;
create policy "exception_select_all" on "BusinessException" for select using (true);
create policy "exception_write_own" on "BusinessException" for all
  using ("businessId" = public.current_business_id())
  with check ("businessId" = public.current_business_id());

-- BusinessPhoto: lectura pública, escritura/borrado solo del propio negocio
alter table "BusinessPhoto" enable row level security;
create policy "photo_select_all" on "BusinessPhoto" for select using (true);
create policy "photo_insert_own" on "BusinessPhoto" for insert
  with check ("businessId" = public.current_business_id());
create policy "photo_delete_own" on "BusinessPhoto" for delete
  using ("businessId" = public.current_business_id());

-- ProfessionalSettings: solo el propio usuario
alter table "ProfessionalSettings" enable row level security;
create policy "psettings_own" on "ProfessionalSettings" for all
  using ("userId" = auth.uid()::text)
  with check ("userId" = auth.uid()::text);

-- Service / User / Appointment: @musa/availability los LEE desde el móvil.
-- Appointment es el más sensible: limitar lectura al propio negocio.
alter table "Appointment" enable row level security;
create policy "appt_select_own_business" on "Appointment" for select
  using ("businessId" = public.current_business_id());
-- ⚠️ Si la reserva pública web calcula slots client-side leyendo Appointment con anon,
-- esta política la rompe → en ese caso exponer una vista/RPC con solo (startTime, endTime).
```

## 4 · Storage: buckets `staff-avatars` y `business-photos`

El móvil sube con `upsert: true` a rutas `avatars/<userId>-<ts>.jpg` y `business/<...>`. Sin política de path, un usuario puede sobrescribir archivos ajenos.

```sql
-- Verificar políticas actuales
select * from storage.policies; -- o Dashboard → Storage → Policies

-- Ejemplo: solo escribir bajo su propio prefijo en staff-avatars
create policy "avatar_upload_own_prefix"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'staff-avatars'
    and (storage.foldername(name))[1] = 'avatars'
    and name like 'avatars/' || auth.uid()::text || '-%'
  );
create policy "avatar_update_own_prefix"
  on storage.objects for update to authenticated
  using (bucket_id = 'staff-avatars' and name like 'avatars/' || auth.uid()::text || '-%');
```

Para `business-photos`, replicar con prefijo por `businessId` (requiere el helper de §2 o mover la subida al backend).

## 5 · Checklist al terminar

- [ ] §1 ejecutado: todas las tablas listadas tienen `rls_activo = true`
- [ ] Políticas de escritura por negocio en Business / BusinessHours / BusinessException / BusinessPhoto / ProfessionalSettings
- [ ] Lectura de Appointment restringida (o vista/RPC para slots públicos)
- [ ] Políticas de path en storage para ambos buckets
- [ ] Probar en el móvil: editar negocio, subir foto, calendario (slots) y reserva pública web siguen funcionando
