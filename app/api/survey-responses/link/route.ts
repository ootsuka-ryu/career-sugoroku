import { NextResponse } from "next/server";
import { buildStudentProfileUpdateFromSurveyAnswers } from "@/lib/surveys/profile-updates";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

export async function POST(request: Request) {
  const supabase = createClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "ログイン状態を確認できませんでした。再ログインしてください。" },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const responseId = String(body.response_id ?? "");
  const studentId = String(body.student_id ?? "");

  if (!responseId || !studentId) {
    return NextResponse.json(
      { error: "紐づける回答または学生が指定されていません。" },
      { status: 400 }
    );
  }

  const { data: response, error: responseError } = await supabase
    .from("survey_responses")
    .select(
      `
      id,
      survey_id,
      raw_answers_jsonb,
      respondent_name,
      surveys(id, title, public_title)
    `
    )
    .eq("id", responseId)
    .maybeSingle();

  if (responseError || !response) {
    return NextResponse.json(
      { error: responseError?.message ?? "Survey response was not found" },
      { status: 404 }
    );
  }

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id")
    .eq("id", studentId)
    .maybeSingle();

  if (studentError || !student) {
    return NextResponse.json(
      { error: studentError?.message ?? "Student was not found" },
      { status: 404 }
    );
  }

  const { data: questions, error: questionsError } = await supabase
    .from("survey_questions")
    .select(
      `
      id,
      label,
      validation_type,
      settings_jsonb,
      survey_question_tags(
        tag_id,
        when_answer_matches_jsonb
      )
    `
    )
    .eq("survey_id", response.survey_id);

  if (questionsError) {
    return NextResponse.json({ error: questionsError.message }, { status: 500 });
  }

  const answers = (response.raw_answers_jsonb ?? {}) as Record<string, Json>;
  await applyProfileUpdates(supabase, studentId, questions ?? [], answers, response.respondent_name);
  await applyTagRules(supabase, studentId, questions ?? [], answers);

  const { error: updateError } = await supabase
    .from("survey_responses")
    .update({
      student_id: studentId,
      needs_manual_merge: false
    })
    .eq("id", responseId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await supabase.from("student_actions").insert({
    student_id: studentId,
    staff_id: null,
    action_type: "note",
    title: `${response.surveys?.public_title || response.surveys?.title || "アンケート"}の回答を紐付け`,
    body: `未紐付け回答を学生情報に登録しました。回答ID: ${responseId}`,
    executed_at: new Date().toISOString()
  });

  return NextResponse.json({ ok: true });
}

async function applyProfileUpdates(
  supabase: any,
  studentId: string,
  questions: any[],
  answers: Record<string, Json>,
  respondentName?: string | null
) {
  const update = buildStudentProfileUpdateFromSurveyAnswers(questions, answers, respondentName);

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

function matchesRule(answer: unknown, rule: unknown) {
  if (!rule || typeof rule !== "object" || Array.isArray(rule)) return false;
  const values = Array.isArray(answer) ? answer.map(String) : [String(answer ?? "")];
  const matcher = rule as { equals?: unknown; contains?: unknown };
  if (typeof matcher.equals === "string") {
    return values.some((value) => value === matcher.equals);
  }
  if (typeof matcher.contains === "string") {
    return values.some((value) => value.includes(matcher.contains as string));
  }
  return false;
}
