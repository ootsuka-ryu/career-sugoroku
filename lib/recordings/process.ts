import { summarizeRecordingWithClaude } from "@/lib/ai/claude";
import { transcribeAudioFile } from "@/lib/ai/transcribe";

type SupabaseLike = any;

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
      tagCandidates: []
    };
  }

  const { error: transcriptUpdateError } = await supabase
    .from("recordings")
    .update({ transcript })
    .eq("id", recordingId);

  if (transcriptUpdateError) throw transcriptUpdateError;

  const { data: recording, error: recordingError } = await supabase
    .from("recordings")
    .select("student_id")
    .eq("id", recordingId)
    .single();

  if (recordingError) throw recordingError;

  const [companyContext, studentContext] = await Promise.all([
    fetchCompanyContext(supabase),
    fetchStudentContext(supabase, recording?.student_id, recordingId)
  ]);
  const summary = await summarizeRecordingWithClaude({
    transcript,
    companyContext,
    studentContext
  });
  const nextAction = summary.nextActions.join("\n");

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
      transcript
    });

    if (nextAction) {
      await supabase
        .from("students")
        .update({ ai_next_action: nextAction })
        .eq("id", recording.student_id);
    }

    await supabase.from("student_actions").insert({
      student_id: recording.student_id,
      staff_id: null,
      action_type: "ai",
      title: "Recording AI summary",
      body: `${summary.summary}\n\nNext actions:\n${nextAction}`,
      executed_at: new Date().toISOString()
    });
  }

  return {
    transcript,
    summary: summary.summary,
    nextAction,
    tagCandidates: summary.tagCandidates
  };
}

async function appendRecordingSummaryToStudentNotes({
  supabase,
  studentId,
  summary,
  nextAction,
  transcript
}: {
  supabase: SupabaseLike;
  studentId: string;
  summary: string;
  nextAction: string;
  transcript: string;
}) {
  const { data: student, error } = await supabase
    .from("students")
    .select("notes")
    .eq("id", studentId)
    .maybeSingle();

  if (isMissingNotesColumnError(error)) return;
  if (error) throw error;

  const entry = buildRecordingNoteEntry({ summary, nextAction, transcript });
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
  transcript
}: {
  summary: string;
  nextAction: string;
  transcript: string;
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
    "文字起こし:",
    transcriptExcerpt || "-"
  ].join("\n");
}

function isMissingNotesColumnError(error: any) {
  return Boolean(error?.message?.includes("notes") || error?.details?.includes("notes"));
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

  const [student, messages, actions, surveys, events, recordings] = await Promise.all([
    supabase
      .from("students")
      .select(
        `
        id, display_name, real_name, kana, university, grade, graduation_year,
        practical_period, desired_job_type, desired_area, motivation_level,
        motivation_rank, candidate_stage, decline_reason, first_contact_method,
        first_contact_date, last_inbound_at, last_outbound_at, manual_next_action,
        ai_next_action, status, notes,
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
      .select("ai_summary, ai_next_action, recorded_at")
      .eq("student_id", studentId)
      .neq("id", currentRecordingId)
      .order("recorded_at", { ascending: false })
      .limit(5)
  ]);

  return stringifyAiContext({
    profile: student.data ?? null,
    recentMessages: messages.data ?? [],
    recentActions: actions.data ?? [],
    recentSurveyResponses: surveys.data ?? [],
    recentEventParticipation: events.data ?? [],
    previousRecordingSummaries: recordings.data ?? []
  });
}

function stringifyAiContext(value: unknown) {
  const text = JSON.stringify(
    value,
    (_key, item) =>
      typeof item === "string" && item.length > 2500
        ? `${item.slice(0, 2500)}…`
        : item,
    2
  );

  return text.length > 50000
    ? `${text.slice(0, 50000)}\n…（古い履歴の一部を省略）`
    : text;
}
