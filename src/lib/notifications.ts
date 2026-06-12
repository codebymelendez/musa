import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase-admin";

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || "";
const vapidEmail = process.env.VAPID_EMAIL || "mailto:soporte@musa.app";

if (publicVapidKey && privateVapidKey) {
  webpush.setVapidDetails(vapidEmail, publicVapidKey, privateVapidKey);
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  appointmentId?: string;
  actions?: { action: string; title: string }[];
}

interface PushSubscriptionRow {
  id: string;
  endpoint: string | null;
  keys: { p256dh: string; auth: string } | string | null;
  platform?: string | null;
  fcmToken?: string | null;
}

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_BATCH_SIZE = 100; // límite de mensajes por request de la API de Expo

async function sendPushToSubscriptions(
  subscriptions: PushSubscriptionRow[],
  payload: PushPayload
) {
  const admin = createAdminClient();

  const expoSubs: PushSubscriptionRow[] = [];
  const webSubs: PushSubscriptionRow[] = [];
  for (const sub of subscriptions) {
    if (sub.fcmToken && sub.fcmToken.startsWith("ExponentPushToken")) {
      expoSubs.push(sub);
    } else {
      webSubs.push(sub);
    }
  }

  // ── Web Push (navegadores) ──────────────────────────────────────────────
  for (const sub of webSubs) {
    if (!sub.endpoint) continue;
    try {
      const keys = typeof sub.keys === 'string' ? JSON.parse(sub.keys) : sub.keys;
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys },
        JSON.stringify(payload)
      );
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 410 || statusCode === 404) {
        await admin.from('PushSubscription').delete().eq('id', sub.id);
      }
    }
  }

  // ── Expo Push (apps móviles) ────────────────────────────────────────────
  for (let i = 0; i < expoSubs.length; i += EXPO_BATCH_SIZE) {
    const batch = expoSubs.slice(i, i + EXPO_BATCH_SIZE);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          batch.map((sub) => ({
            to: sub.fcmToken,
            title: payload.title,
            body: payload.body,
            data: { url: payload.url, appointmentId: payload.appointmentId },
            sound: "default",
          }))
        ),
      });
      const json = await res.json().catch(() => null);
      // Los tickets vienen en el mismo orden que los mensajes enviados
      const tickets: { status?: string; details?: { error?: string } }[] =
        Array.isArray(json?.data) ? json.data : [];
      for (let j = 0; j < tickets.length; j++) {
        const ticket = tickets[j];
        if (
          ticket?.status === "error" &&
          ticket?.details?.error === "DeviceNotRegistered"
        ) {
          await admin.from('PushSubscription').delete().eq('id', batch[j].id);
        }
      }
    } catch (err) {
      console.error("[sendPushToSubscriptions] Expo push error:", err);
    }
  }
}

// ── Notificar a un profesional (staff/owner) ──────────────────────────────────
export async function sendNotification(
  userId: string,
  data: PushPayload
) {
  try {
    const admin = createAdminClient();
    const { data: localNotification } = await admin
      .from('Notification')
      .insert({
        userId,
        title: data.title,
        body: data.body,
        url: data.url,
        data: data.appointmentId ? { appointmentId: data.appointmentId } : undefined,
      })
      .select()
      .single();

    const { data: subscriptions } = await admin
      .from('PushSubscription')
      .select('id, endpoint, keys, platform, fcmToken')
      .eq('userId', userId);

    if (subscriptions) {
      await sendPushToSubscriptions(subscriptions, data);
    }
    return localNotification;
  } catch (error) {
    console.error("[sendNotification]", error);
  }
}

// ── Notificar a una clienta ───────────────────────────────────────────────────
export async function sendClientNotification(
  clientId: string,
  data: PushPayload
) {
  try {
    const admin = createAdminClient();
    const { data: localNotification } = await admin
      .from('Notification')
      .insert({
        clientId,
        title: data.title,
        body: data.body,
        url: data.url,
        data: data.appointmentId ? { appointmentId: data.appointmentId } : undefined,
      })
      .select()
      .single();

    const { data: subscriptions } = await admin
      .from('PushSubscription')
      .select('id, endpoint, keys, platform, fcmToken')
      .eq('clientId', clientId);

    if (subscriptions) {
      await sendPushToSubscriptions(subscriptions, data);
    }
    return localNotification;
  } catch (error) {
    console.error("[sendClientNotification]", error);
  }
}

// ── Broadcast a todas las clientas de un negocio ─────────────────────────────
export async function broadcastToBusinessClients(
  businessId: string,
  data: PushPayload
) {
  try {
    const admin = createAdminClient();
    const { data: clients } = await admin
      .from('Client')
      .select('id, pushSubscriptions:PushSubscription(id, endpoint, keys, platform, fcmToken)')
      .eq('businessId', businessId)
      .eq('wantsNotifications', true);

    if (clients) {
      for (const client of clients) {
        // Crear notificación en base de datos para la campana
        await admin.from('Notification').insert({
          clientId: client.id,
          title: data.title,
          body: data.body,
          url: data.url,
          type: "PROMOTION",
        });

        const subs = (client as { pushSubscriptions?: PushSubscriptionRow[] }).pushSubscriptions;
        if (subs && subs.length > 0) {
          await sendPushToSubscriptions(subs, data);
        }
      }
    }
  } catch (error) {
    console.error("[broadcastToBusinessClients]", error);
  }
}
