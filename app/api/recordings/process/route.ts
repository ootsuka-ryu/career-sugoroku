import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { processRecording } from "@/lib/recordings/process";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { recordingId } = await request.json();
  if (!recordingId) {
    return NextResponse.json(
      { error: "recordingId is required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient() as any;
  const { data: recording, error } = await admin
    .from("recordings")
    .select("*")
    .eq("id", recordingId)
    .single();

  if (error || !recording) {
    return NextResponse.json(
      { error: error?.message ?? "Recording not found" },
      { status: 404 }
    );
  }

  let audioFile: File | undefined;
  if (!recording.transcript && recording.audio_url) {
    const response = await fetch(recording.audio_url);
    if (response.ok) {
      const blob = await response.blob();
      audioFile = new File([blob], "recording.audio", {
        type: blob.type || "audio/webm"
      });
    }
  }

  const result = await processRecording({
    supabase: admin,
    recordingId,
    audioFile,
    transcriptOverride: recording.transcript ?? undefined
  });

  return NextResponse.json(result);
}
