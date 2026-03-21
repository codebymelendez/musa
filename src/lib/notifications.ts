import webpush from "web-push";
import { prisma } from "@/lib/prisma";

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || "";

if (publicVapidKey && privateVapidKey) {
  webpush.setVapidDetails(
    "mailto:soporte@musa.com",
    publicVapidKey,
    privateVapidKey
  );
}

export async function sendNotification(userId: string, data: { title: string; body: string; url?: string }) {
  try {
    // 1. Guardar en base de datos (notificación interna)
    const localNotification = await prisma.notification.create({
      data: {
        userId,
        title: data.title,
        body: data.body,
        url: data.url,
      },
    });

    // 2. Intentar enviar Push Notification si tiene suscripción
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    for (const sub of subscriptions) {
      try {
        const pushConfig = {
          endpoint: sub.endpoint,
          keys: JSON.parse(sub.keys as string),
        };

        await webpush.sendNotification(
          pushConfig,
          JSON.stringify({
            title: data.title,
            body: data.body,
            url: data.url,
          })
        );
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Suscripción inválida o expirada, eliminarla
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
      }
    }

    return localNotification;
  } catch (error) {
    console.error("[sendNotification]", error);
  }
}
