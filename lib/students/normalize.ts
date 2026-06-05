import type {
  StaffSummary,
  StudentDetail,
  StudentListItem,
  TagSummary
} from "@/lib/students/types";

type RelationList<T> = T[] | null | undefined;

type StudentTagRelation = {
  tags?: TagSummary | null;
};

type StudentAssigneeRelation = {
  staff_users?: StaffSummary | null;
};

export function normalizeStudentListItem(row: any): StudentListItem {
  return {
    id: row.id,
    display_name: row.display_name,
    real_name: row.real_name,
    kana: row.kana,
    university: row.university,
    grade: row.grade,
    graduation_year: row.graduation_year,
    practical_period: row.practical_period,
    desired_area: row.desired_area ?? null,
    first_contact_method: row.first_contact_method ?? null,
    first_contact_date: row.first_contact_date ?? null,
    motivation_level: row.motivation_level,
    motivation_rank: row.motivation_rank ?? null,
    candidate_stage: row.candidate_stage ?? null,
    decline_reason: row.decline_reason ?? null,
    last_inbound_at: row.last_inbound_at,
    last_outbound_at: row.last_outbound_at,
    ai_next_action: row.ai_next_action,
    manual_next_action: row.manual_next_action,
    notes: row.notes ?? null,
    photo_url: row.photo_url ?? null,
    photo_position_x: row.photo_position_x ?? 50,
    photo_position_y: row.photo_position_y ?? 50,
    photo_scale: row.photo_scale ?? 100,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    funnel_entry: row.funnel_entry ?? true,
    funnel_uncontacted: row.funnel_uncontacted ?? !row.last_inbound_at,
    funnel_pool: row.funnel_pool ?? Boolean(row.last_inbound_at || row.last_outbound_at),
    funnel_next: row.funnel_next ?? hasMatchingTag(row.student_tags, ["ネクスト"]),
    funnel_is: row.funnel_is ?? hasMatchingTag(row.student_tags, ["IS", "インターン", "ツアー", "説明会", "交流"]),
    funnel_pharmacist_interview:
      row.funnel_pharmacist_interview ?? hasMatchingTag(row.student_tags, ["薬剤師インタビュー", "インタビュー"]),
    funnel_selection:
      row.funnel_selection ?? ["専願", "併願"].includes(String(row.motivation_rank ?? "")),
    funnel_offer: row.funnel_offer ?? hasMatchingTag(row.student_tags, ["内定出し", "内定"]),
    funnel_offer_accepted: row.funnel_offer_accepted ?? hasMatchingTag(row.student_tags, ["内定内諾", "内諾"]),
    funnel_hired: row.funnel_hired ?? hasMatchingTag(row.student_tags, ["入社"]),
    tags: extractTags(row.student_tags),
    assignees: extractAssignees(row.student_assignees)
  };
}

export function normalizeStudentDetail(row: any): StudentDetail {
  return {
    ...normalizeStudentListItem(row),
    line_user_id: row.line_user_id,
    phone: row.phone,
    email: row.email,
    desired_job_type: row.desired_job_type,
    optimistic_lock_version: row.optimistic_lock_version
  };
}

function extractTags(relations: RelationList<StudentTagRelation>) {
  return (relations ?? [])
    .map((relation) => relation.tags)
    .filter(Boolean) as TagSummary[];
}

function extractAssignees(relations: RelationList<StudentAssigneeRelation>) {
  return (relations ?? [])
    .map((relation) => relation.staff_users)
    .filter(Boolean) as StaffSummary[];
}

function hasMatchingTag(relations: RelationList<StudentTagRelation>, keywords: string[]) {
  return extractTags(relations).some((tag) =>
    keywords.some((keyword) => tag.name.includes(keyword))
  );
}
