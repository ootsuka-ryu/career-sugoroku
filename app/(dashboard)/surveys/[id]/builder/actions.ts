"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { UNIVERSITY_TAG_COLORS } from "@/lib/tags/university-folders";

export type SurveyBuilderState = {
  ok: boolean;
  message: string;
};

const initialState: SurveyBuilderState = {
  ok: false,
  message: ""
};

const settingsSchema = z.object({
  survey_id: z.string().uuid(),
  admin_title: z.string().trim().min(1, "管理用タイトルは必須です。"),
  public_title: z.string().trim().min(1, "学生に見えるタイトルは必須です。"),
  description: z.string().trim().optional(),
  folder_id: z.string().uuid().optional().or(z.literal("")),
  is_active: z.string().optional(),
  is_visible: z.string().optional(),
  one_response_per_student: z.string().optional(),
  redirect_url: z.string().trim().url().optional().or(z.literal("")),
  thank_you_message: z.string().trim().optional(),
  custom_css: z.string().optional()
});

const sectionSchema = z.object({
  survey_id: z.string().uuid(),
  title: z.string().trim().optional(),
  description: z.string().trim().optional(),
  is_visible: z.string().optional()
});

const sectionOperationSchema = z.object({
  survey_id: z.string().uuid(),
  section_id: z.string().uuid(),
  direction: z.enum(["up", "down"]).optional()
});

const questionSchema = z.object({
  survey_id: z.string().uuid(),
  section_id: z.string().uuid().optional().or(z.literal("")),
  type: z.enum(["heading", "text", "radio", "checkbox", "select", "file_upload"]),
  label: z.string().trim().min(1, "項目名は必須です。"),
  description: z.string().trim().optional(),
  placeholder: z.string().trim().optional(),
  validation_type: z.enum(["none", "email", "phone"]).default("none"),
  options_text: z.string().trim().optional(),
  is_required: z.string().optional(),
  is_visible: z.string().optional(),
  attached_image_url: z.string().trim().url().optional().or(z.literal("")),
  branch_rules_text: z.string().trim().optional(),
  tag_rules_text: z.string().trim().optional()
});

const updateQuestionSchema = questionSchema.extend({
  question_id: z.string().uuid()
});

const deleteQuestionSchema = z.object({
  survey_id: z.string().uuid(),
  question_id: z.string().uuid()
});

const questionOperationSchema = z.object({
  survey_id: z.string().uuid(),
  question_id: z.string().uuid(),
  section_id: z.string().uuid().optional().or(z.literal("")),
  direction: z.enum(["up", "down"])
});

export async function updateSurveySettings(
  _prevState: SurveyBuilderState = initialState,
  formData: FormData
): Promise<SurveyBuilderState> {
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.errors[0]?.message ?? "設定内容を確認してください。"
    };
  }

  const input = parsed.data;
  const supabase = createClient() as any;
  const update: Record<string, unknown> = {
    title: input.public_title,
    admin_title: input.admin_title,
    public_title: input.public_title,
    description: input.description || null,
    folder_id: input.folder_id || null
  };

  if (formData.has("is_active")) update.is_active = input.is_active === "on";
  if (formData.has("is_visible")) update.is_visible = input.is_visible !== "off";
  if (formData.has("one_response_per_student")) {
    update.one_response_per_student = input.one_response_per_student === "on";
  }
  if (formData.has("redirect_url")) update.redirect_url = input.redirect_url || null;
  if (formData.has("thank_you_message")) {
    update.thank_you_message =
      input.thank_you_message || "回答を送信しました。ありがとうございました。";
  }
  if (formData.has("custom_css")) update.custom_css = input.custom_css || null;

  const { error } = await supabase
    .from("surveys")
    .update(update)
    .eq("id", input.survey_id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/surveys");
  revalidatePath(`/surveys/${input.survey_id}/builder`);
  return { ok: true, message: "保存しました。" };
}

export async function addSurveySection(
  _prevState: SurveyBuilderState = initialState,
  formData: FormData
): Promise<SurveyBuilderState> {
  const parsed = sectionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "セクションを追加できませんでした。" };
  }

  const supabase = createClient() as any;
  const { count } = await supabase
    .from("survey_sections")
    .select("id", { count: "exact", head: true })
    .eq("survey_id", parsed.data.survey_id);

  const order = (count ?? 0) + 1;
  const { error } = await supabase.from("survey_sections").insert({
    survey_id: parsed.data.survey_id,
    order,
    title: parsed.data.title || `セクション${order}`,
    description: parsed.data.description || null,
    is_visible: parsed.data.is_visible !== "off"
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/surveys/${parsed.data.survey_id}/builder`);
  return { ok: true, message: "セクションを追加しました。" };
}

export async function duplicateSurveySection(
  _prevState: SurveyBuilderState = initialState,
  formData: FormData
): Promise<SurveyBuilderState> {
  const parsed = sectionOperationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "セクションを選択してください。" };

  const supabase = createClient() as any;
  const { data: source, error: sourceError } = await supabase
    .from("survey_sections")
    .select("id, survey_id, order, title, description, is_visible")
    .eq("id", parsed.data.section_id)
    .maybeSingle();

  if (sourceError || !source) {
    return { ok: false, message: sourceError?.message ?? "セクションが見つかりません。" };
  }

  const { count } = await supabase
    .from("survey_sections")
    .select("id", { count: "exact", head: true })
    .eq("survey_id", parsed.data.survey_id);

  const { data: inserted, error } = await supabase
    .from("survey_sections")
    .insert({
      survey_id: parsed.data.survey_id,
      order: (count ?? 0) + 1,
      title: `${source.title} のコピー`,
      description: source.description,
      is_visible: source.is_visible
    })
    .select("id")
    .single();

  if (error) return { ok: false, message: error.message };

  const { data: questions } = await supabase
    .from("survey_questions")
    .select(
      "type, label, description, placeholder, validation_type, options_jsonb, is_required, is_visible, attached_image_url, branch_rules_jsonb, order"
    )
    .eq("section_id", parsed.data.section_id)
    .order("order");

  if (inserted?.id && questions?.length) {
    await supabase.from("survey_questions").insert(
      questions.map((question: any, index: number) => ({
        survey_id: parsed.data.survey_id,
        section_id: inserted.id,
        order: index + 1,
        type: question.type,
        label: question.label,
        description: question.description,
        placeholder: question.placeholder,
        validation_type: question.validation_type,
        options_jsonb: question.options_jsonb ?? [],
        is_required: question.is_required,
        is_visible: question.is_visible,
        attached_image_url: question.attached_image_url,
        branch_rules_jsonb: question.branch_rules_jsonb ?? []
      }))
    );
  }

  revalidatePath(`/surveys/${parsed.data.survey_id}/builder`);
  return { ok: true, message: "セクションを複製しました。" };
}

export async function moveSurveySection(
  _prevState: SurveyBuilderState = initialState,
  formData: FormData
): Promise<SurveyBuilderState> {
  const parsed = sectionOperationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || !parsed.data.direction) {
    return { ok: false, message: "移動するセクションを選択してください。" };
  }

  const supabase = createClient() as any;
  const { data: sections, error } = await supabase
    .from("survey_sections")
    .select("id, order")
    .eq("survey_id", parsed.data.survey_id)
    .order("order");

  if (error) return { ok: false, message: error.message };

  const index = sections.findIndex((section: any) => section.id === parsed.data.section_id);
  const targetIndex = parsed.data.direction === "up" ? index - 1 : index + 1;

  if (index < 0 || targetIndex < 0 || targetIndex >= sections.length) {
    return { ok: true, message: "これ以上移動できません。" };
  }

  const current = sections[index];
  const target = sections[targetIndex];

  await supabase.from("survey_sections").update({ order: target.order }).eq("id", current.id);
  await supabase.from("survey_sections").update({ order: current.order }).eq("id", target.id);

  revalidatePath(`/surveys/${parsed.data.survey_id}/builder`);
  return { ok: true, message: "セクションを移動しました。" };
}

export async function deleteSurveySection(
  _prevState: SurveyBuilderState = initialState,
  formData: FormData
): Promise<SurveyBuilderState> {
  const parsed = sectionOperationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "セクションを選択してください。" };

  const supabase = createClient() as any;
  const { survey_id, section_id } = parsed.data;

  const { error: questionError } = await supabase
    .from("survey_questions")
    .delete()
    .eq("survey_id", survey_id)
    .eq("section_id", section_id);

  if (questionError) return { ok: false, message: questionError.message };

  const { error } = await supabase
    .from("survey_sections")
    .delete()
    .eq("id", section_id)
    .eq("survey_id", survey_id);

  if (error) return { ok: false, message: error.message };

  const { data: remainingSections } = await supabase
    .from("survey_sections")
    .select("id")
    .eq("survey_id", survey_id)
    .order("order");

  if (remainingSections?.length) {
    await Promise.all(
      remainingSections.map((section: { id: string }, index: number) =>
        supabase
          .from("survey_sections")
          .update({ order: index + 1 })
          .eq("id", section.id)
      )
    );
  }

  revalidatePath("/surveys");
  revalidatePath(`/surveys/${survey_id}/builder`);
  return { ok: true, message: "セクションを削除しました。" };
}

export async function addSurveyQuestion(
  _prevState: SurveyBuilderState = initialState,
  formData: FormData
): Promise<SurveyBuilderState> {
  const parsed = questionSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.errors[0]?.message ?? "入力内容を確認してください。"
    };
  }

  const input = parsed.data;
  const supabase = createClient() as any;
  const { count } = await supabase
    .from("survey_questions")
    .select("id", { count: "exact", head: true })
    .eq("survey_id", input.survey_id);

  const { data: inserted, error } = await supabase
    .from("survey_questions")
    .insert({
      survey_id: input.survey_id,
      section_id: input.section_id || null,
      order: (count ?? 0) + 1,
      type: input.type as any,
      label: input.label,
      description: input.description || null,
      placeholder: input.placeholder || null,
      validation_type: input.validation_type,
      options_jsonb: parseOptions(input.options_text),
      is_required: input.is_required === "on",
      is_visible: input.is_visible !== "off",
      attached_image_url: input.attached_image_url || null,
      branch_rules_jsonb: parseBranchRules(input.branch_rules_text)
    })
    .select("id")
    .single();

  if (error) return { ok: false, message: error.message };
  if (inserted?.id) {
    await syncQuestionTagRules(supabase, inserted.id, input.tag_rules_text);
  }

  revalidatePath(`/surveys/${input.survey_id}/builder`);
  return { ok: true, message: "項目を追加しました。" };
}

export async function updateSurveyQuestion(
  _prevState: SurveyBuilderState = initialState,
  formData: FormData
): Promise<SurveyBuilderState> {
  const parsed = updateQuestionSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.errors[0]?.message ?? "入力内容を確認してください。"
    };
  }

  const input = parsed.data;
  const supabase = createClient() as any;
  const { error } = await supabase
    .from("survey_questions")
    .update({
      type: input.type as any,
      label: input.label,
      description: input.description || null,
      placeholder: input.placeholder || null,
      validation_type: input.validation_type,
      options_jsonb: parseOptions(input.options_text),
      is_required: input.is_required === "on",
      is_visible: input.is_visible !== "off",
      attached_image_url: input.attached_image_url || null,
      branch_rules_jsonb: parseBranchRules(input.branch_rules_text)
    })
    .eq("id", input.question_id);

  if (error) return { ok: false, message: error.message };
  await syncQuestionTagRules(supabase, input.question_id, input.tag_rules_text);

  revalidatePath(`/surveys/${input.survey_id}/builder`);
  return { ok: true, message: "項目を保存しました。" };
}

export async function deleteSurveyQuestion(
  _prevState: SurveyBuilderState = initialState,
  formData: FormData
): Promise<SurveyBuilderState> {
  const parsed = deleteQuestionSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) return { ok: false, message: "項目を選択してください。" };

  const supabase = createClient() as any;
  const { survey_id, question_id } = parsed.data;
  const { error } = await supabase
    .from("survey_questions")
    .delete()
    .eq("id", question_id);

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/surveys/${survey_id}/builder`);
  return { ok: true, message: "項目を削除しました。" };
}

export async function moveSurveyQuestion(
  _prevState: SurveyBuilderState = initialState,
  formData: FormData
): Promise<SurveyBuilderState> {
  const parsed = questionOperationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "項目を選択してください。" };

  const input = parsed.data;
  const supabase = createClient() as any;
  let query = supabase
    .from("survey_questions")
    .select("id, order")
    .eq("survey_id", input.survey_id)
    .order("order");

  query = input.section_id
    ? query.eq("section_id", input.section_id)
    : query.is("section_id", null);

  const { data: questions, error } = await query;
  if (error) return { ok: false, message: error.message };

  const index = questions.findIndex((question: any) => question.id === input.question_id);
  const targetIndex = input.direction === "up" ? index - 1 : index + 1;

  if (index < 0 || targetIndex < 0 || targetIndex >= questions.length) {
    return { ok: true, message: "これ以上移動できません。" };
  }

  const current = questions[index];
  const target = questions[targetIndex];

  await supabase.from("survey_questions").update({ order: target.order }).eq("id", current.id);
  await supabase.from("survey_questions").update({ order: current.order }).eq("id", target.id);

  revalidatePath(`/surveys/${input.survey_id}/builder`);
  return { ok: true, message: "項目を移動しました。" };
}

function parseOptions(value?: string) {
  return (value ?? "")
    .split(/\r?\n|,/)
    .map((option) => option.trim())
    .filter(Boolean);
}

function parseBranchRules(value?: string) {
  return (value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [answer, targetSectionId] = line.split("=>").map((item) => item.trim());
      return answer && targetSectionId ? { answer, targetSectionId } : null;
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

  await supabase.from("survey_question_tags").delete().eq("question_id", questionId);

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
