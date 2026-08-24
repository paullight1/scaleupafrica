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
      business_enrichment_candidates: {
        Row: {
          canonical_name: string
          country: string | null
          created_at: string
          enriched_profile: Json
          field_evidence: Json
          id: string
          identity_confidence: number
          member_state: string
          run_id: string
          source_urls: string[]
          summary: string | null
          website: string | null
        }
        Insert: {
          canonical_name: string
          country?: string | null
          created_at?: string
          enriched_profile?: Json
          field_evidence?: Json
          id?: string
          identity_confidence: number
          member_state?: string
          run_id: string
          source_urls?: string[]
          summary?: string | null
          website?: string | null
        }
        Update: {
          canonical_name?: string
          country?: string | null
          created_at?: string
          enriched_profile?: Json
          field_evidence?: Json
          id?: string
          identity_confidence?: number
          member_state?: string
          run_id?: string
          source_urls?: string[]
          summary?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_enrichment_candidates_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "business_enrichment_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      business_enrichment_runs: {
        Row: {
          business_name_input: string
          candidate_count: number
          completed_at: string | null
          country_hint: string | null
          error_class: string | null
          id: string
          selected_candidate_id: string | null
          started_at: string
          status: string
          user_id: string
          website_hint: string | null
        }
        Insert: {
          business_name_input: string
          candidate_count?: number
          completed_at?: string | null
          country_hint?: string | null
          error_class?: string | null
          id?: string
          selected_candidate_id?: string | null
          started_at?: string
          status?: string
          user_id: string
          website_hint?: string | null
        }
        Update: {
          business_name_input?: string
          candidate_count?: number
          completed_at?: string | null
          country_hint?: string | null
          error_class?: string | null
          id?: string
          selected_candidate_id?: string | null
          started_at?: string
          status?: string
          user_id?: string
          website_hint?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_enrichment_runs_selected_candidate_fkey"
            columns: ["selected_candidate_id"]
            isOneToOne: false
            referencedRelation: "business_enrichment_candidates"
            referencedColumns: ["id"]
          },
        ]
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
          application_status: string
          application_url: string | null
          batch_id: string | null
          country_focus: string[]
          created_at: string
          current_cycle_label: string | null
          deadline: string | null
          deadline_at: string | null
          deadline_status: string
          deadline_timezone: string | null
          details: Json
          eligibility: string | null
          eligibility_evidence: Json
          eligibility_evidence_url: string | null
          eligibility_rules: Json
          eligibility_verified_at: string | null
          featured: boolean
          funder: string
          id: string
          last_verified_at: string | null
          opens: string | null
          opens_at: string | null
          source: string
          source_fingerprint: string | null
          source_name: string | null
          source_retrieved_at: string | null
          source_url: string | null
          status: string
          status_checked_at: string | null
          status_evidence_url: string | null
          summary: string | null
          tags: string[]
          title: string
          type: string | null
          updated_at: string
          url: string | null
          verification_status: string
          verified_by: string | null
        }
        Insert: {
          amount?: string | null
          application_status?: string
          application_url?: string | null
          batch_id?: string | null
          country_focus?: string[]
          created_at?: string
          current_cycle_label?: string | null
          deadline?: string | null
          deadline_at?: string | null
          deadline_status?: string
          deadline_timezone?: string | null
          details?: Json
          eligibility?: string | null
          eligibility_evidence?: Json
          eligibility_evidence_url?: string | null
          eligibility_rules?: Json
          eligibility_verified_at?: string | null
          featured?: boolean
          funder: string
          id?: string
          last_verified_at?: string | null
          opens?: string | null
          opens_at?: string | null
          source?: string
          source_fingerprint?: string | null
          source_name?: string | null
          source_retrieved_at?: string | null
          source_url?: string | null
          status?: string
          status_checked_at?: string | null
          status_evidence_url?: string | null
          summary?: string | null
          tags?: string[]
          title: string
          type?: string | null
          updated_at?: string
          url?: string | null
          verification_status?: string
          verified_by?: string | null
        }
        Update: {
          amount?: string | null
          application_status?: string
          application_url?: string | null
          batch_id?: string | null
          country_focus?: string[]
          created_at?: string
          current_cycle_label?: string | null
          deadline?: string | null
          deadline_at?: string | null
          deadline_status?: string
          deadline_timezone?: string | null
          details?: Json
          eligibility?: string | null
          eligibility_evidence?: Json
          eligibility_evidence_url?: string | null
          eligibility_rules?: Json
          eligibility_verified_at?: string | null
          featured?: boolean
          funder?: string
          id?: string
          last_verified_at?: string | null
          opens?: string | null
          opens_at?: string | null
          source?: string
          source_fingerprint?: string | null
          source_name?: string | null
          source_retrieved_at?: string | null
          source_url?: string | null
          status?: string
          status_checked_at?: string | null
          status_evidence_url?: string | null
          summary?: string | null
          tags?: string[]
          title?: string
          type?: string | null
          updated_at?: string
          url?: string | null
          verification_status?: string
          verified_by?: string | null
        }
        Relationships: []
      }
      funding_opportunity_reports: {
        Row: {
          category: string
          created_at: string
          id: string
          message: string | null
          opportunity_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          message?: string | null
          opportunity_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          message?: string | null
          opportunity_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funding_opportunity_reports_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "funding_opportunities"
            referencedColumns: ["id"]
          },
        ]
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
      funding_source_checks: {
        Row: {
          check_key: string
          checked_at: string
          classified_status: string
          content_bytes: number | null
          content_type: string | null
          created_at: string
          error_class: string | null
          extracted_signals: Json
          http_status: number | null
          id: string
          opportunity_id: string
          source_fingerprint: string | null
          source_id: string | null
          source_url: string
        }
        Insert: {
          check_key: string
          checked_at?: string
          classified_status?: string
          content_bytes?: number | null
          content_type?: string | null
          created_at?: string
          error_class?: string | null
          extracted_signals?: Json
          http_status?: number | null
          id?: string
          opportunity_id: string
          source_fingerprint?: string | null
          source_id?: string | null
          source_url: string
        }
        Update: {
          check_key?: string
          checked_at?: string
          classified_status?: string
          content_bytes?: number | null
          content_type?: string | null
          created_at?: string
          error_class?: string | null
          extracted_signals?: Json
          http_status?: number | null
          id?: string
          opportunity_id?: string
          source_fingerprint?: string | null
          source_id?: string | null
          source_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "funding_source_checks_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "funding_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funding_source_checks_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "funding_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      funding_sources: {
        Row: {
          active: boolean
          base_url: string
          country_focus: string[]
          created_at: string
          created_by: string | null
          id: string
          last_checked_at: string | null
          last_error: string | null
          last_success_at: string | null
          name: string
          refresh_interval_hours: number
          source_type: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          active?: boolean
          base_url: string
          country_focus?: string[]
          created_at?: string
          created_by?: string | null
          id?: string
          last_checked_at?: string | null
          last_error?: string | null
          last_success_at?: string | null
          name: string
          refresh_interval_hours?: number
          source_type?: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          active?: boolean
          base_url?: string
          country_focus?: string[]
          created_at?: string
          created_by?: string | null
          id?: string
          last_checked_at?: string | null
          last_error?: string | null
          last_success_at?: string | null
          name?: string
          refresh_interval_hours?: number
          source_type?: string
          tags?: string[]
          updated_at?: string
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
      member_opportunity_state: {
        Row: {
          applied_at: string | null
          note: string | null
          opportunity_id: string
          state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          note?: string | null
          opportunity_id: string
          state?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_at?: string | null
          note?: string | null
          opportunity_id?: string
          state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_opportunity_state_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "funding_opportunities"
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
      notification_events: {
        Row: {
          attempt_count: number
          created_at: string
          dedupe_key: string
          event_type: string
          id: string
          last_error: string | null
          metadata: Json
          opportunity_id: string | null
          processing_at: string | null
          sent_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          dedupe_key: string
          event_type: string
          id?: string
          last_error?: string | null
          metadata?: Json
          opportunity_id?: string | null
          processing_at?: string | null
          sent_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          dedupe_key?: string
          event_type?: string
          id?: string
          last_error?: string | null
          metadata?: Json
          opportunity_id?: string | null
          processing_at?: string | null
          sent_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_events_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "funding_opportunities"
            referencedColumns: ["id"]
          },
        ]
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
          provider_charge_id: string | null
          provider_invoice_id: string | null
          provider_subscription_id: string | null
          provider: string
          reference: string
          status: string
          updated_at: string
          user_id: string | null
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
          provider_charge_id?: string | null
          provider_invoice_id?: string | null
          provider_subscription_id?: string | null
          provider?: string
          reference: string
          status?: string
          updated_at?: string
          user_id?: string | null
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
          provider_charge_id?: string | null
          provider_invoice_id?: string | null
          provider_subscription_id?: string | null
          provider?: string
          reference?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          acquisition_source: string | null
          acquisition_source_other: string | null
          application_readiness: string | null
          business_identity_candidate_id: string | null
          business_identity_confirmed_at: string | null
          business_identity_run_id: string | null
          business_identity_source_urls: string[]
          business_name: string
          business_stage: string | null
          country: string
          created_at: string
          email: string | null
          featured: boolean
          founder_name: string | null
          founder_photo_url: string | null
          founding_year: number | null
          funding_target_usd: number | null
          id: string
          instagram: string | null
          keywords: string[] | null
          linkedin: string | null
          logo_url: string | null
          long_description: string | null
          operating_countries: string[]
          organisation_type: string | null
          offerings: Json
          phone: string | null
          preferred_funding_types: string[]
          sector: string
          short_description: string | null
          show_email: boolean
          show_phone: boolean
          show_whatsapp: boolean
          slug: string
          status: string
          twitter: string | null
          target_customers: string | null
          updated_at: string
          user_id: string
          view_count: number
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          acquisition_source?: string | null
          acquisition_source_other?: string | null
          application_readiness?: string | null
          business_identity_candidate_id?: string | null
          business_identity_confirmed_at?: string | null
          business_identity_run_id?: string | null
          business_identity_source_urls?: string[]
          business_name: string
          business_stage?: string | null
          country: string
          created_at?: string
          email?: string | null
          featured?: boolean
          founder_name?: string | null
          founder_photo_url?: string | null
          founding_year?: number | null
          funding_target_usd?: number | null
          id?: string
          instagram?: string | null
          keywords?: string[] | null
          linkedin?: string | null
          logo_url?: string | null
          long_description?: string | null
          operating_countries?: string[]
          organisation_type?: string | null
          offerings?: Json
          phone?: string | null
          preferred_funding_types?: string[]
          sector: string
          short_description?: string | null
          show_email?: boolean
          show_phone?: boolean
          show_whatsapp?: boolean
          slug: string
          status?: string
          twitter?: string | null
          target_customers?: string | null
          updated_at?: string
          user_id: string
          view_count?: number
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          acquisition_source?: string | null
          acquisition_source_other?: string | null
          application_readiness?: string | null
          business_identity_candidate_id?: string | null
          business_identity_confirmed_at?: string | null
          business_identity_run_id?: string | null
          business_identity_source_urls?: string[]
          business_name?: string
          business_stage?: string | null
          country?: string
          created_at?: string
          email?: string | null
          featured?: boolean
          founder_name?: string | null
          founder_photo_url?: string | null
          founding_year?: number | null
          funding_target_usd?: number | null
          id?: string
          instagram?: string | null
          keywords?: string[] | null
          linkedin?: string | null
          logo_url?: string | null
          long_description?: string | null
          operating_countries?: string[]
          organisation_type?: string | null
          offerings?: Json
          phone?: string | null
          preferred_funding_types?: string[]
          sector?: string
          short_description?: string | null
          show_email?: boolean
          show_phone?: boolean
          show_whatsapp?: boolean
          slug?: string
          status?: string
          twitter?: string | null
          target_customers?: string | null
          updated_at?: string
          user_id?: string
          view_count?: number
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_business_identity_candidate_id_fkey"
            columns: ["business_identity_candidate_id"]
            isOneToOne: false
            referencedRelation: "business_enrichment_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_business_identity_run_id_fkey"
            columns: ["business_identity_run_id"]
            isOneToOne: false
            referencedRelation: "business_enrichment_runs"
            referencedColumns: ["id"]
          },
        ]
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
          bachs_customer_id: string | null
          bachs_initial_reference: string | null
          bachs_subscription_id: string | null
          billing_email: string | null
          billing_status: string
          cancel_at_period_end: boolean
          current_period_start: string | null
          created_at: string
          expires_at: string | null
          has_access: boolean
          id: string
          last_bachs_event_at: string | null
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
          bachs_customer_id?: string | null
          bachs_initial_reference?: string | null
          bachs_subscription_id?: string | null
          billing_email?: string | null
          billing_status?: string
          cancel_at_period_end?: boolean
          current_period_start?: string | null
          created_at?: string
          expires_at?: string | null
          has_access?: boolean
          id?: string
          last_bachs_event_at?: string | null
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
          bachs_customer_id?: string | null
          bachs_initial_reference?: string | null
          bachs_subscription_id?: string | null
          billing_email?: string | null
          billing_status?: string
          cancel_at_period_end?: boolean
          current_period_start?: string | null
          created_at?: string
          expires_at?: string | null
          has_access?: boolean
          id?: string
          last_bachs_event_at?: string | null
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
          email_deadline_alerts: boolean
          email_new_funding: boolean
          email_new_matches: boolean
          email_product_updates: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_deadline_alerts?: boolean
          email_new_funding?: boolean
          email_new_matches?: boolean
          email_product_updates?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_deadline_alerts?: boolean
          email_new_funding?: boolean
          email_new_matches?: boolean
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
      admin_content_performance: {
        Args: { _days?: number; _limit?: number }
        Returns: {
          content_id: string
          content_type: string
          downloads: number
          status: string
          title: string
          total_engagement: number
          views: number
        }[]
      }
      admin_dashboard_stats: { Args: never; Returns: Json }
      admin_reporting_summary: { Args: { _days?: number }; Returns: Json }
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
      claim_funding_notification_events: {
        Args: { _limit?: number }
        Returns: {
          attempt_count: number
          created_at: string
          dedupe_key: string
          event_type: string
          id: string
          metadata: Json
          opportunity_id: string
          user_id: string
        }[]
      }
      confirm_business_identity: {
        Args: {
          _accepted: boolean
          _candidate_id: string
          _run_id: string
          _user_id: string
        }
        Returns: Json
      }
      directory_facets: {
        Args: never
        Returns: {
          count: number
          facet: string
          value: string
        }[]
      }
      enqueue_funding_transition_notifications: {
        Args: {
          _next_deadline_at: string
          _next_status: string
          _opportunity_id: string
          _previous_deadline_at: string
          _previous_status: string
          _transition_key: string
        }
        Returns: number
      }
      funding_source_is_registered: { Args: { _url: string }; Returns: boolean }
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
      grant_membership_access: {
        Args: { _payment_id: string }
        Returns: boolean
      }
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
      record_funding_status_check: {
        Args: {
          _application_url?: string
          _apply_canonical?: boolean
          _check_key: string
          _checked_at: string
          _classified_status: string
          _content_bytes: number
          _content_type: string
          _current_cycle_label?: string
          _deadline_at?: string
          _deadline_status?: string
          _deadline_timezone?: string
          _eligibility_evidence?: Json
          _eligibility_evidence_url?: string
          _eligibility_rules?: Json
          _eligibility_verified_at?: string
          _error_class: string
          _extracted_signals: Json
          _http_status: number
          _opens_at?: string
          _opportunity_id: string
          _source_fingerprint: string
          _source_id: string
          _source_url: string
          _status_evidence_url?: string
        }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      slugify: { Args: { _txt: string }; Returns: string }
      unaccent: { Args: { "": string }; Returns: string }
      update_funding_source_and_invalidate: {
        Args: {
          _active: boolean
          _base_url: string
          _name: string
          _source_id: string
        }
        Returns: {
          active: boolean
          base_url: string
          country_focus: string[]
          created_at: string
          created_by: string | null
          id: string
          last_checked_at: string | null
          last_error: string | null
          last_success_at: string | null
          name: string
          refresh_interval_hours: number
          source_type: string
          tags: string[]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "funding_sources"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
