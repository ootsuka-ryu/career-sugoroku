export type RecordingEventUpdate = {
  eventTitle: string;
  eventDate: string | null;
  status: "申込" | "参加" | "欠席" | "キャンセル";
  memo: string | null;
};

export type RecordingScheduleUpdate = {
  title: string;
  dueAt: string | null;
  memo: string | null;
};

export type RecordingProfileUpdates = {
  real_name?: string | null;
  kana?: string | null;
  university?: string | null;
  grade?: string | null;
  graduation_year?: number | null;
  phone?: string | null;
  email?: string | null;
  desired_job_type?: string | null;
  desired_area?: string | null;
  motivation_rank?: string | null;
  candidate_stage?: string | null;
  first_contact_method?: string | null;
  first_contact_date?: string | null;
  manual_next_action?: string | null;
  funnel_next?: boolean;
  funnel_is?: boolean;
  funnel_pharmacist_interview?: boolean;
  funnel_selection?: boolean;
  funnel_offer?: boolean;
  funnel_offer_accepted?: boolean;
  funnel_hired?: boolean;
};

export type RecordingSummary = {
  summary: string;
  nextActions: string[];
  tagCandidates: string[];
  urgent: boolean;
  profileUpdates: RecordingProfileUpdates;
  eventUpdates: RecordingEventUpdate[];
  scheduleUpdates: RecordingScheduleUpdate[];
  needsStudentConfirmation: boolean;
  confirmationReason: string;
  mentionedStudentName: string | null;
};

export async function summarizeRecordingWithClaude({
  transcript,
  companyContext,
  studentContext,
  selectedStudentLabel
}: {
  transcript: string;
  companyContext: string;
  studentContext: string;
  selectedStudentLabel?: string;
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
        max_tokens: 2200,
        system: [
          "あなたは薬学生採用CRMの面談・音声メモを処理する採用アシスタントです。",
          "文字起こし、学生プロフィール、過去チャット、過去アンケート、イベント参加履歴、会社資料を見て、実務で使える要約と次アクションを日本語で作ります。",
          "録音内容だけで断定できないことは推測で反映しないでください。",
          "録音に紐づいた対象学生が明示されている場合、summary、nextActions、profileUpdates、eventUpdates、scheduleUpdatesは必ずその対象学生だけを対象にしてください。",
          "録音に紐づいた対象学生が明示されている場合、「この学生」「この子」「この人」「選択中の学生」「対象学生」などの指示は必ずその対象学生を指すものとして扱ってください。",
          "大学名・イベント名・施設名・タグ名・会社名・地名に含まれる名字だけを根拠に、別の学生へ対象を切り替えないでください。",
          "対象学生と異なる学生のフルネームが録音内で明確に出た場合だけ、needsStudentConfirmationをtrueにしてください。その場合、profileUpdates、eventUpdates、scheduleUpdatesは空にしてください。",
          "対象学生が曖昧な場合、needsStudentConfirmationをtrueにして、変更候補は空にしてください。",
          "選択済みの対象学生がいるのに録音内で別の学生名らしき語が出た場合でも、大学名やイベント名など文脈上の固有名詞なら別人候補として扱わないでください。",
          "次アクションは採用担当者が次に行う具体的な行動だけを書いてください。理由、分析、優先度、JSON説明、候補の羅列はnextActionsに入れないでください。",
          "学生から返信をもらうための次アクションは、相手の大学、卒年、興味、過去の接触、参加イベントに合わせて具体的にしてください。",
          "参加イベント、タグ、予定、プロフィールに反映できるものは構造化して返してください。",
          "返答はMarkdownやコードフェンスを付けず、JSONオブジェクトだけにしてください。",
          "JSON形式: {\"summary\":\"短い要約\",\"nextActions\":[\"誰がいつ何をするか\"],\"tagCandidates\":[\"追加タグ\"],\"urgent\":false,\"profileUpdates\":{},\"eventUpdates\":[{\"eventTitle\":\"店舗見学\",\"eventDate\":\"2026-06-10\",\"status\":\"参加\",\"memo\":\"\"}],\"scheduleUpdates\":[{\"title\":\"電話する\",\"dueAt\":\"2026-06-07T10:00:00+09:00\",\"memo\":\"\"}],\"needsStudentConfirmation\":false,\"confirmationReason\":\"\",\"mentionedStudentName\":null}",
          "profileUpdatesで使えるキー: real_name,kana,university,grade,graduation_year,phone,email,desired_job_type,desired_area,motivation_rank,candidate_stage,first_contact_method,first_contact_date,manual_next_action,funnel_next,funnel_is,funnel_pharmacist_interview,funnel_selection,funnel_offer,funnel_offer_accepted,funnel_hired。",
          "eventUpdates.statusは必ず 申込,参加,欠席,キャンセル のどれかにしてください。"
        ].join("\n"),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: [
                  `現在日時: ${new Date().toISOString()}`,
                  `録音に紐づいている対象学生: ${selectedStudentLabel || "(未選択)"}`,
                  `会社・採用方針:\n${companyContext || "(未登録)"}`,
                  `対象学生の情報とこれまでの履歴:\n${studentContext || "(取得できる学生情報なし)"}`,
                  `今回の録音文字起こし:\n${transcript}`
                ].join("\n\n")
              }
            ]
          }
        ]
      })
    });
  } catch {
    throw new Error("Claude APIに接続できませんでした。少し待ってから再実行してください。");
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
    return normalizeRecordingSummary(JSON.parse(jsonText));
  } catch {
    return {
      summary: jsonText || "Claudeから要約が返されませんでした。",
      nextActions: [],
      tagCandidates: [],
      urgent: false,
      profileUpdates: {},
      eventUpdates: [],
      scheduleUpdates: [],
      needsStudentConfirmation: false,
      confirmationReason: "",
      mentionedStudentName: null
    };
  }
}

function normalizeRecordingSummary(value: unknown): RecordingSummary {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    summary: cleanString(row.summary),
    nextActions: normalizeStringArray(row.nextActions),
    tagCandidates: normalizeStringArray(row.tagCandidates),
    urgent: Boolean(row.urgent),
    profileUpdates: normalizeProfileUpdates(row.profileUpdates),
    eventUpdates: normalizeEventUpdates(row.eventUpdates),
    scheduleUpdates: normalizeScheduleUpdates(row.scheduleUpdates),
    needsStudentConfirmation: Boolean(row.needsStudentConfirmation),
    confirmationReason: cleanString(row.confirmationReason),
    mentionedStudentName: cleanString(row.mentionedStudentName) || null
  };
}

function normalizeProfileUpdates(value: unknown): RecordingProfileUpdates {
  if (!value || typeof value !== "object") return {};
  const row = value as Record<string, unknown>;
  const output: RecordingProfileUpdates = {};
  const stringKeys: Array<keyof RecordingProfileUpdates> = [
    "real_name",
    "kana",
    "university",
    "grade",
    "phone",
    "email",
    "desired_job_type",
    "desired_area",
    "motivation_rank",
    "candidate_stage",
    "first_contact_method",
    "first_contact_date",
    "manual_next_action"
  ];
  for (const key of stringKeys) {
    const text = cleanString(row[key]);
    if (text) output[key] = text as never;
  }
  const graduationYear = Number(row.graduation_year);
  if (Number.isInteger(graduationYear) && graduationYear >= 2020 && graduationYear <= 2040) {
    output.graduation_year = graduationYear;
  }
  const booleanKeys: Array<keyof RecordingProfileUpdates> = [
    "funnel_next",
    "funnel_is",
    "funnel_pharmacist_interview",
    "funnel_selection",
    "funnel_offer",
    "funnel_offer_accepted",
    "funnel_hired"
  ];
  for (const key of booleanKeys) {
    if (typeof row[key] === "boolean") output[key] = row[key] as never;
  }
  return output;
}

function normalizeEventUpdates(value: unknown): RecordingEventUpdate[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const eventTitle = cleanString(row.eventTitle);
      const rawStatus = cleanString(row.status);
      const status = normalizeEventStatus(rawStatus);
      if (!eventTitle || !status) return null;
      return {
        eventTitle,
        eventDate: cleanString(row.eventDate) || null,
        status,
        memo: cleanString(row.memo) || null
      };
    })
    .filter((item): item is RecordingEventUpdate => Boolean(item))
    .slice(0, 8);
}

function normalizeScheduleUpdates(value: unknown): RecordingScheduleUpdate[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const title = cleanString(row.title);
      if (!title) return null;
      return {
        title,
        dueAt: cleanString(row.dueAt) || null,
        memo: cleanString(row.memo) || null
      };
    })
    .filter((item): item is RecordingScheduleUpdate => Boolean(item))
    .slice(0, 8);
}

function normalizeEventStatus(value: string): RecordingEventUpdate["status"] | null {
  if (/キャンセル|取消/.test(value)) return "キャンセル";
  if (/欠席|不参加/.test(value)) return "欠席";
  if (/参加|来る|出席/.test(value)) return "参加";
  if (/申込|申し込み|予約/.test(value)) return "申込";
  return null;
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 12);
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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
