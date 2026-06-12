export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      Appointment: {
        Row: {
          id: string
          userId: string
          clientId: string
          serviceId: string
          startTime: string
          endTime: string
          status: string
          notes: string | null
          rescheduleToken: string | null
          oldStartTime: string | null
          oldEndTime: string | null
          createdAt: string
          updatedAt: string
          reminderSent: boolean
          businessId: string | null
          businessTimezone: string
          bufferMin: number
          source: string
          reminder24hSentAt: string | null
          reminder2hSentAt: string | null
        }
        Insert: {
          id: string
          userId: string
          clientId: string
          serviceId: string
          startTime: string
          endTime: string
          status?: string
          notes?: string | null
          rescheduleToken?: string | null
          oldStartTime?: string | null
          oldEndTime?: string | null
          createdAt?: string
          updatedAt?: string
          reminderSent?: boolean
          businessId?: string | null
          businessTimezone?: string
          bufferMin?: number
          source?: string
          reminder24hSentAt?: string | null
          reminder2hSentAt?: string | null
        }
        Update: {
          id?: string
          userId?: string
          clientId?: string
          serviceId?: string
          startTime?: string
          endTime?: string
          status?: string
          notes?: string | null
          rescheduleToken?: string | null
          oldStartTime?: string | null
          oldEndTime?: string | null
          createdAt?: string
          updatedAt?: string
          reminderSent?: boolean
          businessId?: string | null
          businessTimezone?: string
          bufferMin?: number
          source?: string
          reminder24hSentAt?: string | null
          reminder2hSentAt?: string | null
        }
        Relationships: []
      }
      AvailabilityBlock: {
        Row: {
          id: string
          userId: string
          businessId: string
          startTime: string
          endTime: string
          isAllDay: boolean
          reason: string | null
          blockType: string
          recurrenceRule: string | null
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id: string
          userId: string
          businessId: string
          startTime: string
          endTime: string
          isAllDay?: boolean
          reason?: string | null
          blockType?: string
          recurrenceRule?: string | null
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          userId?: string
          businessId?: string
          startTime?: string
          endTime?: string
          isAllDay?: boolean
          reason?: string | null
          blockType?: string
          recurrenceRule?: string | null
          createdAt?: string
          updatedAt?: string
        }
        Relationships: []
      }
      Business: {
        Row: {
          id: string
          name: string
          slug: string
          category: string | null
          phone: string | null
          city: string | null
          address: string | null
          planId: string
          currentMonthBookings: number
          createdAt: string
          updatedAt: string
          logoUrl: string | null
          timezone: string
          country: string
          latitude: number | null
          longitude: number | null
          serviceMode: string
          description: string | null
          email: string | null
          website: string | null
          coverUrl: string | null
        }
        Insert: {
          id: string
          name: string
          slug: string
          category?: string | null
          phone?: string | null
          city?: string | null
          address?: string | null
          planId: string
          currentMonthBookings?: number
          createdAt?: string
          updatedAt?: string
          logoUrl?: string | null
          timezone?: string
          country?: string
          latitude?: number | null
          longitude?: number | null
          serviceMode?: string
          description?: string | null
          email?: string | null
          website?: string | null
          coverUrl?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          category?: string | null
          phone?: string | null
          city?: string | null
          address?: string | null
          planId?: string
          currentMonthBookings?: number
          createdAt?: string
          updatedAt?: string
          logoUrl?: string | null
          timezone?: string
          country?: string
          latitude?: number | null
          longitude?: number | null
          serviceMode?: string
          description?: string | null
          email?: string | null
          website?: string | null
          coverUrl?: string | null
        }
        Relationships: []
      }
      BusinessException: {
        Row: {
          id: string
          businessId: string
          date: string
          isClosed: boolean
          openTime: string | null
          closeTime: string | null
          reason: string | null
          createdAt: string
        }
        Insert: {
          id: string
          businessId: string
          date: string
          isClosed?: boolean
          openTime?: string | null
          closeTime?: string | null
          reason?: string | null
          createdAt?: string
        }
        Update: {
          id?: string
          businessId?: string
          date?: string
          isClosed?: boolean
          openTime?: string | null
          closeTime?: string | null
          reason?: string | null
          createdAt?: string
        }
        Relationships: []
      }
      BusinessHours: {
        Row: {
          id: string
          businessId: string
          dayOfWeek: number
          openTime: string
          closeTime: string
          isOpen: boolean
          userId: string | null
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id: string
          businessId: string
          dayOfWeek: number
          openTime: string
          closeTime: string
          isOpen?: boolean
          userId?: string | null
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          businessId?: string
          dayOfWeek?: number
          openTime?: string
          closeTime?: string
          isOpen?: boolean
          userId?: string | null
          createdAt?: string
          updatedAt?: string
        }
        Relationships: []
      }
      BusinessPhoto: {
        Row: {
          id: string
          businessId: string
          url: string
          type: string
          sortOrder: number
          createdAt: string
        }
        Insert: {
          id: string
          businessId: string
          url: string
          type?: string
          sortOrder?: number
          createdAt?: string
        }
        Update: {
          id?: string
          businessId?: string
          url?: string
          type?: string
          sortOrder?: number
          createdAt?: string
        }
        Relationships: []
      }
      Client: {
        Row: {
          id: string
          businessId: string | null
          userId: string | null
          name: string
          phone: string
          email: string | null
          notes: string | null
          wantsNotifications: boolean
          createdAt: string
          updatedAt: string
          isActive: boolean
          preferences: string | null
          birthday: string | null
          tags: Json | null
        }
        Insert: {
          id: string
          businessId?: string | null
          userId?: string | null
          name: string
          phone: string
          email?: string | null
          notes?: string | null
          wantsNotifications?: boolean
          createdAt?: string
          updatedAt?: string
          isActive?: boolean
          preferences?: string | null
          birthday?: string | null
          tags?: Json | null
        }
        Update: {
          id?: string
          businessId?: string | null
          userId?: string | null
          name?: string
          phone?: string
          email?: string | null
          notes?: string | null
          wantsNotifications?: boolean
          createdAt?: string
          updatedAt?: string
          isActive?: boolean
          preferences?: string | null
          birthday?: string | null
          tags?: Json | null
        }
        Relationships: []
      }
      ClientLoyaltyAccount: {
        Row: {
          id: string
          businessId: string
          clientId: string
          programId: string
          totalPoints: number
          lifetimePoints: number
          qrToken: string
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id: string
          businessId: string
          clientId: string
          programId: string
          totalPoints?: number
          lifetimePoints?: number
          qrToken?: string
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          businessId?: string
          clientId?: string
          programId?: string
          totalPoints?: number
          lifetimePoints?: number
          qrToken?: string
          createdAt?: string
          updatedAt?: string
        }
        Relationships: []
      }
      Invitation: {
        Row: {
          id: string
          businessId: string
          token: string
          code: string
          role: string
          expiresAt: string | null
          usedAt: string | null
          createdAt: string
          email: string | null
        }
        Insert: {
          id: string
          businessId: string
          token: string
          code: string
          role?: string
          expiresAt?: string | null
          usedAt?: string | null
          createdAt?: string
          email?: string | null
        }
        Update: {
          id?: string
          businessId?: string
          token?: string
          code?: string
          role?: string
          expiresAt?: string | null
          usedAt?: string | null
          createdAt?: string
          email?: string | null
        }
        Relationships: []
      }
      LoyaltyProgram: {
        Row: {
          id: string
          businessId: string
          name: string
          isActive: boolean
          accumulationType: string
          pointsPerVisit: number
          rewardThreshold: number
          rewardDescription: string
          validUntil: string | null
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id: string
          businessId: string
          name?: string
          isActive?: boolean
          accumulationType?: string
          pointsPerVisit?: number
          rewardThreshold?: number
          rewardDescription?: string
          validUntil?: string | null
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          businessId?: string
          name?: string
          isActive?: boolean
          accumulationType?: string
          pointsPerVisit?: number
          rewardThreshold?: number
          rewardDescription?: string
          validUntil?: string | null
          createdAt?: string
          updatedAt?: string
        }
        Relationships: []
      }
      LoyaltyRedemption: {
        Row: {
          id: string
          accountId: string
          transactionId: string
          businessId: string
          clientId: string
          pointsUsed: number
          rewardDescription: string
          redeemedBy: string | null
          redeemedAt: string
        }
        Insert: {
          id: string
          accountId: string
          transactionId: string
          businessId: string
          clientId: string
          pointsUsed: number
          rewardDescription: string
          redeemedBy?: string | null
          redeemedAt?: string
        }
        Update: {
          id?: string
          accountId?: string
          transactionId?: string
          businessId?: string
          clientId?: string
          pointsUsed?: number
          rewardDescription?: string
          redeemedBy?: string | null
          redeemedAt?: string
        }
        Relationships: []
      }
      LoyaltyTransaction: {
        Row: {
          id: string
          accountId: string
          businessId: string
          clientId: string
          appointmentId: string | null
          pointsDelta: number
          transactionType: string
          notes: string | null
          createdBy: string | null
          createdAt: string
        }
        Insert: {
          id: string
          accountId: string
          businessId: string
          clientId: string
          appointmentId?: string | null
          pointsDelta: number
          transactionType: string
          notes?: string | null
          createdBy?: string | null
          createdAt?: string
        }
        Update: {
          id?: string
          accountId?: string
          businessId?: string
          clientId?: string
          appointmentId?: string | null
          pointsDelta?: number
          transactionType?: string
          notes?: string | null
          createdBy?: string | null
          createdAt?: string
        }
        Relationships: []
      }
      Notification: {
        Row: {
          id: string
          userId: string | null
          clientId: string | null
          appointmentId: string | null
          type: string | null
          title: string
          body: string
          url: string | null
          data: Json | null
          read: boolean
          readAt: string | null
          createdAt: string
        }
        Insert: {
          id: string
          userId?: string | null
          clientId?: string | null
          appointmentId?: string | null
          type?: string | null
          title: string
          body: string
          url?: string | null
          data?: Json | null
          read?: boolean
          readAt?: string | null
          createdAt?: string
        }
        Update: {
          id?: string
          userId?: string | null
          clientId?: string | null
          appointmentId?: string | null
          type?: string | null
          title?: string
          body?: string
          url?: string | null
          data?: Json | null
          read?: boolean
          readAt?: string | null
          createdAt?: string
        }
        Relationships: []
      }
      PasswordResetToken: {
        Row: {
          id: string
          userId: string
          token: string
          expiresAt: string
          usedAt: string | null
          createdAt: string
        }
        Insert: {
          id: string
          userId: string
          token: string
          expiresAt: string
          usedAt?: string | null
          createdAt?: string
        }
        Update: {
          id?: string
          userId?: string
          token?: string
          expiresAt?: string
          usedAt?: string | null
          createdAt?: string
        }
        Relationships: []
      }
      Payment: {
        Row: {
          id: string
          appointmentId: string
          amount: number
          currency: string
          method: string
          isPaid: boolean
          paidAt: string | null
          notes: string | null
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id: string
          appointmentId: string
          amount: number
          currency?: string
          method?: string
          isPaid?: boolean
          paidAt?: string | null
          notes?: string | null
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          appointmentId?: string
          amount?: number
          currency?: string
          method?: string
          isPaid?: boolean
          paidAt?: string | null
          notes?: string | null
          createdAt?: string
          updatedAt?: string
        }
        Relationships: []
      }
      Plan: {
        Row: {
          id: string
          name: string
          price: number
          currency: string
          limits: Json
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id: string
          name: string
          price: number
          currency?: string
          limits: Json
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          name?: string
          price?: number
          currency?: string
          limits?: Json
          createdAt?: string
          updatedAt?: string
        }
        Relationships: []
      }
      ProfessionalSettings: {
        Row: {
          id: string
          userId: string
          workDays: string
          startHour: number
          endHour: number
          slotDuration: number
          currency: string
          bookingEnabled: boolean
          createdAt: string
          updatedAt: string
          paymentMethods: string | null
        }
        Insert: {
          id: string
          userId: string
          workDays?: string
          startHour?: number
          endHour?: number
          slotDuration?: number
          currency?: string
          bookingEnabled?: boolean
          createdAt?: string
          updatedAt?: string
          paymentMethods?: string | null
        }
        Update: {
          id?: string
          userId?: string
          workDays?: string
          startHour?: number
          endHour?: number
          slotDuration?: number
          currency?: string
          bookingEnabled?: boolean
          createdAt?: string
          updatedAt?: string
          paymentMethods?: string | null
        }
        Relationships: []
      }
      Promotion: {
        Row: {
          id: string
          businessId: string
          title: string
          description: string
          discount: number
          validFrom: string
          validUntil: string
          targetUserId: string | null
          isActive: boolean
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id: string
          businessId: string
          title: string
          description: string
          discount: number
          validFrom: string
          validUntil: string
          targetUserId?: string | null
          isActive?: boolean
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          businessId?: string
          title?: string
          description?: string
          discount?: number
          validFrom?: string
          validUntil?: string
          targetUserId?: string | null
          isActive?: boolean
          createdAt?: string
          updatedAt?: string
        }
        Relationships: []
      }
      PushSubscription: {
        Row: {
          id: string
          userId: string | null
          clientId: string | null
          endpoint: string | null
          keys: Json | null
          userAgent: string | null
          createdAt: string
          platform: string
          fcmToken: string | null
          appVersion: string | null
          deviceModel: string | null
        }
        Insert: {
          id: string
          userId?: string | null
          clientId?: string | null
          endpoint?: string | null
          keys?: Json | null
          userAgent?: string | null
          createdAt?: string
          platform?: string
          fcmToken?: string | null
          appVersion?: string | null
          deviceModel?: string | null
        }
        Update: {
          id?: string
          userId?: string | null
          clientId?: string | null
          endpoint?: string | null
          keys?: Json | null
          userAgent?: string | null
          createdAt?: string
          platform?: string
          fcmToken?: string | null
          appVersion?: string | null
          deviceModel?: string | null
        }
        Relationships: []
      }
      Service: {
        Row: {
          id: string
          userId: string | null
          businessId: string | null
          name: string
          description: string | null
          category: string
          durationMin: number
          price: number
          currency: string
          isActive: boolean
          createdAt: string
          updatedAt: string
          imageUrl: string | null
          bufferMin: number
          maxAdvanceDays: number
        }
        Insert: {
          id: string
          userId?: string | null
          businessId?: string | null
          name: string
          description?: string | null
          category: string
          durationMin: number
          price: number
          currency?: string
          isActive?: boolean
          createdAt?: string
          updatedAt?: string
          imageUrl?: string | null
          bufferMin?: number
          maxAdvanceDays?: number
        }
        Update: {
          id?: string
          userId?: string | null
          businessId?: string | null
          name?: string
          description?: string | null
          category?: string
          durationMin?: number
          price?: number
          currency?: string
          isActive?: boolean
          createdAt?: string
          updatedAt?: string
          imageUrl?: string | null
          bufferMin?: number
          maxAdvanceDays?: number
        }
        Relationships: []
      }
      User: {
        Row: {
          id: string
          phone: string | null
          email: string | null
          name: string
          passwordHash: string | null
          slug: string
          businessId: string | null
          serviceType: string | null
          bio: string | null
          avatarUrl: string | null
          whatsapp: string | null
          instagram: string | null
          onboardingDone: boolean
          createdAt: string
          updatedAt: string
          appRole: string
        }
        Insert: {
          id: string
          phone?: string | null
          email?: string | null
          name: string
          passwordHash?: string | null
          slug: string
          businessId?: string | null
          serviceType?: string | null
          bio?: string | null
          avatarUrl?: string | null
          whatsapp?: string | null
          instagram?: string | null
          onboardingDone?: boolean
          createdAt?: string
          updatedAt?: string
          appRole?: string
        }
        Update: {
          id?: string
          phone?: string | null
          email?: string | null
          name?: string
          passwordHash?: string | null
          slug?: string
          businessId?: string | null
          serviceType?: string | null
          bio?: string | null
          avatarUrl?: string | null
          whatsapp?: string | null
          instagram?: string | null
          onboardingDone?: boolean
          createdAt?: string
          updatedAt?: string
          appRole?: string
        }
        Relationships: []
      }
      WhatsappRateLimit: {
        Row: {
          id: string
          phone: string
          attempts: number
          window_start: string
        }
        Insert: {
          id?: string
          phone: string
          attempts?: number
          window_start?: string
        }
        Update: {
          id?: string
          phone?: string
          attempts?: number
          window_start?: string
        }
        Relationships: []
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : keyof (PublicSchema["Tables"] & PublicSchema["Views"]) = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : keyof PublicSchema["Tables"] = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : keyof PublicSchema["Tables"] = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : keyof PublicSchema["Enums"] = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : keyof PublicSchema["CompositeTypes"] = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
