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
    return NextResponse.json(
      { error: "ログイン状態を確認できませんでした。再ログインしてからAI処理を実行してください。" },
      { status: 401 }
    );
  }

  const { recordingId } = await request.json();
  if (!recordingId) {
    return NextResponse.json(
      { error: "AI処理する録音が指定されていません。" },
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
      { error: error?.message ?? "録音が見つかりません。" },
      { status: 404 }
    );
  }

  let audioFile: File | undefined;
  if (!recording.transcript && recording.audio_url) {
    const response = await fetch(recording.audio_url).catch(() => null);
    if (response?.ok) {
      const blob = await response.blob();
      audioFile = new File([blob], "recording.audio", {
        type: blob.type || "audio/webm"
      });
    }
  }

  try {
    const result = await processRecording({
      supabase: admin,
      recordingId,
      audioFile,
      transcriptOverride: recording.transcript ?? undefined
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "AI処理に失敗しました。"
      },
      { status: 502 }
    );
  }
}
