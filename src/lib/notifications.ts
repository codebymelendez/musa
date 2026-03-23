import webpush from "web-push";
import { prisma } from "@/lib/prisma";

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
  subscriptions: { id: string; endpoint: string; keys: unknown }[],
  payload: PushPayload
) {
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: JSON.parse(sub.keys as string) },
        JSON.stringify(payload)
      );
    } catch (err: unknown) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 410 || status === 404) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } });
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
    const localNotification = await prisma.notification.create({
      data: {
        userId,
        title: data.title,
        body: data.body,
        url: data.url,
        data: data.appointmentId ? { appointmentId: data.appointmentId } : undefined,
      },
    });

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    await sendPushToSubscriptions(subscriptions, data);
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
    const localNotification = await prisma.notification.create({
      data: {
        clientId,
        title: data.title,
        body: data.body,
        url: data.url,
        data: data.appointmentId ? { appointmentId: data.appointmentId } : undefined,
      },
    });

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { clientId },
    });

    await sendPushToSubscriptions(subscriptions, data);
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
    const clients = await prisma.client.findMany({
      where: { businessId, wantsNotifications: true },
      include: { pushSubscriptions: true },
    });

    for (const client of clients) {
      if (client.pushSubscriptions.length > 0) {
        await sendPushToSubscriptions(client.pushSubscriptions, data);
      }
    }
  } catch (error) {
    console.error("[broadcastToBusinessClients]", error);
  }
}
