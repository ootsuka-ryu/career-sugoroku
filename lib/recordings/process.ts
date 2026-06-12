import {
  summarizeRecordingWithClaude,
  type RecordingEventUpdate,
  type RecordingProfileUpdates,
  type RecordingScheduleUpdate
} from "@/lib/ai/claude";
import { transcribeAudioFile } from "@/lib/ai/transcribe";

type SupabaseLike = any;

type StudentLite = {
  id: string;
  display_name: string | null;
  real_name: string | null;
  kana: string | null;
  university: string | null;
  graduation_year: number | null;
};

type AppliedUpdate = {
  type: string;
  label: string;
};

const NON_PERSON_PARTIAL_SUFFIXES = [
  "大学",
  "女子大学",
  "薬科大学",
  "医科大学",
  "医療大学",
  "学院大学",
  "科学大学",
  "短期大学",
  "専門学校",
  "高校",
  "病院",
  "薬局",
  "店舗",
  "セミナー",
  "説明会",
  "交流会",
  "イベント"
];

export async function processRecording({
  supabase,
  recordingId,
  audioFile,
  transcriptOverride
}: {
  supabase: SupabaseLike;
  recordingId: string;
  audioFile?: File;
  transcriptOverride?: string;
}) {
  const transcript =
    transcriptOverride?.trim() ||
    (audioFile ? (await transcribeAudioFile(audioFile)).transcript : "");

  if (!transcript) {
    return {
      transcript: "",
      summary: "",
      nextAction: "",
      tagCandidates: [],
      appliedUpdates: []
    };
  }

  const { error: transcriptUpdateError } = await supabase
    .from("recordings")
    .update({ transcript })
    .eq("id", recordingId);

  if (transcriptUpdateError) throw transcriptUpdateError;

  const { data: recording, error: recordingError } = await supabase
    .from("recordings")
    .select("student_id, uploaded_by")
    .eq("id", recordingId)
    .single();

  if (recordingError) throw recordingError;

  const [companyContext, studentContext, identity] = await Promise.all([
    fetchCompanyContext(supabase),
    fetchStudentContext(supabase, recording?.student_id, recordingId),
    resolveRecordingStudentIdentity(supabase, transcript, recording?.student_id)
  ]);

  const summary = await summarizeRecordingWithClaude({
    transcript,
    companyContext,
    studentContext,
    selectedStudentLabel: identity.selectedStudentLabel
  });

  const shouldUseAiConfirmation =
    !identity.selectedStudentLabel && summary.needsStudentConfirmation;
  const confirmationReason =
    identity.requiresConfirmation || shouldUseAiConfirmation
      ? [identity.reason, shouldUseAiConfirmation ? summary.confirmationReason : ""]
          .filter(Boolean)
          .join("\n")
      : "";
  const canApply = Boolean(recording?.student_id) && !confirmationReason;
  const appliedUpdates: AppliedUpdate[] = [];

  if (canApply) {
    appliedUpdates.push(
      ...(await applyProfileUpdates({
        supabase,
        studentId: recording.student_id,
        updates: summary.profileUpdates,
        scheduleUpdates: summary.scheduleUpdates,
        nextActions: summary.nextActions
      }))
    );
    appliedUpdates.push(
      ...(await applyTagUpdates({
        supabase,
        studentId: recording.student_id,
        tagNames: summary.tagCandidates,
        staffId: recording.uploaded_by ?? null
      }))
    );
    appliedUpdates.push(
      ...(await applyEventUpdates({
        supabase,
        studentId: recording.student_id,
        eventUpdates: summary.eventUpdates
      }))
    );
    appliedUpdates.push(
      ...(await applyScheduleUpdates({
        supabase,
        studentId: recording.student_id,
        staffId: recording.uploaded_by ?? null,
        scheduleUpdates: summary.scheduleUpdates
      }))
    );
  }

  const nextAction = buildNextActionText({
    nextActions: summary.nextActions,
    confirmationReason,
    appliedUpdates
  });

  await supabase
    .from("recordings")
    .update({
      ai_summary: summary.summary,
      ai_next_action: nextAction,
      ai_tag_candidates: summary.tagCandidates
    })
    .eq("id", recordingId);

  if (recording?.student_id) {
    await appendRecordingSummaryToStudentNotes({
      supabase,
      studentId: recording.student_id,
      summary: summary.summary,
      nextAction,
      transcript,
      appliedUpdates
    });

    if (nextAction) {
      await supabase
        .from("students")
        .update({ ai_next_action: nextAction })
        .eq("id", recording.student_id);
    }

    await supabase.from("student_actions").insert({
      student_id: recording.student_id,
      staff_id: recording.uploaded_by ?? null,
      action_type: "ai",
      title: confirmationReason ? "録音AI: 反映前に確認が必要" : "録音AI: 要約と自動反映",
      body: [
        summary.summary,
        nextAction ? `次アクション:\n${nextAction}` : "",
        appliedUpdates.length
          ? `反映内容:\n${appliedUpdates.map((item) => `- ${item.label}`).join("\n")}`
          : confirmationReason
            ? "自動反映は行っていません。"
            : ""
      ]
        .filter(Boolean)
        .join("\n\n"),
      executed_at: new Date().toISOString()
    });
  }

  return {
    transcript,
    summary: summary.summary,
    nextAction,
    tagCandidates: summary.tagCandidates,
    appliedUpdates
  };
}

async function applyProfileUpdates({
  supabase,
  studentId,
  updates,
  scheduleUpdates,
  nextActions
}: {
  supabase: SupabaseLike;
  studentId: string;
  updates: RecordingProfileUpdates;
  scheduleUpdates: RecordingScheduleUpdate[];
  nextActions: string[];
}): Promise<AppliedUpdate[]> {
  const payload: Record<string, unknown> = {};
  const applied: AppliedUpdate[] = [];
  const allowedKeys: Array<keyof RecordingProfileUpdates> = [
    "real_name",
    "kana",
    "university",
    "grade",
    "graduation_year",
    "phone",
    "email",
    "desired_job_type",
    "desired_area",
    "motivation_rank",
    "candidate_stage",
    "first_contact_method",
    "first_contact_date",
    "manual_next_action",
    "funnel_next",
    "funnel_is",
    "funnel_pharmacist_interview",
    "funnel_selection",
    "funnel_offer",
    "funnel_offer_accepted",
    "funnel_hired"
  ];

  for (const key of allowedKeys) {
    const value = updates[key];
    if (value === undefined || value === null || value === "") continue;
    payload[key] = value;
  }

  const nextActionLines = [
    ...nextActions,
    ...scheduleUpdates.map((item) =>
      [item.dueAt ? `${formatDateForNote(item.dueAt)}まで` : "", item.title, item.memo]
        .filter(Boolean)
        .join(" / ")
    )
  ].filter(Boolean);

  if (nextActionLines.length > 0 && !payload.manual_next_action) {
    payload.manual_next_action = nextActionLines.join("\n");
  }

  if (Object.keys(payload).length === 0) return applied;

  if (typeof payload.real_name === "string" && payload.real_name) {
    payload.display_name = payload.real_name;
  }

  const { error } = await supabase.from("students").update(payload).eq("id", studentId);
  if (isMissingStudentColumnError(error)) {
    const fallbackPayload = { ...payload };
    for (const key of Object.keys(fallbackPayload)) {
      if (error.message?.includes(key)) delete fallbackPayload[key];
    }
    if (Object.keys(fallbackPayload).length > 0) {
      const retry = await supabase.from("students").update(fallbackPayload).eq("id", studentId);
      if (retry.error) return applied;
    }
  } else if (error) {
    return applied;
  }

  applied.push({
    type: "profile",
    label: `学生情報を更新: ${Object.keys(payload).join(", ")}`
  });
  return applied;
}

async function applyTagUpdates({
  supabase,
  studentId,
  tagNames,
  staffId
}: {
  supabase: SupabaseLike;
  studentId: string;
  tagNames: string[];
  staffId: string | null;
}): Promise<AppliedUpdate[]> {
  const names = uniqueCleanStrings(tagNames).slice(0, 12);
  if (names.length === 0) return [];

  const { data: tags, error } = await supabase
    .from("tags")
    .upsert(
      names.map((name) => ({
        name,
        color: inferTagColor(name),
        created_by: staffId
      })),
      { onConflict: "name" }
    )
    .select("id, name");

  if (error || !tags?.length) return [];

  await supabase.from("student_tags").upsert(
    tags.map((tag: { id: string }) => ({
      student_id: studentId,
      tag_id: tag.id,
      created_by: staffId
    })),
    { onConflict: "student_id,tag_id" }
  );

  return [
    {
      type: "tags",
      label: `タグを追加: ${tags.map((tag: { name: string }) => tag.name).join("、")}`
    }
  ];
}

async function applyEventUpdates({
  supabase,
  studentId,
  eventUpdates
}: {
  supabase: SupabaseLike;
  studentId: string;
  eventUpdates: RecordingEventUpdate[];
}): Promise<AppliedUpdate[]> {
  if (eventUpdates.length === 0) return [];

  const { data: events } = await supabase
    .from("recruiting_events")
    .select("id, title, starts_at, event_type, location")
    .order("starts_at", { ascending: false })
    .limit(200);

  const applied: AppliedUpdate[] = [];
  for (const update of eventUpdates) {
    const event = findMatchingEvent(events ?? [], update);
    if (!event) continue;

    const { error } = await supabase.from("event_participants").upsert(
      {
        event_id: event.id,
        student_id: studentId,
        status: update.status,
        memo: update.memo || null,
        source: "recording_ai"
      },
      { onConflict: "event_id,student_id" }
    );
    if (error) continue;

    applied.push({
      type: "event",
      label: `イベント「${event.title}」を${update.status}で登録`
    });
  }

  return applied;
}

async function applyScheduleUpdates({
  supabase,
  studentId,
  staffId,
  scheduleUpdates
}: {
  supabase: SupabaseLike;
  studentId: string;
  staffId: string | null;
  scheduleUpdates: RecordingScheduleUpdate[];
}): Promise<AppliedUpdate[]> {
  const schedules = scheduleUpdates.filter((item) => item.title.trim()).slice(0, 8);
  if (schedules.length === 0) return [];

  await supabase.from("student_actions").insert(
    schedules.map((item) => ({
      student_id: studentId,
      staff_id: staffId,
      action_type: "note",
      title: `AI予定: ${item.title}`,
      body: [item.dueAt ? `予定日時: ${formatDateForNote(item.dueAt)}` : "", item.memo || ""]
        .filter(Boolean)
        .join("\n"),
      executed_at: new Date().toISOString()
    }))
  );

  return schedules.map((item) => ({
    type: "schedule",
    label: `予定を履歴に追加: ${item.title}`
  }));
}

async function appendRecordingSummaryToStudentNotes({
  supabase,
  studentId,
  summary,
  nextAction,
  transcript,
  appliedUpdates
}: {
  supabase: SupabaseLike;
  studentId: string;
  summary: string;
  nextAction: string;
  transcript: string;
  appliedUpdates: AppliedUpdate[];
}) {
  const { data: student, error } = await supabase
    .from("students")
    .select("notes")
    .eq("id", studentId)
    .maybeSingle();

  if (isMissingNotesColumnError(error)) return;
  if (error) throw error;

  const entry = buildRecordingNoteEntry({ summary, nextAction, transcript, appliedUpdates });
  const currentNotes = String(student?.notes ?? "").trim();
  const notes = currentNotes ? `${currentNotes}\n\n${entry}` : entry;

  const { error: updateError } = await supabase
    .from("students")
    .update({ notes })
    .eq("id", studentId);

  if (isMissingNotesColumnError(updateError)) return;
  if (updateError) throw updateError;
}

function buildRecordingNoteEntry({
  summary,
  nextAction,
  transcript,
  appliedUpdates
}: {
  summary: string;
  nextAction: string;
  transcript: string;
  appliedUpdates: AppliedUpdate[];
}) {
  const timestamp = new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Tokyo"
  }).format(new Date());
  const transcriptExcerpt = transcript.length > 1200 ? `${transcript.slice(0, 1200)}...` : transcript;

  return [
    `【録音AI要約 ${timestamp}】`,
    "要約:",
    summary || "-",
    "",
    "次アクション:",
    nextAction || "-",
    "",
    "自動反映:",
    appliedUpdates.length ? appliedUpdates.map((item) => `- ${item.label}`).join("\n") : "-",
    "",
    "文字起こし:",
    transcriptExcerpt || "-"
  ].join("\n");
}

function buildNextActionText({
  nextActions,
  confirmationReason,
  appliedUpdates
}: {
  nextActions: string[];
  confirmationReason: string;
  appliedUpdates: AppliedUpdate[];
}) {
  if (confirmationReason) {
    return [
      "自動反映前に確認が必要です。",
      confirmationReason,
      "対象学生を確認してから、必要なタグ・参加イベント・予定を手動で反映してください。"
    ].join("\n");
  }

  const lines = [...nextActions];
  if (appliedUpdates.length > 0) {
    lines.push("【自動反映済み】");
    lines.push(...appliedUpdates.map((item) => `- ${item.label}`));
  }
  return lines.join("\n");
}

async function resolveRecordingStudentIdentity(
  supabase: SupabaseLike,
  transcript: string,
  selectedStudentId: string | null | undefined
) {
  const { data } = await supabase
    .from("students")
    .select("id, display_name, real_name, kana, university, graduation_year")
    .limit(2000);

  const students = (data ?? []) as StudentLite[];
  const matches = findMentionedStudents(transcript, students);
  const exactMatches = uniqueStudentMatches(matches.filter((match) => match.kind === "full"));
  const selected = students.find((student) => student.id === selectedStudentId);
  const selectedStudentLabel = selected ? displayStudent(selected) : "";

  if (selectedStudentId) {
    const otherExactMatches = exactMatches.filter((match) => match.student.id !== selectedStudentId);
    if (otherExactMatches.length === 1) {
      const match = otherExactMatches[0]!;
      return {
        requiresConfirmation: true,
        selectedStudentLabel,
        reason: `録音内では「${displayStudent(match.student)}」の氏名が出ていますが、録音の紐づけ先は「${selected ? displayStudent(selected) : selectedStudentId}」です。`
      };
    }
    if (otherExactMatches.length > 1) {
      return {
        requiresConfirmation: true,
        selectedStudentLabel,
        reason: `録音内に選択中の学生とは別の氏名が複数出ています: ${otherExactMatches
          .map((match) => displayStudent(match.student))
          .join("、")}`
      };
    }

    return { requiresConfirmation: false, reason: "", selectedStudentLabel };
  }

  if (exactMatches.length === 1) {
    return { requiresConfirmation: false, reason: "", selectedStudentLabel: displayStudent(exactMatches[0]!.student) };
  }

  if (exactMatches.length > 1) {
    return {
      requiresConfirmation: true,
      selectedStudentLabel,
      reason: `録音内の氏名に一致する学生が複数います: ${exactMatches
        .map((match) => displayStudent(match.student))
        .join("、")}`
    };
  }

  if (selectedStudentId) {
    return { requiresConfirmation: false, reason: "", selectedStudentLabel };
  }

  if (matches.length > 1) {
    const candidateIds = new Set(matches.map((match) => match.student.id));
    if (candidateIds.size > 1) {
      return {
        requiresConfirmation: true,
        selectedStudentLabel,
        reason: `名字または呼び名が近い学生が複数います: ${Array.from(candidateIds)
          .map((id) => students.find((student) => student.id === id))
          .filter((student): student is StudentLite => Boolean(student))
          .map(displayStudent)
          .join("、")}`
      };
    }
  }

  return { requiresConfirmation: false, reason: "", selectedStudentLabel };
}

function uniqueStudentMatches(matches: Array<{ student: StudentLite; kind: "full" | "partial" }>) {
  const seen = new Set<string>();
  return matches.filter((match) => {
    if (seen.has(match.student.id)) return false;
    seen.add(match.student.id);
    return true;
  });
}

function findMentionedStudents(transcript: string, students: StudentLite[]) {
  const normalizedTranscript = normalizeForMatch(transcript);
  const matches: Array<{ student: StudentLite; kind: "full" | "partial" }> = [];

  for (const student of students) {
    const fullTokens = uniqueCleanStrings([
      student.real_name,
      student.display_name,
      student.kana
    ])
      .map(normalizeForMatch)
      .filter((token) => token.length >= 3);
    const partialTokens = uniqueCleanStrings([
      getFirstNamePart(student.real_name),
      getFirstNamePart(student.display_name),
      getFirstNamePart(student.kana)
    ])
      .map(normalizeForMatch)
      .filter((token) => token.length >= 2);

    if (fullTokens.some((token) => normalizedTranscript.includes(token))) {
      matches.push({ student, kind: "full" });
    } else if (partialTokens.some((token) => hasPersonLikePartialMention(normalizedTranscript, token))) {
      matches.push({ student, kind: "partial" });
    }
  }

  return matches;
}

function hasPersonLikePartialMention(normalizedTranscript: string, token: string) {
  let searchStart = 0;

  while (searchStart < normalizedTranscript.length) {
    const index = normalizedTranscript.indexOf(token, searchStart);
    if (index === -1) return false;

    const suffix = normalizedTranscript.slice(index + token.length, index + token.length + 10);
    const isNonPersonContext = NON_PERSON_PARTIAL_SUFFIXES.some((word) =>
      suffix.startsWith(normalizeForMatch(word))
    );
    if (!isNonPersonContext) return true;

    searchStart = index + token.length;
  }

  return false;
}

async function fetchCompanyContext(supabase: SupabaseLike) {
  const { data } = await supabase
    .from("company_resources")
    .select("title, body_markdown")
    .eq("is_ai_context", true)
    .limit(10);

  return (data ?? [])
    .map((resource: { title: string; body_markdown: string }) => {
      return `# ${resource.title}\n${resource.body_markdown}`;
    })
    .join("\n\n");
}

async function fetchStudentContext(
  supabase: SupabaseLike,
  studentId: string | null | undefined,
  currentRecordingId: string
) {
  if (!studentId) return "";

  const [student, messages, actions, surveys, events, recordings, availableEvents] =
    await Promise.all([
      supabase
        .from("students")
        .select(
          `
          id, display_name, real_name, kana, university, grade, graduation_year,
          practical_period, desired_job_type, desired_area, motivation_level,
          motivation_rank, candidate_stage, decline_reason, first_contact_method,
          first_contact_date, last_inbound_at, last_outbound_at, manual_next_action,
          ai_next_action, status, notes,
          funnel_entry, funnel_uncontacted, funnel_pool, funnel_next, funnel_is,
          funnel_pharmacist_interview, funnel_selection, funnel_offer,
          funnel_offer_accepted, funnel_hired,
          student_tags(tags(name)),
          student_assignees(staff_users!student_assignees_staff_id_fkey(name))
        `
        )
        .eq("id", studentId)
        .maybeSingle(),
      supabase
        .from("messages")
        .select("direction, type, payload, status, sent_at")
        .eq("student_id", studentId)
        .order("sent_at", { ascending: false })
        .limit(20),
      supabase
        .from("student_actions")
        .select("action_type, title, body, executed_at")
        .eq("student_id", studentId)
        .order("executed_at", { ascending: false })
        .limit(15),
      supabase
        .from("survey_responses")
        .select("submitted_at, raw_answers_jsonb, surveys(title)")
        .eq("student_id", studentId)
        .order("submitted_at", { ascending: false })
        .limit(8),
      supabase
        .from("event_participants")
        .select(
          "status, memo, created_at, recruiting_events(title, event_type, starts_at, location, next_action)"
        )
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("recordings")
        .select("ai_summary, ai_next_action, transcript, recorded_at")
        .eq("student_id", studentId)
        .neq("id", currentRecordingId)
        .order("recorded_at", { ascending: false })
        .limit(5),
      supabase
        .from("recruiting_events")
        .select("title, event_type, starts_at, location, next_action")
        .order("starts_at", { ascending: false })
        .limit(50)
    ]);

  return stringifyAiContext({
    profile: student.data ?? null,
    recentMessages: messages.data ?? [],
    recentActions: actions.data ?? [],
    recentSurveyResponses: surveys.data ?? [],
    recentEventParticipation: events.data ?? [],
    previousRecordingSummaries: recordings.data ?? [],
    availableEvents: availableEvents.data ?? []
  });
}

function findMatchingEvent(events: any[], update: RecordingEventUpdate) {
  const title = normalizeForMatch(update.eventTitle);
  const candidates = events.filter((event) => {
    const eventTitle = normalizeForMatch(event.title);
    return eventTitle.includes(title) || title.includes(eventTitle);
  });
  const dated = update.eventDate
    ? candidates.filter((event) => sameJstDate(event.starts_at, update.eventDate))
    : [];
  if (dated.length === 1) return dated[0];
  if (candidates.length === 1) return candidates[0];
  return null;
}

function sameJstDate(left: string | null | undefined, right: string | null | undefined) {
  if (!left || !right) return false;
  return toJstDateKey(left) === toJstDateKey(right);
}

function toJstDateKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  return `${year}-${month}-${day}`;
}

function formatDateForNote(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function inferTagColor(name: string) {
  if (/国立|大学|卒|薬科|医療/.test(name)) return "#2563eb";
  if (/参加|済|ネクスト|面談|見学|イベント/.test(name)) return "#009944";
  if (/返信|待ち|注意|未/.test(name)) return "#dc2626";
  return "#0ea5e9";
}

function isMissingNotesColumnError(error: any) {
  return Boolean(error?.message?.includes("notes") || error?.details?.includes("notes"));
}

function isMissingStudentColumnError(error: any) {
  return Boolean(error?.message?.includes("column") || error?.message?.includes("schema cache"));
}

function stringifyAiContext(value: unknown) {
  const text = JSON.stringify(
    value,
    (_key, item) =>
      typeof item === "string" && item.length > 2500
        ? `${item.slice(0, 2500)}...`
        : item,
    2
  );

  return text.length > 50000
    ? `${text.slice(0, 50000)}\n...（長い履歴の一部を省略）`
    : text;
}

function displayStudent(student: StudentLite) {
  return [
    student.real_name || student.display_name || "名前未設定",
    student.kana,
    student.university,
    student.graduation_year ? `${student.graduation_year}卒` : ""
  ]
    .filter(Boolean)
    .join(" / ");
}

function getFirstNamePart(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const parts = text.split(/[\s　]+/).filter(Boolean);
  return parts[0] ?? "";
}

function normalizeForMatch(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/さん|様|くん|ちゃん/g, "")
    .replace(/[\s　・･,，.。()（）\[\]【】「」『』]/g, "");
}

function uniqueCleanStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => String(value ?? "").trim())
        .filter(Boolean)
    )
  );
}
