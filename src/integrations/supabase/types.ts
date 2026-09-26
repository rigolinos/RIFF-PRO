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
      profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string
          phone: string | null
          email: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          state: string | null
          role: 'professional' | 'student'
          professional_type: string | null
          credential_type: string | null
          credential_number: string | null
          credential_verified: boolean
          specialties: string[] | null
          experience_years: number | null
          public_slug: string | null
          instagram_handle: string | null
          whatsapp_number: string | null
          pix_key: string | null
          pix_key_type: string | null
          rating_avg: number
          total_reviews: number
          total_sessions_given: number
          total_students_served: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name?: string
          phone?: string | null
          email?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          state?: string | null
          role?: 'professional' | 'student'
          professional_type?: string | null
          credential_type?: string | null
          credential_number?: string | null
          credential_verified?: boolean
          specialties?: string[] | null
          experience_years?: number | null
          public_slug?: string | null
          instagram_handle?: string | null
          whatsapp_number?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          rating_avg?: number
          total_reviews?: number
          total_sessions_given?: number
          total_students_served?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string
          phone?: string | null
          email?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          state?: string | null
          role?: 'professional' | 'student'
          professional_type?: string | null
          credential_type?: string | null
          credential_number?: string | null
          credential_verified?: boolean
          specialties?: string[] | null
          experience_years?: number | null
          public_slug?: string | null
          instagram_handle?: string | null
          whatsapp_number?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          rating_avg?: number
          total_reviews?: number
          total_sessions_given?: number
          total_students_served?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          icon: string | null
          emoji: string | null
          parent_id: string | null
          sort_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          icon?: string | null
          emoji?: string | null
          parent_id?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          icon?: string | null
          emoji?: string | null
          parent_id?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      sessions: {
        Row: {
          id: string
          professional_id: string
          category_id: string
          title: string
          description: string | null
          session_type: 'individual' | 'group'
          date: string
          start_time: string
          end_time: string | null
          duration_minutes: number
          location_name: string
          location_address: string | null
          latitude: number | null
          longitude: number | null
          location_type: string | null
          max_participants: number
          current_participants: number
          price_per_slot: number
          status: 'active' | 'full' | 'cancelled' | 'completed' | 'draft'
          cover_image_url: string | null
          what_to_bring: string | null
          skill_level: 'beginner' | 'intermediate' | 'advanced' | 'all'
          is_recurring: boolean
          recurrence_rule: string | null
          parent_session_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          professional_id: string
          category_id: string
          title: string
          description?: string | null
          session_type?: 'individual' | 'group'
          date: string
          start_time: string
          end_time?: string | null
          duration_minutes?: number
          location_name: string
          location_address?: string | null
          latitude?: number | null
          longitude?: number | null
          location_type?: string | null
          max_participants?: number
          current_participants?: number
          price_per_slot: number
          status?: 'active' | 'full' | 'cancelled' | 'completed' | 'draft'
          cover_image_url?: string | null
          what_to_bring?: string | null
          skill_level?: 'beginner' | 'intermediate' | 'advanced' | 'all'
          is_recurring?: boolean
          recurrence_rule?: string | null
          parent_session_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          professional_id?: string
          category_id?: string
          title?: string
          description?: string | null
          session_type?: 'individual' | 'group'
          date?: string
          start_time?: string
          end_time?: string | null
          duration_minutes?: number
          location_name?: string
          location_address?: string | null
          latitude?: number | null
          longitude?: number | null
          location_type?: string | null
          max_participants?: number
          current_participants?: number
          price_per_slot?: number
          status?: 'active' | 'full' | 'cancelled' | 'completed' | 'draft'
          cover_image_url?: string | null
          what_to_bring?: string | null
          skill_level?: 'beginner' | 'intermediate' | 'advanced' | 'all'
          is_recurring?: boolean
          recurrence_rule?: string | null
          parent_session_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      bookings: {
        Row: {
          id: string
          session_id: string
          student_id: string
          professional_id: string
          status: string
          amount_total: number
          platform_fee: number
          professional_payout: number | null
          payment_method: string
          payment_status: string
          payment_confirmed_at: string | null
          checked_in: boolean
          checked_in_at: string | null
          cancelled_at: string | null
          cancellation_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          student_id: string
          professional_id: string
          status?: string
          amount_total: number
          platform_fee?: number
          professional_payout?: number | null
          payment_method?: string
          payment_status?: string
          payment_confirmed_at?: string | null
          checked_in?: boolean
          checked_in_at?: string | null
          cancelled_at?: string | null
          cancellation_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          student_id?: string
          professional_id?: string
          status?: string
          amount_total?: number
          platform_fee?: number
          professional_payout?: number | null
          payment_method?: string
          payment_status?: string
          payment_confirmed_at?: string | null
          checked_in?: boolean
          checked_in_at?: string | null
          cancelled_at?: string | null
          cancellation_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
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
          {
            foreignKeyName: "bookings_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      reviews: {
        Row: {
          id: string
          booking_id: string
          session_id: string
          reviewer_id: string
          professional_id: string
          rating: number
          comment: string | null
          tags: string[] | null
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          session_id: string
          reviewer_id: string
          professional_id: string
          rating: number
          comment?: string | null
          tags?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          session_id?: string
          reviewer_id?: string
          professional_id?: string
          rating?: number
          comment?: string | null
          tags?: string[] | null
          created_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string
          data: Json | null
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          message: string
          data?: Json | null
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          message?: string
          data?: Json | null
          read?: boolean
          created_at?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          id: string
          student_id: string
          professional_id: string
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          professional_id: string
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          professional_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_booking: {
        Args: { p_session_id: string; p_student_user_id: string }
        Returns: Json
      }
      calculate_professional_rating: {
        Args: { pro_id: string }
        Returns: number
      }
      get_professional_dashboard: {
        Args: { p_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types
type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]
