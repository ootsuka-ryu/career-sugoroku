"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type RichMenuActionState = {
  ok: boolean;
  message: string;
};

const initialState: RichMenuActionState = {
  ok: false,
  message: ""
};

const richMenuSchema = z.object({
  rich_menu_id: z.string().uuid().optional().or(z.literal("")),
  name: z.string().trim().min(1, "リッチメニュー名は必須です。"),
  image_url: z.string().trim().url("画像を選択してください。"),
  is_default: z.string().optional(),
  target_tag_ids_json: z.string().optional(),
  layout_json: z.string().min(1)
});

const deleteSchema = z.object({
  rich_menu_id: z.string().uuid()
});

export async function saveRichMenu(
  _prevState: RichMenuActionState = initialState,
  formData: FormData
): Promise<RichMenuActionState> {
  const parsed = richMenuSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.errors[0]?.message ?? "入力内容を確認してください。"
    };
  }

  const input = parsed.data;
  const layout = parseJson(input.layout_json, {});
  const targetTagIds = parseJson(input.target_tag_ids_json ?? "[]", []);
  const supabase = createClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "ログインが必要です。" };

  if (input.is_default === "on") {
    await supabase.from("rich_menus").update({ is_default: false }).neq("id", input.rich_menu_id || "00000000-0000-0000-0000-000000000000");
  }

  const payload = {
    name: input.name,
    image_url: input.image_url,
    is_default: input.is_default === "on",
    target_tag_ids: targetTagIds,
    layout_jsonb: layout,
    created_by: user.id
  };

  const { error } = input.rich_menu_id
    ? await supabase.from("rich_menus").update(payload).eq("id", input.rich_menu_id)
    : await supabase.from("rich_menus").insert(payload);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/rich-menus");
  return { ok: true, message: "リッチメニューを保存しました。" };
}

export async function deleteRichMenu(
  _prevState: RichMenuActionState = initialState,
  formData: FormData
): Promise<RichMenuActionState> {
  const parsed = deleteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "削除するリッチメニューを選択してください。" };

  const supabase = createClient() as any;
  const { error } = await supabase
    .from("rich_menus")
    .delete()
    .eq("id", parsed.data.rich_menu_id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/rich-menus");
  return { ok: true, message: "リッチメニューを削除しました。" };
}

function parseJson(value: string, fallback: unknown) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
