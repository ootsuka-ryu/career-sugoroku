"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type MessageTemplateActionState = {
  ok: boolean;
  message: string;
};

const initialState: MessageTemplateActionState = {
  ok: false,
  message: ""
};

const folderSchema = z.object({
  name: z.string().trim().min(1, "フォルダ名を入力してください。")
});

export async function createTemplateFolder(
  _prevState: MessageTemplateActionState = initialState,
  formData: FormData
): Promise<MessageTemplateActionState> {
  const parsed = folderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.errors[0]?.message ?? "フォルダ名を入力してください。"
    };
  }
  const supabase = createClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("message_template_folders").insert({
    name: parsed.data.name,
    created_by: user?.id ?? null
  });

  if (error) {
    return {
      ok: false,
      message: error.message.includes("message_template_folders")
        ? "Supabaseで 10_recruiting_ops_features.sql を先に実行してください。"
        : error.message
    };
  }

  revalidatePath("/message-templates");
  return { ok: true, message: "フォルダを作成しました。" };
}

const templateSchema = z.object({
  title: z.string().trim().min(1),
  body: z.string().trim().min(1),
  kind: z.string().trim().min(1),
  folder_id: z.string().uuid().optional().or(z.literal(""))
});

export async function createMessageTemplate(
  _prevState: MessageTemplateActionState = initialState,
  formData: FormData
): Promise<MessageTemplateActionState> {
  const parsed = templateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "テンプレート名と内容を入力してください。" };
  }
  const supabase = createClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("message_templates").insert({
    title: parsed.data.title,
    body: parsed.data.body,
    kind: parsed.data.kind,
    folder_id: parsed.data.folder_id || null,
    created_by: user?.id ?? null
  });

  if (error) {
    return {
      ok: false,
      message: error.message.includes("message_templates")
        ? "Supabaseで 10_recruiting_ops_features.sql を先に実行してください。"
        : error.message
    };
  }

  revalidatePath("/message-templates");
  return { ok: true, message: "テンプレートを保存しました。" };
}

export async function deleteMessageTemplate(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = createClient() as any;
  await supabase.from("message_templates").delete().eq("id", id);
  revalidatePath("/message-templates");
}
