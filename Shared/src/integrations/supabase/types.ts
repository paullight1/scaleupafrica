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
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
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
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string | null
          id: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string | null
          id?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          metadata: Json
          path: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          metadata?: Json
          path?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          metadata?: Json
          path?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          author_name: string | null
          category: string | null
          content: string | null
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          featured: boolean
          id: string
          published_at: string | null
          read_time_min: number | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: string
          tags: string[]
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          category?: string | null
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          featured?: boolean
          id?: string
          published_at?: string | null
          read_time_min?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          category?: string | null
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          featured?: boolean
          id?: string
          published_at?: string | null
          read_time_min?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      email_events: {
        Row: {
          created_at: string
          error: string | null
          id: string
          ip_hash: string | null
          kind: string
          provider_id: string | null
          status: string
          subject: string | null
          to_email: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          ip_hash?: string | null
          kind: string
          provider_id?: string | null
          status?: string
          subject?: string | null
          to_email: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          ip_hash?: string | null
          kind?: string
          provider_id?: string | null
          status?: string
          subject?: string | null
          to_email?: string
        }
        Relationships: []
      }
      funding_opportunities: {
        Row: {
          amount: string | null
          batch_id: string | null
          country_focus: string[]
          created_at: string
          deadline: string | null
          details: Json
          eligibility: string | null
          featured: boolean
          funder: string
          id: string
          last_verified_at: string | null
          opens: string | null
          source: string
          status: string
          summary: string | null
          tags: string[]
          title: string
          type: string | null
          updated_at: string
          url: string | null
          verified_by: string | null
        }
        Insert: {
          amount?: string | null
          batch_id?: string | null
          country_focus?: string[]
          created_at?: string
          deadline?: string | null
          details?: Json
          eligibility?: string | null
          featured?: boolean
          funder: string
          id?: string
          last_verified_at?: string | null
          opens?: string | null
          source?: string
          status?: string
          summary?: string | null
          tags?: string[]
          title: string
          type?: string | null
          updated_at?: string
          url?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: string | null
          batch_id?: string | null
          country_focus?: string[]
          created_at?: string
          deadline?: string | null
          details?: Json
          eligibility?: string | null
          featured?: boolean
          funder?: string
          id?: string
          last_verified_at?: string | null
          opens?: string | null
          source?: string
          status?: string
          summary?: string | null
          tags?: string[]
          title?: string
          type?: string | null
          updated_at?: string
          url?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      funding_results: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          keywords_normalized: string
          keywords_raw: string
          model: string
          opportunities: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          keywords_normalized: string
          keywords_raw: string
          model?: string
          opportunities: Json
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          keywords_normalized?: string
          keywords_raw?: string
          model?: string
          opportunities?: Json
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          message: string | null
          metadata: Json
          name: string | null
          resource_id: string | null
          source: string
          status: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          message?: string | null
          metadata?: Json
          name?: string | null
          resource_id?: string | null
          source?: string
          status?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          metadata?: Json
          name?: string | null
          resource_id?: string | null
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          source: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source?: string | null
          status?: string
        }
        Relationships: []
      }
      payment_webhook_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          processed: boolean
          provider: string
          reference: string | null
          signature_valid: boolean
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload: Json
          processed?: boolean
          provider?: string
          reference?: string | null
          signature_valid: boolean
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean
          provider?: string
          reference?: string | null
          signature_valid?: boolean
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          channel: string | null
          created_at: string
          currency: string
          gateway_response: Json | null
          id: string
          paid_at: string | null
          plan_code: string
          provider: string
          reference: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          channel?: string | null
          created_at?: string
          currency: string
          gateway_response?: Json | null
          id?: string
          paid_at?: string | null
          plan_code: string
          provider?: string
          reference: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          channel?: string | null
          created_at?: string
          currency?: string
          gateway_response?: Json | null
          id?: string
          paid_at?: string | null
          plan_code?: string
          provider?: string
          reference?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          business_name: string
          country: string
          created_at: string
          email: string | null
          featured: boolean
          founder_name: string | null
          founder_photo_url: string | null
          id: string
          instagram: string | null
          keywords: string[] | null
          linkedin: string | null
          logo_url: string | null
          long_description: string | null
          phone: string | null
          sector: string
          short_description: string | null
          show_email: boolean
          show_phone: boolean
          show_whatsapp: boolean
          slug: string
          status: string
          twitter: string | null
          updated_at: string
          user_id: string
          view_count: number
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          business_name: string
          country: string
          created_at?: string
          email?: string | null
          featured?: boolean
          founder_name?: string | null
          founder_photo_url?: string | null
          id?: string
          instagram?: string | null
          keywords?: string[] | null
          linkedin?: string | null
          logo_url?: string | null
          long_description?: string | null
          phone?: string | null
          sector: string
          short_description?: string | null
          show_email?: boolean
          show_phone?: boolean
          show_whatsapp?: boolean
          slug: string
          status?: string
          twitter?: string | null
          updated_at?: string
          user_id: string
          view_count?: number
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          business_name?: string
          country?: string
          created_at?: string
          email?: string | null
          featured?: boolean
          founder_name?: string | null
          founder_photo_url?: string | null
          id?: string
          instagram?: string | null
          keywords?: string[] | null
          linkedin?: string | null
          logo_url?: string | null
          long_description?: string | null
          phone?: string | null
          sector?: string
          short_description?: string | null
          show_email?: boolean
          show_phone?: boolean
          show_whatsapp?: boolean
          slug?: string
          status?: string
          twitter?: string | null
          updated_at?: string
          user_id?: string
          view_count?: number
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      resources: {
        Row: {
          author_id: string | null
          author_name: string | null
          category: string | null
          content: string | null
          cover_image_url: string | null
          created_at: string
          download_count: number
          excerpt: string | null
          featured: boolean
          file_name: string | null
          file_size_kb: number | null
          file_url: string | null
          gated: boolean
          id: string
          published_at: string | null
          read_time_min: number | null
          slug: string
          status: string
          title: string
          topics: string[]
          type: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          category?: string | null
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          download_count?: number
          excerpt?: string | null
          featured?: boolean
          file_name?: string | null
          file_size_kb?: number | null
          file_url?: string | null
          gated?: boolean
          id?: string
          published_at?: string | null
          read_time_min?: number | null
          slug: string
          status?: string
          title: string
          topics?: string[]
          type?: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          category?: string | null
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          download_count?: number
          excerpt?: string | null
          featured?: boolean
          file_name?: string | null
          file_size_kb?: number | null
          file_url?: string | null
          gated?: boolean
          id?: string
          published_at?: string | null
          read_time_min?: number | null
          slug?: string
          status?: string
          title?: string
          topics?: string[]
          type?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      saved_opportunities: {
        Row: {
          created_at: string
          id: string
          opportunity_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          opportunity_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          opportunity_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_opportunities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "funding_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          auto_renew: boolean
          billing_email: string | null
          billing_status: string
          created_at: string
          expires_at: string | null
          has_access: boolean
          id: string
          next_payment_at: string | null
          paystack_customer_code: string | null
          paystack_email_token: string | null
          paystack_subscription_code: string | null
          plan_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_renew?: boolean
          billing_email?: string | null
          billing_status?: string
          created_at?: string
          expires_at?: string | null
          has_access?: boolean
          id?: string
          next_payment_at?: string | null
          paystack_customer_code?: string | null
          paystack_email_token?: string | null
          paystack_subscription_code?: string | null
          plan_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_renew?: boolean
          billing_email?: string | null
          billing_status?: string
          created_at?: string
          expires_at?: string | null
          has_access?: boolean
          id?: string
          next_payment_at?: string | null
          paystack_customer_code?: string | null
          paystack_email_token?: string | null
          paystack_subscription_code?: string | null
          plan_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          email_new_funding: boolean
          email_product_updates: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_new_funding?: boolean
          email_product_updates?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_new_funding?: boolean
          email_product_updates?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_dashboard_stats: { Args: never; Returns: Json }
      admin_list_users: {
        Args: { _limit?: number; _search?: string }
        Returns: {
          business_name: string
          country: string
          created_at: string
          email: string
          expires_at: string
          has_access: boolean
          is_admin: boolean
          is_editor: boolean
          last_sign_in_at: string
          user_id: string
        }[]
      }
      admin_set_role: {
        Args: {
          _add: boolean
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      admin_timeseries: {
        Args: { _days?: number; _metric: string }
        Returns: {
          count: number
          day: string
        }[]
      }
      directory_facets: {
        Args: never
        Returns: {
          count: number
          facet: string
          value: string
        }[]
      }
      funding_teaser: {
        Args: { _limit?: number }
        Returns: {
          deadline: string
          funder: string
          id: string
          title: string
          total_published: number
          type: string
        }[]
      }
      get_profile_contact: {
        Args: { _profile_id: string }
        Returns: {
          email: string
          phone: string
          whatsapp: string
        }[]
      }
      grant_annual_access: { Args: { _payment_id: string }; Returns: boolean }
      grant_subscription_access: {
        Args: { _payment_id: string }
        Returns: boolean
      }
      has_active_subscription: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_post_views: { Args: { _id: string }; Returns: undefined }
      increment_profile_views: { Args: { _id: string }; Returns: undefined }
      increment_resource_metric: {
        Args: { _id: string; _metric: string }
        Returns: undefined
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      slugify: { Args: { _txt: string }; Returns: string }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "editor" | "moderator" | "user"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "editor", "moderator", "user"],
    },
  },
} as const
