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

type ChatTopic =
  | "reply"
  | "zoom"
  | "visit"
  | "event"
  | "interview"
  | "internship"
  | "selection"
  | "general";

const MESSAGE_KEYS = [
  "chatMessage",
  "studentMessage",
  "sendText",
  "lineMessage",
  "recommendedMessage",
  "messageDraft",
  "draftMessage"
];

const ACTION_KEYS = ["nextAction", "nextActions", "action", "actions", "what", "task"];

const INTERNAL_LABEL_PATTERNS = [
  /^AI判断[:：]/,
  /^判断材料[:：]/,
  /^理由[:：]/,
  /^根拠[:：]/,
  /^優先度/,
  /^次アクション[:：]/,
  /^推奨連絡手段[:：]/,
  /^タグ候補[:：]/,
  /^Channel:/i,
  /^Reason:/i,
  /^Next Action:/i,
  /^Priority:/i,
  /^Urgency:/i,
  /^recommendedChannel/i,
  /^tagCandidates/i,
  /^nextActions?/i,
  /^urgent/i
];

const INTERNAL_TEXT_PATTERNS = [
  /採用担当者が/,
  /チーム内で/,
  /フォロー計画/,
  /情報提供計画/,
  /直接ヒアリング/,
  /優先的にアプローチ/,
  /確認・共有/,
  /JSON/i,
  /tagCandidates/i,
  /recommendedChannel/i
];

export function buildRecommendedChatDraft(student: RecommendedChatStudent) {
  const explicitMessage =
    extractStudentMessage(student.ai_next_action) || extractStudentMessage(student.manual_next_action);
  if (explicitMessage) {
    return normalizeSendableMessage(explicitMessage, student);
  }

  const action =
    extractNextAction(student.ai_next_action) ||
    extractNextAction(student.manual_next_action) ||
    inferAction(student);
  if (!action) return "";

  const topic = classifyTopic(`${action}\n${buildTagText(student)}`);
  return synthesizeStudentMessage(student, topic);
}

export function buildRecommendedChatReason(student: RecommendedChatStudent) {
  const aiAction = extractNextAction(student.ai_next_action) || readableAnalysis(student.ai_next_action);
  const manualAction = extractNextAction(student.manual_next_action) || readableAnalysis(student.manual_next_action);
  const context = buildStudentContext(student);
  const fallback = inferAction(student);

  return [
    "送信文には入れない判断材料",
    context ? `学生情報: ${context}` : "",
    aiAction ? `AI判断: ${aiAction}` : "",
    manualAction ? `手動ネクストアクション: ${manualAction}` : "",
    !aiAction && !manualAction && fallback ? `推定理由: ${fallback}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

export function extractNextAction(value: string | null | undefined) {
  const original = clean(value);
  if (!original) return "";

  const jsonAction = extractActionFromJson(original);
  if (jsonAction) return compactAction(jsonAction);

  const text = stripCodeFence(original).replace(/\r\n/g, "\n").trim();
  const explicitAction = extractSection(text, [
    "次アクション",
    "次にやること",
    "Next Action",
    "nextAction",
    "対応内容"
  ]);
  if (explicitAction) return compactAction(explicitAction);

  const usefulLines = text
    .split("\n")
    .map((line) => compactAction(line))
    .filter((line) => line && !isInternalLine(line));

  return usefulLines.slice(0, 2).join(" ");
}

function extractStudentMessage(value: string | null | undefined) {
  const original = clean(value);
  if (!original) return "";

  const jsonMessage = extractMessageFromJson(original);
  if (jsonMessage && looksStudentFacing(jsonMessage)) return jsonMessage;

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
  if (explicitMessage && looksStudentFacing(explicitMessage)) {
    return explicitMessage;
  }

  return "";
}

function synthesizeStudentMessage(student: RecommendedChatStudent, topic: ChatTopic) {
  const name = getStudentChatName(student);
  const greeting = `${name}さん、こんにちは！ゴダイ薬局の採用担当です😊`;
  const university = clean(student.university);
  const graduation = student.graduation_year ? `${student.graduation_year}卒` : "";
  const context = [university, graduation].filter(Boolean).join(" / ");
  const contextLine = context ? `${context}での就活状況を見て、ご連絡しました。` : "就活の状況を見て、ご連絡しました。";

  const bodyByTopic: Record<ChatTopic, string> = {
    reply:
      "先日お送りした案内について、気になる点があれば気軽に返信してください✨\n日程が合うかだけでも大丈夫です。",
    zoom:
      "一度15〜20分ほどZoomでお話しできたらと思っています✨\n希望勤務地や実習、就活で不安なことを聞きながら、合いそうな見学やイベントを一緒に整理できます。",
    visit:
      "店舗見学に興味があれば、雰囲気を見やすい日程をご案内できます✨\n実際の働き方や職場の空気感も見てもらえるので、就活の判断材料にしやすいと思います。",
    event:
      "次のイベントで、現場社員や薬学生同士と話せる機会があります✨\nまだ迷っている段階でも参加しやすい内容なので、少しでも気になれば案内しますね。",
    interview:
      "若手薬剤師と話せる機会をご案内できます✨\n現場の雰囲気や入社後の働き方など、近い目線で聞けるのでおすすめです。",
    internship:
      "インターンシップや実習に近い体験の案内ができます✨\n薬局で働くイメージをつかみやすい内容なので、興味があれば詳細を送ります。",
    selection:
      "選考前に、不安なところを一度整理できたらと思っています✨\n確認したいことや迷っていることがあれば、個別に相談できます。",
    general:
      "今後の就活で気になっていることや、不安に感じていることがあれば気軽に教えてください✨\n店舗見学や若手薬剤師との相談など、合いそうな機会をこちらで案内できます。"
  };

  return [greeting, "", contextLine, bodyByTopic[topic]].join("\n");
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

function buildStudentContext(student: RecommendedChatStudent) {
  const pieces: string[] = [];
  const university = clean(student.university);
  const graduation = student.graduation_year ? `${student.graduation_year}卒` : "";
  const motivation = getMotivationRankLabel(student.motivation_rank, student.motivation_level);
  const contact = clean(student.first_contact_method);
  const area = clean(student.desired_area);
  const tags = (student.tags ?? [])
    .map((tag) => clean(tag.name))
    .filter(Boolean)
    .slice(0, 5)
    .join("、");

  if (university || graduation) pieces.push([university, graduation].filter(Boolean).join(" / "));
  if (motivation && motivation !== "-") pieces.push(`志望度${motivation}`);
  if (contact) pieces.push(`初回接触: ${contact}`);
  if (area) pieces.push(`希望エリア: ${area}`);
  if (tags) pieces.push(`タグ: ${tags}`);

  return pieces.join("、");
}

function buildTagText(student: RecommendedChatStudent) {
  return (student.tags ?? []).map((tag) => clean(tag.name)).join(" ");
}

function getStudentChatName(student: RecommendedChatStudent) {
  const raw = clean(student.real_name) || clean(student.display_name) || "学生";
  return raw.replace(/\s*[（(].*?[）)]/g, "").trim() || "学生";
}

function extractMessageFromJson(value: string) {
  const parsed = parseJsonLike(value);
  return parsed ? findFirstStringByKeys(parsed, MESSAGE_KEYS) : "";
}

function extractActionFromJson(value: string) {
  const parsed = parseJsonLike(value);
  return parsed ? findFirstStringByKeys(parsed, ACTION_KEYS) : "";
}

function parseJsonLike(value: string): unknown {
  const candidates = [value, stripCodeFence(value), findJsonBlock(value)].filter(Boolean);
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Keep trying other candidates.
    }
  }
  return null;
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
    const match = text.match(new RegExp(`${escaped}\\s*[:：-]?\\s*([\\s\\S]+?)(?=\\n\\s*(?:${stop})\\s*[:：-]|$)`, "i"));
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

function compactAction(value: string) {
  const lines = stripCodeFence(value)
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) =>
      line
        .replace(/^[\s"'[{,]+/g, "")
        .replace(/[\s"'}\],]+$/g, "")
        .replace(/^\s*[-・]\s*/g, "")
        .trim()
    )
    .filter((line) => line && !isInternalLine(line));

  return lines.slice(0, 3).join(" ");
}

function readableAnalysis(value: string | null | undefined) {
  const text = stripCodeFence(clean(value));
  if (!text) return "";
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !/^```/.test(line))
    .slice(0, 4)
    .join(" ");
}

function normalizeSendableMessage(value: string, student: RecommendedChatStudent) {
  const name = getStudentChatName(student);
  const lines = stripCodeFence(value)
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !isInternalLine(line));

  const body = lines.join("\n").trim();
  if (!body) return synthesizeStudentMessage(student, "general");
  if (/こんにちは|お疲れさま|ご連絡/.test(body)) return body;
  return `${name}さん、こんにちは！ゴダイ薬局の採用担当です😊\n\n${body}`;
}

function looksStudentFacing(value: string) {
  const text = value.trim();
  if (!text || isInternalLine(text)) return false;
  return /さん|こんにちは|ご案内|連絡しました|返信|気軽|大丈夫|✨|😊|お願いします/.test(text);
}

function isInternalLine(value: string) {
  const text = value.trim();
  return (
    INTERNAL_LABEL_PATTERNS.some((pattern) => pattern.test(text)) ||
    INTERNAL_TEXT_PATTERNS.some((pattern) => pattern.test(text))
  );
}

function clean(value: string | null | undefined) {
  return localizeSampleText(value)?.trim() || "";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
