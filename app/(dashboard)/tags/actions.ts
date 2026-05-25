"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type TagActionState = {
  ok: boolean;
  message: string;
};

const initialState: TagActionState = {
  ok: false,
  message: ""
};

const tagSchema = z.object({
  tag_id: z.string().uuid().optional().or(z.literal("")),
  name: z.string().trim().min(1, "タグ名は必須です。"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "色を選択してください。")
});

const deleteSchema = z.object({
  tag_id: z.string().uuid()
});

export async function saveTag(
  _prevState: TagActionState = initialState,
  formData: FormData
): Promise<TagActionState> {
  const parsed = tagSchema.safeParse(Object.fromEntries(formData));
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
    name: input.name,
    color: input.color,
    created_by: user.id
  };

  const { error } = input.tag_id
    ? await supabase.from("tags").update(payload).eq("id", input.tag_id)
    : await supabase.from("tags").insert(payload);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/tags");
  revalidatePath("/students");
  revalidatePath("/surveys");
  return { ok: true, message: input.tag_id ? "タグを更新しました。" : "タグを作成しました。" };
}

export async function deleteTag(
  _prevState: TagActionState = initialState,
  formData: FormData
): Promise<TagActionState> {
  const parsed = deleteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "削除するタグを選択してください。" };

  const supabase = createClient() as any;
  const { error } = await supabase.from("tags").delete().eq("id", parsed.data.tag_id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/tags");
  revalidatePath("/students");
  revalidatePath("/surveys");
  return { ok: true, message: "タグを削除しました。" };
}
