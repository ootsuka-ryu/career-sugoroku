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

type SupabaseActionResult = {
  error: { message: string } | null;
};

const tagSchema = z.object({
  tag_id: z.string().uuid().optional().or(z.literal("")),
  name: z.string().trim().min(1, "タグ名は必須です。"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "色を選択してください。")
});

const folderSchema = z.object({
  name: z.string().trim().min(1, "フォルダ名は必須です。"),
  description: z.string().trim().optional()
});

const deleteSchema = z.object({
  tag_id: z.string().uuid()
});

const moveTagsSchema = z.object({
  tag_ids: z.array(z.string().uuid()).min(1),
  folder_id: z.string().uuid().optional().or(z.literal("none"))
});

function actionErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function withActionTimeout<T>(promise: PromiseLike<T>, label: string, ms = 15000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label}に時間がかかっています。通信状態を確認して、もう一度お試しください。`)),
          ms
        );
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function revalidateTagScreens() {
  try {
    revalidatePath("/tags");
    revalidatePath("/students");
    revalidatePath("/surveys");
  } catch {
    // Revalidation failure should not make a successful database update look failed.
  }
}

export async function saveTag(
  _prevState: TagActionState = initialState,
  formData: FormData
): Promise<TagActionState> {
  try {
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
    } = (await withActionTimeout(supabase.auth.getUser(), "ログイン確認")) as {
      data: { user: { id: string } | null };
    };

    if (!user) return { ok: false, message: "ログインが必要です。" };

    const input = parsed.data;
    const payload = {
      name: input.name,
      color: input.color,
      created_by: user.id
    };

    const { error } = (await (async () => {
      try {
        return input.tag_id
          ? await withActionTimeout(supabase.from("tags").update(payload).eq("id", input.tag_id), "タグ更新")
          : await withActionTimeout(supabase.from("tags").insert(payload), "タグ作成");
      } catch (error) {
        return {
          error: {
            message: actionErrorMessage(error, "タグの保存中にエラーが発生しました。")
          }
        };
      }
    })()) as SupabaseActionResult;

    if (error) return { ok: false, message: error.message };

    revalidateTagScreens();
    return { ok: true, message: input.tag_id ? "タグを更新しました。" : "タグを作成しました。" };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "タグの保存中にエラーが発生しました。") };
  }
}

export async function createTagFolder(
  _prevState: TagActionState = initialState,
  formData: FormData
): Promise<TagActionState> {
  try {
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
    } = (await withActionTimeout(supabase.auth.getUser(), "ログイン確認")) as {
      data: { user: { id: string } | null };
    };

    if (!user) return { ok: false, message: "ログインが必要です。" };

    const { error } = (await (async () => {
      try {
        return await withActionTimeout(
          supabase.from("tag_folders").insert({
            name: parsed.data.name,
            description: parsed.data.description || null,
            created_by: user.id
          }),
          "フォルダ作成"
        );
      } catch (error) {
        return {
          error: {
            message: actionErrorMessage(error, "フォルダの保存中にエラーが発生しました。")
          }
        };
      }
    })()) as SupabaseActionResult;

    if (error) {
      return {
        ok: false,
        message: error.message.includes("tag_folders")
          ? "Supabaseで16_tag_folders.sqlを実行するとフォルダを保存できます。"
          : error.message
      };
    }

    revalidateTagScreens();
    return { ok: true, message: "フォルダを作成しました。" };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "フォルダの保存中にエラーが発生しました。") };
  }
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

export async function moveTagsToFolder(
  _prevState: TagActionState = initialState,
  formData: FormData
): Promise<TagActionState> {
  try {
    const parsed = moveTagsSchema.safeParse({
      tag_ids: formData.getAll("tag_ids").map((value) => String(value)),
      folder_id: String(formData.get("folder_id") ?? "")
    });

    if (!parsed.success) {
      return { ok: false, message: "移動するタグとフォルダを選択してください。" };
    }

    const folderId = parsed.data.folder_id === "none" ? null : parsed.data.folder_id;
    const supabase = createClient() as any;
    const {
      data: { user }
    } = (await withActionTimeout(supabase.auth.getUser(), "ログイン確認")) as {
      data: { user: { id: string } | null };
    };

    if (!user) return { ok: false, message: "ログインが必要です。" };

    const { error } = (await (async () => {
      try {
        return await withActionTimeout(
          supabase
            .from("tags")
            .update({ folder_id: folderId })
            .in("id", parsed.data.tag_ids),
          "タグ移動"
        );
      } catch (error) {
        return {
          error: {
            message: actionErrorMessage(error, "タグの移動中にエラーが発生しました。")
          }
        };
      }
    })()) as SupabaseActionResult;

    if (error) {
      return {
        ok: false,
        message: error.message.includes("folder_id")
          ? "Supabaseで21_tag_folder_assignments.sqlを実行するとタグをフォルダ移動できます。"
          : error.message
      };
    }

    revalidateTagScreens();

    return {
      ok: true,
      message: folderId
        ? `${parsed.data.tag_ids.length}件のタグをフォルダへ移動しました。`
        : `${parsed.data.tag_ids.length}件のタグを未分類へ移動しました。`
    };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "タグの移動中にエラーが発生しました。") };
  }
}
