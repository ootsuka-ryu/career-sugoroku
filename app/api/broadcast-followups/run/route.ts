import { NextResponse, type NextRequest } from "next/server";
import { buildLineMessages, type BroadcastBody } from "@/lib/broadcasts/flex";
import { pushLineMessage } from "@/lib/line/client";
import { createAdminClient } from "@/lib/supabase/admin";

type FollowupStep = {
  id: string;
  body_jsonb: BroadcastBody;
  condition_mode: "and" | "or";
  require_no_reply: boolean;
  require_survey_unanswered: boolean;
  survey_id: string | null;
};

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const providedSecret = request.headers.get("x-cron-secret");

  if (cronSecret && providedSecret !== cronSecret) {
    return NextResponse.json(
      { ok: false, error: "追撃配信実行用の認証情報が一致しません。" },
      { status: 401 }
    );
  }

  const supabase = createAdminClient() as any;
  const { data: jobs, error } = await supabase
    .from("broadcast_followup_jobs")
    .select("id, broadcast_id, step_id, student_id, due_at")
    .eq("status", "pending")
    .lte("due_at", new Date().toISOString())
    .order("due_at", { ascending: true })
    .limit(50);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const results = [];
  let sentCount = 0;

  for (const job of jobs ?? []) {
    const outcome = await processFollowupJob(supabase, job);
    if (outcome.status === "sent") sentCount += 1;
    results.push({ jobId: job.id, ...outcome });
  }

  if (sentCount > 0) {
    await supabase.from("line_usage_events").insert({
      event_month: new Date().toISOString().slice(0, 7) + "-01",
      message_count: sentCount,
      source: "broadcast_followup"
    });
  }

  return NextResponse.json({
    ok: true,
    processed: results.length,
    sentCount,
    results
  });
}

async function processFollowupJob(supabase: any, job: any) {
  const [stepResult, studentResult] = await Promise.all([
    supabase
      .from("broadcast_followup_steps")
      .select("id, body_jsonb, condition_mode, require_no_reply, require_survey_unanswered, survey_id")
      .eq("id", job.step_id)
      .single(),
    supabase
      .from("students")
      .select("id, line_user_id")
      .eq("id", job.student_id)
      .single()
  ]);

  if (stepResult.error || !stepResult.data) {
    await markJob(supabase, job.id, "failed", "追撃設定が見つかりません。");
    return { status: "failed", reason: "missing_step" };
  }

  if (studentResult.error || !studentResult.data?.line_user_id) {
    await markJob(supabase, job.id, "skipped", "LINE IDがないため送信できません。");
    return { status: "skipped", reason: "no_line_user_id" };
  }

  const step = stepResult.data as FollowupStep;
  const shouldSend = await shouldSendFollowup(supabase, job, step);
  if (!shouldSend.ok) {
    await markJob(supabase, job.id, "skipped", shouldSend.reason);
    return { status: "skipped", reason: shouldSend.reason };
  }

  const messages = buildLineMessages(step.body_jsonb);
  const result = await pushLineMessage(studentResult.data.line_user_id, messages);
  const delivered = result.ok && !result.skipped;
  const status = delivered ? "sent" : result.skipped ? "skipped" : "failed";
  const sentAt = new Date().toISOString();

  await supabase.from("messages").insert({
    student_id: job.student_id,
    broadcast_id: job.broadcast_id,
    broadcast_followup_job_id: job.id,
    direction: "out",
    type: step.body_jsonb.kind === "text" ? "text" : "flex",
    payload: step.body_jsonb.kind === "text" ? { text: step.body_jsonb.text } : step.body_jsonb,
    status: result.skipped ? "mock_sent" : status,
    sent_at: sentAt,
    staff_id: null
  });

  await supabase
    .from("broadcast_followup_jobs")
    .update({
      status,
      sent_at: delivered ? sentAt : null,
      error_message: delivered ? null : result.reason
    })
    .eq("id", job.id);

  return { status, reason: delivered ? null : result.reason };
}

async function shouldSendFollowup(
  supabase: any,
  job: any,
  step: FollowupStep
): Promise<{ ok: boolean; reason: string }> {
  const checks: boolean[] = [];
  const reasons: string[] = [];

  if (step.require_no_reply) {
    const noReply = await hasNoInboundAfterBroadcast(supabase, job);
    checks.push(noReply);
    if (!noReply) reasons.push("配信後に返信がありました。");
  }

  if (step.require_survey_unanswered && step.survey_id) {
    const unanswered = await hasNoSurveyResponse(supabase, job.student_id, step.survey_id);
    checks.push(unanswered);
    if (!unanswered) reasons.push("対象アンケートに回答済みです。");
  }

  if (checks.length === 0) {
    return { ok: false, reason: "追撃条件が設定されていません。" };
  }

  const matched = step.condition_mode === "and" ? checks.every(Boolean) : checks.some(Boolean);
  return {
    ok: matched,
    reason: matched ? "" : reasons.join(" / ") || "追撃条件に一致しません。"
  };
}

async function hasNoInboundAfterBroadcast(supabase: any, job: any) {
  const { data: outbound } = await supabase
    .from("messages")
    .select("sent_at")
    .eq("student_id", job.student_id)
    .eq("broadcast_id", job.broadcast_id)
    .eq("direction", "out")
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const since = outbound?.sent_at ?? job.due_at;
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("student_id", job.student_id)
    .eq("direction", "in")
    .gt("sent_at", since);

  return (count ?? 0) === 0;
}

async function hasNoSurveyResponse(supabase: any, studentId: string, surveyId: string) {
  const { count } = await supabase
    .from("survey_responses")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("survey_id", surveyId);

  return (count ?? 0) === 0;
}

async function markJob(
  supabase: any,
  jobId: string,
  status: "skipped" | "failed",
  message: string
) {
  await supabase
    .from("broadcast_followup_jobs")
    .update({
      status,
      skipped_reason: status === "skipped" ? message : null,
      error_message: status === "failed" ? message : null
    })
    .eq("id", jobId);
}
