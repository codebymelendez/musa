# MUSA Pro — Auditoría de Seguridad (FASE 4)

**Fecha:** 2026-06-10
**Alcance:** `apps/pro` (Expo / React Native). La API web (`src/app/api/`) se audita solo desde la perspectiva del cliente — **no se modificó nada server-side**.
**Leyenda de estado:** ✅ corregido en esta fase (lado cliente) · 📋 reportado, requiere acción server-side o de consola · ℹ️ verificado sin hallazgo.

---

## Resumen ejecutivo

| Severidad | Hallazgos | Corregidos cliente | Pendientes |
|---|---|---|---|
| Crítico | 1 | 0 | 1 (verificar RLS — ver PENDING_SQL.md) |
| Alto | 4 | 1 | 3 (server-side, reportados) |
| Medio | 4 | 1 | 3 |
| Bajo | 4 | 1 | 3 |

---

## CRÍTICO

### C-1 · Acceso directo a tablas desde el cliente depende 100 % de RLS (verificar) 📋
El cliente móvil consulta y **escribe** tablas de Supabase directamente con la anon key + JWT del usuario:

| Tabla | Operaciones | Dónde |
|---|---|---|
| `Business` | SELECT, **UPDATE** | `BusinessInfoScreen`, `@musa/availability` |
| `BusinessHours` | SELECT, **UPSERT** | `BusinessInfoScreen`, `useBusinessDay`, `@musa/availability` |
| `BusinessException` | SELECT | `useBusinessDay`, `@musa/availability` |
| `BusinessPhoto` | SELECT, **INSERT**, **DELETE** | `BusinessInfoScreen` |
| `ProfessionalSettings` | **UPDATE** | `BusinessInfoScreen` (sync) |
| `Service`, `User`, `Appointment` | SELECT | `@musa/availability` (slots) |
| Storage `staff-avatars`, `business-photos` | **UPLOAD** (upsert), público | `settings.tsx`, `BusinessInfoScreen` |

El `businessId` usado en los `.eq('id', businessId)` proviene de `/api/settings`, pero **un cliente manipulado puede enviar cualquier id**: la única barrera real es RLS. Si alguna de estas tablas no tiene RLS habilitado con políticas por pertenencia al negocio, cualquier usuario autenticado podría leer/modificar datos de otros negocios (p. ej. `Business.update().eq('id', <otro>)` o sobrescribir el avatar de otro staff vía `upsert: true` en storage).

**Acción:** ejecutar las verificaciones de `PENDING_SQL.md` en Supabase y aplicar las políticas faltantes. **No ejecutado por mí** — requiere revisión humana contra las políticas existentes.

---

## ALTO

### A-1 · Caché persistido sobrevivía al cierre de sesión ✅ CORREGIDO
El caché de React Query (citas, clientas, ingresos, teléfonos — PII) se persiste en AsyncStorage (`musa-pro-query-cache`) y **no se limpiaba en signOut**: los datos de un negocio quedaban en el dispositivo para la siguiente sesión (otro usuario en el mismo dispositivo los vería como caché inicial).
**Fix implementado:** `clearPersistedCache()` en `lib/queryClient.ts` (`queryClient.clear()` + `persister.removeClient()`), invocado en:
- `app/(tabs)/settings.tsx` → botón "Cerrar sesión"
- `lib/api.ts` → `handle401()` (expulsión por token inválido)

### A-2 · `POST /api/appointments` acepta `businessId` y `status` del cliente 📋
`createAppointment` envía `businessId` (tomado de settings) y `status: 'confirmed'` en el body. Si el server honra ese `businessId` en lugar de derivarlo de la sesión, un cliente manipulado podría crear citas en negocios ajenos. **Verificar que la API ignore `businessId` del body y lo derive del token.**

### A-3 · `POST /api/team/invite` envía `role: 'STAFF'` desde el cliente 📋
El rol viaja en el body. Verificar que el server fuerce `STAFF` (o valide contra una allowlist) y que solo un OWNER pueda invitar; si aceptara `role: 'OWNER'` del body sería escalada de privilegios.

### A-4 · `PATCH /api/appointments/[id]` acepta `status` y `payment` arbitrarios 📋
El cobro (`payment.amount/method/currency/isPaid`) y el estado se aceptan del cliente. Verificar server-side: (1) ownership de la cita por el negocio del token, (2) validación de rangos de monto y enum de método/moneda, (3) transiciones de estado válidas. El cliente ahora valida con zod (ver M-1), pero eso **no sustituye** la validación server.

---

## MEDIO

### M-1 · Formularios sin validación estructurada ✅ CORREGIDO
Los formularios enviaban datos con checks mínimos (`if (!name.trim())`). Se creó `lib/validation.ts` (zod, mensajes en español) y se conectó **antes de cada request**:

| Formulario | Esquema | Valida |
|---|---|---|
| Nueva clienta (`AddClientModal`) | `clientFormSchema` | nombre, teléfono 7–15 dígitos, email, fecha de nacimiento |
| Editar clienta (`clients/[id]`) | `clientFormSchema` | ídem |
| Cobro (`appointments/[id]`) | `paymentFormSchema` | monto > 0 y ≤ 1 M, método, moneda USD/BS |
| Servicio crear/editar | `serviceFormSchema` | nombre, duración 5–600 min, precio ≥ 0 |
| Promoción crear/editar | `promotionFormSchema` | título, descuento 1–100 %, `validUntil ≥ validFrom` |
| Invitar miembro (`team/`) | `inviteFormSchema` | email |
| Fidelidad (`settings/loyalty`) | `loyaltyFormSchema` | umbrales enteros ≥ 1, descripción |
| Ajustes negocio (`settings/`) | `businessSettingsFormSchema` | nombre, WhatsApp 7–15 dígitos, handle Instagram |

### M-2 · Clave de Google Places viaja en el binario ✅ **MITIGADO (2026-06-10)** / 📋 acción residual del owner
Las llamadas REST (Places Autocomplete/Details y Time Zone) ya **no** usan key en el cliente: pasan por el proxy autenticado del backend (`/api/google/place/*`, `/api/google/timezone`) con `GOOGLE_MAPS_SERVER_KEY` (variable de servidor en Vercel, restringida por API: Places API + Time Zone API, sin restricción de app/referrer).

Residual: `EXPO_PUBLIC_GOOGLE_PLACES_KEY` solo queda en `app.config.js` para el **SDK nativo de mapas** (`android.config.googleMaps.apiKey`). Esa key debe restringirse en Google Cloud Console a *Maps SDK for Android/iOS* únicamente, con restricción de aplicación (package `app.getmusa.pro` + SHA-1 de EAS / bundle iOS) y alertas de cuota.

### M-3 · Caché con PII en AsyncStorage sin cifrar 📋 (riesgo residual aceptado)
`musa-pro-query-cache` guarda nombres/teléfonos de clientas e ingresos en texto plano (sandbox de la app). Mitigado por A-1 (se purga al cerrar sesión). Si se quiere defensa adicional en dispositivos comprometidos/rooteados: cifrar el snapshot con una clave en SecureStore o reducir `maxAge`.

### M-4 · `app.json` malformado: plugins anidados dentro de `android` 📋
`plugins`, `experiments`, `extra.eas` y `owner` están **dentro del bloque `android`** en lugar del nivel raíz de `expo`. Consecuencias: los config-plugins (`expo-router`, `expo-notifications`, `expo-secure-store` con su `faceIDPermission`, `expo-web-browser`) no se aplican en prebuild, y conviven dos `projectId` de EAS distintos (`b4250c86…` anidado vs `5f40f09f…` raíz). Mover esas claves al nivel raíz y dejar un solo `projectId`. *(No lo corregí: cambia identidad del build EAS — decisión del owner.)*

---

## BAJO

### B-1 · Guard de navegación corre en `useEffect` 📋
`app/_layout.tsx` redirige a `/(auth)/login` en un efecto. Entre el primer render y el `router.replace` una pantalla protegida puede montarse un frame y disparar queries (que devuelven 401 → signOut + redirect, sin fuga de datos porque el caché ya se purga). Endurecimiento opcional: render condicional declarativo (no montar el `Stack` protegido sin sesión) o `Stack.Protected` de expo-router v6.

### B-2 · Sesión Supabase en SecureStore puede exceder 2048 bytes ℹ️/📋
El adaptador híbrido guarda la sesión completa (JWT + refresh) en `expo-secure-store`, correcto frente a AsyncStorage. iOS keychain lo tolera; en Android, valores > 2048 bytes emiten warning y en versiones antiguas del SDK podían fallar. Funciona hoy; vigilar si la sesión crece (muchos custom claims).

### B-3 · Login por email sin validación de formato client-side ✅ parcial
`(auth)/email.tsx` solo valida no-vacío; Supabase rechaza server-side y el mensaje de error no filtra existencia de cuentas ("Correo o contraseña incorrectos") — correcto contra user-enumeration. Se deja sin zod a propósito: el error genérico ya cubre UX y seguridad.

### B-4 · `console.error` con objetos de error ℹ️
`secureStorage`, `ob.logError` y `[avatar upload]` loguean objetos `error` (pueden contener URLs firmadas en errores de storage). Aceptable: nunca incluyen el access token ni datos de clientas, y `console.error` se mantiene por política del proyecto solo para errores.

---

## Verificaciones sin hallazgo ℹ️

1. **El access token nunca se loguea.** Único uso: header `Authorization` (`lib/api.ts`) y `setSession()` en el callback OAuth (`login.tsx`, parseado en memoria desde el fragment, nunca persistido fuera del adaptador de Supabase). Los `ob.debug` son no-op en producción (FASE 3).
2. **SecureStore vs AsyncStorage:** el material sensible (sesión Supabase) vive en SecureStore con migración transparente desde AsyncStorage que **borra** la copia insegura tras migrar. AsyncStorage solo guarda el caché de queries (ver M-3/A-1).
3. **Deep links / rutas protegidas:** scheme `getmusa-pro://`. Todas las rutas fuera de `(auth)` exigen sesión por el guard global; un deep link directo a `/appointments/123` sin sesión redirige a login (con la salvedad B-1). El redirect OAuth usa `expo-web-browser` + `makeRedirectUri` (sin webview embebida).
4. **Anon key de Supabase en el binario:** by-design (key publicable `sb_publishable_…`); su seguridad depende íntegramente de RLS → ver C-1.

---

## Claves `EXPO_PUBLIC_*` embebidas en el binario

| Variable | Valor/uso | ¿Secreta? | Restricción requerida |
|---|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | URL del proyecto | No | — |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Key publicable | No (si RLS ✓) | RLS en todas las tablas accedidas (C-1) |
| `EXPO_PUBLIC_API_URL` / `APP_URL` | `https://getmusa.app` | No | — |
| `EXPO_PUBLIC_APP_ENV` | `preview`/`production` | No | — |
| `EXPO_PUBLIC_GOOGLE_PLACES_KEY` | Places/Maps/Timezone | **Sí (facturable)** | **M-2: restringir por bundle ID + APIs en Google Cloud Console** |

---

## Mapa de endpoints consumidos por la app

Todos van con `Authorization: Bearer <jwt>` y, según la arquitectura del proyecto (CLAUDE.md + SECURITY-HOTFIX-02), el backend usa **service-role client (bypass RLS) + validación de sesión/ownership en código**. "Confía en el cliente" = el body incluye campos que el server debe ignorar o re-validar.

| Endpoint | Métodos | Protección esperada | ⚠️ Confía en el cliente |
|---|---|---|---|
| `/api/dashboard` | GET | sesión → scoping por usuario | — |
| `/api/appointments` | GET, POST | sesión + ownership | ⚠️ POST: `businessId`, `status` en body (A-2) |
| `/api/appointments/[id]` | GET, PATCH | sesión + ownership de la cita | ⚠️ PATCH: `status`, `payment.*` (A-4) |
| `/api/appointments/[id]/action` | POST (`?action=confirm\|cancel`) | sesión + ownership | enum de action validado server |
| `/api/clients` | GET, POST | sesión → scoping por negocio | POST: datos validados con zod en server (verificar) |
| `/api/clients/[id]` | GET, PATCH | sesión + ownership de la clienta | PATCH: campos libres (name/phone/email/tags) |
| `/api/services` | GET, POST | sesión (POST: ¿solo OWNER?) | precio/duración del body |
| `/api/services/[id]` | PATCH, DELETE | sesión + ownership (¿solo OWNER?) | ídem |
| `/api/promotions` | GET, POST | OWNER only (per CLAUDE.md) | descuento/fechas del body |
| `/api/promotions/[id]` | PATCH, DELETE | OWNER only | ídem |
| `/api/promotions/broadcast` | POST | OWNER only + rate limit recomendado | `promotionId` (verificar pertenencia) |
| `/api/stats` | GET | sesión → scoping | `year`/`month` en query (inocuo) |
| `/api/settings` | GET, PATCH | sesión | PATCH: `businessName`, `settings.*` |
| `/api/team/invite` | POST | OWNER only + plan Team | ⚠️ `role` en body (A-3) |
| `/api/loyalty/program` | GET, POST | OWNER only | umbrales del body |
| `/api/loyalty/accounts` | GET | sesión → scoping por negocio | — |
| `/api/loyalty/redeem` | POST | sesión + ownership de la cuenta | ⚠️ `accountId` (verificar pertenencia al negocio) |
| `/api/bcv-rate` | GET | sesión | — |

**Acceso directo a Supabase (RLS-dependiente):** ver tabla en C-1.

---

## Cambios implementados en esta fase (solo cliente)

1. `lib/queryClient.ts` — `clearPersistedCache()` (A-1).
2. `lib/api.ts` — `handle401()` purga caché además de signOut (A-1).
3. `app/(tabs)/settings.tsx` — signOut purga caché (A-1).
4. `lib/validation.ts` — nuevo; esquemas zod + helper `validate()` (M-1).
5. Validación zod conectada en: `AddClientModal`, `clients/[id]`, `appointments/[id]` (pago), `services/index`, `services/[id]`, `promotions/index`, `promotions/[id]`, `team/index`, `settings/loyalty`, `settings/index` (M-1).
6. `hooks/useBusinessDay.ts` — migrado de `useEffect`+`setState` a React Query (criterio de aceptación "cero useEffect de data-fetching"; misma semántica: excepción → horario regular → cerrado por defecto).
