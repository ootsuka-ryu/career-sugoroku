"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit/log";
import {
  candidateStages,
  declineReasons,
  motivationRanks
} from "@/lib/students/options";
import { uploadStudentPhoto as uploadStudentPhotoToStorage } from "@/lib/students/photo-storage";
import { studentFunnelFlagFields } from "@/lib/recruiting/funnel";
import { createClient } from "@/lib/supabase/server";
import type { ActionType, PracticalPeriod } from "@/lib/supabase/database.types";

export type StudentActionState = {
  ok: boolean;
  message: string;
};

const emptyState: StudentActionState = {
  ok: false,
  message: ""
};

const profileSchema = z.object({
  student_id: z.string().uuid(),
  expected_updated_at: z.string().min(1),
  real_name: z.string().trim().min(1, "氏名は必須です。"),
  kana: z.string().trim().optional(),
  university: z.string().trim().optional(),
  grade: z.string().trim().optional(),
  graduation_year: z.coerce.number().int().min(2020).max(2040).optional().or(z.literal("")),
  practical_period: z.enum(["P1_2", "P2_3", "P3_4", "undecided"]),
  motivation_level: z.coerce.number().int().min(1).max(5).optional().or(z.literal("")),
  motivation_rank: z.string().trim().optional(),
  candidate_stage: z.string().trim().optional(),
  decline_reason: z.string().trim().optional(),
  desired_job_type: z.string().trim().optional(),
  desired_area: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  status: z.string().trim().min(1),
  notes: z.string().trim().optional(),
  manual_next_action: z.string().trim().optional()
});

export async function updateStudentProfile(
  _prevState: StudentActionState = emptyState,
  formData: FormData
): Promise<StudentActionState> {
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.errors[0]?.message ?? "入力内容を確認してください。"
    };
  }

  const input = parsed.data;
  const supabase = createClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "ログインが必要です。" };

  const motivationRank = motivationRanks.includes(input.motivation_rank as any)
    ? input.motivation_rank
    : null;
  const candidateStage = candidateStages.some((stage) => stage.value === input.candidate_stage)
    ? input.candidate_stage
    : "friend_added";
  const declineReason = declineReasons.includes(input.decline_reason as any)
    ? input.decline_reason
    : null;

  const { data: before } = await supabase
    .from("students")
    .select("*")
    .eq("id", input.student_id)
    .maybeSingle();

  const payload = {
    real_name: input.real_name,
    display_name: input.real_name,
    kana: input.kana || null,
    university: input.university || null,
    grade: input.grade || null,
    graduation_year: input.graduation_year || null,
    practical_period: input.practical_period as PracticalPeriod,
    motivation_level: input.motivation_level || null,
    motivation_rank: motivationRank,
    candidate_stage: candidateStage,
    decline_reason: candidateStage === "declined" ? declineReason : null,
    last_stage_changed_at:
      before?.candidate_stage && before.candidate_stage !== candidateStage
        ? new Date().toISOString()
        : before?.last_stage_changed_at ?? new Date().toISOString(),
    desired_job_type: input.desired_job_type || null,
    desired_area: input.desired_area || null,
    phone: input.phone || null,
    email: input.email || null,
    status: input.status,
    notes: input.notes || null,
    manual_next_action: input.manual_next_action || null
  };

  let updatePayload: Record<string, unknown> = payload;
  let { data, error } = await supabase
    .from("students")
    .update(updatePayload)
    .eq("id", input.student_id)
    .eq("updated_at", input.expected_updated_at)
    .select("id")
    .maybeSingle();

  if (isMissingNewStudentColumnError(error)) {
    const {
      motivation_rank: _motivationRank,
      candidate_stage: _candidateStage,
      decline_reason: _declineReason,
      last_stage_changed_at: _lastStageChangedAt,
      notes: _notes,
      ...legacyPayload
    } = payload;

    updatePayload = legacyPayload;
    const retry = await supabase
      .from("students")
      .update(updatePayload)
      .eq("id", input.student_id)
      .eq("updated_at", input.expected_updated_at)
      .select("id")
      .maybeSingle();
    data = retry.data;
    error = retry.error;
  }

  if (error) return { ok: false, message: error.message };

  if (!data) {
    return {
      ok: false,
      message:
        "他のスタッフが先に更新した可能性があります。ページを再読み込みして内容を確認してください。"
    };
  }

  await writeAuditLog(supabase, {
    actorStaffId: user.id,
    action: "学生プロフィール更新",
    targetTable: "students",
    targetId: input.student_id,
    before,
    after: updatePayload
  });

  revalidatePath("/students");
  revalidatePath(`/students/${input.student_id}`);
  return { ok: true, message: "プロフィールを更新しました。" };
}

function isMissingNewStudentColumnError(error: any) {
  if (!error?.message) return false;
  return [
    "motivation_rank",
    "candidate_stage",
    "decline_reason",
    "last_stage_changed_at",
    "notes"
  ].some((column) => error.message.includes(column));
}

const photoSchema = z.object({
  student_id: z.string().uuid()
});

export async function uploadStudentPhoto(
  _prevState: StudentActionState = emptyState,
  formData: FormData
): Promise<StudentActionState> {
  const parsed = photoSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) return { ok: false, message: "学生情報を確認してください。" };

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "顔写真を選択してください。" };
  }

  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return { ok: false, message: "jpg、png、webp の画像を選択してください。" };
  }

  if (file.size > 1024 * 1024 * 5) {
    return { ok: false, message: "画像サイズは5MB以下にしてください。" };
  }

  const supabase = createClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "ログインが必要です。" };

  try {
    const photoUrl = await uploadStudentPhotoToStorage({
      bytes: await file.arrayBuffer(),
      contentType: file.type,
      fileName: file.name,
      studentId: parsed.data.student_id
    });

    const { data: before } = await supabase
      .from("students")
      .select("*")
      .eq("id", parsed.data.student_id)
      .maybeSingle();

    const { error } = await supabase
      .from("students")
      .update({ photo_url: photoUrl })
      .eq("id", parsed.data.student_id);

    if (error) {
      if (error.message?.includes("photo_url")) {
        return {
          ok: false,
          message:
            "Supabaseに顔写真用の保存場所がまだありません。11_student_photo.sql を実行してください。"
        };
      }
      return { ok: false, message: error.message };
    }

    await writeAuditLog(supabase, {
      actorStaffId: user.id,
      action: "学生顔写真更新",
      targetTable: "students",
      targetId: parsed.data.student_id,
      before,
      after: { photo_url: photoUrl }
    });

    revalidatePath("/students");
    revalidatePath(`/students/${parsed.data.student_id}`);
    return { ok: true, message: "顔写真を更新しました。" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "顔写真をアップロードできませんでした。"
    };
  }
}

const assigneeSchema = z.object({
  student_id: z.string().uuid(),
  staff_id: z.string().uuid().optional().or(z.literal(""))
});

const funnelSchema = z.object({
  student_id: z.string().uuid()
});

export async function updateStudentFunnelFlags(
  _prevState: StudentActionState = emptyState,
  formData: FormData
): Promise<StudentActionState> {
  const parsed = funnelSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "学生情報を確認してください。" };

  const supabase = createClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "ログインが必要です。" };

  const payload = Object.fromEntries(
    studentFunnelFlagFields.map((field) => [field.name, formData.get(field.name) === "on"])
  );

  const { data: before } = await supabase
    .from("students")
    .select("*")
    .eq("id", parsed.data.student_id)
    .maybeSingle();

  const { error } = await supabase
    .from("students")
    .update(payload)
    .eq("id", parsed.data.student_id);

  if (error) {
    if (error.message?.includes("funnel_")) {
      return {
        ok: false,
        message: "Supabaseに進捗チェック用の保存場所がまだありません。12_recruiting_funnel.sql を実行してください。"
      };
    }
    return { ok: false, message: error.message };
  }

  await writeAuditLog(supabase, {
    actorStaffId: user.id,
    action: "学生進捗チェック更新",
    targetTable: "students",
    targetId: parsed.data.student_id,
    before,
    after: payload
  });

  revalidatePath("/dashboard");
  revalidatePath("/students");
  revalidatePath(`/students/${parsed.data.student_id}`);
  return { ok: true, message: "進捗チェックを更新しました。" };
}

export async function updateStudentAssignee(
  _prevState: StudentActionState = emptyState,
  formData: FormData
): Promise<StudentActionState> {
  const parsed = assigneeSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { ok: false, message: "担当者を選び直してください。" };
  }

  const supabase = createClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "ログインが必要です。" };

  const { student_id, staff_id } = parsed.data;
  const { data: before } = await supabase
    .from("student_assignees")
    .select("staff_id")
    .eq("student_id", student_id);

  const deleteResult = await supabase
    .from("student_assignees")
    .delete()
    .eq("student_id", student_id);

  if (deleteResult.error) {
    return { ok: false, message: deleteResult.error.message };
  }

  if (staff_id) {
    const insertResult = await supabase.from("student_assignees").insert({
      student_id,
      staff_id,
      assigned_by: user.id
    });

    if (insertResult.error) {
      return { ok: false, message: insertResult.error.message };
    }
  }

  await writeAuditLog(supabase, {
    actorStaffId: user.id,
    action: "学生担当者変更",
    targetTable: "student_assignees",
    targetId: student_id,
    before,
    after: { staff_id: staff_id || null }
  });

  revalidatePath("/students");
  revalidatePath(`/students/${student_id}`);
  return { ok: true, message: "担当者を更新しました。" };
}

const actionSchema = z.object({
  student_id: z.string().uuid(),
  action_type: z.enum(["call", "line", "zoom", "email", "event", "note", "ai"]),
  title: z.string().trim().min(1, "タイトルは必須です。"),
  body: z.string().trim().optional(),
  executed_at: z.string().optional()
});

export async function addStudentAction(
  _prevState: StudentActionState = emptyState,
  formData: FormData
): Promise<StudentActionState> {
  const parsed = actionSchema.safeParse(Object.fromEntries(formData));

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
    student_id: input.student_id,
    staff_id: user.id,
    action_type: input.action_type as ActionType,
    title: input.title,
    body: input.body || null,
    executed_at: input.executed_at
      ? new Date(input.executed_at).toISOString()
      : new Date().toISOString()
  };
  const { error } = await supabase.from("student_actions").insert(payload);

  if (error) return { ok: false, message: error.message };

  await writeAuditLog(supabase, {
    actorStaffId: user.id,
    action: "学生アクション追加",
    targetTable: "student_actions",
    targetId: input.student_id,
    after: payload
  });

  revalidatePath("/students");
  revalidatePath(`/students/${input.student_id}`);
  return { ok: true, message: "アクション履歴を追加しました。" };
}

const tagSchema = z.object({
  student_id: z.string().uuid(),
  tag_id: z.string().uuid()
});

export async function addStudentTag(
  _prevState: StudentActionState = emptyState,
  formData: FormData
): Promise<StudentActionState> {
  const parsed = tagSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) return { ok: false, message: "タグを選択してください。" };

  const supabase = createClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "ログインが必要です。" };

  const { student_id, tag_id } = parsed.data;
  const { error } = await supabase.from("student_tags").insert({
    student_id,
    tag_id,
    created_by: user.id
  });

  if (error && error.code !== "23505") return { ok: false, message: error.message };

  await writeAuditLog(supabase, {
    actorStaffId: user.id,
    action: "タグ追加",
    targetTable: "student_tags",
    targetId: student_id,
    after: { tag_id }
  });

  revalidatePath("/students");
  revalidatePath(`/students/${student_id}`);
  return { ok: true, message: "タグを追加しました。" };
}

export async function removeStudentTag(
  _prevState: StudentActionState = emptyState,
  formData: FormData
): Promise<StudentActionState> {
  const parsed = tagSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) return { ok: false, message: "タグを選択してください。" };

  const supabase = createClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const { student_id, tag_id } = parsed.data;
  const { error } = await supabase
    .from("student_tags")
    .delete()
    .eq("student_id", student_id)
    .eq("tag_id", tag_id);

  if (error) return { ok: false, message: error.message };

  await writeAuditLog(supabase, {
    actorStaffId: user?.id,
    action: "タグ削除",
    targetTable: "student_tags",
    targetId: student_id,
    before: { tag_id }
  });

  revalidatePath("/students");
  revalidatePath(`/students/${student_id}`);
  return { ok: true, message: "タグを外しました。" };
}
