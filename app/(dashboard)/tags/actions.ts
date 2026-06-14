"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type TagActionState = {
  ok: boolean;
  message: string;
  folderId?: string;
};

const initialState: TagActionState = {
  ok: false,
  message: ""
};

type SupabaseActionResult = {
  error: { message: string } | null;
};

const MSG = {
  tagNameRequired: "\u30bf\u30b0\u540d\u306f\u5fc5\u9808\u3067\u3059\u3002",
  colorRequired: "\u8272\u3092\u9078\u629e\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
  folderNameRequired: "\u30d5\u30a9\u30eb\u30c0\u540d\u306f\u5fc5\u9808\u3067\u3059\u3002",
  invalidInput: "\u5165\u529b\u5185\u5bb9\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
  loginRequired: "\u30ed\u30b0\u30a4\u30f3\u304c\u5fc5\u8981\u3067\u3059\u3002",
  saveTagFailed: "\u30bf\u30b0\u306e\u4fdd\u5b58\u4e2d\u306b\u30a8\u30e9\u30fc\u304c\u767a\u751f\u3057\u307e\u3057\u305f\u3002",
  tagCreated: "\u30bf\u30b0\u3092\u4f5c\u6210\u3057\u307e\u3057\u305f\u3002",
  tagUpdated: "\u30bf\u30b0\u3092\u66f4\u65b0\u3057\u307e\u3057\u305f\u3002",
  saveFolderFailed: "\u30d5\u30a9\u30eb\u30c0\u306e\u4fdd\u5b58\u4e2d\u306b\u30a8\u30e9\u30fc\u304c\u767a\u751f\u3057\u307e\u3057\u305f\u3002",
  folderCreated: "\u30d5\u30a9\u30eb\u30c0\u3092\u4f5c\u6210\u3057\u307e\u3057\u305f\u3002",
  selectDeleteTag: "\u524a\u9664\u3059\u308b\u30bf\u30b0\u3092\u9078\u629e\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
  tagDeleted: "\u30bf\u30b0\u3092\u524a\u9664\u3057\u307e\u3057\u305f\u3002",
  selectMoveTarget:
    "\u79fb\u52d5\u3059\u308b\u30bf\u30b0\u3068\u30d5\u30a9\u30eb\u30c0\u3092\u9078\u629e\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
  moveFailed: "\u30bf\u30b0\u306e\u79fb\u52d5\u4e2d\u306b\u30a8\u30e9\u30fc\u304c\u767a\u751f\u3057\u307e\u3057\u305f\u3002",
  timeoutSuffix:
    "\u306b\u6642\u9593\u304c\u304b\u304b\u3063\u3066\u3044\u307e\u3059\u3002\u901a\u4fe1\u72b6\u614b\u3092\u78ba\u8a8d\u3057\u3066\u3001\u3082\u3046\u4e00\u5ea6\u304a\u8a66\u3057\u304f\u3060\u3055\u3044\u3002",
  folderSetupMissing:
    "Supabase\u306720_pending_feature_setup.sql\u3092\u5b9f\u884c\u3059\u308b\u3068\u3001\u30bf\u30b0\u30d5\u30a9\u30eb\u30c0\u3092\u4fdd\u5b58\u30fb\u79fb\u52d5\u3067\u304d\u307e\u3059\u3002"
};

const tagSchema = z.object({
  tag_id: z.string().uuid().optional().or(z.literal("")),
  name: z.string().trim().min(1, MSG.tagNameRequired),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, MSG.colorRequired)
});

const folderSchema = z.object({
  name: z.string().trim().min(1, MSG.folderNameRequired),
  description: z.string().trim().optional()
});

const deleteSchema = z.object({
  tag_id: z.string().uuid()
});

const moveTagsSchema = z.object({
  tag_ids: z.array(z.string().uuid()).min(1),
  folder_id: z.string().uuid().or(z.literal("none"))
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
        timer = setTimeout(() => reject(new Error(`${label}${MSG.timeoutSuffix}`)), ms);
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

function missingTagFolderSetupMessage() {
  return MSG.folderSetupMissing;
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
        message: parsed.error.errors[0]?.message ?? MSG.invalidInput
      };
    }

    const supabase = createClient() as any;
    const {
      data: { user }
    } = (await withActionTimeout(supabase.auth.getUser(), "\u30ed\u30b0\u30a4\u30f3\u78ba\u8a8d")) as {
      data: { user: { id: string } | null };
    };

    if (!user) return { ok: false, message: MSG.loginRequired };

    const input = parsed.data;
    const payload = {
      name: input.name,
      color: input.color,
      created_by: user.id
    };

    const { error } = (await (async () => {
      try {
        return input.tag_id
          ? await withActionTimeout(supabase.from("tags").update(payload).eq("id", input.tag_id), "\u30bf\u30b0\u66f4\u65b0")
          : await withActionTimeout(supabase.from("tags").insert(payload), "\u30bf\u30b0\u4f5c\u6210");
      } catch (error) {
        return {
          error: {
            message: actionErrorMessage(error, MSG.saveTagFailed)
          }
        };
      }
    })()) as SupabaseActionResult;

    if (error) return { ok: false, message: error.message };

    revalidateTagScreens();
    return { ok: true, message: input.tag_id ? MSG.tagUpdated : MSG.tagCreated };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, MSG.saveTagFailed) };
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
        message: parsed.error.errors[0]?.message ?? MSG.invalidInput
      };
    }

    const supabase = createClient() as any;
    const {
      data: { user }
    } = (await withActionTimeout(supabase.auth.getUser(), "\u30ed\u30b0\u30a4\u30f3\u78ba\u8a8d")) as {
      data: { user: { id: string } | null };
    };

    if (!user) return { ok: false, message: MSG.loginRequired };

    const { data, error } = (await (async () => {
      try {
        return await withActionTimeout(
          supabase.from("tag_folders").insert({
            name: parsed.data.name,
            description: parsed.data.description || null,
            created_by: user.id
          }).select("id").single(),
          "\u30d5\u30a9\u30eb\u30c0\u4f5c\u6210"
        );
      } catch (error) {
        return {
          data: null,
          error: {
            message: actionErrorMessage(error, MSG.saveFolderFailed)
          }
        };
      }
    })()) as SupabaseActionResult & { data: { id: string } | null };

    if (error) {
      return {
        ok: false,
        message:
          error.message.includes("tag_folders") || error.message.includes("folder_id")
            ? missingTagFolderSetupMessage()
            : error.message
      };
    }

    revalidateTagScreens();
    return { ok: true, message: MSG.folderCreated, folderId: data?.id };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, MSG.saveFolderFailed) };
  }
}

export async function deleteTag(
  _prevState: TagActionState = initialState,
  formData: FormData
): Promise<TagActionState> {
  const parsed = deleteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: MSG.selectDeleteTag };

  const supabase = createClient() as any;
  const { error } = await supabase.from("tags").delete().eq("id", parsed.data.tag_id);

  if (error) return { ok: false, message: error.message };

  revalidateTagScreens();
  return { ok: true, message: MSG.tagDeleted };
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
      return { ok: false, message: MSG.selectMoveTarget };
    }

    const folderId = parsed.data.folder_id === "none" ? null : parsed.data.folder_id;
    const supabase = createClient() as any;
    const {
      data: { user }
    } = (await withActionTimeout(supabase.auth.getUser(), "\u30ed\u30b0\u30a4\u30f3\u78ba\u8a8d")) as {
      data: { user: { id: string } | null };
    };

    if (!user) return { ok: false, message: MSG.loginRequired };

    const { error } = (await (async () => {
      try {
        return await withActionTimeout(
          supabase.from("tags").update({ folder_id: folderId }).in("id", parsed.data.tag_ids),
          "\u30bf\u30b0\u79fb\u52d5"
        );
      } catch (error) {
        return {
          error: {
            message: actionErrorMessage(error, MSG.moveFailed)
          }
        };
      }
    })()) as SupabaseActionResult;

    if (error) {
      return {
        ok: false,
        message: error.message.includes("folder_id") ? missingTagFolderSetupMessage() : error.message
      };
    }

    revalidateTagScreens();

    return {
      ok: true,
      message: folderId
        ? `${parsed.data.tag_ids.length}\u4ef6\u306e\u30bf\u30b0\u3092\u30d5\u30a9\u30eb\u30c0\u3078\u79fb\u52d5\u3057\u307e\u3057\u305f\u3002`
        : `${parsed.data.tag_ids.length}\u4ef6\u306e\u30bf\u30b0\u3092\u672a\u5206\u985e\u3078\u79fb\u52d5\u3057\u307e\u3057\u305f\u3002`
    };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, MSG.moveFailed) };
  }
}
