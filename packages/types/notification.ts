export interface Notification {
  id: string
  userId: string | null
  clientId: string | null
  appointmentId: string | null
  type: string | null
  title: string
  body: string
  url: string | null
  data: Record<string, unknown> | null
  read: boolean
  readAt: string | null
  createdAt: string
}

export interface PushSubscription {
  id: string
  userId: string | null
  clientId: string | null
  endpoint: string | null
  keys: Record<string, string> | null
  userAgent: string | null
  platform: 'web' | 'ios' | 'android'
  fcmToken: string | null
  appVersion: string | null
  deviceModel: string | null
  createdAt: string
}
