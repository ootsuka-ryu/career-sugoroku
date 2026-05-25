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
