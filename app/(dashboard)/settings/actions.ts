"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const staffSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(1),
  role: z.enum(["admin", "staff"]),
  line_user_id: z.string().trim().optional()
});

const updateStaffSchema = staffSchema.extend({
  id: z.string().uuid()
});

export async function addStaffUser(formData: FormData) {
  const parsed = staffSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    throw new Error("スタッフ情報の入力内容を確認してください。");
  }
  await ensureSignedIn();
  const supabase = createAdminClient() as any;
  const id = crypto.randomUUID();
  const { error } = await supabase.from("staff_users").insert({
    id,
    email: parsed.data.email,
    name: parsed.data.name,
    role: parsed.data.role,
    line_user_id: parsed.data.line_user_id || null,
    is_active: true
  });
  if (error) {
    throw new Error(`スタッフを追加できませんでした: ${error.message}`);
  }
  revalidatePath("/settings");
}

export async function updateStaffUser(formData: FormData) {
  const parsed = updateStaffSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    throw new Error("スタッフ情報の入力内容を確認してください。");
  }
  await ensureSignedIn();
  const supabase = createAdminClient() as any;
  const { error } = await supabase
    .from("staff_users")
    .update({
      email: parsed.data.email,
      name: parsed.data.name,
      role: parsed.data.role,
      line_user_id: parsed.data.line_user_id || null
    })
    .eq("id", parsed.data.id);
  if (error) {
    throw new Error(`スタッフ情報を保存できませんでした: ${error.message}`);
  }
  revalidatePath("/settings");
}

export async function deactivateStaffUser(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) {
    throw new Error("スタッフIDが見つかりません。");
  }
  await ensureSignedIn();
  const supabase = createAdminClient() as any;
  const { error } = await supabase.from("staff_users").update({ is_active: false }).eq("id", id);
  if (error) {
    throw new Error(`スタッフを無効化できませんでした: ${error.message}`);
  }
  revalidatePath("/settings");
}

async function ensureSignedIn() {
  const supabase = createClient() as any;
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("ログインが必要です。");
  }
}
