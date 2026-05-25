"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { pushLineMessage } from "@/lib/line/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type FollowUpActionState = {
  ok: boolean;
  message: string;
};

const reminderSchema = z.object({
  student_id: z.string().uuid(),
  text: z.string().trim().min(1).max(1000)
});

const tagSchema = z.object({
  student_id: z.string().uuid(),
  tag_id: z.string().uuid()
});

export async function sendReminder(
  _prevState: FollowUpActionState,
  formData: FormData
): Promise<FollowUpActionState> {
  const parsed = reminderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "送信内容を確認してください。" };
  }

  const supabase = createClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "ログインが必要です。" };
  }

  const admin = createAdminClient() as any;
  const { data: student, error } = await admin
    .from("students")
    .select("id, line_user_id")
    .eq("id", parsed.data.student_id)
    .single();

  if (error || !student) {
    return { ok: false, message: error?.message ?? "学生が見つかりません。" };
  }

  let status = "no_line_user_id";
  let message = "LINE userId がないため、送信記録だけ保存しました。";

  if (student.line_user_id) {
    const result = await pushLineMessage(student.line_user_id, [
      { type: "text", text: parsed.data.text }
    ]);

    if (result.ok && result.skipped) {
      status = "mock_sent";
      message = "LINE設定が未完了のため、送信記録だけ保存しました。";
    } else if (result.ok) {
      status = "sent";
      message = "リマインダーを送信しました。";
    } else {
      status = "failed";
      message = `LINE送信に失敗しました: ${result.reason}`;
    }
  }

  const sentAt = new Date().toISOString();
  await admin.from("messages").insert({
    student_id: parsed.data.student_id,
    direction: "out",
    type: "text",
    payload: { text: parsed.data.text },
    status,
    sent_at: sentAt,
    staff_id: user.id
  });

  await admin
    .from("students")
    .update({ last_outbound_at: sentAt })
    .eq("id", parsed.data.student_id);

  revalidatePath("/follow-ups");
  revalidatePath("/dashboard");
  revalidatePath(`/students/${parsed.data.student_id}`);

  return { ok: status !== "failed", message };
}

export async function addFollowUpTag(
  _prevState: FollowUpActionState,
  formData: FormData
): Promise<FollowUpActionState> {
  const parsed = tagSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "タグを選んでください。" };
  }

  const supabase = createClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "ログインが必要です。" };
  }

  const admin = createAdminClient() as any;
  const { error } = await admin.from("student_tags").upsert({
    student_id: parsed.data.student_id,
    tag_id: parsed.data.tag_id
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/follow-ups");
  revalidatePath(`/students/${parsed.data.student_id}`);

  return { ok: true, message: "タグを付けました。" };
}
