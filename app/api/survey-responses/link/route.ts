import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

export async function POST(request: Request) {
  const supabase = createClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const responseId = String(body.response_id ?? "");
  const studentId = String(body.student_id ?? "");

  if (!responseId || !studentId) {
    return NextResponse.json({ error: "response_id and student_id are required" }, { status: 400 });
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
  const update: Record<string, unknown> = {};

  if (respondentName) {
    update.real_name = respondentName;
    update.display_name = respondentName;
  }

  for (const question of questions) {
    const label = String(question.label ?? "");
    const lowerLabel = label.toLowerCase();
    const answer = answers[question.id];

    if (
      (label.includes("氏名") || label.includes("名前") || lowerLabel.includes("name")) &&
      typeof answer === "string" &&
      answer
    ) {
      update.real_name = answer;
      update.display_name = answer;
    }

    if (
      (label.includes("ふりがな") ||
        label.includes("フリガナ") ||
        label.includes("カナ") ||
        lowerLabel.includes("kana")) &&
      typeof answer === "string" &&
      answer
    ) {
      update.kana = answer;
    }

    if (
      (label.includes("大学") || lowerLabel.includes("university") || lowerLabel.includes("college")) &&
      typeof answer === "string" &&
      answer
    ) {
      update.university = answer;
    }

    if (
      (label.includes("卒業年") ||
        label.includes("卒業年度") ||
        label.includes("卒業予定") ||
        lowerLabel.includes("graduation")) &&
      answer
    ) {
      const graduationYear = parseGraduationYear(answer);
      if (graduationYear) update.graduation_year = graduationYear;
    }

    if (
      (question.validation_type === "email" ||
        label.includes("メール") ||
        lowerLabel.includes("email")) &&
      typeof answer === "string" &&
      answer
    ) {
      update.email = answer;
    }

    if (
      (question.validation_type === "phone" ||
        label.includes("電話") ||
        lowerLabel.includes("phone") ||
        lowerLabel.includes("tel")) &&
      typeof answer === "string" &&
      answer
    ) {
      update.phone = answer;
    }
  }

  if (Object.keys(update).length > 0) {
    await supabase.from("students").update(update).eq("id", studentId);
  }
}

function parseGraduationYear(answer: Json) {
  const value = Array.isArray(answer) ? String(answer[0] ?? "") : String(answer ?? "");
  const match = value.match(/20\d{2}/);
  if (!match) return null;

  const year = Number(match[0]);
  return year >= 2000 && year <= 2100 ? year : null;
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
