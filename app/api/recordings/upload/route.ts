import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { processRecording } from "@/lib/recordings/process";
import { uploadRecordingFile } from "@/lib/recordings/storage";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const studentId = String(formData.get("student_id") ?? "");
  const source = String(formData.get("source") ?? "upload");
  const durationSec = Number(formData.get("duration_sec") ?? 0) || null;
  const transcript = String(formData.get("transcript") ?? "").trim();
  const shouldProcessAi = formData.get("process_ai") === "true";
  const audio = formData.get("audio");

  if (!studentId) {
    return NextResponse.json(
      { error: "student_id is required" },
      { status: 400 }
    );
  }

  if (!(audio instanceof File) || audio.size === 0) {
    return NextResponse.json(
      { error: "audio file is required" },
      { status: 400 }
    );
  }

  if (!["browser", "upload"].includes(source)) {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  }

  const admin = createAdminClient() as any;
  const storage = await uploadRecordingFile({
    bytes: await audio.arrayBuffer(),
    fileName: audio.name || "recording.webm",
    contentType: audio.type || "audio/webm",
    studentId
  });

  const { data: recording, error } = await admin
    .from("recordings")
    .insert({
      student_id: studentId,
      source,
      audio_url: storage.signedUrl,
      duration_sec: durationSec,
      transcript: transcript || null,
      uploaded_by: user.id,
      recorded_at: new Date().toISOString()
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let aiResult = null;
  if (shouldProcessAi) {
    aiResult = await processRecording({
      supabase: admin,
      recordingId: recording.id,
      audioFile: audio,
      transcriptOverride: transcript
    });
  }

  return NextResponse.json({
    recording,
    aiResult
  });
}
