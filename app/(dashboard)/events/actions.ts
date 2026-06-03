"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type EventActionState = {
  ok: boolean;
  message: string;
};

const initialState: EventActionState = {
  ok: false,
  message: ""
};

const eventSchema = z.object({
  title: z.string().trim().min(1),
  event_type: z.string().trim().min(1),
  starts_at: z.string().optional(),
  location: z.string().trim().optional(),
  description: z.string().trim().optional(),
  survey_id: z.string().uuid().optional().or(z.literal("")),
  next_action: z.string().trim().optional()
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

  const { data: createdEvent, error } = await supabase.from("recruiting_events").insert({
    title: parsed.data.title,
    event_type: parsed.data.event_type,
    starts_at: parsed.data.starts_at ? new Date(parsed.data.starts_at).toISOString() : null,
    location: parsed.data.location || null,
    description: parsed.data.description || null,
    survey_id: parsed.data.survey_id || null,
    next_action: parsed.data.next_action || null,
    created_by: user?.id ?? null
  }).select("id").single();

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
  const input = parsed.data;
  await supabase.from("event_participants").upsert({
    event_id: input.event_id,
    student_id: input.student_id,
    status: input.status,
    memo: input.memo || null,
    source: "manual"
  });

  const { data: event } = await supabase
    .from("recruiting_events")
    .select("title")
    .eq("id", input.event_id)
    .maybeSingle();

  await supabase.from("student_actions").insert({
    student_id: input.student_id,
    action_type: "event",
    title: `${event?.title ?? "イベント"} ${input.status}`,
    body: input.memo || null,
    executed_at: new Date().toISOString()
  });

  revalidatePath("/events");
  revalidatePath(`/students/${input.student_id}`);
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
