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
      activity_results: {
        Row: {
          booking_id: string | null
          details: Json
          id: string
          position: number | null
          recorded_at: string
          recorded_by: string | null
          score: number | null
          session_id: string
          team: string | null
        }
        Insert: {
          booking_id?: string | null
          details?: Json
          id?: string
          position?: number | null
          recorded_at?: string
          recorded_by?: string | null
          score?: number | null
          session_id: string
          team?: string | null
        }
        Update: {
          booking_id?: string | null
          details?: Json
          id?: string
          position?: number | null
          recorded_at?: string
          recorded_by?: string | null
          score?: number | null
          session_id?: string
          team?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_results_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_results_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
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
          attendance_recorded_at: string | null
          attendance_recorded_by: string | null
          attendance_status: string | null
          attribution: Json
          cancellation_reason: string | null
          cancelled_at: string | null
          checked_in: boolean | null
          checked_in_at: string | null
          created_at: string | null
          dependent_id: string | null
          id: string
          payment_confirmed_at: string | null
          payment_method: string | null
          payment_status: string | null
          platform_fee: number | null
          product: string
          professional_id: string
          professional_payout: number | null
          session_id: string
          source: string | null
          status: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          amount_total: number
          attendance_recorded_at?: string | null
          attendance_recorded_by?: string | null
          attendance_status?: string | null
          attribution?: Json
          cancellation_reason?: string | null
          cancelled_at?: string | null
          checked_in?: boolean | null
          checked_in_at?: string | null
          created_at?: string | null
          dependent_id?: string | null
          id?: string
          payment_confirmed_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          platform_fee?: number | null
          product?: string
          professional_id: string
          professional_payout?: number | null
          session_id: string
          source?: string | null
          status?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          amount_total?: number
          attendance_recorded_at?: string | null
          attendance_recorded_by?: string | null
          attendance_status?: string | null
          attribution?: Json
          cancellation_reason?: string | null
          cancelled_at?: string | null
          checked_in?: boolean | null
          checked_in_at?: string | null
          created_at?: string | null
          dependent_id?: string | null
          id?: string
          payment_confirmed_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          platform_fee?: number | null
          product?: string
          professional_id?: string
          professional_payout?: number | null
          session_id?: string
          source?: string | null
          status?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_attendance_recorded_by_fkey"
            columns: ["attendance_recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_dependent_id_fkey"
            columns: ["dependent_id"]
            isOneToOne: false
            referencedRelation: "dependents"
            referencedColumns: ["id"]
          },
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
      dependents: {
        Row: {
          birth_date: string | null
          consent_version: string
          consented_at: string
          created_at: string
          full_name: string | null
          guardian_id: string
          id: string
          relationship: string
          removed_at: string | null
        }
        Insert: {
          birth_date?: string | null
          consent_version: string
          consented_at?: string
          created_at?: string
          full_name?: string | null
          guardian_id: string
          id?: string
          relationship: string
          removed_at?: string | null
        }
        Update: {
          birth_date?: string | null
          consent_version?: string
          consented_at?: string
          created_at?: string
          full_name?: string | null
          guardian_id?: string
          id?: string
          relationship?: string
          removed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dependents_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      game_kudos: {
        Row: {
          created_at: string
          giver_id: string
          id: string
          receiver_id: string
          session_id: string
          tag: string
        }
        Insert: {
          created_at?: string
          giver_id: string
          id?: string
          receiver_id: string
          session_id: string
          tag: string
        }
        Update: {
          created_at?: string
          giver_id?: string
          id?: string
          receiver_id?: string
          session_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_kudos_giver_id_fkey"
            columns: ["giver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_kudos_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_kudos_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      game_reviews: {
        Row: {
          created_at: string
          id: string
          reviewer_id: string
          session_id: string
          vibe: number
        }
        Insert: {
          created_at?: string
          id?: string
          reviewer_id: string
          session_id: string
          vibe: number
        }
        Update: {
          created_at?: string
          id?: string
          reviewer_id?: string
          session_id?: string
          vibe?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_reviews_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_acceptances: {
        Row: {
          accepted_at: string
          document: string
          id: string
          profile_id: string
          user_agent: string | null
          version: string
        }
        Insert: {
          accepted_at?: string
          document: string
          id?: string
          profile_id: string
          user_agent?: string | null
          version: string
        }
        Update: {
          accepted_at?: string
          document?: string
          id?: string
          profile_id?: string
          user_agent?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_acceptances_profile_id_fkey"
            columns: ["profile_id"]
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
      organization_invites: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          max_uses: number | null
          organization_id: string
          revoked_at: string | null
          role: string
          uses: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          organization_id: string
          revoked_at?: string | null
          role?: string
          uses?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          organization_id?: string
          revoked_at?: string | null
          role?: string
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          organization_id: string
          profile_id: string
          role: string
          status: string
        }
        Insert: {
          created_at?: string
          organization_id: string
          profile_id: string
          role: string
          status?: string
        }
        Update: {
          created_at?: string
          organization_id?: string
          profile_id?: string
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          kind: string
          name: string | null
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          kind: string
          name?: string | null
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          kind?: string
          name?: string | null
          slug?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_private: {
        Row: {
          birth_date: string | null
          created_at: string | null
          credential_number: string | null
          email: string | null
          phone: string | null
          pix_key: string | null
          pix_key_type: string | null
          profile_id: string
          tax_id: string | null
          tax_id_type: string | null
          updated_at: string | null
          whatsapp_number: string | null
        }
        Insert: {
          birth_date?: string | null
          created_at?: string | null
          credential_number?: string | null
          email?: string | null
          phone?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          profile_id: string
          tax_id?: string | null
          tax_id_type?: string | null
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          birth_date?: string | null
          created_at?: string | null
          credential_number?: string | null
          email?: string | null
          phone?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          profile_id?: string
          tax_id?: string | null
          tax_id_type?: string | null
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
          deleted_at: string | null
          experience_years: number | null
          full_name: string
          id: string
          instagram_handle: string | null
          professional_type: string | null
          public_slug: string | null
          rating_avg: number | null
          role: string
          specialties: string[] | null
          sports_hidden: boolean
          state: string | null
          total_reviews: number | null
          total_sessions_given: number | null
          total_students_served: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          credential_number?: string | null
          credential_type?: string | null
          credential_verified?: boolean | null
          deleted_at?: string | null
          experience_years?: number | null
          full_name?: string
          id?: string
          instagram_handle?: string | null
          professional_type?: string | null
          public_slug?: string | null
          rating_avg?: number | null
          role?: string
          specialties?: string[] | null
          sports_hidden?: boolean
          state?: string | null
          total_reviews?: number | null
          total_sessions_given?: number | null
          total_students_served?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          credential_number?: string | null
          credential_type?: string | null
          credential_verified?: boolean | null
          deleted_at?: string | null
          experience_years?: number | null
          full_name?: string
          id?: string
          instagram_handle?: string | null
          professional_type?: string | null
          public_slug?: string | null
          rating_avg?: number | null
          role?: string
          specialties?: string[] | null
          sports_hidden?: boolean
          state?: string | null
          total_reviews?: number | null
          total_sessions_given?: number | null
          total_students_served?: number | null
          updated_at?: string | null
          user_id?: string | null
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
          city: string | null
          cover_image_url: string | null
          created_at: string | null
          current_participants: number | null
          date: string
          description: string | null
          duration_minutes: number | null
          end_time: string | null
          id: string
          is_recurring: boolean | null
          kind: 'class' | 'match' | 'tournament' | 'event' | 'other'
          latitude: number | null
          location_address: string | null
          location_name: string
          location_type: string | null
          longitude: number | null
          max_participants: number | null
          min_age: number | null
          minors_allowed: boolean
          organization_id: string | null
          parent_session_id: string | null
          price_per_slot: number
          product: string
          professional_id: string
          recurrence_rule: string | null
          session_type: string
          skill_level: string | null
          start_time: string
          status: string | null
          title: string
          updated_at: string | null
          venue_id: string | null
          what_to_bring: string | null
        }
        Insert: {
          category_id: string
          city?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          current_participants?: number | null
          date: string
          description?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          is_recurring?: boolean | null
          kind?: 'class' | 'match' | 'tournament' | 'event' | 'other'
          latitude?: number | null
          location_address?: string | null
          location_name: string
          location_type?: string | null
          longitude?: number | null
          max_participants?: number | null
          min_age?: number | null
          minors_allowed?: boolean
          organization_id?: string | null
          parent_session_id?: string | null
          price_per_slot: number
          product?: string
          professional_id: string
          recurrence_rule?: string | null
          session_type?: string
          skill_level?: string | null
          start_time: string
          status?: string | null
          title: string
          updated_at?: string | null
          venue_id?: string | null
          what_to_bring?: string | null
        }
        Update: {
          category_id?: string
          city?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          current_participants?: number | null
          date?: string
          description?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          is_recurring?: boolean | null
          kind?: 'class' | 'match' | 'tournament' | 'event' | 'other'
          latitude?: number | null
          location_address?: string | null
          location_name?: string
          location_type?: string | null
          longitude?: number | null
          max_participants?: number | null
          min_age?: number | null
          minors_allowed?: boolean
          organization_id?: string | null
          parent_session_id?: string | null
          price_per_slot?: number
          product?: string
          professional_id?: string
          recurrence_rule?: string | null
          session_type?: string
          skill_level?: string | null
          start_time?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          venue_id?: string | null
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
            foreignKeyName: "sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          {
            foreignKeyName: "sessions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          created_by: string | null
          id: string
          kind: string
          latitude: number | null
          longitude: number | null
          name: string
          organization_id: string | null
          state: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          organization_id?: string | null
          state?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          organization_id?: string | null
          state?: string | null
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "venues_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venues_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      activity_participants: {
        Args: { p_limit?: number; p_sessions: string[] }
        Returns: {
          dependents: number
          people: Json
          people_count: number
          session_id: string
        }[]
      }
      add_dependent: {
        Args: {
          p_birth_date: string
          p_consent_version: string
          p_full_name: string
          p_relationship: string
        }
        Returns: string
      }
      admin_create_community: {
        Args: { p_kind: string; p_name: string; p_owner_email: string }
        Returns: string
      }
      become_organizer: {
        Args: {
          p_bio: string
          p_birth_date: string
          p_city: string
          p_credential_number: string
          p_credential_type: string
          p_full_name: string
          p_pix_key: string
          p_pix_key_type: string
          p_professional_type: string
          p_tax_id: string
          p_whatsapp: string
        }
        Returns: Json
      }
      calculate_professional_rating: {
        Args: { pro_id: string }
        Returns: number
      }
      can_view_dependent: { Args: { p_dependent: string }; Returns: boolean }
      cancel_session: {
        Args: { p_reason?: string; p_session_id: string }
        Returns: undefined
      }
      close_community_session: {
        Args: {
          p_attendance?: Json
          p_happened?: boolean
          p_notes?: string
          p_session_id: string
        }
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
      community_ranking: {
        Args: { p_month?: string; p_org: string }
        Returns: {
          avatar_url: string
          is_me: boolean
          points: number
          profile_id: string
          rank: number
          short_name: string
        }[]
      }
      create_booking: {
        Args: { p_attribution?: Json; p_session_id: string; p_source?: string }
        Returns: Json
      }
      create_dependent_booking: {
        Args: { p_dependent_id: string; p_session_id: string }
        Returns: Json
      }
      create_invite: {
        Args: {
          p_days?: number
          p_max_uses?: number
          p_org: string
          p_role?: string
        }
        Returns: Json
      }
      delete_user_account: { Args: never; Returns: undefined }
      ensure_solo_organization: { Args: { p_profile: string }; Returns: string }
      generate_invite_code: { Args: never; Returns: string }
      get_booking_payment_info: {
        Args: { p_booking_id: string }
        Returns: Json
      }
      get_professional_dashboard: { Args: never; Returns: Json }
      get_professional_insights: { Args: never; Returns: Json }
      is_org_member: {
        Args: { p_org: string; p_roles?: string[] }
        Returns: boolean
      }
      job_auto_close_expired_sessions: { Args: never; Returns: undefined }
      join_organization: { Args: { p_code: string }; Returns: Json }
      manage_member: {
        Args: { p_action: string; p_org: string; p_profile: string }
        Returns: Json
      }
      my_organizer_missing: { Args: never; Returns: string[] }
      my_pro_sports_profile: { Args: never; Returns: Json }
      now_sp: { Args: never; Returns: string }
      organizer_missing: { Args: { p_profile: string }; Returns: string[] }
      pending_game_reviews: {
        Args: never
        Returns: {
          category_slug: string
          date: string
          kind: string
          organization_id: string
          organization_name: string
          players: Json
          session_id: string
          start_time: string
          title: string
        }[]
      }
      played_session: {
        Args: { p_profile: string; p_session: string }
        Returns: boolean
      }
      player_games: {
        Args: { p_org: string; p_profile: string }
        Returns: {
          att: string
          category_id: string
          d: string
          session_id: string
          venue_name: string
        }[]
      }
      player_profile: {
        Args: { p_org?: string; p_profile: string }
        Returns: Json
      }
      pro_player_games: {
        Args: { p_profile: string }
        Returns: {
          att: string
          category_id: string
          d: string
          organizer: string
          session_id: string
          venue_name: string
        }[]
      }
      pro_session_participants: { Args: { p_session: string }; Returns: Json }
      remove_dependent: { Args: { p_dependent: string }; Returns: undefined }
      resolve_venue: {
        Args: {
          p_address: string
          p_city: string
          p_created_by: string
          p_lat: number
          p_lng: number
          p_location_type: string
          p_name: string
          p_org: string
        }
        Returns: string
      }
      revoke_invite: { Args: { p_invite: string }; Returns: undefined }
      sanitize_attribution: { Args: { p: Json }; Returns: Json }
      session_community: { Args: { p_session: string }; Returns: string }
      session_end_local: {
        Args: { p_date: string; p_minutes: number; p_time: string }
        Returns: string
      }
      short_name: { Args: { p_full: string }; Returns: string }
      tax_id_kind: { Args: { p_value: string }; Returns: string }
      submit_game_review: {
        Args: { p_kudos?: Json; p_session: string; p_vibe: number }
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
