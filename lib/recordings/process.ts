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

  const companyContext = await fetchCompanyContext(supabase);
  const summary = await summarizeRecordingWithClaude({
    transcript,
    companyContext
  });
  const nextAction = summary.nextActions.join("\n");

  const { data: recording } = await supabase
    .from("recordings")
    .select("student_id")
    .eq("id", recordingId)
    .single();

  await supabase
    .from("recordings")
    .update({
      transcript,
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

    await supabase
      .from("students")
      .update({ ai_next_action: nextAction || summary.summary })
      .eq("id", recording.student_id);

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
