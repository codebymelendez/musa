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

## 5 · Normalización de moneda en Payment (2026-06-10, fix multi-moneda)

El esquema del API aceptaba `currency: 'Bs'` además de `'BS'`. Los writers actuales (web `PaymentModal`, móvil `appointments/[id]`) escriben `'BS'` y el server ahora normaliza toda escritura a mayúsculas, pero pueden existir filas históricas con casing mixto. El código lee con normalización case-insensitive, así que esto es solo limpieza de datos:

```sql
-- Diagnóstico: ¿qué variantes existen?
select currency, count(*) from "Payment" group by currency;

-- Normalizar: cualquier variante de "bs" → 'BS'; todo lo demás → 'USD'
update "Payment" set currency = 'BS'  where upper(currency) = 'BS'  and currency <> 'BS';
update "Payment" set currency = 'USD' where upper(currency) <> 'BS' and currency <> 'USD';
update "Payment" set currency = 'USD' where currency is null;
```

## 6 · Normalización de métodos de pago en ProfessionalSettings (2026-06-10)

`ProfessionalSettings.paymentMethods` (texto JSON) contiene mezcla de formato viejo (etiquetas: `"Efectivo"`, `"Pago Móvil"`, `"Zelle"`, `"Divisas"`, `"Transferencia Bancaria"`) y nuevo (keys canónicas: `efectivo_usd, efectivo_bs, pago_movil, zelle, transferencia, otro`). El código ya lee con normalización defensiva (`src/lib/paymentMethods.ts` / `apps/pro/lib/utils.ts`) y escribe solo keys canónicas, así que esto es limpieza de datos históricos.

Mapeo: `Efectivo`→`efectivo_usd`, `Divisas`→`efectivo_usd`, `Pago Móvil`→`pago_movil`, `Zelle`→`zelle`, `Transferencia`/`Transferencia Bancaria`→`transferencia`, no reconocido→`otro`. Case/acento-tolerante. Deduplicar al final.

```sql
-- 1) Diagnóstico previo: cuántas filas y qué valores existen hoy
select count(*) as filas_con_metodos
from "ProfessionalSettings"
where "paymentMethods" is not null and "paymentMethods" not in ('', '[]');

select valor, count(*) as ocurrencias
from "ProfessionalSettings",
     lateral jsonb_array_elements_text("paymentMethods"::jsonb) as valor
where "paymentMethods" is not null and "paymentMethods" <> ''
group by valor
order by ocurrencias desc;

-- 2) Preview del resultado (no escribe nada): fila original vs normalizada
with normalizado as (
  select ps."userId",
         ps."paymentMethods" as original,
         (
           select coalesce(jsonb_agg(distinct c.canon), '[]'::jsonb)
           from lateral jsonb_array_elements_text(ps."paymentMethods"::jsonb) as v(valor),
                lateral (
                  select case lower(translate(trim(v.valor), 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU'))
                    when 'efectivo'                then 'efectivo_usd'
                    when 'divisas'                 then 'efectivo_usd'
                    when 'pago movil'              then 'pago_movil'
                    when 'transferencia bancaria'  then 'transferencia'
                    when 'efectivo_usd'            then 'efectivo_usd'
                    when 'efectivo_bs'             then 'efectivo_bs'
                    when 'pago_movil'              then 'pago_movil'
                    when 'zelle'                   then 'zelle'
                    when 'transferencia'           then 'transferencia'
                    when 'otro'                    then 'otro'
                    else 'otro'
                  end as canon
                ) c
         ) as normalizada
  from "ProfessionalSettings" ps
  where ps."paymentMethods" is not null and ps."paymentMethods" <> ''
)
select * from normalizado where original::jsonb <> normalizada;

-- 3) UPDATE definitivo (mismo mapeo; ejecutar solo tras revisar el preview)
update "ProfessionalSettings" ps
set "paymentMethods" = (
  select coalesce(jsonb_agg(distinct c.canon), '[]'::jsonb)::text
  from lateral jsonb_array_elements_text(ps."paymentMethods"::jsonb) as v(valor),
       lateral (
         select case lower(translate(trim(v.valor), 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU'))
           when 'efectivo'                then 'efectivo_usd'
           when 'divisas'                 then 'efectivo_usd'
           when 'pago movil'              then 'pago_movil'
           when 'transferencia bancaria'  then 'transferencia'
           when 'efectivo_usd'            then 'efectivo_usd'
           when 'efectivo_bs'             then 'efectivo_bs'
           when 'pago_movil'              then 'pago_movil'
           when 'zelle'                   then 'zelle'
           when 'transferencia'           then 'transferencia'
           when 'otro'                    then 'otro'
           else 'otro'
         end as canon
       ) c
)
where ps."paymentMethods" is not null and ps."paymentMethods" <> '';
```

Notas:
- El `case` compara contra valores ya en minúsculas/sin acentos, por eso `'Pago Móvil'` cae en `'pago movil'`.
- Si el diagnóstico (paso 1) revela valores no contemplados, añadirlos al `case` antes del UPDATE en vez de dejar que caigan en `otro`.
- No es urgente: la lectura defensiva en código ya elimina los duplicados en UI, y cada guardado desde la pantalla de métodos de pago reescribe la fila del usuario en formato canónico.

## 7 · Slug personalizable del perfil público (2026-06-11)

> **OJO — tabla real:** aunque la spec hablaba de `Business.slug`, el perfil público `/p/[slug]` se resuelve por **`User.slug`** (la profesional dueña): `src/app/api/public/[slug]/route.ts`, `src/app/p/[slug]/layout.tsx`, `sitemap.ts`, `[ciudad]/[servicio]` — todos consultan `User.slug`. `Business.slug` existe pero solo se usa internamente (se genera con sufijo timestamp en `/api/settings`) y **no** se toca en esta feature. Por eso el índice único, `slugChangedAt` y la FK de `SlugHistory` van sobre `"User"`.

### 7.1 · Diagnóstico previo: colisiones case-insensitive existentes

Si esto devuelve filas, hay slugs que chocan en minúsculas y el índice único fallará — resolver a mano antes de continuar:

```sql
select lower(slug) as slug_lower, count(*) as n,
       array_agg(id) as user_ids, array_agg(slug) as slugs_originales
from "User"
where slug is not null
group by lower(slug)
having count(*) > 1;
```

### 7.2 · Índice único case-insensitive sobre el slug actual

```sql
create unique index "User_slug_lower_key" on "User" (lower(slug));
```

### 7.3 · Tabla SlugHistory

```sql
create table "SlugHistory" (
  "id"        text primary key default gen_random_uuid()::text,
  "userId"    text not null references "User"(id) on delete cascade,
  "slug"      text not null,
  "createdAt" timestamptz not null default now()
);

create unique index "SlugHistory_slug_lower_key" on "SlugHistory" (lower(slug));
create index "SlugHistory_userId_idx" on "SlugHistory" ("userId");
```

Nota: el índice único en historial garantiza que un mismo slug viejo no apunte a dos negocios distintos. El API además valida que un slug nuevo no exista ni en `User` ni en `SlugHistory` (salvo en el historial propio, que se elimina al reclamarlo).

### 7.4 · Columna de cooldown

```sql
alter table "User" add column "slugChangedAt" timestamptz;
```

`null` = nunca lo cambió → el primer cambio no tiene cooldown.

### 7.5 · RLS de SlugHistory

Lectura pública (la web pública resuelve redirecciones de slugs viejos con anon key); **sin ninguna política de escritura** — solo escribe el admin client (service role, que bypasea RLS):

```sql
alter table "SlugHistory" enable row level security;
create policy "slughistory_select_all" on "SlugHistory" for select using (true);
-- Sin políticas de insert/update/delete a propósito: escritura solo vía service role.
```

## 8 · Migración: Business como entidad pública canónica (2026-06-11)

> Decisión de arquitectura: el slug público pasa de `User.slug` a `Business.slug`. El slug que las usuarias conocen y han compartido (`User.slug`) **gana** y se copia a `Business.slug`; el `Business.slug` actual (sufijo timestamp, nunca expuesto) se descarta pero se archiva en `SlugHistory` como seguro. `SlugHistory` pasa a FK por `businessId`.
>
> **Orden importa**: 8.2 (reestructurar SlugHistory) y 8.3a (archivar Business.slug viejos) deben ejecutarse ANTES del UPDATE de 8.3b, que pisa los valores antiguos. Ejecutar 8.1, revisar, y luego 8.2–8.5 en orden.

### 8.1 · Diagnóstico previo (revisar antes de tocar nada)

```sql
-- a) User.slug vs Business.slug lado a lado (solo owners: el slug del negocio
--    se canonicaliza desde la dueña; staff tiene slug propio que queda deprecado)
select u.id as user_id, u."appRole", u.slug as user_slug,
       b.id as business_id, b.slug as business_slug,
       (lower(u.slug) is distinct from lower(b.slug)) as difieren
from "User" u
join "Business" b on b.id = u."businessId"
where u."appRole" = 'owner'
order by difieren desc, u.slug;

-- b) Negocios con más de un User (equipo): la canonicalización copia SOLO el
--    slug de la owner; si algún negocio tiene 2+ owners, resolver a mano antes
select b.id, b.name, count(*) filter (where u."appRole" = 'owner') as owners,
       count(*) as usuarios
from "Business" b
join "User" u on u."businessId" = b.id
group by b.id, b.name
having count(*) > 1 or count(*) filter (where u."appRole" = 'owner') <> 1;

-- c) Colisiones que tendría lower(Business.slug) DESPUÉS de canonicalizar
--    (simulación: slug futuro = User.slug de la owner, o el actual si no hay owner)
with futuro as (
  select b.id, coalesce(u.slug, b.slug) as slug_final
  from "Business" b
  left join "User" u on u."businessId" = b.id and u."appRole" = 'owner'
)
select lower(slug_final) as slug_lower, count(*) as n, array_agg(id) as business_ids
from futuro
group by lower(slug_final)
having count(*) > 1;

-- d) Filas de SlugHistory cuyo User no tiene businessId (huérfanas para la
--    migración a businessId; si aparecen, se borran en 8.2 — revisar cuáles son)
select sh.*
from "SlugHistory" sh
join "User" u on u.id = sh."userId"
where u."businessId" is null;
```

### 8.2 · Reestructurar SlugHistory: FK por businessId

```sql
begin;

alter table "SlugHistory" add column "businessId" text;

update "SlugHistory" sh
set "businessId" = u."businessId"
from "User" u
where u.id = sh."userId";

-- Huérfanas (User sin negocio): sin businessId no pueden redirigir a nada
delete from "SlugHistory" where "businessId" is null;

alter table "SlugHistory" alter column "businessId" set not null;
alter table "SlugHistory"
  add constraint "SlugHistory_businessId_fkey"
  foreign key ("businessId") references "Business"(id) on delete cascade;
create index "SlugHistory_businessId_idx" on "SlugHistory" ("businessId");

-- userId queda fuera: el historial pertenece al negocio
drop index if exists "SlugHistory_userId_idx";
alter table "SlugHistory" drop column "userId";

commit;
```

(El índice único `SlugHistory_slug_lower_key` sobre `lower(slug)` y la RLS del §7.5 no cambian.)

### 8.3 · Canonicalizar: User.slug → Business.slug (+ slugChangedAt)

```sql
begin;

alter table "Business" add column "slugChangedAt" timestamptz;

-- 8.3a · Archivar el Business.slug ANTIGUO antes de pisarlo: cualquier enlace
-- que (improbablemente) lo usara seguirá redirigiendo. Los User.slug NO se
-- siembran en el historial: pasan a ser los slugs canónicos del Business —
-- meterlos en SlugHistory crearía una colisión consigo mismos en el índice
-- único y un lookup ambiguo (canónico y "viejo" a la vez).
insert into "SlugHistory" ("businessId", "slug")
select b.id, b.slug
from "Business" b
join "User" u on u."businessId" = b.id and u."appRole" = 'owner'
where lower(b.slug) is distinct from lower(u.slug)
on conflict ((lower("slug"))) do nothing;

-- 8.3b · El slug que las usuarias conocen gana
update "Business" b
set slug = u.slug,
    "slugChangedAt" = u."slugChangedAt"
from "User" u
where u."businessId" = b.id and u."appRole" = 'owner';

commit;
```

### 8.4 · Índice único case-insensitive sobre Business.slug

Después de 8.3 (con los valores finales ya en sitio; 8.1c debe haber salido limpio):

```sql
create unique index "Business_slug_lower_key" on "Business" (lower(slug));
```

### 8.5 · Deprecación suave de User.slug

NO borrar las columnas todavía (hay lecturas legacy en código):

```sql
comment on column "User".slug is 'DEPRECATED: canónico en Business.slug desde 2026-06';
comment on column "User"."slugChangedAt" is 'DEPRECATED: canónico en Business."slugChangedAt" desde 2026-06';
```

Nota: el índice único `User_slug_lower_key` del §7.2 se conserva — `User.slug` ya no se edita, así que no estorba, y mantiene la integridad de los datos legacy.

## 9 · Checklist al terminar

- [ ] §1 ejecutado: todas las tablas listadas tienen `rls_activo = true`
- [ ] Políticas de escritura por negocio en Business / BusinessHours / BusinessException / BusinessPhoto / ProfessionalSettings
- [ ] Lectura de Appointment restringida (o vista/RPC para slots públicos)
- [ ] Políticas de path en storage para ambos buckets
- [ ] Probar en el móvil: editar negocio, subir foto, calendario (slots) y reserva pública web siguen funcionando
- [ ] §6 ejecutado: `paymentMethods` históricos normalizados a keys canónicas
- [ ] §7 ejecutado: diagnóstico de colisiones limpio, índice único `lower(User.slug)`, tabla `SlugHistory` + RLS, columna `User.slugChangedAt`
- [ ] §8 ejecutado: diagnóstico limpio (owners 1:1, sin colisiones futuras), SlugHistory por `businessId`, `Business.slug` canonicalizado desde la owner, slugs viejos de Business archivados, índice único `lower(Business.slug)`, comentarios DEPRECATED en `User.slug`
