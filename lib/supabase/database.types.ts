export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type StaffRole = "admin" | "staff";
export type PracticalPeriod = "P1_2" | "P2_3" | "P3_4" | "undecided";
export type ActionType = "call" | "line" | "zoom" | "email" | "event" | "note" | "ai";
export type MessageDirection = "in" | "out";
export type MessageType =
  | "text"
  | "image"
  | "sticker"
  | "flex"
  | "file"
  | "audio"
  | "video"
  | "location"
  | "unknown";
export type BroadcastStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "sent"
  | "failed"
  | "cancelled";
export type SurveyQuestionType = "text" | "radio" | "checkbox" | "image_upload";
export type MatchType = "exact" | "contains" | "regex";
export type RecordingSource = "zoom" | "upload" | "browser";
export type ResourceKind =
  | "approach_policy"
  | "talk_script"
  | "event_info"
  | "faq"
  | "other";
export type NotificationChannel = "line" | "email" | "both";

type Timestamp = string;

export type Database = {
  public: {
    Tables: {
      staff_users: {
        Row: {
          id: string;
          email: string;
          name: string;
          role: StaffRole;
          line_user_id: string | null;
          avatar_url: string | null;
          is_active: boolean;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          role?: StaffRole;
          line_user_id?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["staff_users"]["Insert"]>;
      };
      students: {
        Row: {
          id: string;
          line_user_id: string | null;
          display_name: string | null;
          real_name: string | null;
          kana: string | null;
          university: string | null;
          grade: string | null;
          graduation_year: number | null;
          practical_period: PracticalPeriod;
          phone: string | null;
          email: string | null;
          desired_job_type: string | null;
          desired_area: string | null;
          motivation_level: number | null;
          first_contact_method: string | null;
          first_contact_date: string | null;
          last_inbound_at: Timestamp | null;
          last_outbound_at: Timestamp | null;
          ai_next_action: string | null;
          manual_next_action: string | null;
          notes: string | null;
          line_picture_url: string | null;
          photo_url: string | null;
          photo_position_x: number;
          photo_position_y: number;
          photo_scale: number;
          status: string;
          funnel_entry: boolean;
          funnel_uncontacted: boolean;
          funnel_pool: boolean;
          funnel_next: boolean;
          funnel_is: boolean;
          funnel_pharmacist_interview: boolean;
          funnel_selection: boolean;
          funnel_offer: boolean;
          funnel_offer_accepted: boolean;
          funnel_hired: boolean;
          event_hb_fes_date: string | null;
          event_himeji_tour_date: string | null;
          event_real_talk_date: string | null;
          event_company_session_date: string | null;
          event_employee_exchange_date: string | null;
          optimistic_lock_version: number;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: Partial<Database["public"]["Tables"]["students"]["Row"]> & {
          id?: string;
        };
        Update: Partial<Database["public"]["Tables"]["students"]["Row"]>;
      };
      student_assignees: {
        Row: {
          student_id: string;
          staff_id: string;
          assigned_by: string | null;
          created_at: Timestamp;
        };
        Insert: {
          student_id: string;
          staff_id: string;
          assigned_by?: string | null;
          created_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["student_assignees"]["Insert"]>;
      };
      student_actions: {
        Row: {
          id: string;
          student_id: string;
          staff_id: string | null;
          action_type: ActionType;
          title: string;
          body: string | null;
          executed_at: Timestamp;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          student_id: string;
          staff_id?: string | null;
          action_type: ActionType;
          title: string;
          body?: string | null;
          executed_at?: Timestamp;
          created_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["student_actions"]["Insert"]>;
      };
      tags: {
        Row: {
          id: string;
          name: string;
          color: string;
          created_by: string | null;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          name: string;
          color?: string;
          created_by?: string | null;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["tags"]["Insert"]>;
      };
      student_tags: {
        Row: {
          student_id: string;
          tag_id: string;
          created_by: string | null;
          created_at: Timestamp;
        };
        Insert: {
          student_id: string;
          tag_id: string;
          created_by?: string | null;
          created_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["student_tags"]["Insert"]>;
      };
      messages: {
        Row: {
          id: string;
          student_id: string;
          direction: MessageDirection;
          type: MessageType;
          payload: Json;
          line_message_id: string | null;
          status: string;
          sent_at: Timestamp;
          read_at: Timestamp | null;
          staff_id: string | null;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          student_id: string;
          direction: MessageDirection;
          type?: MessageType;
          payload?: Json;
          line_message_id?: string | null;
          status?: string;
          sent_at?: Timestamp;
          read_at?: Timestamp | null;
          staff_id?: string | null;
          created_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["messages"]["Insert"]>;
      };
      broadcasts: {
        Row: {
          id: string;
          title: string;
          body_jsonb: Json;
          target_tag_ids: Json;
          excluded_tag_ids: Json;
          target_mode: "and" | "or";
          scheduled_at: Timestamp | null;
          sent_at: Timestamp | null;
          sent_by: string | null;
          status: BroadcastStatus;
          test_sent_to: string | null;
          estimated_recipients: number;
          sent_count: number;
          failed_count: number;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: Partial<Database["public"]["Tables"]["broadcasts"]["Row"]> & {
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["broadcasts"]["Row"]>;
      };
      surveys: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          is_active: boolean;
          require_signin: boolean;
          created_by: string | null;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: Partial<Database["public"]["Tables"]["surveys"]["Row"]> & {
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["surveys"]["Row"]>;
      };
      survey_responses: {
        Row: {
          id: string;
          survey_id: string;
          student_id: string | null;
          submitted_at: Timestamp;
          raw_answers_jsonb: Json;
          respondent_name: string | null;
          respondent_line_user_id: string | null;
          needs_manual_merge: boolean;
        };
        Insert: Partial<Database["public"]["Tables"]["survey_responses"]["Row"]> & {
          survey_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["survey_responses"]["Row"]>;
      };
      recordings: {
        Row: {
          id: string;
          student_id: string;
          source: RecordingSource;
          audio_url: string;
          duration_sec: number | null;
          transcript: string | null;
          ai_summary: string | null;
          ai_next_action: string | null;
          ai_tag_candidates: Json;
          recorded_at: Timestamp;
          uploaded_by: string | null;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: Partial<Database["public"]["Tables"]["recordings"]["Row"]> & {
          student_id: string;
          source: RecordingSource;
          audio_url: string;
        };
        Update: Partial<Database["public"]["Tables"]["recordings"]["Row"]>;
      };
      csv_imports: {
        Row: {
          id: string;
          file_name: string;
          column_mapping: Json;
          status: "pending" | "processing" | "completed" | "failed";
          total_rows: number;
          success_rows: number;
          failed_rows: number;
          skipped_rows: number;
          created_by: string | null;
          created_at: Timestamp;
          completed_at: Timestamp | null;
        };
        Insert: Partial<Database["public"]["Tables"]["csv_imports"]["Row"]> & {
          file_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["csv_imports"]["Row"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      staff_role: StaffRole;
      practical_period: PracticalPeriod;
      action_type: ActionType;
      message_direction: MessageDirection;
      message_type: MessageType;
      broadcast_status: BroadcastStatus;
      survey_question_type: SurveyQuestionType;
      match_type: MatchType;
      recording_source: RecordingSource;
      resource_kind: ResourceKind;
      notification_channel: NotificationChannel;
    };
  };
};
