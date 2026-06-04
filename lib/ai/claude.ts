export type RecordingSummary = {
  summary: string;
  nextActions: string[];
  tagCandidates: string[];
  urgent: boolean;
};

export async function summarizeRecordingWithClaude({
  transcript,
  companyContext
}: {
  transcript: string;
  companyContext: string;
}): Promise<RecordingSummary> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey.startsWith("your-")) {
    throw new Error(
      "Claude APIキーが設定されていません。CloudflareのSecretにANTHROPIC_API_KEYを登録し、再デプロイしてください。"
    );
  }

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
        max_tokens: 1200,
        system: [
          "あなたは薬学生の新卒採用を支援する採用担当者です。",
          "録音の文字起こしから、事実と推測を混同せず、日本語で実務に使える要約を作成してください。",
          "学生の関心、希望条件、懸念、温度感、約束事項を優先して抽出してください。",
          "次アクションは、誰が・いつまでに・何をするか分かる具体的な内容にしてください。",
          "必ずMarkdownのコード枠を付けず、JSONだけを返してください。",
          "形式は {\"summary\":\"要約\",\"nextActions\":[\"担当者が期限までに行う具体的な対応\"],\"tagCandidates\":[\"タグ候補\"],\"urgent\":false} としてください。",
          "nextActionsとtagCandidatesは必ず文字列の配列にしてください。"
        ].join("\n"),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `会社・採用方針:\n${companyContext || "(未登録)"}\n\n録音の文字起こし:\n${transcript}`
              }
            ]
          }
        ]
      })
    });
  } catch {
    throw new Error(
      "Claude APIに接続できませんでした。少し待ってから再実行してください。"
    );
  }

  if (!response.ok) {
    throw new Error(await buildClaudeApiError(response));
  }

  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = data.content?.find((item) => item.type === "text")?.text ?? "";
  const jsonText = extractJsonText(text);

  try {
    const parsed = JSON.parse(jsonText) as Record<string, unknown>;
    return {
      summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
      nextActions: normalizeNextActions(parsed.nextActions),
      tagCandidates: normalizeStringArray(parsed.tagCandidates),
      urgent: Boolean(parsed.urgent)
    };
  } catch {
    return {
      summary: jsonText || "Claudeから要約が返されませんでした。",
      nextActions: [],
      tagCandidates: [],
      urgent: false
    };
  }
}

function extractJsonText(text: string) {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const firstBrace = withoutFence.indexOf("{");
  const lastBrace = withoutFence.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return withoutFence.slice(firstBrace, lastBrace + 1);
  }

  return withoutFence;
}

function normalizeNextActions(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (!item || typeof item !== "object") return "";

      const action = item as Record<string, unknown>;
      const who = getStringValue(action, ["who", "owner", "担当", "担当者"]);
      const by = getStringValue(action, ["by", "deadline", "期限"]);
      const what = getStringValue(action, ["what", "action", "内容", "対応"]);
      const parts = [
        who ? `担当: ${who}` : "",
        by ? `期限: ${by}` : "",
        what ? `内容: ${what}` : ""
      ].filter(Boolean);

      return parts.join(" / ");
    })
    .filter(Boolean);
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getStringValue(value: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (typeof value[key] === "string" && value[key].trim()) {
      return value[key].trim();
    }
  }
  return "";
}

async function buildClaudeApiError(response: Response) {
  const data = (await response.json().catch(() => null)) as {
    error?: { message?: string; type?: string };
  } | null;
  const detail = data?.error?.message?.trim();
  const suffix = detail ? ` 詳細: ${detail}` : "";

  switch (response.status) {
    case 400:
      return `Claudeへのリクエスト内容が不正です。モデル設定などを確認してください。${suffix}`;
    case 401:
      return `Claude APIキーが無効です。CloudflareのANTHROPIC_API_KEYを新しいキーへ更新してください。${suffix}`;
    case 403:
      return `Claude APIを利用する権限がありません。Anthropicの利用設定・組織・APIキーを確認してください。${suffix}`;
    case 404:
      return `指定したClaudeモデルを利用できません。ANTHROPIC_MODELの設定を確認してください。${suffix}`;
    case 429:
      return `Claude APIの利用上限に達したか、Anthropicのクレジット残高が不足しています。Anthropic ConsoleのUsageとBillingを確認してください。${suffix}`;
    default:
      return `Claudeによる要約に失敗しました（HTTP ${response.status}）。${suffix}`;
  }
}
