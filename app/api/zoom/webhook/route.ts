import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  return NextResponse.json({ ok: true, route: "zoom-webhook" });
}

export async function POST(request: Request) {
  const payload = await request.json();

  if (payload.event === "endpoint.url_validation") {
    const plainToken = payload.payload?.plainToken;
    const secret = process.env.ZOOM_WEBHOOK_SECRET_TOKEN;

    if (!plainToken || !secret) {
      return NextResponse.json(
        { error: "Zoom webhook secret is not configured." },
        { status: 400 }
      );
    }

    const encryptedToken = createHmac("sha256", secret)
      .update(plainToken)
      .digest("hex");

    return NextResponse.json({ plainToken, encryptedToken });
  }

  if (payload.event !== "recording.completed") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const url = new URL(request.url);
  const studentId = url.searchParams.get("studentId");
  const recordingFile = payload.payload?.object?.recording_files?.find(
    (file: { file_type?: string; download_url?: string }) => {
      return file.download_url && ["M4A", "MP4"].includes(file.file_type ?? "");
    }
  );

  if (!studentId || !recordingFile?.download_url) {
    return NextResponse.json({
      ok: true,
      stored: false,
      message:
        "Zoom recording received. Add ?studentId=... to link it automatically."
    });
  }

  const admin = createAdminClient() as any;
  const { data, error } = await admin
    .from("recordings")
    .insert({
      student_id: studentId,
      source: "zoom",
      audio_url: recordingFile.download_url,
      duration_sec: payload.payload?.object?.duration ?? null,
      recorded_at:
        payload.payload?.object?.start_time ?? new Date().toISOString()
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, stored: true, recording: data });
}
