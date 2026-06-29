import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SurveyBuilder } from "@/components/surveys/survey-builder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import type { TagSummary } from "@/lib/students/types";

export default async function SurveyBuilderPage({
  params
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const [surveyResult, sectionsResult, questionsResult, tagsResult, foldersResult] =
    await Promise.all([
      (supabase as any)
        .from("surveys")
        .select(
          "id, title, admin_title, public_title, description, folder_id, is_active, is_visible, one_response_per_student, redirect_url, thank_you_message, custom_css, updated_at"
        )
        .eq("id", params.id)
        .maybeSingle(),
      (supabase as any)
        .from("survey_sections")
        .select("id, survey_id, order, title, description, is_visible")
        .eq("survey_id", params.id)
        .order("order"),
      (supabase as any)
        .from("survey_questions")
        .select(
          `
          id,
          section_id,
          order,
          type,
          label,
          description,
          placeholder,
          validation_type,
          options_jsonb,
          settings_jsonb,
          is_required,
          is_visible,
          attached_image_url,
          branch_rules_jsonb,
          survey_question_tags(
            when_answer_matches_jsonb,
            tags(id, name, color)
          )
        `
        )
        .eq("survey_id", params.id)
        .order("order"),
      supabase.from("tags").select("id, name, color").order("name"),
      (supabase as any).from("survey_folders").select("id, name, description").order("name")
    ]);

  const survey = surveyResult.data as any;

  if (!survey) {
    notFound();
  }

  const sections = (sectionsResult.data ?? []) as any[];
  const questions = (questionsResult.data ?? []).map((row: any) => ({
    id: row.id,
    section_id: row.section_id,
    order: row.order,
    type: row.type,
    label: row.label,
    description: row.description,
    placeholder: row.placeholder,
    validation_type: row.validation_type,
    options_jsonb: row.options_jsonb,
    settings_jsonb: row.settings_jsonb ?? {},
    is_required: row.is_required,
    is_visible: row.is_visible ?? true,
    attached_image_url: row.attached_image_url,
    branch_rules_jsonb: row.branch_rules_jsonb ?? [],
    tag_rules: (row.survey_question_tags ?? []).map((rule: any) => ({
      tag: rule.tags,
      when_answer_matches_jsonb: rule.when_answer_matches_jsonb
    }))
  }));
  const tags = (tagsResult.data ?? []) as TagSummary[];
  const folders = foldersResult.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Button asChild className="mb-4" size="sm" variant="ghost">
          <Link href="/surveys">
            <ArrowLeft className="mr-2 h-4 w-4" />
            アンケート一覧へ
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={survey.is_active ? "accent" : "secondary"}>
            {survey.is_active ? "公開中" : "非公開"}
          </Badge>
          <Badge variant="outline">{questions.length}問</Badge>
          <Badge variant="outline">{sections.length}セクション</Badge>
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal">
          {survey.admin_title || survey.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          学生向け: {survey.public_title || survey.title}
        </p>
      </div>
      <SurveyBuilder
        folders={folders}
        questions={questions}
        sections={sections}
        survey={survey}
        tags={tags}
      />
    </div>
  );
}
