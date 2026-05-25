"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { motivationRanks } from "@/lib/students/options";
import { createClient } from "@/lib/supabase/server";

const createStudentSchema = z.object({
  real_name: z.string().trim().min(1, "氏名は必須です。"),
  kana: z.string().trim().optional(),
  display_name: z.string().trim().optional(),
  university: z.string().trim().optional(),
  grade: z.string().trim().optional(),
  graduation_year: z.coerce.number().int().optional().or(z.literal("")),
  practical_period: z.enum(["P1_2", "P2_3", "P3_4", "undecided"]),
  phone: z.string().trim().optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  desired_job_type: z.string().trim().optional(),
  desired_area: z.string().trim().optional(),
  motivation_level: z.coerce.number().int().min(1).max(5).optional().or(z.literal("")),
  motivation_rank: z.string().trim().optional(),
  first_contact_method: z.string().trim().optional(),
  manual_next_action: z.string().trim().optional(),
  status: z.string().trim().optional(),
  staff_ids: z.string().optional(),
  tag_ids: z.string().optional()
});

export type CreateStudentState = {
  ok: boolean;
  message: string;
};

export async function createStudent(
  _prevState: CreateStudentState,
  formData: FormData
): Promise<CreateStudentState> {
  const parsed = createStudentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.errors[0]?.message ?? "入力内容を確認してください。"
    };
  }

  const supabase = createClient() as any;
  const input = parsed.data;
  const motivationRank = motivationRanks.includes(input.motivation_rank as any)
    ? input.motivation_rank
    : null;
  const staffIds = parseIds(input.staff_ids);
  const tagIds = parseIds(input.tag_ids);

  const { data: student, error } = await supabase
    .from("students")
    .insert({
      real_name: input.real_name,
      display_name: input.display_name || input.real_name,
      kana: input.kana || null,
      university: input.university || null,
      grade: input.grade || null,
      graduation_year: input.graduation_year || null,
      practical_period: input.practical_period,
      phone: input.phone || null,
      email: input.email || null,
      desired_job_type: input.desired_job_type || null,
      desired_area: input.desired_area || null,
      motivation_level: input.motivation_level || null,
      motivation_rank: motivationRank,
      first_contact_method: input.first_contact_method || "手動登録",
      first_contact_date: new Date().toISOString().slice(0, 10),
      manual_next_action: input.manual_next_action || null,
      status: input.status || "active"
    })
    .select("id")
    .single();

  if (error || !student?.id) {
    return { ok: false, message: error?.message ?? "学生を作成できませんでした。" };
  }

  if (staffIds.length > 0) {
    await supabase.from("student_assignees").insert(
      staffIds.map((staffId) => ({
        student_id: student.id,
        staff_id: staffId
      }))
    );
  }

  if (tagIds.length > 0) {
    await supabase.from("student_tags").insert(
      tagIds.map((tagId) => ({
        student_id: student.id,
        tag_id: tagId
      }))
    );
  }

  revalidatePath("/students");
  redirect(`/students/${student.id}`);
}

function parseIds(value?: string) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
