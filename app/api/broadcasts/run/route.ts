import { NextResponse, type NextRequest } from "next/server";
import { sendBroadcastToTargets } from "@/lib/broadcasts/send";
import { parseJsonArray } from "@/lib/broadcasts/targeting";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BroadcastBody } from "@/lib/broadcasts/flex";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const providedSecret = request.headers.get("x-cron-secret");

  if (cronSecret && providedSecret !== cronSecret) {
    return NextResponse.json(
      { ok: false, error: "配信実行用の認証情報が一致しません。" },
      { status: 401 }
    );
  }

  const supabase = createAdminClient() as any;
  const { data: broadcasts, error } = await supabase
    .from("broadcasts")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString())
    .limit(10);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const results = [];

  for (const broadcast of broadcasts ?? []) {
    await supabase
      .from("broadcasts")
      .update({ status: "sending" })
      .eq("id", broadcast.id);

    const result = await sendBroadcastToTargets({
      supabase,
      broadcastId: broadcast.id,
      body: broadcast.body_jsonb as BroadcastBody,
      targeting: {
        targetTagIds: parseJsonArray(broadcast.target_tag_ids),
        excludedTagIds: parseJsonArray(broadcast.excluded_tag_ids),
        targetMode: broadcast.target_mode
      },
      staffId: broadcast.sent_by
    });

    await supabase
      .from("broadcasts")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        sent_count: result.sentCount,
        failed_count: result.failedCount
      })
      .eq("id", broadcast.id);

    results.push({ broadcastId: broadcast.id, ...result });
  }

  return NextResponse.json({
    ok: true,
    processed: results.length,
    results
  });
}
