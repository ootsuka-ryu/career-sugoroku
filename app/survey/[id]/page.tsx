import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PublicSurveyForm } from "@/components/surveys/public-survey-form";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function PublicSurveyPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams: { lineUserId?: string; source?: string };
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

  const { data: linkedStudent } = searchParams.lineUserId
    ? await supabase
        .from("students")
        .select("id")
        .eq("line_user_id", searchParams.lineUserId)
        .maybeSingle()
    : { data: null };

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
  const canAnswer = survey.is_active && (survey.is_visible !== false || isPersonalLineUrl);

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      {survey.custom_css ? <style>{survey.custom_css}</style> : null}
      <div className="survey-page mx-auto max-w-2xl space-y-6">
        <div>
          <p className="text-sm font-medium text-primary">薬学生LINE採用CRM</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-normal">
            {survey.public_title || survey.title}
          </h1>
          {survey.description ? (
            <p className="mt-2 text-sm text-muted-foreground">{survey.description}</p>
          ) : null}
        </div>

        {canAnswer ? (
          <PublicSurveyForm
            lineUserId={searchParams.lineUserId}
            questions={questions}
            redirectUrl={survey.redirect_url}
            sections={sections}
            source={searchParams.source}
            surveyId={survey.id}
            thankYouMessage={survey.thank_you_message}
          />
        ) : (
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
            このアンケートは現在公開されていません。
          </div>
        )}
      </div>
    </main>
  );
}
