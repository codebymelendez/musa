# MOBILE.md — Constitución técnica de MUSA App Móvil

> Documento de referencia para Claude Code al trabajar en la app móvil de MUSA.
> Leer junto con `CLAUDE.md` (web) y `MUSA_DESIGN_RULES.md`.
> Desarrollado por [codebymelendez.com](https://codebymelendez.com)

---

## Decisiones de arquitectura (no discutir, están tomadas)

| Decisión | Elección | Motivo |
|---|---|---|
| Framework | React Native 0.83.1 + Expo SDK 55 | Mismo ecosistema JS que la web, React 19 nativo |
| Routing | Expo Router (file-based) | Consistente con App Router de Next.js |
| Dos apps en stores | Sí — MUSA Pro (profesionales) + MUSA (clientas) | UX más limpia por perfil |
| Backend | Reutilizar API de Next.js existente | Cero endpoints nuevos para el MVP |
| Base de datos | Mismo Supabase, mismo schema | Extender PushSubscription para FCM |
| Monorepo | Sí — apps/ + packages/ en el repo actual | Un solo lugar para todo |
| Builds | Expo EAS (nube) | Windows + iPhone físico, sin Mac |
| Dev diario | Expo Go en iPhone físico | Sin simulador iOS local |
| Estado global | Zustand (mismo que web) | Consistencia entre codebases |
| Estilos | NativeWind (Tailwind para RN) | Mismo sistema de clases que web |
| Tipos compartidos | packages/types/ | Un solo source of truth |
| CI/CD | GitHub Actions con filtros por path | Deploy independiente web vs mobile |

---

## Estructura del monorepo

```
musa/                              ← raíz del monorepo (repo actual)
├── src/                           ← Next.js web (NO TOCAR desde apps)
├── supabase/                      ← migrations compartidas
├── packages/                      ← código compartido
│   ├── types/                     ← tipos TypeScript del schema
│   │   ├── index.ts               ← exporta todo
│   │   ├── business.ts
│   │   ├── user.ts
│   │   ├── appointment.ts
│   │   ├── client.ts
│   │   ├── service.ts
│   │   └── notification.ts
│   ├── validators/                ← schemas Zod compartidos
│   │   ├── index.ts
│   │   ├── appointment.ts
│   │   └── client.ts
│   ├── shared/                    ← componentes UI compartidos entre las dos apps
│   │   ├── components/
│   │   │   ├── AppointmentCard.tsx
│   │   │   ├── ServiceBadge.tsx
│   │   │   └── Avatar.tsx
│   │   └── hooks/
│   │       ├── useNotifications.ts
│   │       └── usePushToken.ts
│   ├── ui/                        ← componentes UI compartidos (placeholder)
│   ├── core/                      ← auth, storage, constants (placeholder)
│   └── api/                       ← fetch helpers y clientes de API (placeholder)
├── apps/                          ← apps móviles Expo
│   ├── pro/                       ← MUSA Pro (profesionales)
│   │   ├── app/                   ← Expo Router pages
│   │   │   ├── (auth)/            ← login, register
│   │   │   ├── (tabs)/            ← agenda, clientes, stats, perfil
│   │   │   └── _layout.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   │   ├── supabase.ts        ← cliente Supabase (AsyncStorage)
│   │   │   ├── auth.ts            ← Supabase Auth para profesionales
│   │   │   └── api.ts             ← fetch helpers contra /api/
│   │   ├── store/                 ← Zustand stores
│   │   ├── app.json               ← config Expo (bundle id, nombre)
│   │   └── eas.json               ← perfiles de build
│   └── client/                    ← MUSA (clientas)
│       ├── app/
│       │   ├── (auth)/            ← verify (phone + name)
│       │   ├── (tabs)/            ← explorar, mis citas, puntos
│       │   └── _layout.tsx
│       ├── components/
│       ├── hooks/
│       ├── lib/
│       │   ├── supabase.ts        ← cliente Supabase (solo lectura pública)
│       │   ├── clientAuth.ts      ← JWT propio (AsyncStorage en vez de localStorage)
│       │   └── api.ts
│       ├── store/
│       ├── app.json
│       └── eas.json
├── .github/
│   └── workflows/
│       ├── deploy-web.yml         ← solo se dispara si cambia src/
│       ├── deploy-pro.yml         ← solo si cambia apps/pro/
│       └── deploy-client.yml      ← solo si cambia apps/client/
├── package.json                   ← workspaces: ["apps/*", "packages/*"]
├── CLAUDE.md                      ← guía Claude Code para la web
├── MOBILE.md                      ← este archivo
└── MUSA_DESIGN_RULES.md
```

---

## Modificación de base de datos requerida

Antes de escribir código mobile, ejecutar esta migration en Supabase:

```sql
-- Extender PushSubscription para soportar FCM (mobile) además de VAPID (web)
ALTER TABLE "PushSubscription"
  ADD COLUMN "platform" TEXT NOT NULL DEFAULT 'web',       -- 'web' | 'ios' | 'android'
  ADD COLUMN "fcmToken" TEXT,                               -- token FCM para mobile
  ADD COLUMN "appVersion" TEXT,                             -- versión de la app
  ADD COLUMN "deviceModel" TEXT;                            -- modelo del dispositivo

-- El campo 'endpoint' y 'keys' son requeridos solo para web (VAPID)
-- Para mobile: solo fcmToken es requerido, endpoint puede ser NULL
ALTER TABLE "PushSubscription"
  ALTER COLUMN "endpoint" DROP NOT NULL,
  ALTER COLUMN "keys" DROP NOT NULL;

-- Índice para buscar por plataforma
CREATE INDEX "PushSubscription_platform_idx" ON "PushSubscription"("platform");
CREATE INDEX "PushSubscription_fcmToken_idx" ON "PushSubscription"("fcmToken")
  WHERE "fcmToken" IS NOT NULL;

-- Unique constraint solo para web (endpoint único) — no aplica a FCM
DROP INDEX IF EXISTS "PushSubscription_endpoint_key";
CREATE UNIQUE INDEX "PushSubscription_endpoint_key"
  ON "PushSubscription"("endpoint")
  WHERE "endpoint" IS NOT NULL;
```

### Regla de negocio post-migración

En `src/lib/notifications.ts` (web), al enviar notificaciones filtrar por `platform = 'web'`.
En el nuevo `packages/shared/hooks/useNotifications.ts`, registrar con `platform = 'ios' | 'android'`.

---

## Autenticación en la app móvil

### MUSA Pro — profesionales (Supabase Auth)

```typescript
// apps/pro/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AppState } from 'react-native'

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,          // AsyncStorage en vez de cookies
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,      // CRÍTICO: false en React Native
    },
  }
)

// Refrescar sesión cuando la app vuelve al foreground
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})
```

**Google OAuth en React Native:** Usar `expo-auth-session` + `expo-web-browser`.
No usar `@react-oauth/google` (es solo para web).

```typescript
import * as WebBrowser from 'expo-web-browser'
import { makeRedirectUri } from 'expo-auth-session'

WebBrowser.maybeCompleteAuthSession()

async function signInWithGoogle() {
  const redirectUrl = makeRedirectUri({ scheme: 'getmusa-pro' })
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
    },
  })
  if (data.url) {
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl)
    // Supabase procesa el token automáticamente vía deep link
  }
}
```

### MUSA (clientas) — JWT propio

```typescript
// apps/client/lib/clientAuth.ts
// MISMO algoritmo que src/lib/clientAuth.ts en la web
// ÚNICO cambio: localStorage → AsyncStorage

import AsyncStorage from '@react-native-async-storage/async-storage'
import * as jose from 'jose'

const CLIENT_TOKEN_KEY = 'musa_client_token'
const JWT_SECRET = process.env.EXPO_PUBLIC_JWT_CLIENT_SECRET!

export async function verifyClient(phone: string, name: string): Promise<string | null> {
  // Llama a POST /api/client/verify (endpoint existente, sin cambios)
  const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/client/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, name }),
  })
  if (!res.ok) return null
  const { token } = await res.json()
  await AsyncStorage.setItem(CLIENT_TOKEN_KEY, token)
  return token
}

export async function getClientToken(): Promise<string | null> {
  return AsyncStorage.getItem(CLIENT_TOKEN_KEY)
}

export async function clearClientToken(): Promise<void> {
  return AsyncStorage.removeItem(CLIENT_TOKEN_KEY)
}
```

---

## Variables de entorno

### MUSA Pro (`apps/pro/.env`)
```
EXPO_PUBLIC_SUPABASE_URL=         # mismo que NEXT_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=    # mismo que NEXT_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_API_URL=              # https://getmusa.app (prod) | http://IP_LOCAL:3000 (dev)
EXPO_PUBLIC_APP_ENV=              # development | preview | production
```

### MUSA Client (`apps/client/.env`)
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_API_URL=
EXPO_PUBLIC_JWT_CLIENT_SECRET=    # mismo que JWT_SECRET + "_client" (web)
EXPO_PUBLIC_APP_ENV=
```

> CRÍTICO: En Expo, las variables EXPO_PUBLIC_* son visibles en el bundle.
> Nunca poner SUPABASE_SERVICE_ROLE_KEY ni VAPID_PRIVATE_KEY en la app mobile.
> Toda operación privilegiada sigue pasando por los API routes de Next.js.

---

## Notificaciones push (FCM)

### Setup requerido
1. Crear proyecto en Firebase Console
2. Añadir app iOS (bundle id: `app.musa.pro` y `app.musa.client`)
3. Añadir app Android (package: `app.musa.pro` y `app.musa.client`)
4. Descargar `google-services.json` (Android) y `GoogleService-Info.plist` (iOS)
5. Instalar `expo-notifications` y `@react-native-firebase/app`

### Hook compartido
```typescript
// packages/shared/hooks/useNotifications.ts
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

export async function registerForPushNotifications(
  userId: string,
  userType: 'professional' | 'client'
): Promise<void> {
  const { status } = await Notifications.requestPermissionsAsync()
  if (status !== 'granted') return

  const token = (await Notifications.getExpoPushTokenAsync()).data
  const platform = Platform.OS // 'ios' | 'android'

  // Registrar en la DB (endpoint existente, extendido)
  const endpoint = userType === 'professional'
    ? '/api/notifications/subscribe'
    : '/api/push/subscribe-client'

  await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      fcmToken: token,
      platform,
      // endpoint y keys se omiten para mobile (null en DB)
    }),
  })
}
```

---

## Pantallas del MVP — orden de implementación

### MUSA (clientas) — prioridad 1

| Orden | Pantalla | Ruta Expo Router | API que consume |
|---|---|---|---|
| 1 | Explorar profesionales | `/(tabs)/explore` | `GET /api/public/businesses` |
| 2 | Perfil de profesional | `/p/[slug]` | `GET /api/public/[slug]` |
| 3 | Reservar cita | `/p/[slug]/book` | `POST /api/public/[slug]/book` |
| 4 | Verificar identidad (auth) | `/(auth)/verify` | `POST /api/client/verify` |
| 5 | Mis citas | `/(tabs)/appointments` | `GET /api/client/bookings` |
| 6 | Detalle de cita | `/appointments/[id]` | token de reschedule existente |
| 7 | Mis puntos | `/(tabs)/loyalty` | — (datos en JWT de clienta) |

### MUSA Pro (profesionales) — prioridad 2

| Orden | Pantalla | Ruta Expo Router | API que consume |
|---|---|---|---|
| 1 | Login / Google OAuth | `/(auth)/login` | Supabase Auth |
| 2 | Agenda del día | `/(tabs)/calendar` | `GET /api/appointments` |
| 3 | Detalle de cita | `/appointments/[id]` | `GET /api/appointments/[id]` |
| 4 | Lista de clientas | `/(tabs)/clients` | `GET /api/clients` |
| 5 | Ficha de clienta | `/clients/[id]` | `GET /api/clients/[id]` |
| 6 | Configurar disponibilidad | `/settings/availability` | `GET/PATCH /api/settings` |
| 7 | Estadísticas básicas | `/(tabs)/stats` | `GET /api/stats` |
| 8 | Mi perfil público | `/(tabs)/profile` | `GET/PATCH /api/profile` |

---

## Dependencias de cada app

```json
{
  "dependencies": {
    "react": "19.2.4",
    "react-native": "0.83.1",
    "expo": "~55.0.0",
    "expo-router": "~5.0.0",
    "expo-notifications": "~0.29.0",
    "expo-auth-session": "~6.1.0",
    "expo-web-browser": "~14.1.0",
    "expo-secure-store": "~14.0.0",
    "@react-native-async-storage/async-storage": "^2.0.0",
    "@supabase/supabase-js": "^2.100.0",
    "nativewind": "^4.1.0",
    "zustand": "^5.0.12",
    "zod": "^4.3.6",
    "react-native-safe-area-context": "^4.0.0",
    "react-native-screens": "^3.0.0"
  },
  "devDependencies": {
    "@types/react": "~19.2.0"
  }
}
```

> Versiones validadas en instalación limpia — sin legacy-peer-deps, sin --force.
> React 19.2.4 es compatible con React Native 0.83.1 de forma nativa.
> NO bajar react-native por debajo de 0.78 — versiones anteriores requieren React 18.

---

## CI/CD — GitHub Actions

### `deploy-web.yml` (sin cambios, solo añadir filtro)
```yaml
on:
  push:
    branches: [main]
    paths:
      - 'src/**'
      - 'public/**'
      - 'middleware.ts'
      - 'next.config.ts'
      - 'package.json'
      - 'packages/**'   # tipos compartidos también rebuild web
```

### `deploy-pro.yml` (nuevo)
```yaml
name: Build MUSA Pro (EAS)
on:
  push:
    branches: [main]
    paths:
      - 'apps/pro/**'
      - 'packages/shared/**'
      - 'packages/**'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install -g eas-cli
      - run: cd apps/pro && eas build --platform all --profile production --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

### `deploy-client.yml` (nuevo — idéntico apuntando a apps/client)

---

## Perfiles de EAS (`eas.json` en cada app)

```json
{
  "cli": { "version": ">= 10.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": false },
      "android": { "buildType": "apk" }
    },
    "production": {
      "ios": { "buildType": "archive" },
      "android": { "buildType": "app-bundle" }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "TU_APPLE_ID",
        "ascAppId": "TU_APP_STORE_CONNECT_APP_ID",
        "appleTeamId": "TU_TEAM_ID"
      },
      "android": {
        "serviceAccountKeyPath": "./google-play-key.json",
        "track": "production"
      }
    }
  }
}
```

---

## Flujo de trabajo diario (Windows + iPhone físico)

```bash
# 1. Iniciar la web en local (para que la app consuma la API)
npm run dev                          # corre en localhost:3000

# 2. En otra terminal, iniciar la app
cd apps/pro                   # o /client
npx expo start

# 3. En el iPhone: abrir Expo Go → escanear QR
#    La app se conecta a tu máquina via LAN (mismo WiFi)

# IMPORTANTE: En .env de la app mobile, durante desarrollo:
# EXPO_PUBLIC_API_URL=http://TU_IP_LOCAL:3000
# Obtener IP: ipconfig en Windows → buscar IPv4 de tu adaptador WiFi
```

### Builds de prueba para beta testers (profesionales de MUSA)
```bash
# Genera un build instalable distribuido por QR/URL (sin pasar por stores)
eas build --profile preview --platform ios
eas build --profile preview --platform android

# EAS genera un link que puedes compartir directamente con las profesionales
```

### Build de producción y submit a stores
```bash
# Build para ambas plataformas
eas build --profile production --platform all

# Submit a Play Store
eas submit --platform android

# Submit a App Store
eas submit --platform ios
```

---

## Reglas para Claude Code al trabajar en apps/

1. **Nunca modificar `src/`** desde contexto de trabajo en apps. Son codebases independientes.
2. **Nunca usar `localStorage`** — siempre `AsyncStorage` o `expo-secure-store` para datos sensibles.
3. **Nunca usar `window`, `document`, o APIs de browser** — React Native no tiene DOM.
4. **Nunca importar de `@supabase/ssr`** — ese paquete es solo para Next.js. Usar `@supabase/supabase-js` directamente.
5. **Siempre usar `EXPO_PUBLIC_`** como prefijo en variables de entorno que la app necesita en runtime.
6. **Los tipos van en `packages/types/`**, no definirlos localmente en apps si ya existen para la web.
7. **Respetar `MUSA_DESIGN_RULES.md`** — los colores, tipografía y decisiones visuales aplican también a las apps. El color primario `#B5593E` y el sistema visual MUSA deben trasladarse a NativeWind.
8. **No crear endpoints nuevos** en `src/app/api/` para el MVP — consumir los existentes.
9. **El campo `platform`** en `PushSubscription` siempre debe enviarse al registrar tokens. Nunca asumir que es web.
10. **Expo Router file-based routing** — las rutas reflejan la estructura de carpetas en `app/`. Grupos con paréntesis `(tabs)` para tabs y `(auth)` para flujos de autenticación.

---

## Identifiers de las apps en stores

| App | Bundle ID (iOS) | Package (Android) | Slug Expo | Scheme deep link | Nombre en store |
|---|---|---|---|---|---|
| MUSA Pro | `app.getmusa.pro` | `app.getmusa.pro` | `getmusa-pro` | `getmusa-pro` | MUSA Pro — Gestión de belleza |
| MUSA | `app.getmusa.client` | `app.getmusa.client` | `getmusa-client` | `getmusa-client` | MUSA — Reserva tu cita |

> `extra.eas.projectId` en app.json de MUSA Pro está pendiente — se obtiene al
> vincular el proyecto en expo.dev con `eas init` desde apps/pro/

---

## Estado actual

- [x] Arquitectura definida
- [x] Decisiones técnicas tomadas
- [x] Schema de DB extendido (pendiente ejecutar migration en Supabase)
- [x] Monorepo migrado — workspaces: ["apps/*", "packages/*"]
- [x] apps/pro/ y apps/client/ en raíz (antes mobile/apps/)
- [x] packages/shared/ consolidado junto a types/ y validators/
- [x] packages/ui/, packages/core/, packages/api/ creados (placeholders)
- [x] @musa/types v0.1.0 creado (business, user, appointment, client, service, notification, payment, plan)
- [x] @musa/validators v0.1.0 creado (appointment, client)
- [x] Proyecto Expo SDK 55 creado para MUSA Pro (apps/pro)
- [x] Scaffolding de pantallas placeholder creado (auth + tabs)
- [x] lib/supabase.ts creado con AsyncStorage y AppState listener
- [x] React Native 0.83.1 + React 19.2.4 — instalación limpia sin conflictos
- [x] Cuentas en stores (Google Play $25 ✓ | Apple Developer $99/año ✓) — en verificación
- [x] EXPO_TOKEN configurado en GitHub Actions secrets
- [ ] Migration SQL ejecutada en Supabase (PushSubscription + FCM)
- [ ] Proyecto Expo creado para MUSA (clientas) — apps/client
- [ ] Primera pantalla funcional: login con Google OAuth en MUSA Pro
- [ ] Firebase configurado (FCM)
- [ ] GitHub Actions workflows configurados
- [ ] Primera prueba en iPhone físico con Expo Go

---

*Última actualización: Junio 2026 — codebymelendez.com — v0.3.0 (monorepo migrado: apps/* + packages/*)*
