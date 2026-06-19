import { buildLineMessages, type BroadcastBody } from "@/lib/broadcasts/flex";
import {
  filterBroadcastTargets,
  type BroadcastTargeting,
  type TargetableStudent
} from "@/lib/broadcasts/targeting";
import { pushLineMessage } from "@/lib/line/client";
import { trackUrlForLineClick, trackUrlsInTextForLineClicks } from "@/lib/line/tracked-links";
import {
  personalizeSurveyUrl,
  personalizeSurveyUrlsInText
} from "@/lib/surveys/personalized-url";

type SupabaseLike = any;

export async function estimateRecipients(
  supabase: SupabaseLike,
  targeting: BroadcastTargeting
) {
  const students = await fetchTargetableStudents(supabase);
  return filterBroadcastTargets(students, targeting).length;
}

export async function sendBroadcastToTargets({
  supabase,
  broadcastId,
  body,
  targeting,
  staffId
}: {
  supabase: SupabaseLike;
  broadcastId: string;
  body: BroadcastBody;
  targeting: BroadcastTargeting;
  staffId: string | null;
}) {
  const students = await fetchTargetableStudents(supabase);
  const targets = filterBroadcastTargets(students, targeting);
  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  const followupTargetIds: string[] = [];

  for (const student of targets) {
    let status = "mock_sent";
    const personalizedBody = personalizeBroadcastBody(body, student.id, student.line_user_id);
    const messages = buildLineMessages(personalizedBody);

    if (student.line_user_id) {
      const result = await pushLineMessage(student.line_user_id, messages);
      if (result.ok && !result.skipped) {
        status = "sent";
      } else if (result.ok && result.skipped) {
        status = "mock_sent";
      } else {
        status = "failed";
      }
    } else {
      status = "no_line_user_id";
    }

    if (status === "sent") {
      sentCount += 1;
    } else if (status === "failed") {
      failedCount += 1;
    } else {
      skippedCount += 1;
    }

    if (status === "sent") {
      followupTargetIds.push(student.id);
    }

    await supabase.from("messages").insert({
      student_id: student.id,
      broadcast_id: broadcastId,
      direction: "out",
      type: personalizedBody.kind === "text" ? "text" : "flex",
      payload: personalizedBody.kind === "text" ? { text: personalizedBody.text } : personalizedBody,
      status,
      sent_at: new Date().toISOString(),
      staff_id: staffId
    });
  }

  await scheduleBroadcastFollowupJobs({
    supabase,
    broadcastId,
    studentIds: followupTargetIds
  });

  if (sentCount > 0) {
    await supabase.from("line_usage_events").insert({
      event_month: new Date().toISOString().slice(0, 7) + "-01",
      message_count: sentCount,
      source: "broadcast",
      broadcast_id: broadcastId
    });
  }

  return {
    sentCount,
    failedCount,
    skippedCount,
    targetCount: targets.length
  };
}

function personalizeBroadcastBody(
  body: BroadcastBody,
  studentId: string,
  lineUserId: string | null | undefined
): BroadcastBody {
  if (body.kind === "text") {
    return {
      ...body,
      text: trackUrlsInTextForLineClicks(personalizeSurveyUrlsInText(body.text, lineUserId, studentId), {
        studentId,
        lineUserId,
        source: "broadcast_text"
      })
    };
  }

  return {
    ...body,
    cells: body.cells.map((cell) => ({
      ...cell,
      detailUrl: trackUrlForLineClick(personalizeSurveyUrl(cell.detailUrl, lineUserId, studentId), {
        studentId,
        lineUserId,
        label: `${cell.title} 詳細`,
        source: "broadcast_grid"
      }),
      applyUrl: trackUrlForLineClick(personalizeSurveyUrl(cell.applyUrl, lineUserId, studentId), {
        studentId,
        lineUserId,
        label: `${cell.title} 申し込み`,
        source: "broadcast_grid"
      })
    }))
  };
}

async function scheduleBroadcastFollowupJobs({
  supabase,
  broadcastId,
  studentIds
}: {
  supabase: SupabaseLike;
  broadcastId: string;
  studentIds: string[];
}) {
  if (studentIds.length === 0) return;

  const { data: steps, error } = await supabase
    .from("broadcast_followup_steps")
    .select("id, delay_days, is_active")
    .eq("broadcast_id", broadcastId)
    .eq("is_active", true)
    .order("step_order", { ascending: true });

  if (error || !steps?.length) return;

  const now = Date.now();
  const rows = steps.flatMap((step: { id: string; delay_days: number }) =>
    studentIds.map((studentId) => ({
      broadcast_id: broadcastId,
      step_id: step.id,
      student_id: studentId,
      due_at: new Date(now + Number(step.delay_days) * 24 * 60 * 60 * 1000).toISOString(),
      status: "pending"
    }))
  );

  if (rows.length > 0) {
    await supabase.from("broadcast_followup_jobs").upsert(rows, {
      onConflict: "step_id,student_id",
      ignoreDuplicates: true
    });
  }
}

async function fetchTargetableStudents(supabase: SupabaseLike) {
  const { data, error } = await supabase
    .from("students")
    .select("id, line_user_id, student_tags(tag_id)")
    .eq("status", "active");

  if (error) {
    throw error;
  }

  return (data ?? []) as TargetableStudent[];
}
