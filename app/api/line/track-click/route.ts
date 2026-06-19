import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type StudentRecord = {
  id: string;
  real_name: string | null;
  display_name: string | null;
};

export async function GET(request: NextRequest) {
  const targetUrl = getTargetUrl(request);
  if (!targetUrl) {
    return NextResponse.json({ error: "Invalid tracking URL." }, { status: 400 });
  }

  const label = request.nextUrl.searchParams.get("label")?.trim() || targetUrl.hostname;
  const source = request.nextUrl.searchParams.get("source")?.trim() || "line_link";
  const studentId = request.nextUrl.searchParams.get("studentId");
  const lineUserId = request.nextUrl.searchParams.get("lineUserId");

  try {
    await recordClick({
      targetUrl: targetUrl.toString(),
      label,
      source,
      studentId,
      lineUserId
    });
  } catch (error) {
    console.error("Failed to record LINE link click", error);
  }

  return NextResponse.redirect(targetUrl.toString(), { status: 302 });
}

function getTargetUrl(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("u");
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

async function recordClick({
  targetUrl,
  label,
  source,
  studentId,
  lineUserId
}: {
  targetUrl: string;
  label: string;
  source: string;
  studentId: string | null;
  lineUserId: string | null;
}) {
  const supabase = createAdminClient() as any;
  const student = await findStudent(supabase, studentId, lineUserId);
  if (!student) return;

  const clickedAt = new Date().toISOString();
  const title = `${label} のリンクをタップしました`;
  const body = `${title}。\n${targetUrl}`;

  await supabase.from("messages").insert({
    student_id: student.id,
    direction: "in",
    type: "text",
    payload: {
      text: title,
      event: "line_link_click",
      label,
      url: targetUrl,
      source,
      clicked_at: clickedAt
    },
    status: "received",
    sent_at: clickedAt
  });

  await supabase.from("student_actions").insert({
    student_id: student.id,
    action_type: "line",
    title: "リンクをタップ",
    body,
    executed_at: clickedAt
  });
}

async function findStudent(
  supabase: any,
  studentId: string | null,
  lineUserId: string | null
): Promise<StudentRecord | null> {
  if (studentId) {
    const { data } = await supabase
      .from("students")
      .select("id, real_name, display_name")
      .eq("id", studentId)
      .maybeSingle();
    if (data) return data as StudentRecord;
  }

  if (lineUserId) {
    const { data } = await supabase
      .from("students")
      .select("id, real_name, display_name")
      .eq("line_user_id", lineUserId)
      .maybeSingle();
    if (data) return data as StudentRecord;
  }

  return null;
}
