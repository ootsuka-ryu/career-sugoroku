"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { saveRecruitingMonthlySnapshots } from "@/lib/recruiting/snapshots";
import { createClient } from "@/lib/supabase/server";

export type SaveRecruitingSnapshotState = {
  ok: boolean;
  message: string;
};

const snapshotSchema = z.object({
  graduation_year: z.coerce.number().int().min(2020).max(2040)
});

const goalOverrideSchema = z.object({
  graduationYear: z.coerce.number().int().min(2020).max(2040),
  rowKey: z.string().min(1).max(80),
  targetValue: z.coerce.number().int().min(0).max(1000000).nullable(),
  actualValue: z.coerce.number().int().min(0).max(1000000).nullable()
});

export type SaveRecruitingGoalOverrideState = {
  ok: boolean;
  message: string;
};

export async function saveRecruitingGoalOverride(
  input: z.input<typeof goalOverrideSchema>
): Promise<SaveRecruitingGoalOverrideState> {
  const parsed = goalOverrideSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "入力値を確認してください。" };
  }

  const supabase = createClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const staffId = user?.id ? await getExistingStaffId(supabase, user.id) : null;

  const { error } = await supabase.from("recruiting_goal_overrides").upsert(
    {
      graduation_year: parsed.data.graduationYear,
      row_key: parsed.data.rowKey,
      target_value: parsed.data.targetValue,
      actual_value: parsed.data.actualValue,
      updated_by: staffId,
      updated_at: new Date().toISOString()
    },
    { onConflict: "graduation_year,row_key" }
  );

  if (error) {
    if (error.code === "42P01" || error.message.includes("recruiting_goal_overrides")) {
      return {
        ok: false,
        message: "Supabaseで 22_recruiting_goal_overrides.sql を実行すると保存できます。"
      };
    }
    return { ok: false, message: error.message };
  }

  revalidatePath("/dashboard");
  return { ok: true, message: "月次目標と実績を保存しました。" };
}

export async function saveRecruitingMonthlySnapshot(
  _prevState: SaveRecruitingSnapshotState,
  formData: FormData
): Promise<SaveRecruitingSnapshotState> {
  const parsed = snapshotSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "卒業年度を確認してください。" };
  }

  const supabase = createClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  try {
    const staffId = user?.id ? await getExistingStaffId(supabase, user.id) : null;
    const result = await saveRecruitingMonthlySnapshots({
      createdBy: staffId,
      graduationYear: parsed.data.graduation_year,
      supabase
    });

    revalidatePath("/dashboard");
    return {
      ok: true,
      message: `${parsed.data.graduation_year}卒の${result.snapshotMonth.slice(0, 7)}データを保存しました。`
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "月次データを保存できませんでした。";
    if (message.includes("recruiting_monthly_snapshots") || message.includes("schema cache")) {
      return {
        ok: false,
        message: "Supabaseで 20_pending_feature_setup.sql を実行してください。"
      };
    }
    return { ok: false, message };
  }
}

async function getExistingStaffId(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("staff_users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data?.id) return null;
  return data.id as string;
}
