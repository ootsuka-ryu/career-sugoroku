"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  deleteLineRichMenu,
  syncRichMenuToLine
} from "@/lib/line/rich-menu";
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

const richMenuIdSchema = z.object({
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
    await supabase
      .from("rich_menus")
      .update({ is_default: false })
      .neq("id", input.rich_menu_id || "00000000-0000-0000-0000-000000000000");
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
  return { ok: true, message: "リッチメニューを保存しました。LINEに反映するには一覧の「LINEに反映」を押してください。" };
}

export async function syncRichMenu(
  _prevState: RichMenuActionState = initialState,
  formData: FormData
): Promise<RichMenuActionState> {
  const parsed = richMenuIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "LINEに反映するリッチメニューを選んでください。" };
  }

  const supabase = createClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "ログインが必要です。" };

  const { data: menu, error } = await supabase
    .from("rich_menus")
    .select("id, name, layout_jsonb, image_url, is_default, target_tag_ids, line_rich_menu_id")
    .eq("id", parsed.data.rich_menu_id)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      message: isRichMenuSyncSchemaMissing(error.message)
        ? "Supabaseで 15_rich_menu_line_sync.sql を先に実行してください。"
        : error.message
    };
  }

  if (!menu) return { ok: false, message: "リッチメニューが見つかりません。" };

  await supabase
    .from("rich_menus")
    .update({ line_sync_status: "syncing", line_sync_error: null })
    .eq("id", menu.id);

  const result = await syncRichMenuToLine({
    menu,
    baseUrl: process.env.NEXT_PUBLIC_APP_URL || "https://pharmacy-student-line-crm.ootsuka-r.workers.dev",
    lineAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    supabase
  });

  const { error: updateError } = await supabase
    .from("rich_menus")
    .update({
      line_rich_menu_id: result.ok ? result.lineRichMenuId : menu.line_rich_menu_id ?? null,
      line_synced_at: result.ok ? new Date().toISOString() : null,
      line_sync_status: result.ok ? "synced" : "failed",
      line_sync_error: result.ok ? null : result.message
    })
    .eq("id", menu.id);

  if (updateError) {
    return {
      ok: false,
      message: isRichMenuSyncSchemaMissing(updateError.message)
        ? "Supabaseで 15_rich_menu_line_sync.sql を先に実行してください。"
        : updateError.message
    };
  }

  revalidatePath("/rich-menus");
  return { ok: result.ok, message: result.message };
}

export async function deleteRichMenu(
  _prevState: RichMenuActionState = initialState,
  formData: FormData
): Promise<RichMenuActionState> {
  const parsed = richMenuIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "削除するリッチメニューを選んでください。" };

  const supabase = createClient() as any;
  const { data: menu } = await supabase
    .from("rich_menus")
    .select("line_rich_menu_id")
    .eq("id", parsed.data.rich_menu_id)
    .maybeSingle();

  if (menu?.line_rich_menu_id) {
    await deleteLineRichMenu(process.env.LINE_CHANNEL_ACCESS_TOKEN, menu.line_rich_menu_id);
  }

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

function isRichMenuSyncSchemaMissing(message: string) {
  return /line_rich_menu_id|line_sync|schema cache|column .* does not exist/i.test(message);
}
