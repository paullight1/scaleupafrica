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
      subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          has_access: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          has_access?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          has_access?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: Database["public"]["Enums"]["app_role"]
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: Database["public"]["Enums"]["app_role"]
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          created_at?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          id: string
          title: string
          slug: string
          type: string
          category: string | null
          excerpt: string | null
          content: string | null
          cover_image_url: string | null
          file_url: string | null
          file_name: string | null
          file_size_kb: number | null
          topics: string[]
          gated: boolean
          status: string
          featured: boolean
          view_count: number
          download_count: number
          read_time_min: number | null
          author_id: string | null
          author_name: string | null
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          type?: string
          category?: string | null
          excerpt?: string | null
          content?: string | null
          cover_image_url?: string | null
          file_url?: string | null
          file_name?: string | null
          file_size_kb?: number | null
          topics?: string[]
          gated?: boolean
          status?: string
          featured?: boolean
          view_count?: number
          download_count?: number
          read_time_min?: number | null
          author_id?: string | null
          author_name?: string | null
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          type?: string
          category?: string | null
          excerpt?: string | null
          content?: string | null
          cover_image_url?: string | null
          file_url?: string | null
          file_name?: string | null
          file_size_kb?: number | null
          topics?: string[]
          gated?: boolean
          status?: string
          featured?: boolean
          view_count?: number
          download_count?: number
          read_time_min?: number | null
          author_id?: string | null
          author_name?: string | null
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          id: string
          title: string
          slug: string
          excerpt: string | null
          content: string | null
          cover_image_url: string | null
          category: string | null
          tags: string[]
          status: string
          featured: boolean
          view_count: number
          read_time_min: number | null
          author_id: string | null
          author_name: string | null
          seo_title: string | null
          seo_description: string | null
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          excerpt?: string | null
          content?: string | null
          cover_image_url?: string | null
          category?: string | null
          tags?: string[]
          status?: string
          featured?: boolean
          view_count?: number
          read_time_min?: number | null
          author_id?: string | null
          author_name?: string | null
          seo_title?: string | null
          seo_description?: string | null
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          excerpt?: string | null
          content?: string | null
          cover_image_url?: string | null
          category?: string | null
          tags?: string[]
          status?: string
          featured?: boolean
          view_count?: number
          read_time_min?: number | null
          author_id?: string | null
          author_name?: string | null
          seo_title?: string | null
          seo_description?: string | null
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      funding_opportunities: {
        Row: {
          id: string
          title: string
          funder: string
          type: string | null
          summary: string | null
          amount: string | null
          opens: string | null
          deadline: string | null
          eligibility: string | null
          url: string | null
          tags: string[]
          country_focus: string[]
          status: string
          featured: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          funder: string
          type?: string | null
          summary?: string | null
          amount?: string | null
          opens?: string | null
          deadline?: string | null
          eligibility?: string | null
          url?: string | null
          tags?: string[]
          country_focus?: string[]
          status?: string
          featured?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          funder?: string
          type?: string | null
          summary?: string | null
          amount?: string | null
          opens?: string | null
          deadline?: string | null
          eligibility?: string | null
          url?: string | null
          tags?: string[]
          country_focus?: string[]
          status?: string
          featured?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          id: string
          name: string | null
          email: string
          company: string | null
          message: string | null
          source: string
          resource_id: string | null
          status: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          name?: string | null
          email: string
          company?: string | null
          message?: string | null
          source?: string
          resource_id?: string | null
          status?: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          email?: string
          company?: string | null
          message?: string | null
          source?: string
          resource_id?: string | null
          status?: string
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          id: string
          email: string
          status: string
          source: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          status?: string
          source?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          status?: string
          source?: string | null
          created_at?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          id: string
          event_type: string
          path: string | null
          entity_type: string | null
          entity_id: string | null
          user_id: string | null
          session_id: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          event_type: string
          path?: string | null
          entity_type?: string | null
          entity_id?: string | null
          user_id?: string | null
          session_id?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          event_type?: string
          path?: string | null
          entity_type?: string | null
          entity_id?: string | null
          user_id?: string | null
          session_id?: string | null
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          key: string
          value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          key?: string
          value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          id: string
          actor_id: string | null
          actor_email: string | null
          action: string
          entity_type: string | null
          entity_id: string | null
          details: Json
          created_at: string
        }
        Insert: {
          id?: string
          actor_id?: string | null
          actor_email?: string | null
          action: string
          entity_type?: string | null
          entity_id?: string | null
          details?: Json
          created_at?: string
        }
        Update: {
          id?: string
          actor_id?: string | null
          actor_email?: string | null
          action?: string
          entity_type?: string | null
          entity_id?: string | null
          details?: Json
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_active_subscription: { Args: { _user_id: string }; Returns: boolean }
      has_role: { Args: { _user_id: string; _role: Database["public"]["Enums"]["app_role"] }; Returns: boolean }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      admin_dashboard_stats: { Args: Record<string, never>; Returns: Json }
      admin_timeseries: { Args: { _metric: string; _days?: number }; Returns: { day: string; count: number }[] }
      admin_list_users: {
        Args: { _search?: string; _limit?: number }
        Returns: {
          user_id: string
          email: string
          created_at: string
          last_sign_in_at: string | null
          business_name: string | null
          country: string | null
          has_access: boolean
          expires_at: string | null
          is_admin: boolean
          is_editor: boolean
        }[]
      }
      increment_resource_metric: { Args: { _id: string; _metric: string }; Returns: undefined }
      increment_post_views: { Args: { _id: string }; Returns: undefined }
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
  public: {
    Enums: {
      app_role: ["admin", "editor", "moderator", "user"],
    },
  },
} as const
