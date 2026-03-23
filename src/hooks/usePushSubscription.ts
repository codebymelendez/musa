"use client";

import { useEffect, useState, useCallback } from "react";

type SubscribeEndpoint = "/api/notifications/subscribe" | "/api/push/subscribe-client";

interface UsePushSubscriptionOptions {
  /** Para staff autenticado usa '/api/notifications/subscribe', para clientas '/api/push/subscribe-client' */
  endpoint: SubscribeEndpoint;
  /** Solo para clientas: el clientId devuelto por el book API */
  clientId?: string;
  /** Activar automáticamente al montar (útil en dashboard de staff) */
  autoSubscribe?: boolean;
}

export function usePushSubscription({
  endpoint,
  clientId,
  autoSubscribe = false,
}: UsePushSubscriptionOptions) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
      if (Notification.permission === "granted") setSubscribed(true);
    }
  }, []);

  const subscribe = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setError("Tu navegador no soporta notificaciones push");
        return false;
      }

      const registration = await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      setPermission(permission);
      if (permission !== "granted") {
        setError("Permiso de notificaciones denegado");
        return false;
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        setError("Configuración de push incompleta");
        return false;
      }

      // Convertir VAPID key de base64 a Uint8Array
      const urlBase64ToUint8Array = (base64String: string) => {
        const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
        const rawData = window.atob(base64);
        return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
      };

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const { endpoint: subEndpoint, keys } = subscription.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      const body =
        endpoint === "/api/push/subscribe-client"
          ? { clientId, subscription: { endpoint: subEndpoint, keys } }
          : { subscription: { endpoint: subEndpoint, keys } };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Error al activar notificaciones");
        return false;
      }

      setSubscribed(true);
      return true;
    } catch (err) {
      console.error("[usePushSubscription]", err);
      setError("Error inesperado al activar notificaciones");
      return false;
    } finally {
      setLoading(false);
    }
  }, [endpoint, clientId]);

  useEffect(() => {
    if (autoSubscribe && permission === "default") {
      subscribe();
    }
  }, [autoSubscribe, permission, subscribe]);

  return { permission, subscribed, loading, error, subscribe };
}
