import type {
  ActionType,
  Json,
  MessageDirection,
  MessageType,
  PracticalPeriod,
  RecordingSource
} from "@/lib/supabase/database.types";

export type StaffSummary = {
  id: string;
  name: string;
  email: string;
};

export type TagSummary = {
  id: string;
  name: string;
  color: string;
};

export type StudentListItem = {
  id: string;
  line_user_id: string | null;
  display_name: string | null;
  real_name: string | null;
  kana: string | null;
  university: string | null;
  grade: string | null;
  graduation_year: number | null;
  practical_period: PracticalPeriod;
  desired_area: string | null;
  first_contact_method: string | null;
  first_contact_date: string | null;
  motivation_level: number | null;
  motivation_rank: string | null;
  candidate_stage: string | null;
  decline_reason: string | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  ai_next_action: string | null;
  manual_next_action: string | null;
  notes: string | null;
  line_picture_url: string | null;
  photo_url: string | null;
  photo_position_x: number;
  photo_position_y: number;
  photo_scale: number;
  status: string;
  created_at: string;
  updated_at: string;
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
  tags: TagSummary[];
  assignees: StaffSummary[];
};

export type StudentDetail = StudentListItem & {
  phone: string | null;
  email: string | null;
  desired_job_type: string | null;
  optimistic_lock_version: number;
};

export type StudentActionItem = {
  id: string;
  action_type: ActionType;
  title: string;
  body: string | null;
  executed_at: string;
  staff: StaffSummary | null;
};

export type StudentMessageItem = {
  id: string;
  direction: MessageDirection;
  type: MessageType;
  payload: Json;
  sent_at: string;
  staff: StaffSummary | null;
};

export type StudentSurveyResponseItem = {
  id: string;
  submitted_at: string;
  raw_answers_jsonb: Json;
  survey: {
    title: string;
    questions?: Array<{
      id: string;
      label: string;
      order: number;
    }>;
  } | null;
};

export type StudentRecordingItem = {
  id: string;
  source: RecordingSource;
  audio_url: string;
  duration_sec: number | null;
  transcript: string | null;
  ai_summary: string | null;
  ai_next_action: string | null;
  recorded_at: string;
};
