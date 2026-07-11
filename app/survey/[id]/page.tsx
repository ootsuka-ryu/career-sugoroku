import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PublicSurveyForm } from "@/components/surveys/public-survey-form";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function PublicSurveyPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams: { lineUserId?: string; source?: string; studentId?: string };
}) {
  const supabase = createAdminClient() as any;
  const { data: survey, error } = await supabase
    .from("surveys")
    .select(
      `
      id,
      title,
      public_title,
      description,
      is_active,
      is_visible,
      one_response_per_student,
      redirect_url,
      thank_you_message,
      custom_css,
      survey_sections(
        id,
        order,
        title,
        description,
        is_visible
      ),
      survey_questions(
        id,
        section_id,
        order,
        type,
        label,
        description,
        placeholder,
        validation_type,
        options_jsonb,
        is_required,
        is_visible,
        attached_image_url,
        branch_rules_jsonb
      )
    `
    )
    .eq("id", params.id)
    .maybeSingle();

  if (error || !survey) {
    notFound();
  }

  const linkedStudent = await findLinkedStudent(
    supabase,
    searchParams.lineUserId,
    searchParams.studentId,
    searchParams.source
  );

  await supabase.from("survey_link_clicks").insert({
    survey_id: params.id,
    student_id: linkedStudent?.id ?? null,
    source: searchParams.source ?? null,
    user_agent: headers().get("user-agent")
  });

  const sections = (survey.survey_sections ?? []).sort(
    (a: { order: number }, b: { order: number }) => a.order - b.order
  );
  const questions = (survey.survey_questions ?? []).sort(
    (a: { order: number }, b: { order: number }) => a.order - b.order
  );
  const isPersonalLineUrl = searchParams.source === "personal-line";
  const canAnswer = isPersonalLineUrl || (survey.is_active && survey.is_visible !== false);

  return (
    <main className="min-h-screen bg-[#fff7ec] px-3 py-5 text-[#3d2f24] sm:px-4 sm:py-8">
      {survey.custom_css ? <style>{survey.custom_css}</style> : null}
      <div className="survey-page mx-auto max-w-[460px] space-y-4 sm:max-w-[520px]">
        <div className="rounded-b-[22px] border-x border-b border-[#d6b77f] bg-[#fffaf2] px-5 pb-5 pt-2 shadow-sm">
          <h1 className="text-[1.55rem] font-semibold leading-snug tracking-normal text-[#2f241b] sm:text-3xl">
            {survey.public_title || survey.title}
          </h1>
          {survey.description ? (
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#725a43] sm:text-base">
              {survey.description}
            </p>
          ) : null}
        </div>

        {canAnswer ? (
          <PublicSurveyForm
            liffId={process.env.LINE_LIFF_ID ?? process.env.NEXT_PUBLIC_LINE_LIFF_ID ?? ""}
            lineUserId={searchParams.lineUserId}
            questions={questions}
            redirectUrl={survey.redirect_url}
            sections={sections}
            source={searchParams.source}
            studentId={searchParams.studentId}
            surveyId={survey.id}
            thankYouMessage={survey.thank_you_message}
          />
        ) : (
          <div className="rounded-[18px] border border-[#d6b77f] bg-[#fffaf2] p-6 text-center text-[#725a43] shadow-sm">
            このアンケートは現在公開されていません。
          </div>
        )}
      </div>
    </main>
  );
}

async function findLinkedStudent(
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
