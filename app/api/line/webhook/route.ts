import { NextResponse, type NextRequest } from "next/server";
import { getLineProfile, pushLineMessage } from "@/lib/line/client";
import { verifyLineSignature } from "@/lib/line/signature";
import {
  lineMessageTypeToDbType,
  type LineWebhookEvent,
  type LineWebhookPayload
} from "@/lib/line/types";
import {
  createNotificationsForStaff,
  getNotificationTargetsForStudent
} from "@/lib/notifications/service";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MessageType } from "@/lib/supabase/database.types";

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "line-webhook"
  });
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const verification = verifyLineSignature(
    body,
    request.headers.get("x-line-signature")
  );

  if (!verification.ok) {
    return NextResponse.json(
      { ok: false, error: verification.reason },
      { status: 401 }
    );
  }

  const payload = JSON.parse(body) as LineWebhookPayload;
  const events = payload.events ?? [];
  const supabase = createAdminClient() as any;

  for (const event of events) {
    await handleLineEvent(event, supabase);
  }

  return NextResponse.json({
    ok: true,
    processed: events.length
  });
}

async function handleLineEvent(
  event: LineWebhookEvent,
  supabase: any
) {
  const lineUserId = event.source?.userId;
  if (!lineUserId) return;

  const student = await findOrCreateStudent(lineUserId, supabase);

  if (event.type === "follow") {
    await supabase.from("student_actions").insert({
      student_id: student.id,
      staff_id: null,
      action_type: "line",
      title: "LINE follow",
      body: "LINE official account was followed.",
      executed_at: new Date(event.timestamp || Date.now()).toISOString()
    });
    const staffIds = await getActiveStaffIds(supabase);
    await createNotificationsForStaff(supabase, staffIds, {
      type: "new_friend",
      title: "新しい友だち追加",
      body: `${student.display_name ?? "学生"} がLINE公式アカウントを追加しました。`,
      payload: {
        student_id: student.id,
        line_user_id: lineUserId
      }
    });
    return;
  }

  if (event.type === "message" && event.message) {
    const dbType = lineMessageTypeToDbType(event.message.type) as MessageType;
    const payload =
      event.message.type === "text"
        ? { text: event.message.text ?? "" }
        : event.message;

    await supabase.from("messages").insert({
      student_id: student.id,
      direction: "in",
      type: dbType,
      payload,
      line_message_id: event.message.id ?? null,
      status: "received",
      sent_at: new Date(event.timestamp || Date.now()).toISOString(),
      staff_id: null
    });

    await markStudentAsPool(supabase, student.id);

    if (event.message.type === "text" && event.message.text) {
      await handleAutoReply({
        supabase,
        studentId: student.id,
        lineUserId,
        text: event.message.text
      });
    }

    const staffIds = await getNotificationTargetsForStudent(supabase, student.id);
    await createNotificationsForStaff(supabase, staffIds, {
      type: "chat_reply",
      title: "学生からLINE返信がありました",
      body:
        event.message.type === "text"
          ? `${student.display_name ?? "学生"}: ${event.message.text ?? ""}`
          : `${student.display_name ?? "学生"} からメッセージが届きました。`,
      payload: {
        student_id: student.id,
        message_type: event.message.type
      }
    });
  }
}

async function markStudentAsPool(supabase: any, studentId: string) {
  const { error } = await supabase
    .from("students")
    .update({
      funnel_uncontacted: false,
      funnel_pool: true
    })
    .eq("id", studentId);

  if (error?.message?.includes("funnel_")) return;
}

async function handleAutoReply({
  supabase,
  studentId,
  lineUserId,
  text
}: {
  supabase: any;
  studentId: string;
  lineUserId: string;
  text: string;
}) {
  const { data: rules } = await supabase
    .from("auto_replies")
    .select("id, trigger_keyword, match_type, reply_payload_jsonb")
    .eq("is_active", true)
    .order("updated_at", { ascending: false });

  const matchedRule = (rules ?? []).find((rule: any) =>
    matchesAutoReplyRule(text, rule.trigger_keyword, rule.match_type)
  );

  const replyText = matchedRule?.reply_payload_jsonb?.text;
  if (!matchedRule || typeof replyText !== "string" || !replyText.trim()) return;

  const lineResult = await pushLineMessage(lineUserId, [
    {
      type: "text",
      text: replyText
    }
  ]);

  await supabase.from("messages").insert({
    student_id: studentId,
    direction: "out",
    type: "text",
    payload: {
      text: replyText,
      auto_reply_id: matchedRule.id
    },
    status: lineResult.ok ? "sent" : "failed",
    sent_at: new Date().toISOString(),
    staff_id: null
  });
}

function matchesAutoReplyRule(text: string, keyword: string, matchType: string) {
  if (!keyword) return false;
  if (matchType === "exact") return text.trim() === keyword.trim();
  if (matchType === "regex") {
    try {
      return new RegExp(keyword).test(text);
    } catch {
      return false;
    }
  }
  return text.includes(keyword);
}

async function getActiveStaffIds(supabase: any) {
  const { data } = await supabase.from("staff_users").select("id").eq("is_active", true);
  return (data ?? []).map((row: { id: string }) => row.id);
}

async function findOrCreateStudent(
  lineUserId: string,
  supabase: any
) {
  const { data: existing, error: findError } = await supabase
    .from("students")
    .select("id, display_name")
    .eq("line_user_id", lineUserId)
    .maybeSingle();

  if (findError) {
    throw findError;
  }

  if (existing) {
    return existing;
  }

  const profile = await getLineProfile(lineUserId);
  const displayName = profile?.displayName ?? "LINE User";

  const { data: created, error: createError } = await supabase
    .from("students")
    .insert({
      line_user_id: lineUserId,
      display_name: displayName,
      real_name: displayName,
      status: "active",
      first_contact_method: "LINE follow",
      first_contact_date: new Date().toISOString().slice(0, 10)
    })
    .select("id, display_name")
    .single();

  if (createError) {
    throw createError;
  }

  return created;
}
