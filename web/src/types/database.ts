export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
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
      fafsa_scholarships: {
        Row: {
          application_requirements: string[]
          award_amount_cents: number | null
          award_amount_note: string | null
          created_at: string
          deadline_display: string | null
          demographic_tags: string[]
          description: string
          eligibility_summary: string | null
          id: string
          max_family_income_cents: number | null
          min_gpa: number | null
          name: string
          num_awards_per_year: number | null
          provider: string | null
          renewable_years: number | null
          requires_css_profile: boolean
          requires_fafsa: boolean
          selection_criteria: string[]
          slug: string
          sort_order: number
          updated_at: string
          url: string
          verified_at: string | null
        }
        Insert: {
          application_requirements?: string[]
          award_amount_cents?: number | null
          award_amount_note?: string | null
          created_at?: string
          deadline_display?: string | null
          demographic_tags?: string[]
          description: string
          eligibility_summary?: string | null
          id?: string
          max_family_income_cents?: number | null
          min_gpa?: number | null
          name: string
          num_awards_per_year?: number | null
          provider?: string | null
          renewable_years?: number | null
          requires_css_profile?: boolean
          requires_fafsa?: boolean
          selection_criteria?: string[]
          slug: string
          sort_order?: number
          updated_at?: string
          url: string
          verified_at?: string | null
        }
        Update: {
          application_requirements?: string[]
          award_amount_cents?: number | null
          award_amount_note?: string | null
          created_at?: string
          deadline_display?: string | null
          demographic_tags?: string[]
          description?: string
          eligibility_summary?: string | null
          id?: string
          max_family_income_cents?: number | null
          min_gpa?: number | null
          name?: string
          num_awards_per_year?: number | null
          provider?: string | null
          renewable_years?: number | null
          requires_css_profile?: boolean
          requires_fafsa?: boolean
          selection_criteria?: string[]
          slug?: string
          sort_order?: number
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
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
