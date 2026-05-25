import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const surveyId = searchParams.get("survey_id");

  if (!surveyId) {
    return NextResponse.json({ error: "アンケートIDがありません。" }, { status: 400 });
  }

  const { data, error } = await (supabase as any)
    .from("survey_responses")
    .select(
      `
      id,
      submitted_at,
      raw_answers_jsonb,
      respondent_name,
      respondent_line_user_id,
      students(id, real_name, display_name, university)
    `
    )
    .eq("survey_id", surveyId)
    .order("submitted_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ responses: data ?? [] });
}
