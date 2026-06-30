"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { UNIVERSITY_TAG_COLORS } from "@/lib/tags/university-folders";

export type SurveyActionState = {
  ok: boolean;
  message: string;
};

const initialState: SurveyActionState = {
  ok: false,
  message: ""
};

const createSurveySchema = z.object({
  admin_title: z.string().trim().min(1, "管理用タイトルは必須です。"),
  public_title: z.string().trim().min(1, "学生に見えるタイトルは必須です。"),
  description: z.string().trim().optional(),
  folder_id: z.string().uuid().optional().or(z.literal("")),
  is_active: z.string().optional(),
  is_visible: z.string().optional(),
  one_response_per_student: z.string().optional(),
  redirect_url: z.string().trim().url().optional().or(z.literal("")),
  thank_you_message: z.string().trim().optional(),
  custom_css: z.string().optional(),
  draft_payload: z.string().optional()
});

const folderSchema = z.object({
  name: z.string().trim().min(1, "フォルダ名は必須です。"),
  description: z.string().trim().optional()
});

const folderRenameSchema = z.object({
  folder_id: z.string().uuid(),
  name: z.string().trim().min(1, "フォルダ名を入力してください。")
});

type DraftPayload = {
  sections?: Array<{
    id?: string;
    title?: string;
    description?: string;
    questions?: Array<{
      type?: string;
      label?: string;
      description?: string;
      placeholder?: string;
      validation_type?: string;
      options_text?: string;
      is_required?: boolean;
      is_visible?: boolean;
      attached_image_url?: string;
      branch_rules_text?: string;
      tag_rules_text?: string;
    }>;
  }>;
};

export async function createSurvey(
  _prevState: SurveyActionState = initialState,
  formData: FormData
): Promise<SurveyActionState> {
  const parsed = createSurveySchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.errors[0]?.message ?? "入力内容を確認してください。"
    };
  }

  const supabase = createClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "ログインが必要です。" };

  const input = parsed.data;
  const payload = parseDraftPayload(input.draft_payload);

  const { data: survey, error } = await supabase
    .from("surveys")
    .insert({
      title: input.public_title,
      admin_title: input.admin_title,
      public_title: input.public_title,
      description: input.description || null,
      folder_id: input.folder_id || null,
      is_active: input.is_active === "on",
      is_visible: input.is_visible !== "off",
      require_signin: false,
      one_response_per_student: input.one_response_per_student === "on",
      redirect_url: input.redirect_url || null,
      thank_you_message:
        input.thank_you_message || "回答を送信しました。ありがとうございました。",
      custom_css: input.custom_css || null,
      created_by: user.id
    })
    .select("id")
    .single();

  if (error) return { ok: false, message: error.message };

  if (survey?.id) {
    await insertDraftSectionsAndQuestions(supabase, survey.id, payload);
  }

  revalidatePath("/surveys");
  return {
    ok: true,
    message: "アンケートを作成しました。一覧の「質問を編集」から内容を続けて調整できます。"
  };
}

export async function createSurveyFolder(
  _prevState: SurveyActionState = initialState,
  formData: FormData
): Promise<SurveyActionState> {
  const parsed = folderSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.errors[0]?.message ?? "入力内容を確認してください。"
    };
  }

  const supabase = createClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "ログインが必要です。" };

  const { error } = await supabase.from("survey_folders").insert({
    name: parsed.data.name,
    description: parsed.data.description || null,
    created_by: user.id
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath("/surveys");
  return { ok: true, message: "フォルダを作成しました。" };
}

export async function renameSurveyFolder(
  _prevState: SurveyActionState = initialState,
  formData: FormData
): Promise<SurveyActionState> {
  const parsed = folderRenameSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.errors[0]?.message ?? "フォルダ名を確認してください。"
    };
  }

  const supabase = createClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "ログインが必要です。" };

  const { error } = await supabase
    .from("survey_folders")
    .update({ name: parsed.data.name })
    .eq("id", parsed.data.folder_id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/surveys");
  return { ok: true, message: "フォルダ名を変更しました。" };
}

export async function moveSurveysToFolder(
  _prevState: SurveyActionState = initialState,
  formData: FormData
): Promise<SurveyActionState> {
  const surveyIds = formData
    .getAll("survey_ids")
    .map((value) => String(value))
    .filter((value) => z.string().uuid().safeParse(value).success);
  const folderIdRaw = String(formData.get("folder_id") ?? "");
  const folderId = folderIdRaw === "none" ? "" : folderIdRaw;

  if (surveyIds.length === 0) {
    return { ok: false, message: "移動する回答フォームを選択してください。" };
  }
  if (folderId && !z.string().uuid().safeParse(folderId).success) {
    return { ok: false, message: "移動先フォルダを選択してください。" };
  }

  const supabase = createClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "ログインが必要です。" };

  const { error } = await supabase
    .from("surveys")
    .update({ folder_id: folderId || null })
    .in("id", surveyIds);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/surveys");
  for (const surveyId of surveyIds) {
    revalidatePath(`/surveys/${surveyId}/builder`);
  }

  return {
    ok: true,
    message:
      folderId
        ? `${surveyIds.length}件の回答フォームを移動しました。`
        : `${surveyIds.length}件の回答フォームを未分類に移動しました。`
  };
}

export async function toggleSurveyActive(
  _prevState: SurveyActionState = initialState,
  formData: FormData
): Promise<SurveyActionState> {
  const surveyId = String(formData.get("survey_id") ?? "");
  const nextActive = String(formData.get("next_active") ?? "") === "true";

  if (!surveyId) return { ok: false, message: "アンケートIDがありません。" };

  const supabase = createClient() as any;
  const update = nextActive
    ? { is_active: true, is_visible: true }
    : { is_active: false };
  const { error } = await supabase
    .from("surveys")
    .update(update)
    .eq("id", surveyId);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/surveys");
  revalidatePath(`/surveys/${surveyId}/builder`);
  return {
    ok: true,
    message: nextActive ? "公開しました。" : "非公開にしました。"
  };
}

export async function createSurveyTagByName(name: string) {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { ok: false, message: "タグ名を入力してください。" };
  }

  const supabase = createClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "ログイン状態を確認できませんでした。再ログインしてください。" };
  }

  const { data, error } = await supabase
    .from("tags")
    .upsert(
      {
        name: trimmedName,
        color: UNIVERSITY_TAG_COLORS.get(trimmedName) ?? "#0ea5e9",
        created_by: user.id
      },
      { onConflict: "name" }
    )
    .select("id, name, color")
    .single();

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/tags");
  revalidatePath("/students");
  revalidatePath("/surveys");

  return { ok: true, tag: data };
}

function parseDraftPayload(value?: string): DraftPayload {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

async function insertDraftSectionsAndQuestions(
  supabase: any,
  surveyId: string,
  payload: DraftPayload
) {
  const sections = payload.sections ?? [];
  const sectionIdMap = new Map<string, string>();
  const insertedSections: Array<{ source: NonNullable<DraftPayload["sections"]>[number]; id: string | null }> = [];

  for (let index = 0; index < sections.length; index += 1) {
    const section = sections[index];
    const { data: insertedSection } = await supabase
      .from("survey_sections")
      .insert({
        survey_id: surveyId,
        order: index + 1,
        title: section.title || `セクション${index + 1}`,
        description: section.description || null,
        is_visible: true
      })
      .select("id")
      .single();

    if (section.id && insertedSection?.id) {
      sectionIdMap.set(section.id, insertedSection.id);
    }
    insertedSections.push({ source: section, id: insertedSection?.id ?? null });
  }

  for (const insertedSection of insertedSections) {
    const questions = insertedSection.source.questions ?? [];
    for (let questionIndex = 0; questionIndex < questions.length; questionIndex += 1) {
      const question = questions[questionIndex];
      if (!question.label?.trim()) continue;

      const { data: insertedQuestion } = await supabase
        .from("survey_questions")
        .insert({
          survey_id: surveyId,
          section_id: insertedSection.id,
          order: questionIndex + 1,
          type: normalizeQuestionType(question.type),
          label: question.label.trim(),
          description: question.description || null,
          placeholder: question.placeholder || null,
          validation_type: normalizeValidationType(question.validation_type),
          options_jsonb: parseOptions(question.options_text),
          is_required: question.is_required === true,
          is_visible: question.is_visible !== false,
          attached_image_url: question.attached_image_url || null,
          branch_rules_jsonb: parseBranchRules(question.branch_rules_text, sectionIdMap)
        })
        .select("id")
        .single();

      if (insertedQuestion?.id) {
        await syncQuestionTagRules(supabase, insertedQuestion.id, question.tag_rules_text);
      }
    }
  }
}

function normalizeQuestionType(value?: string) {
  return ["heading", "text", "radio", "checkbox", "select", "file_upload"].includes(value ?? "")
    ? value
    : "text";
}

function normalizeValidationType(value?: string) {
  return ["none", "email", "phone"].includes(value ?? "") ? value : "none";
}

function parseOptions(value?: string) {
  return (value ?? "")
    .split(/\r?\n|,/)
    .map((option) => option.trim())
    .filter(Boolean);
}

function parseBranchRules(value?: string, sectionIdMap = new Map<string, string>()) {
  return (value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [answer, targetSectionId] = line.split("=>").map((item) => item.trim());
      const mappedTargetSectionId = sectionIdMap.get(targetSectionId) ?? targetSectionId;
      return answer && mappedTargetSectionId ? { answer, targetSectionId: mappedTargetSectionId } : null;
    })
    .filter(Boolean);
}

function parseTagRules(value?: string) {
  return (value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [answer, tagId] = line.split("=>").map((item) => item.trim());
      return answer && tagId ? { answer, tagId } : null;
    })
    .filter(Boolean) as Array<{ answer: string; tagId: string }>;
}

async function syncQuestionTagRules(supabase: any, questionId: string, value?: string) {
  const rules = parseTagRules(value);
  if (rules.length === 0) return;

  const resolvedRules = (
    await Promise.all(
      rules.map(async (rule) => ({
        answer: rule.answer,
        tagId: await resolveTagId(supabase, rule.tagId)
      }))
    )
  ).filter((rule) => rule.tagId);

  if (resolvedRules.length === 0) return;

  await supabase.from("survey_question_tags").insert(
    resolvedRules.map((rule) => ({
      question_id: questionId,
      tag_id: rule.tagId,
      when_answer_matches_jsonb: { equals: rule.answer }
    }))
  );
}

async function resolveTagId(supabase: any, tagValue: string) {
  if (!tagValue.startsWith("new:")) return tagValue;

  const name = tagValue.slice(4).trim();
  if (!name) return "";

  const { data, error } = await supabase
    .from("tags")
    .upsert(
      {
        name,
        color: UNIVERSITY_TAG_COLORS.get(name) ?? "#0ea5e9"
      },
      { onConflict: "name" }
    )
    .select("id")
    .single();

  if (error) throw error;
  return data?.id ?? "";
}
