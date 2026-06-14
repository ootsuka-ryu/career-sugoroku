import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  runNextActionBatch,
  updateStudentNextAction
} from "@/lib/ai/next-actions";

export const maxDuration = 60;

export async function GET(request: Request) {
  return runBatch(request);
}

export async function POST(request: Request) {
  return runBatch(request);
}

async function runBatch(request: Request) {
  const isCron = isAuthorizedCron(request);
  if (!isCron) {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "ログイン状態を確認できませんでした。再ログインしてください。" },
        { status: 401 }
      );
    }
  }

  const url = new URL(request.url);
  const studentId = url.searchParams.get("studentId");
  const limit = Number(url.searchParams.get("limit") ?? process.env.AI_BATCH_LIMIT ?? 50);
  const admin = createAdminClient() as any;

  if (studentId) {
    const suggestion = await updateStudentNextAction({
      supabase: admin,
      studentId
    });
    return NextResponse.json({ ok: true, mode: "single", studentId, suggestion });
  }

  const results = await runNextActionBatch({
    supabase: admin,
    limit: Number.isFinite(limit) ? Math.max(1, Math.min(limit, 200)) : 50
  });

  return NextResponse.json({
    ok: true,
    mode: "batch",
    total: results.length,
    success: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    results
  });
}

function isAuthorizedCron(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authorization = request.headers.get("authorization") ?? "";
  return authorization === `Bearer ${secret}`;
}
