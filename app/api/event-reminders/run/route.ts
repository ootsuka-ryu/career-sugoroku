import { NextResponse, type NextRequest } from "next/server";
import { pushLineMessage } from "@/lib/line/client";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const providedSecret = request.headers.get("x-cron-secret");

  if (cronSecret && providedSecret !== cronSecret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient() as any;
  const { data: reminders, error } = await supabase
    .from("event_reminders")
    .select("id, event_id, student_id, message, send_at, students(id, line_user_id)")
    .eq("status", "scheduled")
    .lte("send_at", new Date().toISOString())
    .order("send_at", { ascending: true })
    .limit(50);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const results = [];
  let sentCount = 0;

  for (const reminder of reminders ?? []) {
    const outcome = await processReminder(supabase, reminder);
    if (outcome.sent) sentCount += 1;
    results.push({ reminderId: reminder.id, ...outcome });
  }

  if (sentCount > 0) {
    await supabase.from("line_usage_events").insert({
      event_month: new Date().toISOString().slice(0, 7) + "-01",
      message_count: sentCount,
      source: "event_reminder"
    });
  }

  return NextResponse.json({
    ok: true,
    processed: results.length,
    sentCount,
    results
  });
}

async function processReminder(supabase: any, reminder: any) {
  const student = normalizeJoinedStudent(reminder.students);
  if (!student?.line_user_id) {
    await markReminder(supabase, reminder.id, "skipped", "LINE IDが未連携のため送信できませんでした。");
    return { sent: false, status: "skipped", reason: "no_line_user_id" };
  }

  const result = await pushLineMessage(student.line_user_id, [
    { type: "text", text: reminder.message }
  ]);
  const now = new Date().toISOString();
  const status = result.ok ? "sent" : "failed";

  await supabase.from("messages").insert({
    student_id: reminder.student_id,
    direction: "out",
    type: "text",
    payload: {
      text: reminder.message,
      source: "event_reminder",
      event_reminder_id: reminder.id,
      event_id: reminder.event_id
    },
    status: result.skipped ? "mock_sent" : status,
    sent_at: now,
    staff_id: null
  });

  await supabase
    .from("event_reminders")
    .update({
      status,
      sent_at: result.ok ? now : null,
      error_message: result.ok ? null : result.reason,
      line_response_jsonb: result
    })
    .eq("id", reminder.id);

  return { sent: result.ok, status, reason: result.reason };
}

async function markReminder(
  supabase: any,
  reminderId: string,
  status: "skipped" | "failed",
  message: string
) {
  await supabase
    .from("event_reminders")
    .update({
      status,
      error_message: message
    })
    .eq("id", reminderId);
}

function normalizeJoinedStudent(value: any) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
