"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type NotificationActionState = {
  ok: boolean;
  message: string;
};

const emptyState: NotificationActionState = {
  ok: false,
  message: ""
};

const preferenceSchema = z.object({
  type: z.string().min(1),
  via_line: z.string().optional(),
  via_email: z.string().optional(),
  is_enabled: z.string().optional()
});

export async function updateNotificationPreference(
  _prevState: NotificationActionState = emptyState,
  formData: FormData
): Promise<NotificationActionState> {
  const parsed = preferenceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "通知設定を確認してください。" };
  }

  const supabase = createClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "ログインが必要です。" };

  const input = parsed.data;
  const { error } = await supabase.from("notification_preferences").upsert(
    {
      staff_id: user.id,
      type: input.type,
      via_line: input.via_line === "on",
      via_email: input.via_email === "on",
      is_enabled: input.is_enabled === "on",
      updated_at: new Date().toISOString()
    },
    { onConflict: "staff_id,type" }
  );

  if (error) return { ok: false, message: error.message };

  revalidatePath("/notifications");
  return { ok: true, message: "通知設定を保存しました。" };
}

const readSchema = z.object({
  notification_id: z.string().uuid()
});

export async function markNotificationRead(
  _prevState: NotificationActionState = emptyState,
  formData: FormData
): Promise<NotificationActionState> {
  const parsed = readSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "通知を選択してください。" };

  const supabase = createClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "ログインが必要です。" };

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", parsed.data.notification_id)
    .eq("staff_id", user.id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/notifications");
  return { ok: true, message: "既読にしました。" };
}

export async function markAllNotificationsRead() {
  const supabase = createClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("staff_id", user.id)
    .is("read_at", null);

  revalidatePath("/notifications");
}
