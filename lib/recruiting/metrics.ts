import {
  emptyRecruitingMetricCounts,
  type RecruitingMetricCounts
} from "@/lib/recruiting/funnel";

const GODAI_EVENT_COLUMNS = [
  "event_hb_fes_date",
  "event_himeji_tour_date",
  "event_real_talk_date",
  "event_company_session_date",
  "event_employee_exchange_date"
] as const;

const GODAI_EVENT_PATTERN =
  /H&B|Ｈ＆Ｂ|H＆B|H and B|フェス|姫路|日帰り|ツアー|リアルトーク|個別会社説明会|会社説明会|社員交流会|交流会/;
const NEXT_ACTIVITY_PATTERN =
  /ネクスト|Zoom|ZOOM|面談|面接|セミナー|説明会|店舗見学|見学|インターン|IS|H&B|Ｈ＆Ｂ|H＆B|フェス|姫路|日帰り|ツアー|リアルトーク|個別会社説明会|社員交流会|薬剤師インタビュー|選考会|内定/;
const INTERVIEW_PATTERN = /薬剤師インタビュー|薬剤師面談|インタビュー/;
const SELECTION_PATTERN = /選考会|選考|面接|専願|併願/;
const OFFER_PATTERN = /内定出し|内定通知|内定を出|内定です|内定を伝/;
const OFFER_ACCEPTED_PATTERN = /内定内諾|内諾|承諾/;
const HIRED_PATTERN = /入社/;

export function calculateRecruitingMetrics(rows: any[]): RecruitingMetricCounts {
  const counts = emptyRecruitingMetricCounts();

  for (const row of rows) {
    const text = buildMetricText(row);
    const hasGodaiEvent = hasAnyGodaiEventDate(row) || GODAI_EVENT_PATTERN.test(text);

    counts.entry += 1;

    if (row.funnel_pool ?? hasConversation(row)) counts.pool += 1;
    if (row.funnel_next ?? hasNextActivity(row, text, hasGodaiEvent)) counts.next += 1;
    if (row.funnel_is ?? hasGodaiEvent) counts.is += 1;
    if (row.funnel_pharmacist_interview ?? INTERVIEW_PATTERN.test(text)) counts.interview += 1;
    if (row.funnel_selection ?? SELECTION_PATTERN.test(text)) counts.selection += 1;
    if (row.funnel_offer ?? OFFER_PATTERN.test(text)) counts.offer += 1;
    if (row.funnel_offer_accepted ?? OFFER_ACCEPTED_PATTERN.test(text)) counts.offerAccepted += 1;
    if (row.funnel_hired ?? HIRED_PATTERN.test(text)) counts.hired += 1;
  }

  return counts;
}

function buildMetricText(row: any) {
  return [
    row.manual_next_action,
    row.ai_next_action,
    row.status,
    row.motivation_rank,
    row.first_contact_method,
    row.first_event_name,
    row.notes,
    ...extractTagNames(row)
  ]
    .filter(Boolean)
    .join(" ");
}

function hasConversation(row: any) {
  return Boolean(row.last_inbound_at || row.last_outbound_at || row.line_user_id);
}

function hasNextActivity(row: any, text: string, hasGodaiEvent: boolean) {
  if (hasGodaiEvent) return true;
  if (!NEXT_ACTIVITY_PATTERN.test(text)) return false;

  const firstContact = String(row.first_contact_method ?? "").replace(/\s+/g, "");
  if (!firstContact) return true;

  const normalizedText = text.replace(/\s+/g, "");
  return !normalizedText.includes(firstContact) || normalizedText.length > firstContact.length;
}

function hasAnyGodaiEventDate(row: any) {
  return GODAI_EVENT_COLUMNS.some((column) => Boolean(row[column]));
}

function extractTagNames(row: any) {
  return (row.student_tags ?? [])
    .map((relation: any) => relation.tags?.name)
    .filter(Boolean) as string[];
}
