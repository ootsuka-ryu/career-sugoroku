import { localizeSampleText } from "@/lib/display/localize";
import { getMotivationRankLabel } from "@/lib/students/options";
import type { StaffSummary, TagSummary } from "@/lib/students/types";

type RecommendedChatStudent = {
  real_name: string | null;
  display_name: string | null;
  university: string | null;
  grade?: string | null;
  graduation_year: number | null;
  desired_area: string | null;
  first_contact_method: string | null;
  motivation_level: number | null;
  motivation_rank: string | null;
  ai_next_action: string | null;
  manual_next_action: string | null;
  last_inbound_at?: string | null;
  last_outbound_at?: string | null;
  funnel_next: boolean;
  funnel_pharmacist_interview: boolean;
  tags?: TagSummary[];
  assignees?: StaffSummary[];
};

type ChatTopic = "reply" | "zoom" | "visit" | "event" | "interview" | "internship" | "selection" | "general";

const INTERNAL_LINE_PATTERNS = [
  /採用担当者/,
  /チーム内/,
  /優先度/,
  /理由[:：]/,
  /根拠[:：]/,
  /AI判断/,
  /判断材料/,
  /タグ候補/,
  /推奨連絡手段/,
  /フォロー計画/,
  /情報提供計画/,
  /確認・共有/,
  /対応方針/,
  /nextAction/i,
  /urgent/i,
  /tagCandidates/i
];

const MESSAGE_KEYS = [
  "message",
  "chatMessage",
  "studentMessage",
  "draft",
  "sendText",
  "text",
  "lineMessage",
  "recommendedMessage"
];

const ACTION_KEYS = ["nextAction", "nextActions", "action", "actions", "what", "task"];

export function buildRecommendedChatDraft(student: RecommendedChatStudent) {
  const rawAction = extractNextAction(student.ai_next_action) || extractNextAction(student.manual_next_action);
  const inferred = inferAction(student);
  const action = rawAction || inferred;
  if (!action) return "";

  const name = getStudentChatName(student);
  const context = buildStudentContext(student);
  const topic = classifyTopic(`${action}\n${inferred}\n${buildTagText(student)}`);
  const friendlyAction = extractStudentFriendlyHint(action);
  const body = buildStudentFacingBody(topic, context, friendlyAction);

  return [
    `${name}さん、こんにちは！ゴダイ薬局の採用担当です😊`,
    "",
    body,
    "",
    "少しでも気になれば、このLINEにそのまま返信してください✨"
  ].join("\n");
}

export function buildRecommendedChatReason(student: RecommendedChatStudent) {
  const aiAction = extractNextAction(student.ai_next_action) || clean(student.ai_next_action);
  const manualAction = extractNextAction(student.manual_next_action) || clean(student.manual_next_action);
  const context = buildStudentContext(student);
  const fallback = inferAction(student);

  return [
    context ? `学生情報: ${context}` : "",
    aiAction ? `AI判断: ${aiAction}` : "",
    manualAction ? `手動ネクストアクション: ${manualAction}` : "",
    !aiAction && !manualAction && fallback ? `判断材料: ${fallback}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

export function extractNextAction(value: string | null | undefined) {
  const original = clean(value);
  if (!original) return "";

  const jsonValue = extractFromJson(original);
  if (jsonValue) return polishAction(jsonValue);

  const text = stripCodeFence(original).replace(/\r\n/g, "\n").trim();
  const explicitMessage = extractSection(text, [
    "送信文",
    "返信文",
    "メッセージ",
    "チャット文",
    "送る文章",
    "案内文",
    "LINE文面"
  ]);
  if (explicitMessage && looksStudentFacing(explicitMessage)) return polishAction(explicitMessage);

  const explicitAction = extractSection(text, ["次アクション", "次にやること", "Next Action", "nextAction"]);
  if (explicitAction) return polishAction(stripInternalNoise(explicitAction));

  const usefulLines = text
    .split("\n")
    .map((line) => polishAction(line))
    .filter((line) => line && !isInternalActionLine(line));

  if (usefulLines.length > 0) return usefulLines.slice(0, 2).join(" ");
  return "";
}

function inferAction(student: RecommendedChatStudent) {
  const isHighMotivation =
    ["A", "B"].includes(String(student.motivation_rank ?? "").toUpperCase()) ||
    Number(student.motivation_level ?? 0) >= 4;

  if (!student.funnel_next) {
    return isHighMotivation
      ? "次のZoom面談または店舗見学の候補日を確認する"
      : "説明会または店舗見学を軽く案内する";
  }

  if (!student.funnel_pharmacist_interview) {
    return "若手薬剤師インタビューまたは個別面談を案内する";
  }

  if (isHighMotivation) {
    return "選考前に不安点を整理するため個別面談を案内する";
  }

  return "";
}

function classifyTopic(text: string): ChatTopic {
  if (/返信|リマインド|未返信|返事/.test(text)) return "reply";
  if (/Zoom|zoom|面談|相談|個別/.test(text)) return "zoom";
  if (/店舗|見学/.test(text)) return "visit";
  if (/薬剤師|インタビュー|若手/.test(text)) return "interview";
  if (/インターン|IS|実習/.test(text)) return "internship";
  if (/選考|内定|面接/.test(text)) return "selection";
  if (/説明会|セミナー|イベント|交流会|BBQ|案内/.test(text)) return "event";
  return "general";
}

function buildStudentFacingBody(topic: ChatTopic, context: string, action: string) {
  const prefix = context ? `「${context}」の状況を見て、` : "";

  switch (topic) {
    case "reply":
      return `${prefix}先日お送りしたご案内について、気になる点があれば気軽に聞いてもらえたらと思い連絡しました。日程が合うかだけでも大丈夫です！`;
    case "zoom":
      return `${prefix}一度15〜20分ほどZoomでお話しできたらと思い連絡しました。希望勤務地や実習のことも聞きながら、合いそうな見学・イベントを一緒に整理できます。`;
    case "visit":
      return `${prefix}店舗見学をご案内できたらと思い連絡しました。実際の雰囲気や働き方を見てもらえるので、就活の判断材料にしやすいと思います。`;
    case "interview":
      return `${prefix}若手薬剤師と話せる機会をご案内したいと思い連絡しました。現場の雰囲気や入社後の働き方をかなり具体的に聞けます。`;
    case "internship":
      return `${prefix}インターンシップや実務に近い体験の案内が合いそうだと思い連絡しました。薬局で働くイメージをつかみやすい内容です。`;
    case "selection":
      return `${prefix}選考前に不安なところを一度整理できたらと思い連絡しました。気になることや確認したいことがあれば、短時間でも個別にお話しできます。`;
    case "event":
      return `${prefix}次のイベント案内が合いそうだと思い連絡しました。現場社員や薬学生とも話せるので、まだ迷っている段階でも参加しやすい内容です。`;
    default:
      return action
        ? `${prefix}${action}について一度ご案内できたらと思い連絡しました。気になる内容だけ確認でも大丈夫です！`
        : `${prefix}今後のイベントや個別相談について、合いそうな案内を一度お送りできたらと思い連絡しました。`;
  }
}

function buildStudentContext(student: RecommendedChatStudent) {
  const pieces: string[] = [];
  const university = clean(student.university);
  const graduation = student.graduation_year ? `${student.graduation_year}卒` : "";
  const motivation = getMotivationRankLabel(student.motivation_rank, student.motivation_level);
  const contact = clean(student.first_contact_method);
  const area = clean(student.desired_area);

  if (university || graduation) pieces.push([university, graduation].filter(Boolean).join(" / "));
  if (motivation && motivation !== "-") pieces.push(`志望度${motivation}`);
  if (contact) pieces.push(`${contact}で接点あり`);
  if (area) pieces.push(`${area}エリア希望`);

  return pieces.slice(0, 3).join("・");
}

function buildTagText(student: RecommendedChatStudent) {
  return (student.tags ?? []).map((tag) => clean(tag.name)).join(" ");
}

function getStudentChatName(student: RecommendedChatStudent) {
  return clean(student.real_name) || clean(student.display_name) || "学生";
}

function extractFromJson(value: string) {
  const candidates = [value, stripCodeFence(value), findJsonBlock(value)].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      const message = findFirstStringByKeys(parsed, MESSAGE_KEYS);
      if (message && looksStudentFacing(message)) return message;
      const action = findFirstStringByKeys(parsed, ACTION_KEYS);
      if (action) return action;
    } catch {
      // Not JSON; continue with plain-text extraction.
    }
  }
  return "";
}

function findJsonBlock(value: string) {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start < 0 || end <= start) return "";
  return value.slice(start, end + 1);
}

function findFirstStringByKeys(value: unknown, keys: string[]): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstStringByKeys(item, keys);
      if (found) return found;
    }
    return "";
  }
  if (typeof value !== "object") return "";

  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const item = record[key];
    if (typeof item === "string" && item.trim()) return item;
    const nested = findFirstStringByKeys(item, keys);
    if (nested) return nested;
  }
  return "";
}

function extractSection(text: string, headings: string[]) {
  const stopHeadings = [
    "理由",
    "根拠",
    "優先度",
    "AI判断",
    "タグ候補",
    "判断材料",
    "推奨連絡手段",
    "次アクション",
    "次にやること",
    "Next Action",
    "nextAction"
  ];

  for (const heading of headings) {
    const escaped = escapeRegExp(heading);
    const stop = stopHeadings
      .filter((item) => item !== heading)
      .map(escapeRegExp)
      .join("|");
    const match = text.match(new RegExp(`${escaped}\\s*[:：\\-]?\\s*([\\s\\S]+?)(?=\\n\\s*(?:${stop})\\s*[:：\\-]|$)`, "i"));
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function stripCodeFence(value: string) {
  return value
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .trim();
}

function polishAction(value: string) {
  return stripCodeFence(value)
    .replace(/^[\s"'[{,]+/g, "")
    .replace(/[\s"'}\],]+$/g, "")
    .replace(/^\s*[-・]\s*/gm, "")
    .replace(/^次に?/g, "")
    .replace(/^採用担当者が/g, "")
    .replace(/^今週中に[、,]?\s*/g, "")
    .replace(/^学生に[、,]?\s*/g, "")
    .replace(/を確認・共有する$/g, "")
    .replace(/してください。?$/g, "")
    .trim();
}

function clean(value: string | null | undefined) {
  return localizeSampleText(value)?.trim() || "";
}

function stripInternalNoise(value: string) {
  return value
    .split("\n")
    .filter((line) => !isInternalActionLine(line))
    .join("\n")
    .trim();
}

function isInternalActionLine(value: string) {
  return INTERNAL_LINE_PATTERNS.some((pattern) => pattern.test(value));
}

function extractStudentFriendlyHint(value: string) {
  const text = polishAction(stripInternalNoise(value));
  if (!text || isInternalActionLine(text)) return "";
  return text
    .replace(/候補日を確認する/g, "候補日の確認")
    .replace(/不安点を整理する/g, "不安点の整理")
    .replace(/案内する/g, "案内")
    .replace(/連絡する/g, "連絡")
    .trim();
}

function looksStudentFacing(value: string) {
  const text = value.trim();
  if (!text || isInternalActionLine(text)) return false;
  return /さん|こんにちは|ご案内|連絡しました|返信|気軽|大丈夫|いかが|😊|✨/.test(text);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
