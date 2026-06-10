"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  buildGridFlexBodyFromForm,
  type BroadcastBody
} from "@/lib/broadcasts/flex";
import { estimateRecipients, sendBroadcastToTargets } from "@/lib/broadcasts/send";
import { parseJsonArray } from "@/lib/broadcasts/targeting";
import { pushLineMessage } from "@/lib/line/client";
import { createClient } from "@/lib/supabase/server";

export type BroadcastActionState = {
  ok: boolean;
  message: string;
};

const initialState: BroadcastActionState = {
  ok: false,
  message: ""
};

const broadcastSchema = z.object({
  title: z.string().trim().min(1, "タイトルは必須です。"),
  broadcast_kind: z.enum(["text", "grid_flex"]),
  target_mode: z.enum(["and", "or"]),
  scheduled_at: z.string().optional()
});

export async function createBroadcast(
  _prevState: BroadcastActionState = initialState,
  formData: FormData
): Promise<BroadcastActionState> {
  const parsed = broadcastSchema.safeParse(Object.fromEntries(formData));

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

  const body = buildBroadcastBody(input.broadcast_kind, formData);
  if (!body) return { ok: false, message: "配信内容を入力してください。" };

  const targetTagIds = formData.getAll("target_tag_ids").map(String);
  const excludedTagIds = formData.getAll("excluded_tag_ids").map(String);
  const targeting = {
    targetTagIds,
    excludedTagIds,
    targetMode: input.target_mode
  };
  const estimatedRecipients = await estimateRecipients(supabase, targeting);
  const scheduledAt = input.scheduled_at
    ? new Date(input.scheduled_at).toISOString()
    : null;
  const precheck = await buildBroadcastPrecheck(supabase, {
    body,
    estimatedRecipients,
    scheduledAt
  });

  const { data: createdBroadcast, error } = await supabase.from("broadcasts").insert({
    title: input.title,
    body_jsonb: body,
    target_tag_ids: targetTagIds,
    excluded_tag_ids: excludedTagIds,
    target_mode: input.target_mode,
    scheduled_at: scheduledAt,
    sent_by: user.id,
    status: scheduledAt ? "scheduled" : "draft",
    estimated_recipients: estimatedRecipients
  }).select("id").single();

  if (error) return { ok: false, message: error.message };

  const followupSteps = parseFollowupSteps(formData);
  if (createdBroadcast?.id && followupSteps.length > 0) {
    const { error: followupError } = await supabase.from("broadcast_followup_steps").insert(
      followupSteps.map((step) => ({
        ...step,
        broadcast_id: createdBroadcast.id
      }))
    );
    if (followupError) return { ok: false, message: followupError.message };
  }

  revalidatePath("/broadcasts");
  return {
    ok: true,
    message: scheduledAt
      ? `配信予約を保存しました。対象見込み ${estimatedRecipients} 名です。`
      : `下書きを保存しました。対象見込み ${estimatedRecipients} 名です。`
  };
}

function parseFollowupSteps(formData: FormData) {
  return [1, 2, 3, 4]
    .map((index) => {
      const enabled = formData.get(`followup_enabled_${index}`) === "yes";
      const text = String(formData.get(`followup_text_${index}`) ?? "").trim();
      if (!enabled || !text) return null;

      const delayDays = Number(formData.get(`followup_delay_days_${index}`) ?? 3);
      const surveyId = String(formData.get(`followup_survey_id_${index}`) ?? "").trim();
      const requireNoReply = formData.get(`followup_require_no_reply_${index}`) === "yes";
      const requireSurveyUnanswered =
        formData.get(`followup_require_survey_unanswered_${index}`) === "yes" && Boolean(surveyId);

      return {
        step_order: index,
        delay_days: Number.isFinite(delayDays) ? delayDays : 3,
        condition_mode:
          formData.get(`followup_condition_mode_${index}`) === "and" ? "and" : "or",
        require_no_reply: requireNoReply,
        require_survey_unanswered: requireSurveyUnanswered,
        survey_id: requireSurveyUnanswered ? surveyId : null,
        body_jsonb: {
          kind: "text",
          text
        },
        is_active: true
      };
    })
    .filter(Boolean);
}

export async function sendBroadcastNow(
  _prevState: BroadcastActionState = initialState,
  formData: FormData
): Promise<BroadcastActionState> {
  const broadcastId = String(formData.get("broadcast_id") ?? "");
  if (!broadcastId) return { ok: false, message: "配信IDがありません。" };

  const supabase = createClient() as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "ログインが必要です。" };

  const { data: broadcast, error } = await supabase
    .from("broadcasts")
    .select("*")
    .eq("id", broadcastId)
    .single();

  if (error || !broadcast) {
    return { ok: false, message: error?.message ?? "配信が見つかりません。" };
  }

  const precheck = broadcast.precheck_jsonb as { warnings?: string[] } | null;
  if (precheck?.warnings?.length && formData.get("confirmed") !== "yes") {
    return {
      ok: false,
      message: `配信前チェックで警告があります: ${precheck.warnings.join(" / ")}。確認後に再度「今すぐ送信」を押してください。`
    };
  }

  const body = broadcast.body_jsonb as BroadcastBody;
  const result = await sendBroadcastToTargets({
    supabase,
    broadcastId,
    body,
    targeting: {
      targetTagIds: parseJsonArray(broadcast.target_tag_ids),
      excludedTagIds: parseJsonArray(broadcast.excluded_tag_ids),
      targetMode: broadcast.target_mode
    },
    staffId: user.id
  });

  await supabase
    .from("broadcasts")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      sent_count: result.sentCount,
      failed_count: result.failedCount
    })
    .eq("id", broadcastId);

  revalidatePath("/broadcasts");
  return {
    ok: true,
    message: `${result.sentCount}名へ送信記録を作成しました。失敗 ${result.failedCount}件。`
  };
}

export async function sendTestBroadcast(
  _prevState: BroadcastActionState = initialState,
  formData: FormData
): Promise<BroadcastActionState> {
  const broadcastId = String(formData.get("broadcast_id") ?? "");
  const staffId = String(formData.get("staff_id") ?? "");

  if (!broadcastId || !staffId) {
    return { ok: false, message: "配信とテスト送信先を選択してください。" };
  }

  const supabase = createClient() as any;
  const [broadcastResult, staffResult] = await Promise.all([
    supabase.from("broadcasts").select("*").eq("id", broadcastId).single(),
    supabase
      .from("staff_users")
      .select("id, name, line_user_id")
      .eq("id", staffId)
      .single()
  ]);

  if (broadcastResult.error || !broadcastResult.data) {
    return {
      ok: false,
      message: broadcastResult.error?.message ?? "配信が見つかりません。"
    };
  }

  if (staffResult.error || !staffResult.data) {
    return {
      ok: false,
      message: staffResult.error?.message ?? "スタッフが見つかりません。"
    };
  }

  if (!staffResult.data.line_user_id) {
    return {
      ok: false,
      message: "テスト送信先スタッフのline_user_idが未設定です。"
    };
  }

  const messages = await import("@/lib/broadcasts/flex").then((mod) =>
    mod.buildLineMessages(broadcastResult.data.body_jsonb as BroadcastBody)
  );
  const result = await pushLineMessage(staffResult.data.line_user_id, messages);

  await supabase
    .from("broadcasts")
    .update({ test_sent_to: staffId })
    .eq("id", broadcastId);

  revalidatePath("/broadcasts");
  return {
    ok: result.ok,
    message: result.skipped
      ? "LINEトークン未設定のため、テスト送信はスキップしました。"
      : result.ok
        ? "テスト送信しました。"
        : `テスト送信に失敗しました: ${result.reason}`
  };
}

function buildBroadcastBody(kind: "text" | "grid_flex", formData: FormData) {
  if (kind === "text") {
    const text = String(formData.get("text") ?? "").trim();
    const surveyUrl = String(formData.get("survey_url") ?? "").trim();
    const finalText = surveyUrl
      ? `${text}${text ? "\n\n" : ""}アンケートはこちら\n${surveyUrl}`
      : text;
    return finalText ? ({ kind: "text", text: finalText } satisfies BroadcastBody) : null;
  }

  return buildGridFlexBodyFromForm(formData);
}

async function buildBroadcastPrecheck(
  supabase: any,
  {
    body,
    estimatedRecipients,
    scheduledAt
  }: {
    body: BroadcastBody;
    estimatedRecipients: number;
    scheduledAt: string | null;
  }
) {
  const warnings: string[] = [];
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const messagesResult = await supabase
    .from("messages")
    .select("id")
    .eq("direction", "out")
    .eq("status", "sent")
    .gte("sent_at", monthStart.toISOString());

  const used = (messagesResult.data ?? []).length;
  const remaining = Math.max(0, 5000 - used);

  if (estimatedRecipients > remaining) {
    warnings.push(`今月の残り通数 ${remaining}通を超える可能性があります。`);
  }
  if (scheduledAt) {
    const hour = new Date(scheduledAt).getHours();
    if (hour >= 22 || hour < 8) warnings.push("深夜または早朝の配信予約です。");
  }
  if (body.kind === "text") {
    const urls = body.text.match(/https?:\/\/\S+/g) ?? [];
    if (urls.some((url) => url.includes("example.com"))) warnings.push("仮URLが残っています。");
  }
  if (body.kind === "grid_flex") {
    if (body.cells.length === 0) warnings.push("グリッドカードが未設定です。");
    if (body.cells.some((cell) => cell.imageUrl.includes("placehold.co"))) warnings.push("画像未設定のカードがあります。");
    if (body.cells.some((cell) => cell.detailUrl.includes("example.com") || cell.applyUrl.includes("example.com"))) {
      warnings.push("仮URLが残っているカードがあります。");
    }
  }

  return {
    target_count: estimatedRecipients,
    monthly_limit: 5000,
    used_count: used,
    remaining_count: remaining,
    warnings
  };
}
