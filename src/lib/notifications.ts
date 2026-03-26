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

async function sendPushToSubscriptions(
  subscriptions: { id: string; endpoint: string; keys: any }[],
  payload: PushPayload
) {
  const admin = createAdminClient();
  for (const sub of subscriptions) {
    try {
      const keys = typeof sub.keys === 'string' ? JSON.parse(sub.keys) : sub.keys;
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys },
        JSON.stringify(payload)
      );
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await admin.from('PushSubscription').delete().eq('id', sub.id);
      }
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
      .select('id, endpoint, keys')
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
      .select('id, endpoint, keys')
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
      .select('id, pushSubscriptions:PushSubscription(id, endpoint, keys)')
      .eq('businessId', businessId)
      .eq('wantsNotifications', true);

    if (clients) {
      for (const client of clients) {
        const subs = (client as any).pushSubscriptions;
        if (subs && subs.length > 0) {
          await sendPushToSubscriptions(subs, data);
        }
      }
    }
  } catch (error) {
    console.error("[broadcastToBusinessClients]", error);
  }
}
