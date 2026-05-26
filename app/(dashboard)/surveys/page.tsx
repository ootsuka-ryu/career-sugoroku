import { ClipboardList } from "lucide-react";
import { SurveyAdmin } from "@/components/surveys/survey-admin";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function SurveysPage() {
  const supabase = createClient();
  const [surveysResult, foldersResult, tagsResult] = await Promise.all([
    (supabase as any)
      .from("surveys")
      .select(
        `
        id,
        title,
        admin_title,
        public_title,
        description,
        folder_id,
        is_active,
        is_visible,
        one_response_per_student,
        redirect_url,
        thank_you_message,
        custom_css,
        created_at,
        updated_at,
        staff_users!surveys_created_by_fkey(id, name, email),
        survey_folders(id, name, description),
        survey_sections(id, order, title, description, is_visible),
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
          branch_rules_jsonb,
          survey_question_tags(
            tag_id,
            when_answer_matches_jsonb,
            tags(id, name, color)
          )
        ),
        survey_responses(id, submitted_at)
      `
      )
      .order("updated_at", { ascending: false }),
    (supabase as any).from("survey_folders").select("id, name, description").order("name"),
    (supabase as any).from("tags").select("id, name, color").order("name")
  ]);

  const surveys = (surveysResult.data ?? [])
    .map((row: any) => {
      const responseDates = (row.survey_responses ?? [])
        .map((response: any) => response.submitted_at)
        .filter(Boolean)
        .sort()
        .reverse();
      const lastResponseAt = responseDates[0] ?? null;
      const lastActivityAt =
        lastResponseAt && new Date(lastResponseAt) > new Date(row.updated_at)
          ? lastResponseAt
          : row.updated_at;

      return {
        id: row.id,
        title: row.title,
        admin_title: row.admin_title,
        public_title: row.public_title,
        description: row.description,
        folder_id: row.folder_id,
        is_active: row.is_active,
        is_visible: row.is_visible ?? true,
        one_response_per_student: row.one_response_per_student ?? false,
        redirect_url: row.redirect_url,
        thank_you_message: row.thank_you_message,
        custom_css: row.custom_css,
        created_at: row.created_at,
        updated_at: row.updated_at,
        last_response_at: lastResponseAt,
        last_activity_at: lastActivityAt,
        staff: row.staff_users,
        folder: row.survey_folders,
        sections: (row.survey_sections ?? []).sort((a: any, b: any) => a.order - b.order),
        questions: (row.survey_questions ?? []).sort((a: any, b: any) => a.order - b.order),
        question_count: (row.survey_questions ?? []).length,
        response_count: (row.survey_responses ?? []).length
      };
    })
    .sort(
      (a: any, b: any) =>
        new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime()
    );
  const folders = foldersResult.data ?? [];
  const tags = tagsResult.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="accent">Step 6+</Badge>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal">
          アンケート管理
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          保管したアンケートをフォルダで管理し、チャットや一斉送信でいつでも配布できます。
        </p>
      </div>

      {surveysResult.error || foldersResult.error || tagsResult.error ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ClipboardList className="h-5 w-5" />
              アンケート取得エラー
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-destructive">
            <p>{surveysResult.error?.message}</p>
            <p>{foldersResult.error?.message}</p>
            <p>{tagsResult.error?.message}</p>
          </CardContent>
        </Card>
      ) : null}

      <SurveyAdmin folders={folders} surveys={surveys} tags={tags} />
    </div>
  );
}
