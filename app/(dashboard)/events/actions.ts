"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { pushLineMessage } from "@/lib/line/client";
import { createClient } from "@/lib/supabase/server";

export type EventActionState = {
  ok: boolean;
  message: string;
};

const initialState: EventActionState = {
  ok: false,
  message: ""
};

const checkboxSchema = z.preprocess((value) => value === "on", z.boolean());

const eventSchema = z.object({
  title: z.string().trim().min(1),
  event_type: z.string().trim().min(1),
  starts_at: z.string().optional(),
  location: z.string().trim().optional(),
  description: z.string().trim().optional(),
  survey_id: z.string().uuid().optional().or(z.literal("")),
  next_action: z.string().trim().optional(),
  signup_message_enabled: checkboxSchema,
  signup_message_template: z.string().trim().optional(),
  reminder_enabled: checkboxSchema,
  reminder_message_template: z.string().trim().optional()
});

export async function createRecruitingEvent(
  _prevState: EventActionState = initialState,
  formData: FormData
): Promise<EventActionState> {
  const parsed = eventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "イベント名など、入力内容を確認してください。" };
  }

  const supabase = createClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const eventPayload = {
    title: parsed.data.title,
    event_type: parsed.data.event_type,
    starts_at: parsed.data.starts_at ? new Date(parsed.data.starts_at).toISOString() : null,
    location: parsed.data.location || null,
    description: parsed.data.description || null,
    survey_id: parsed.data.survey_id || null,
    next_action: parsed.data.next_action || null,
    signup_message_enabled: parsed.data.signup_message_enabled,
    signup_message_template: parsed.data.signup_message_template || null,
    reminder_enabled: parsed.data.reminder_enabled,
    reminder_message_template: parsed.data.reminder_message_template || null,
    created_by: user?.id ?? null
  };

  let { data: createdEvent, error } = await supabase
    .from("recruiting_events")
    .insert(eventPayload)
    .select("id")
    .single();

  if (error && isEventMessageSchemaMissing(error.message)) {
    const fallbackPayload = {
      title: eventPayload.title,
      event_type: eventPayload.event_type,
      starts_at: eventPayload.starts_at,
      location: eventPayload.location,
      description: eventPayload.description,
      survey_id: eventPayload.survey_id,
      next_action: eventPayload.next_action,
      created_by: eventPayload.created_by
    };
    const fallback = await supabase
      .from("recruiting_events")
      .insert(fallbackPayload)
      .select("id")
      .single();
    createdEvent = fallback.data;
    error = fallback.error;
  }

  if (error) {
    return {
      ok: false,
      message: error.message.includes("recruiting_events")
        ? "Supabaseで 10_recruiting_ops_features.sql を先に実行してください。"
        : error.message
    };
  }

  if (parsed.data.survey_id && createdEvent?.id) {
    await autoUnlinkPreviousSurveyEvents({
      supabase,
      surveyId: parsed.data.survey_id,
      keepEventId: createdEvent.id,
      actorStaffId: user?.id ?? null
    });
  }

  revalidatePath("/events");
  return { ok: true, message: "イベントを作成しました。" };
}

const eventSurveySchema = z.object({
  event_id: z.string().uuid(),
  survey_id: z.string().uuid().optional().or(z.literal(""))
});

export async function updateEventSurveyLink(formData: FormData) {
  const parsed = eventSurveySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  const supabase = createClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const input = parsed.data;

  const { data: before } = await supabase
    .from("recruiting_events")
    .select("id, survey_id")
    .eq("id", input.event_id)
    .maybeSingle();

  const nextSurveyId = input.survey_id || null;
  await supabase
    .from("recruiting_events")
    .update({ survey_id: nextSurveyId })
    .eq("id", input.event_id);

  if (nextSurveyId) {
    await insertAuditLog(supabase, {
      actorStaffId: user?.id ?? null,
      action: "manual_survey_relink",
      targetId: input.event_id,
      beforeJsonb: before ?? null,
      afterJsonb: { id: input.event_id, survey_id: nextSurveyId }
    });
  }

  revalidatePath("/events");
}

const participantSchema = z.object({
  event_id: z.string().uuid(),
  student_id: z.string().uuid(),
  status: z.string().trim().min(1),
  memo: z.string().trim().optional()
});

export async function addEventParticipant(formData: FormData) {
  const parsed = participantSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  const supabase = createClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const input = parsed.data;

  await supabase.from("event_participants").upsert({
    event_id: input.event_id,
    student_id: input.student_id,
    status: input.status,
    memo: input.memo || null,
    source: "manual"
  });

  const event = await fetchEventForMessages(supabase, input.event_id);
  await recordEventAction({
    supabase,
    studentId: input.student_id,
    staffId: user?.id ?? null,
    title: `${event?.title ?? "イベント"} ${input.status}`,
    body: input.memo || null
  });

  if (event) {
    await maybeHandleParticipantMessaging({
      supabase,
      event,
      studentId: input.student_id,
      status: input.status,
      staffId: user?.id ?? null
    });
  }

  revalidatePath("/events");
  revalidatePath(`/students/${input.student_id}`);
}

export async function updateEventParticipant(formData: FormData) {
  const parsed = participantSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  const supabase = createClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const input = parsed.data;

  await supabase
    .from("event_participants")
    .update({
      status: input.status,
      memo: input.memo || null
    })
    .eq("event_id", input.event_id)
    .eq("student_id", input.student_id);

  const event = await fetchEventForMessages(supabase, input.event_id);
  await recordEventAction({
    supabase,
    studentId: input.student_id,
    staffId: user?.id ?? null,
    title: `${event?.title ?? "イベント"} ${input.status}`,
    body: input.memo || null
  });

  if (event) {
    await maybeHandleParticipantMessaging({
      supabase,
      event,
      studentId: input.student_id,
      status: input.status,
      staffId: user?.id ?? null
    });
  }

  revalidatePath("/events");
  revalidatePath(`/students/${input.student_id}`);
}

const cancelParticipantSchema = z.object({
  event_id: z.string().uuid(),
  student_id: z.string().uuid()
});

export async function cancelEventParticipant(formData: FormData) {
  const parsed = cancelParticipantSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  const supabase = createClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const input = parsed.data;

  await supabase
    .from("event_participants")
    .update({ status: "キャンセル" })
    .eq("event_id", input.event_id)
    .eq("student_id", input.student_id);

  await cancelScheduledReminder(supabase, input.event_id, input.student_id, "参加者がキャンセルしました。");

  const event = await fetchEventForMessages(supabase, input.event_id);
  await recordEventAction({
    supabase,
    studentId: input.student_id,
    staffId: user?.id ?? null,
    title: `${event?.title ?? "イベント"} キャンセル`,
    body: null
  });

  revalidatePath("/events");
  revalidatePath(`/students/${input.student_id}`);
}

const eventMessageSettingsSchema = z.object({
  event_id: z.string().uuid(),
  signup_message_enabled: checkboxSchema,
  signup_message_template: z.string().trim().optional(),
  reminder_enabled: checkboxSchema,
  reminder_message_template: z.string().trim().optional()
});

export async function updateEventMessageSettings(
  _prevState: EventActionState = initialState,
  formData: FormData
): Promise<EventActionState> {
  const parsed = eventMessageSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "メッセージ設定を確認してください。" };
  }

  const supabase = createClient() as any;
  const input = parsed.data;
  const { error } = await supabase
    .from("recruiting_events")
    .update({
      signup_message_enabled: input.signup_message_enabled,
      signup_message_template: input.signup_message_template || null,
      reminder_enabled: input.reminder_enabled,
      reminder_message_template: input.reminder_message_template || null
    })
    .eq("id", input.event_id);

  if (error) {
    return {
      ok: false,
      message: isEventMessageSchemaMissing(error.message)
        ? "Supabaseで 14_event_message_settings.sql を先に実行してください。"
        : error.message
    };
  }

  revalidatePath("/events");
  return { ok: true, message: "自動メッセージ設定を保存しました。" };
}

const EVENT_SELECT_FOR_MESSAGES = [
  "id",
  "title",
  "starts_at",
  "location",
  "signup_message_enabled",
  "signup_message_template",
  "reminder_enabled",
  "reminder_message_template"
].join(", ");

type EventForMessages = {
  id: string;
  title: string;
  starts_at: string | null;
  location: string | null;
  signup_message_enabled?: boolean | null;
  signup_message_template?: string | null;
  reminder_enabled?: boolean | null;
  reminder_message_template?: string | null;
};

async function fetchEventForMessages(supabase: any, eventId: string): Promise<EventForMessages | null> {
  const { data, error } = await supabase
    .from("recruiting_events")
    .select(EVENT_SELECT_FOR_MESSAGES)
    .eq("id", eventId)
    .maybeSingle();

  if (!error) return data;

  const fallback = await supabase
    .from("recruiting_events")
    .select("id, title, starts_at, location")
    .eq("id", eventId)
    .maybeSingle();

  return fallback.data
    ? {
        ...fallback.data,
        signup_message_enabled: false,
        signup_message_template: null,
        reminder_enabled: false,
        reminder_message_template: null
      }
    : null;
}

async function maybeHandleParticipantMessaging({
  supabase,
  event,
  studentId,
  status,
  staffId
}: {
  supabase: any;
  event: EventForMessages;
  studentId: string;
  status: string;
  staffId: string | null;
}) {
  if (!isSignupStatus(status)) {
    if (isCancelledStatus(status)) {
      await cancelScheduledReminder(supabase, event.id, studentId, "参加ステータスがキャンセル・欠席になりました。");
    }
    return;
  }

  const { data: student } = await supabase
    .from("students")
    .select("id, real_name, display_name, line_user_id")
    .eq("id", studentId)
    .maybeSingle();

  if (!student) return;

  if (event.signup_message_enabled && event.signup_message_template) {
    const text = renderEventMessage(event.signup_message_template, event, student);
    await sendEventLineMessage({
      supabase,
      student,
      staffId,
      text,
      source: "event_signup"
    });
  }

  if (event.reminder_enabled && event.reminder_message_template && event.starts_at) {
    await upsertEventReminder({
      supabase,
      event,
      student,
      message: renderEventMessage(event.reminder_message_template, event, student)
    });
  }
}

async function sendEventLineMessage({
  supabase,
  student,
  staffId,
  text,
  source
}: {
  supabase: any;
  student: { id: string; line_user_id: string | null };
  staffId: string | null;
  text: string;
  source: string;
}) {
  if (!student.line_user_id) {
    await recordEventAction({
      supabase,
      studentId: student.id,
      staffId,
      title: "イベント自動送信をスキップ",
      body: "LINE IDが未連携のため送信できませんでした。"
    });
    return;
  }

  const result = await pushLineMessage(student.line_user_id, [{ type: "text", text }]);
  const sentAt = new Date().toISOString();
  await supabase.from("messages").insert({
    student_id: student.id,
    direction: "out",
    type: "text",
    payload: { text, source },
    status: result.skipped ? "mock_sent" : result.ok ? "sent" : "failed",
    sent_at: sentAt,
    staff_id: staffId
  });

  if (result.ok) {
    await supabase.from("line_usage_events").insert({
      event_month: sentAt.slice(0, 7) + "-01",
      message_count: 1,
      source
    });
  }
}

async function upsertEventReminder({
  supabase,
  event,
  student,
  message
}: {
  supabase: any;
  event: EventForMessages;
  student: { id: string };
  message: string;
}) {
  const sendAt = getReminderSendAt(event.starts_at);
  if (!sendAt || !event.starts_at) return;

  const eventStart = new Date(event.starts_at);
  const threeDaysBefore = eventStart.getTime() - 3 * 24 * 60 * 60 * 1000;
  if (Date.now() > threeDaysBefore) {
    await cancelScheduledReminder(supabase, event.id, student.id, "開催3日前を過ぎているため自動リマインド対象外です。");
    return;
  }

  await supabase.from("event_reminders").upsert(
    {
      event_id: event.id,
      student_id: student.id,
      send_at: sendAt.toISOString(),
      message,
      status: "scheduled",
      error_message: null
    },
    { onConflict: "event_id,student_id" }
  );
}

async function cancelScheduledReminder(
  supabase: any,
  eventId: string,
  studentId: string,
  reason: string
) {
  await supabase
    .from("event_reminders")
    .update({ status: "cancelled", error_message: reason })
    .eq("event_id", eventId)
    .eq("student_id", studentId)
    .eq("status", "scheduled");
}

async function recordEventAction({
  supabase,
  studentId,
  staffId,
  title,
  body
}: {
  supabase: any;
  studentId: string;
  staffId: string | null;
  title: string;
  body: string | null;
}) {
  await supabase.from("student_actions").insert({
    student_id: studentId,
    staff_id: staffId,
    action_type: "event",
    title,
    body,
    executed_at: new Date().toISOString()
  });
}

function renderEventMessage(
  template: string,
  event: Pick<EventForMessages, "title" | "starts_at" | "location">,
  student: { real_name?: string | null; display_name?: string | null }
) {
  const studentName = student.real_name || student.display_name || "学生さん";
  return template
    .replaceAll("{name}", studentName)
    .replaceAll("{student}", studentName)
    .replaceAll("{event}", event.title)
    .replaceAll("{date}", formatJstDateTime(event.starts_at))
    .replaceAll("{location}", event.location || "未定");
}

function formatJstDateTime(value: string | null | undefined) {
  if (!value) return "未定";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function getReminderSendAt(value: string | null | undefined) {
  if (!value) return null;
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(value));
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day - 1, 1, 0, 0));
}

function isSignupStatus(status: string) {
  return ["申込", "参加"].includes(status);
}

function isCancelledStatus(status: string) {
  return ["キャンセル", "欠席"].includes(status);
}

function isEventMessageSchemaMissing(message: string) {
  return /signup_message|reminder_message|event_reminders|schema cache|column .* does not exist/i.test(message);
}

async function autoUnlinkPreviousSurveyEvents({
  supabase,
  surveyId,
  keepEventId,
  actorStaffId
}: {
  supabase: any;
  surveyId: string;
  keepEventId: string;
  actorStaffId: string | null;
}) {
  const { data: linkedEvents } = await supabase
    .from("recruiting_events")
    .select("id, survey_id")
    .eq("survey_id", surveyId)
    .neq("id", keepEventId);

  const eventIds = (linkedEvents ?? []).map((event: { id: string }) => event.id);
  if (eventIds.length === 0) return;

  const { data: manualRelinks } = await supabase
    .from("audit_logs")
    .select("target_id")
    .eq("target_table", "recruiting_events")
    .eq("action", "manual_survey_relink")
    .in("target_id", eventIds);

  const lockedEventIds = new Set(
    (manualRelinks ?? [])
      .map((log: { target_id: string | null }) => log.target_id)
      .filter((id: string | null): id is string => Boolean(id))
  );
  const unlinkEventIds = eventIds.filter((id: string) => !lockedEventIds.has(id));
  if (unlinkEventIds.length === 0) return;

  const { error } = await supabase
    .from("recruiting_events")
    .update({ survey_id: null })
    .in("id", unlinkEventIds);

  if (error) return;

  await Promise.all(
    unlinkEventIds.map((eventId: string) =>
      insertAuditLog(supabase, {
        actorStaffId,
        action: "auto_unlink_event_survey",
        targetId: eventId,
        beforeJsonb: { id: eventId, survey_id: surveyId },
        afterJsonb: { id: eventId, survey_id: null, replaced_by_event_id: keepEventId }
      })
    )
  );
}

async function insertAuditLog(
  supabase: any,
  input: {
    actorStaffId: string | null;
    action: string;
    targetId: string;
    beforeJsonb: unknown;
    afterJsonb: unknown;
  }
) {
  await supabase.from("audit_logs").insert({
    actor_staff_id: input.actorStaffId,
    action: input.action,
    target_table: "recruiting_events",
    target_id: input.targetId,
    before_jsonb: input.beforeJsonb,
    after_jsonb: input.afterJsonb
  });
}
