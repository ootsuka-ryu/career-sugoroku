"use server";

import { z } from "zod";
import {
  createNotificationsForStaff,
  getAdminNotificationTargets,
  getNotificationTargetsForStudent
} from "@/lib/notifications/service";
import { buildStudentProfileUpdateFromSurveyAnswers } from "@/lib/surveys/profile-updates";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

export type PublicSurveyState = {
  ok: boolean;
  message: string;
  redirectUrl?: string | null;
};

const initialState: PublicSurveyState = {
  ok: false,
  message: ""
};

const submitSchema = z.object({
  survey_id: z.string().uuid(),
  line_user_id: z.string().trim().optional(),
  student_id: z.string().uuid().optional().or(z.literal("")),
  respondent_name: z.string().trim().optional(),
  source: z.string().trim().optional()
});

export async function submitPublicSurvey(
  _prevState: PublicSurveyState = initialState,
  formData: FormData
): Promise<PublicSurveyState> {
  const parsed = submitSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { ok: false, message: "回答情報を確認してください。" };
  }

  const input = parsed.data;
  const supabase = createAdminClient() as any;
  const { data: survey, error: surveyError } = await supabase
    .from("surveys")
    .select(
      `
      id,
      title,
      public_title,
      is_active,
      is_visible,
      one_response_per_student,
      redirect_url,
      thank_you_message,
      survey_questions(
        id,
        section_id,
        label,
        type,
        is_required,
        is_visible,
        validation_type,
        survey_question_tags(
          tag_id,
          when_answer_matches_jsonb
        )
      )
    `
    )
    .eq("id", input.survey_id)
    .maybeSingle();

  if (surveyError || !survey) {
    return { ok: false, message: "アンケートが見つかりません。" };
  }

  const isPersonalLineUrl = input.source === "personal-line";
  if (!survey.is_active || (survey.is_visible === false && !isPersonalLineUrl)) {
    return { ok: false, message: "このアンケートは現在公開されていません。" };
  }

  const student = await findSurveyStudent(
    supabase,
    input.line_user_id,
    input.student_id || undefined,
    input.source
  );

  if (survey.one_response_per_student && student) {
    const { data: existing } = await supabase
      .from("survey_responses")
      .select("id")
      .eq("survey_id", input.survey_id)
      .eq("student_id", student.id)
      .maybeSingle();

    if (existing) {
      return {
        ok: false,
        message: "このアンケートはすでに回答済みです。"
      };
    }
  }

  const visitedSectionIds = formData.getAll("visited_section_ids").map(String).filter(Boolean);
  const questions = (survey.survey_questions ?? []).filter((question: any) => {
    if (question.is_visible === false || question.type === "heading") return false;
    if (visitedSectionIds.length === 0) return true;
    if (!question.section_id) return visitedSectionIds.includes("__no_section__");
    return visitedSectionIds.includes(question.section_id);
  });
  const answers: Record<string, Json> = {};

  for (const question of questions) {
    const key = `question_${question.id}`;
    const value =
      question.type === "checkbox"
        ? formData.getAll(key).map(String).filter(Boolean)
        : normalizeAnswerValue(formData.get(key));

    if (
      question.is_required &&
      ((Array.isArray(value) && value.length === 0) || (!Array.isArray(value) && !value))
    ) {
      return {
        ok: false,
        message: `必須項目「${question.label}」を入力してください。`
      };
    }

    if (value && typeof value === "string") {
      const validation = validateAnswer(question.validation_type, value);
      if (!validation.ok) {
        return {
          ok: false,
          message: `「${question.label}」は${validation.label}として入力してください。`
        };
      }
    }

    answers[question.id] = value;
  }

  const { data: response, error: responseError } = await supabase
    .from("survey_responses")
    .insert({
      survey_id: input.survey_id,
      student_id: student?.id ?? null,
      raw_answers_jsonb: answers,
      respondent_name: input.respondent_name || null,
      respondent_line_user_id: input.line_user_id || null,
      needs_manual_merge: !student
    })
    .select("id")
    .single();

  if (responseError || !response) {
    return {
      ok: false,
      message: responseError?.message ?? "回答を保存できませんでした。"
    };
  }

  const surveyTitle = survey.public_title || survey.title;

  if (student) {
    await applyProfileUpdates(supabase, student.id, questions, answers);
    await applyTagRules(supabase, student.id, questions, answers);
    await recordSurveyParticipation(
      supabase,
      student.id,
      surveyTitle,
      response.id
    );
  }

  await notifySurveyResponse(
    supabase,
    student?.id ?? null,
    surveyTitle,
    response.id,
    input.respondent_name || null,
    !student
  );

  return {
    ok: true,
    message: survey.thank_you_message || "回答を送信しました。ありがとうございました。",
    redirectUrl: survey.redirect_url
  };
}

async function recordSurveyParticipation(
  supabase: any,
  studentId: string,
  surveyTitle: string,
  responseId: string
) {
  const now = new Date();
  const dateText = formatJapaneseDate(now);
  const normalizedTitle = surveyTitle || "アンケート";

  await supabase.from("student_actions").insert({
    student_id: studentId,
    staff_id: null,
    action_type: isEventLikeSurvey(normalizedTitle) ? "event" : "note",
    title: `${normalizedTitle}に回答`,
    body: `アンケート回答を自動記録しました。回答ID: ${responseId}`,
    executed_at: now.toISOString()
  });

  if (isApplicationSurvey(normalizedTitle)) {
    const { data: student } = await supabase
      .from("students")
      .select("manual_next_action")
      .eq("id", studentId)
      .maybeSingle();

    const nextLine = `${dateText}：${normalizedTitle}の申し込みあり。参加案内・日程確認を行う。`;
    const current = String(student?.manual_next_action ?? "").trim();

    await supabase
      .from("students")
      .update({
        manual_next_action: current ? `${current}\n${nextLine}` : nextLine
      })
      .eq("id", studentId);
  }

  if (isPostEventSurvey(normalizedTitle)) {
    await supabase.from("student_actions").insert({
      student_id: studentId,
      staff_id: null,
      action_type: "event",
      title: "実施済アクション",
      body: `${dateText}：${normalizedTitle}に回答。イベント参加後の対応として自動転記しました。`,
      executed_at: now.toISOString()
    });
  }

  await applyRecruitingFunnelFromSurveyTitle(supabase, studentId, normalizedTitle);
}

function isEventLikeSurvey(title: string) {
  return /イベント|説明会|見学|座談会|交流会|インターン|セミナー|申込|申し込み|参加/.test(title);
}

function isApplicationSurvey(title: string) {
  return /申込|申し込み|予約|参加希望|説明会|見学|座談会|交流会|インターン|セミナー/.test(title);
}

function isPostEventSurvey(title: string) {
  return /事後|実施後|参加後|終了後|満足度|振り返り/.test(title);
}

function formatJapaneseDate(date: Date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

async function applyRecruitingFunnelFromSurveyTitle(supabase: any, studentId: string, title: string) {
  const update: Record<string, boolean> = {};

  if (isApplicationSurvey(title) || isEventLikeSurvey(title)) update.funnel_next = true;
  if (/姫路|ツアー|オンラインイベント|H&B|会社説明会|説明会|インターン|IS/.test(title)) {
    update.funnel_is = true;
  }
  if (/薬剤師インタビュー|インタビュー/.test(title)) update.funnel_pharmacist_interview = true;
  if (/選考会|選考/.test(title)) update.funnel_selection = true;
  if (/内定出し|内定通知/.test(title)) update.funnel_offer = true;
  if (/内定内諾|内諾/.test(title)) update.funnel_offer_accepted = true;
  if (/入社/.test(title)) update.funnel_hired = true;

  if (Object.keys(update).length === 0) return;

  const { error } = await supabase.from("students").update(update).eq("id", studentId);
  if (error?.message?.includes("funnel_")) return;
}

async function findSurveyStudent(
  supabase: any,
  lineUserId?: string,
  studentId?: string,
  source?: string
) {
  if (lineUserId) {
    const { data } = await supabase
      .from("students")
      .select("id")
      .eq("line_user_id", lineUserId)
      .maybeSingle();

    if (data) return data;
  }

  if (source === "personal-line" && studentId) {
    const { data } = await supabase
      .from("students")
      .select("id")
      .eq("id", studentId)
      .maybeSingle();

    if (data) return data;
  }

  return null;
}

async function applyProfileUpdates(
  supabase: any,
  studentId: string,
  questions: any[],
  answers: Record<string, Json>
) {
  const update = buildStudentProfileUpdateFromSurveyAnswers(questions, answers);

  if (Object.keys(update).length > 0) {
    await supabase.from("students").update(update).eq("id", studentId);
  }
}

async function applyTagRules(
  supabase: any,
  studentId: string,
  questions: any[],
  answers: Record<string, Json>
) {
  const tagIds = new Set<string>();

  for (const question of questions) {
    const answer = answers[question.id];
    const rules = question.survey_question_tags ?? [];

    for (const rule of rules) {
      if (matchesRule(answer, rule.when_answer_matches_jsonb)) {
        tagIds.add(rule.tag_id);
      }
    }
  }

  for (const tagId of Array.from(tagIds)) {
    await supabase.from("student_tags").upsert(
      {
        student_id: studentId,
        tag_id: tagId,
        created_by: null
      },
      { onConflict: "student_id,tag_id" }
    );
  }
}

function matchesRule(answer: Json, rule: Json) {
  if (!rule || typeof rule !== "object" || Array.isArray(rule)) return false;
  const answerValues = Array.isArray(answer) ? answer.map(String) : [String(answer ?? "")];

  if ("equals" in rule && typeof rule.equals === "string") {
    return answerValues.some((value) => value === rule.equals);
  }

  if ("contains" in rule && typeof rule.contains === "string") {
    return answerValues.some((value) => value.includes(rule.contains as string));
  }

  return false;
}

async function notifySurveyResponse(
  supabase: any,
  studentId: string | null,
  surveyTitle: string,
  responseId: string,
  respondentName: string | null,
  needsManualMerge: boolean
) {
  const [assigneeTargets, adminTargets] = await Promise.all([
    studentId ? getNotificationTargetsForStudent(supabase, studentId) : Promise.resolve([]),
    getAdminNotificationTargets(supabase)
  ]);
  const targets = Array.from(new Set([...adminTargets, ...assigneeTargets]));
  const respondentText = respondentName
    ? `回答者: ${respondentName}`
    : studentId
      ? "回答者: 学生情報に紐づき済み"
      : "回答者: 未紐付け";
  const mergeText = needsManualMerge
    ? "\n学生情報と未紐付けです。回答結果から紐付けしてください。"
    : "";

  await createNotificationsForStaff(supabase, targets, {
    type: "survey_response",
    title: "アンケート回答がありました",
    body: `${surveyTitle} に回答がありました。\n${respondentText}${mergeText}`,
    payload: {
      surveyTitle,
      studentId,
      responseId,
      needsManualMerge
    }
  });
}

function normalizeAnswerValue(value: FormDataEntryValue | null) {
  if (value instanceof File) {
    return value.name ? { fileName: value.name, size: value.size, type: value.type } : "";
  }
  return String(value ?? "").trim();
}

function validateAnswer(validationType: string, value: string) {
  if (validationType === "email") {
    return {
      ok: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      label: "メールアドレス"
    };
  }

  if (validationType === "phone") {
    return {
      ok: /^[0-9+\-()\s]{8,}$/.test(value),
      label: "電話番号"
    };
  }

  return { ok: true, label: "" };
}
