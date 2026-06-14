import { NextResponse } from "next/server";
import {
  isLastDayInJst,
  saveRecruitingMonthlySnapshots
} from "@/lib/recruiting/snapshots";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json(
      { ok: false, error: "月次採用データ保存用の認証情報が一致しません。" },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";

  if (!force && !isLastDayInJst()) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "今日は日本時間の月末ではないため、月次データは保存しませんでした。"
    });
  }

  try {
    const result = await saveRecruitingMonthlySnapshots({
      createdBy: null,
      supabase: createAdminClient()
    });

    return NextResponse.json({
      ok: true,
      skipped: false,
      ...result
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "月次データを保存できませんでした。"
      },
      { status: 500 }
    );
  }
}
