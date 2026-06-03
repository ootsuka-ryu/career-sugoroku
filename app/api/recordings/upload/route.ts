import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { processRecording } from "@/lib/recordings/process";
import { uploadRecordingFile } from "@/lib/recordings/storage";

const MAX_RECORDING_UPLOAD_BYTES = 45 * 1024 * 1024;

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

  if (!isUploadedFile(audio)) {
    return NextResponse.json(
      { error: "audio file is required" },
      { status: 400 }
    );
  }

  if (audio.size > MAX_RECORDING_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        error:
          `音声ファイルが大きすぎます。現在 ${formatBytes(audio.size)} です。` +
          `保存できる目安は ${formatBytes(MAX_RECORDING_UPLOAD_BYTES)} までなので、短く録音するか、mp3/m4a/webmに圧縮してからアップロードしてください。`
      },
      { status: 413 }
    );
  }

  if (!["browser", "upload"].includes(source)) {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  }

  const admin = createAdminClient() as any;
  let storage;
  try {
    storage = await uploadRecordingFile({
      bytes: await audio.arrayBuffer(),
      fileName: audio.name || "recording.webm",
      contentType: audio.type || "audio/webm",
      studentId
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("maximum allowed size")) {
      return NextResponse.json(
        {
          error:
            `Supabaseの保存上限を超えています。現在の音声サイズは ${formatBytes(audio.size)} です。` +
            "Storage全体の上限、またはrecordingsバケットの上限を確認してください。"
        },
        { status: 413 }
      );
    }
    return NextResponse.json(
      { error: message || "音声ファイルを保存できませんでした。" },
      { status: 500 }
    );
  }

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
  let aiError = null;
  if (shouldProcessAi) {
    try {
      aiResult = await processRecording({
        supabase: admin,
        recordingId: recording.id,
        audioFile: audio,
        transcriptOverride: transcript
      });
    } catch (error) {
      aiError = error instanceof Error ? error.message : "AI処理に失敗しました。";
    }
  }

  return NextResponse.json({
    recording,
    aiResult,
    aiError
  });
}

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return Boolean(
    value &&
      typeof value === "object" &&
      "arrayBuffer" in value &&
      typeof value.arrayBuffer === "function" &&
      "size" in value &&
      Number(value.size) > 0
  );
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 MB";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const precision = unitIndex === 0 ? 0 : size >= 10 ? 1 : 2;
  return `${size.toFixed(precision)} ${units[unitIndex]}`;
}
