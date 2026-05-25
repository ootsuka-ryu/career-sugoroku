"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type AutoReplyActionState = {
  ok: boolean;
  message: string;
};

const initialState: AutoReplyActionState = {
  ok: false,
  message: ""
};

const autoReplySchema = z.object({
  auto_reply_id: z.string().uuid().optional().or(z.literal("")),
  trigger_keyword: z.string().trim().min(1, "キーワードは必須です。"),
  match_type: z.enum(["exact", "contains", "regex"]),
  reply_text: z.string().trim().min(1, "返信文は必須です。"),
  is_active: z.string().optional()
});

const deleteSchema = z.object({
  auto_reply_id: z.string().uuid()
});

export async function saveAutoReply(
  _prevState: AutoReplyActionState = initialState,
  formData: FormData
): Promise<AutoReplyActionState> {
  const parsed = autoReplySchema.safeParse(Object.fromEntries(formData));
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
  const payload = {
    trigger_keyword: input.trigger_keyword,
    match_type: input.match_type,
    reply_payload_jsonb: {
      type: "text",
      text: input.reply_text
    },
    is_active: input.is_active === "on",
    created_by: user.id
  };

  const { error } = input.auto_reply_id
    ? await supabase.from("auto_replies").update(payload).eq("id", input.auto_reply_id)
    : await supabase.from("auto_replies").insert(payload);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/auto-replies");
  return {
    ok: true,
    message: input.auto_reply_id ? "自動応答を更新しました。" : "自動応答を作成しました。"
  };
}

export async function deleteAutoReply(
  _prevState: AutoReplyActionState = initialState,
  formData: FormData
): Promise<AutoReplyActionState> {
  const parsed = deleteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "削除する自動応答を選択してください。" };

  const supabase = createClient() as any;
  const { error } = await supabase
    .from("auto_replies")
    .delete()
    .eq("id", parsed.data.auto_reply_id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/auto-replies");
  return { ok: true, message: "自動応答を削除しました。" };
}
