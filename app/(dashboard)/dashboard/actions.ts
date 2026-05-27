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
      message: `${parsed.data.graduation_year}年卒の${result.snapshotMonth.slice(0, 7)}データを保存しました。`
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "月次データを保存できませんでした。";
    if (message.includes("recruiting_monthly_snapshots") || message.includes("schema cache")) {
      return {
        ok: false,
        message: "Supabaseで 12_recruiting_funnel.sql を先に実行してください。"
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
