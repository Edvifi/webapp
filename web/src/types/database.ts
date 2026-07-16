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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      colleges: {
        Row: {
          acceptance_rate: number | null
          application_deadlines: Json
          avg_net_price: number | null
          city: string | null
          cost_of_attendance: number | null
          cost_out_of_state: number | null
          created_at: string
          deadlines_estimated: boolean
          emoji: string | null
          financial_aid_deadlines: Json
          id: string
          logo_url: string | null
          meets_full_need: boolean
          name: string
          no_loan_policy: boolean
          npc_url: string | null
          slug: string
          source: string
          source_external_id: string | null
          state: string | null
          status: string
          type: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          acceptance_rate?: number | null
          application_deadlines?: Json
          avg_net_price?: number | null
          city?: string | null
          cost_of_attendance?: number | null
          cost_out_of_state?: number | null
          created_at?: string
          deadlines_estimated?: boolean
          emoji?: string | null
          financial_aid_deadlines?: Json
          id?: string
          logo_url?: string | null
          meets_full_need?: boolean
          name: string
          no_loan_policy?: boolean
          npc_url?: string | null
          slug: string
          source?: string
          source_external_id?: string | null
          state?: string | null
          status?: string
          type?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          acceptance_rate?: number | null
          application_deadlines?: Json
          avg_net_price?: number | null
          city?: string | null
          cost_of_attendance?: number | null
          cost_out_of_state?: number | null
          created_at?: string
          deadlines_estimated?: boolean
          emoji?: string | null
          financial_aid_deadlines?: Json
          id?: string
          logo_url?: string | null
          meets_full_need?: boolean
          name?: string
          no_loan_policy?: boolean
          npc_url?: string | null
          slug?: string
          source?: string
          source_external_id?: string | null
          state?: string | null
          status?: string
          type?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      college_ingest_runs: {
        Row: {
          archived: number
          error: string | null
          fetched: number
          finished_at: string | null
          id: string
          source: string
          started_at: string
          status: string
          upserted: number
        }
        Insert: {
          archived?: number
          error?: string | null
          fetched?: number
          finished_at?: string | null
          id?: string
          source?: string
          started_at?: string
          status?: string
          upserted?: number
        }
        Update: {
          archived?: number
          error?: string | null
          fetched?: number
          finished_at?: string | null
          id?: string
          source?: string
          started_at?: string
          status?: string
          upserted?: number
        }
        Relationships: []
      }
      app_admins: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      fafsa_federal_programs: {
        Row: {
          award_year: string
          category: string
          created_at: string
          description: string
          id: string
          interest_rate_pct: number | null
          max_amount_cents: number | null
          max_amount_note: string | null
          name: string
          origination_fee_pct: number | null
          slug: string
          sort_order: number
          subcategory: string | null
          updated_at: string
          url: string
          verified_at: string | null
          who_qualifies: string
        }
        Insert: {
          award_year: string
          category: string
          created_at?: string
          description: string
          id?: string
          interest_rate_pct?: number | null
          max_amount_cents?: number | null
          max_amount_note?: string | null
          name: string
          origination_fee_pct?: number | null
          slug: string
          sort_order?: number
          subcategory?: string | null
          updated_at?: string
          url: string
          verified_at?: string | null
          who_qualifies: string
        }
        Update: {
          award_year?: string
          category?: string
          created_at?: string
          description?: string
          id?: string
          interest_rate_pct?: number | null
          max_amount_cents?: number | null
          max_amount_note?: string | null
          name?: string
          origination_fee_pct?: number | null
          slug?: string
          sort_order?: number
          subcategory?: string | null
          updated_at?: string
          url?: string
          verified_at?: string | null
          who_qualifies?: string
        }
        Relationships: []
      }
      fafsa_generous_aid_schools: {
        Row: {
          created_at: string
          free_all_costs_income_cents: number | null
          free_tuition_income_cents: number | null
          id: string
          meets_full_need: boolean
          name: string
          no_loan: boolean
          notes: string | null
          requires_css_profile: boolean
          sort_order: number
          updated_at: string
          url: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          free_all_costs_income_cents?: number | null
          free_tuition_income_cents?: number | null
          id?: string
          meets_full_need?: boolean
          name: string
          no_loan?: boolean
          notes?: string | null
          requires_css_profile?: boolean
          sort_order?: number
          updated_at?: string
          url: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          free_all_costs_income_cents?: number | null
          free_tuition_income_cents?: number | null
          id?: string
          meets_full_need?: boolean
          name?: string
          no_loan?: boolean
          notes?: string | null
          requires_css_profile?: boolean
          sort_order?: number
          updated_at?: string
          url?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      fafsa_saved_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      fafsa_scholarship_ingest_runs: {
        Row: {
          archived: number
          errors: Json | null
          fetched: number
          finished_at: string | null
          id: string
          inserted: number
          notes: string | null
          skipped: number
          source: string
          started_at: string
          status: string
          updated: number
        }
        Insert: {
          archived?: number
          errors?: Json | null
          fetched?: number
          finished_at?: string | null
          id?: string
          inserted?: number
          notes?: string | null
          skipped?: number
          source: string
          started_at?: string
          status?: string
          updated?: number
        }
        Update: {
          archived?: number
          errors?: Json | null
          fetched?: number
          finished_at?: string | null
          id?: string
          inserted?: number
          notes?: string | null
          skipped?: number
          source?: string
          started_at?: string
          status?: string
          updated?: number
        }
        Relationships: []
      }
      fafsa_scholarships: {
        Row: {
          application_requirements: string[]
          award_amount_cents: number | null
          award_amount_note: string | null
          created_at: string
          deadline: string | null
          deadline_display: string | null
          demographic_tags: string[]
          description: string
          eligibility_summary: string | null
          id: string
          last_seen_at: string | null
          max_family_income_cents: number | null
          min_gpa: number | null
          name: string
          num_awards_per_year: number | null
          provider: string | null
          raw: Json | null
          renewable_years: number | null
          requires_css_profile: boolean
          requires_fafsa: boolean
          selection_criteria: string[]
          slug: string
          sort_order: number
          source: string
          source_external_id: string | null
          status: string
          updated_at: string
          url: string
          verified_at: string | null
        }
        Insert: {
          application_requirements?: string[]
          award_amount_cents?: number | null
          award_amount_note?: string | null
          created_at?: string
          deadline?: string | null
          deadline_display?: string | null
          demographic_tags?: string[]
          description: string
          eligibility_summary?: string | null
          id?: string
          last_seen_at?: string | null
          max_family_income_cents?: number | null
          min_gpa?: number | null
          name: string
          num_awards_per_year?: number | null
          provider?: string | null
          raw?: Json | null
          renewable_years?: number | null
          requires_css_profile?: boolean
          requires_fafsa?: boolean
          selection_criteria?: string[]
          slug: string
          sort_order?: number
          source?: string
          source_external_id?: string | null
          status?: string
          updated_at?: string
          url: string
          verified_at?: string | null
        }
        Update: {
          application_requirements?: string[]
          award_amount_cents?: number | null
          award_amount_note?: string | null
          created_at?: string
          deadline?: string | null
          deadline_display?: string | null
          demographic_tags?: string[]
          description?: string
          eligibility_summary?: string | null
          id?: string
          last_seen_at?: string | null
          max_family_income_cents?: number | null
          min_gpa?: number | null
          name?: string
          num_awards_per_year?: number | null
          provider?: string | null
          raw?: Json | null
          renewable_years?: number | null
          requires_css_profile?: boolean
          requires_fafsa?: boolean
          selection_criteria?: string[]
          slug?: string
          sort_order?: number
          source?: string
          source_external_id?: string | null
          status?: string
          updated_at?: string
          url?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      fafsa_state_programs: {
        Row: {
          alternative_application: string | null
          created_at: string
          description: string
          eligibility_notes: string | null
          fafsa_required: boolean
          id: string
          name: string
          program_type: string | null
          sort_order: number
          state_code: string
          updated_at: string
          url: string
          verified_at: string | null
        }
        Insert: {
          alternative_application?: string | null
          created_at?: string
          description: string
          eligibility_notes?: string | null
          fafsa_required?: boolean
          id?: string
          name: string
          program_type?: string | null
          sort_order?: number
          state_code: string
          updated_at?: string
          url: string
          verified_at?: string | null
        }
        Update: {
          alternative_application?: string | null
          created_at?: string
          description?: string
          eligibility_notes?: string | null
          fafsa_required?: boolean
          id?: string
          name?: string
          program_type?: string | null
          sort_order?: number
          state_code?: string
          updated_at?: string
          url?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      fafsa_tracker_items: {
        Row: {
          amount_display: string | null
          created_at: string
          deadline_display: string | null
          id: string
          name: string
          notes: string | null
          scholarship_id: string | null
          sort_order: number
          source: string | null
          status: string
          tracker_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_display?: string | null
          created_at?: string
          deadline_display?: string | null
          id?: string
          name: string
          notes?: string | null
          scholarship_id?: string | null
          sort_order?: number
          source?: string | null
          status?: string
          tracker_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_display?: string | null
          created_at?: string
          deadline_display?: string | null
          id?: string
          name?: string
          notes?: string | null
          scholarship_id?: string | null
          sort_order?: number
          source?: string | null
          status?: string
          tracker_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fafsa_tracker_items_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "fafsa_scholarships"
            referencedColumns: ["id"]
          },
        ]
      }
      fafsa_user_module_state: {
        Row: {
          checklist_progress: Json
          college_list: Json
          npc_runs: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          checklist_progress?: Json
          college_list?: Json
          npc_runs?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          checklist_progress?: Json
          college_list?: Json
          npc_runs?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          answers: Json | null
          avatar_url: string | null
          created_at: string | null
          demographics: Json | null
          display_name: string | null
          email: string | null
          grade_start_idx: number | null
          id: string
          last_login_at: string | null
          onboarding_complete: boolean | null
          settings: Json
        }
        Insert: {
          answers?: Json | null
          avatar_url?: string | null
          created_at?: string | null
          demographics?: Json | null
          display_name?: string | null
          email?: string | null
          grade_start_idx?: number | null
          id: string
          last_login_at?: string | null
          onboarding_complete?: boolean | null
          settings?: Json
        }
        Update: {
          answers?: Json | null
          avatar_url?: string | null
          created_at?: string | null
          demographics?: Json | null
          display_name?: string | null
          email?: string | null
          grade_start_idx?: number | null
          id?: string
          last_login_at?: string | null
          onboarding_complete?: boolean | null
          settings?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_scholarship_ingest_health: { Args: never; Returns: Json }
      get_scholarship_ingest_runs: {
        Args: { p_limit?: number }
        Returns: {
          archived: number
          errors: Json | null
          fetched: number
          finished_at: string | null
          id: string
          inserted: number
          notes: string | null
          skipped: number
          source: string
          started_at: string
          status: string
          updated: number
        }[]
        SetofOptions: {
          from: "*"
          to: "fafsa_scholarship_ingest_runs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      is_app_admin: { Args: never; Returns: boolean }
      mark_intro_seen: { Args: { intro_key: string }; Returns: undefined }
      merge_settings: { Args: { patch: Json }; Returns: undefined }
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
    Enums: {},
  },
} as const
