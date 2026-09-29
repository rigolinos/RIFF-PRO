export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      booking_private_notes: {
        Row: {
          booking_id: string
          note: string | null
          professional_id: string
        }
        Insert: {
          booking_id: string
          note?: string | null
          professional_id: string
        }
        Update: {
          booking_id?: string
          note?: string | null
          professional_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_private_notes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_private_notes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          amount_total: number
          cancellation_reason: string | null
          cancelled_at: string | null
          checked_in: boolean | null
          checked_in_at: string | null
          created_at: string | null
          id: string
          payment_confirmed_at: string | null
          payment_method: string | null
          payment_status: string | null
          platform_fee: number | null
          professional_id: string
          professional_payout: number | null
          session_id: string
          status: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          amount_total: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          checked_in?: boolean | null
          checked_in_at?: string | null
          created_at?: string | null
          id?: string
          payment_confirmed_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          platform_fee?: number | null
          professional_id: string
          professional_payout?: number | null
          session_id: string
          status?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          amount_total?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          checked_in?: boolean | null
          checked_in_at?: string | null
          created_at?: string | null
          id?: string
          payment_confirmed_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          platform_fee?: number | null
          professional_id?: string
          professional_payout?: number | null
          session_id?: string
          status?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          emoji: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          emoji?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          emoji?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string | null
          id: string
          professional_id: string
          student_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          professional_id: string
          student_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          professional_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_private: {
        Row: {
          created_at: string | null
          credential_number: string | null
          email: string | null
          phone: string | null
          pix_key: string | null
          pix_key_type: string | null
          profile_id: string
          updated_at: string | null
          whatsapp_number: string | null
        }
        Insert: {
          created_at?: string | null
          credential_number?: string | null
          email?: string | null
          phone?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          profile_id: string
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          created_at?: string | null
          credential_number?: string | null
          email?: string | null
          phone?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          profile_id?: string
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_private_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string | null
          credential_number: string | null
          credential_type: string | null
          credential_verified: boolean | null
          experience_years: number | null
          full_name: string
          id: string
          instagram_handle: string | null
          professional_type: string | null
          public_slug: string | null
          rating_avg: number | null
          role: string
          specialties: string[] | null
          state: string | null
          total_reviews: number | null
          total_sessions_given: number | null
          total_students_served: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          credential_number?: string | null
          credential_type?: string | null
          credential_verified?: boolean | null
          experience_years?: number | null
          full_name?: string
          id?: string
          instagram_handle?: string | null
          professional_type?: string | null
          public_slug?: string | null
          rating_avg?: number | null
          role?: string
          specialties?: string[] | null
          state?: string | null
          total_reviews?: number | null
          total_sessions_given?: number | null
          total_students_served?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          credential_number?: string | null
          credential_type?: string | null
          credential_verified?: boolean | null
          experience_years?: number | null
          full_name?: string
          id?: string
          instagram_handle?: string | null
          professional_type?: string | null
          public_slug?: string | null
          rating_avg?: number | null
          role?: string
          specialties?: string[] | null
          state?: string | null
          total_reviews?: number | null
          total_sessions_given?: number | null
          total_students_served?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string
          comment: string | null
          created_at: string | null
          id: string
          professional_id: string
          rating: number
          reviewer_id: string
          session_id: string
          tags: string[] | null
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string | null
          id?: string
          professional_id: string
          rating: number
          reviewer_id: string
          session_id: string
          tags?: string[] | null
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string | null
          id?: string
          professional_id?: string
          rating?: number
          reviewer_id?: string
          session_id?: string
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_reports: {
        Row: {
          auto_closed: boolean
          closed_at: string
          happened: boolean
          private_notes: string | null
          session_id: string
        }
        Insert: {
          auto_closed?: boolean
          closed_at?: string
          happened?: boolean
          private_notes?: string | null
          session_id: string
        }
        Update: {
          auto_closed?: boolean
          closed_at?: string
          happened?: boolean
          private_notes?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_reports_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          category_id: string
          cover_image_url: string | null
          created_at: string | null
          current_participants: number | null
          date: string
          description: string | null
          duration_minutes: number | null
          end_time: string | null
          id: string
          is_recurring: boolean | null
          latitude: number | null
          location_address: string | null
          location_name: string
          location_type: string | null
          longitude: number | null
          max_participants: number | null
          parent_session_id: string | null
          price_per_slot: number
          professional_id: string
          recurrence_rule: string | null
          session_type: string
          skill_level: string | null
          start_time: string
          status: string | null
          title: string
          updated_at: string | null
          what_to_bring: string | null
        }
        Insert: {
          category_id: string
          cover_image_url?: string | null
          created_at?: string | null
          current_participants?: number | null
          date: string
          description?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          is_recurring?: boolean | null
          latitude?: number | null
          location_address?: string | null
          location_name: string
          location_type?: string | null
          longitude?: number | null
          max_participants?: number | null
          parent_session_id?: string | null
          price_per_slot: number
          professional_id: string
          recurrence_rule?: string | null
          session_type?: string
          skill_level?: string | null
          start_time: string
          status?: string | null
          title: string
          updated_at?: string | null
          what_to_bring?: string | null
        }
        Update: {
          category_id?: string
          cover_image_url?: string | null
          created_at?: string | null
          current_participants?: number | null
          date?: string
          description?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          is_recurring?: boolean | null
          latitude?: number | null
          location_address?: string | null
          location_name?: string
          location_type?: string | null
          longitude?: number | null
          max_participants?: number | null
          parent_session_id?: string | null
          price_per_slot?: number
          professional_id?: string
          recurrence_rule?: string | null
          session_type?: string
          skill_level?: string | null
          start_time?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          what_to_bring?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_parent_session_id_fkey"
            columns: ["parent_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _profile_id: { Args: never; Returns: string }
      calculate_professional_rating: {
        Args: { pro_id: string }
        Returns: number
      }
      cancel_session: {
        Args: { p_reason?: string; p_session_id: string }
        Returns: undefined
      }
      close_session: {
        Args: {
          p_attendance: Json
          p_happened?: boolean
          p_notes?: string
          p_session_id: string
        }
        Returns: undefined
      }
      create_booking: { Args: { p_session_id: string }; Returns: Json }
      delete_user_account: { Args: never; Returns: undefined }
      get_booking_payment_info: {
        Args: { p_booking_id: string }
        Returns: Json
      }
      get_professional_dashboard: { Args: never; Returns: Json }
      job_auto_close_expired_sessions: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
