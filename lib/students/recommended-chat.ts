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

type ChatTopic = "reply" | "zoom" | "visit" | "event" | "interview" | "internship" | "general";

export function buildRecommendedChatDraft(student: RecommendedChatStudent) {
  const action = extractNextAction(student.ai_next_action) || clean(student.manual_next_action);
  const inferred = inferAction(student);
  if (!action && !inferred) return "";

  const name = getStudentChatName(student);
  const context = buildStudentContext(student);
  const topic = classifyTopic(`${action}\n${inferred}\n${buildTagText(student)}`);
  const body = buildStudentFacingBody(topic, context);

  return [
    `${name}さん、こんにちは！ゴダイ薬局の採用担当です😊`,
    "",
    body,
    "",
    "無理に決めなくて大丈夫なので、",
    "①日程を見たい",
    "②まず内容だけ聞きたい",
    "③今回は見送り",
    "",
    "この中だとどれが近いですか？✨"
  ].join("\n");
}

export function buildRecommendedChatReason(student: RecommendedChatStudent) {
  const aiAction = clean(student.ai_next_action);
  const manualAction = clean(student.manual_next_action);
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
  const text = clean(value);
  if (!text) return "";

  const normalized = text.replace(/\r\n/g, "\n");
  const nextActionMatch = normalized.match(
    /(?:次アクション|次にやること|送る文章|案内内容)\s*[：:\-]?\s*([\s\S]+?)(?=\n\s*(?:推奨連絡手段|理由|優先度|タグ候補|$)|$)/
  );
  if (nextActionMatch?.[1]) return polishAction(nextActionMatch[1]);

  if (/優先度|理由|推奨連絡手段/.test(normalized)) return "";
  return polishAction(normalized);
}

function inferAction(student: RecommendedChatStudent) {
  const isHighMotivation =
    ["A", "B"].includes(String(student.motivation_rank ?? "").toUpperCase()) ||
    Number(student.motivation_level ?? 0) >= 4;

  if (!student.funnel_next) {
    return isHighMotivation
      ? "次のZoom面談や店舗見学の候補日を一緒に見てもらうこと"
      : "まずは短い説明会や店舗見学の雰囲気を知ってもらうこと";
  }

  if (!student.funnel_pharmacist_interview) {
    return "若手薬剤師と話せる機会や個別相談で、不安や希望を具体的に確認すること";
  }

  if (isHighMotivation) {
    return "選考前に不安なところを一度整理する個別相談";
  }

  return "";
}

function classifyTopic(text: string): ChatTopic {
  if (/返信|リマインド|返事|未返信/.test(text)) return "reply";
  if (/Zoom|zoom|面談|相談|個別/.test(text)) return "zoom";
  if (/店舗|見学/.test(text)) return "visit";
  if (/薬剤師|インタビュー|若手/.test(text)) return "interview";
  if (/インターン|IS|実習/.test(text)) return "internship";
  if (/説明会|セミナー|イベント|交流会|BBQ|案内/.test(text)) return "event";
  return "general";
}

function buildStudentFacingBody(topic: ChatTopic, context: string) {
  const prefix = context ? `${context}の状況を見て、` : "";

  switch (topic) {
    case "reply":
      return `${prefix}先日お送りした案内について、気になる点があれば気軽に聞いてもらえたらと思って連絡しました。日程が合うかだけでも大丈夫です！`;
    case "zoom":
      return `${prefix}一度15〜20分くらいでZoom面談できたらと思って連絡しました。就活の進め方や気になっていることを聞きながら、合いそうなイベントも一緒に整理できます。`;
    case "visit":
      return `${prefix}店舗見学をご案内できたらと思って連絡しました。実際の働き方や雰囲気を見てもらえるので、就活の判断材料にしやすいと思います。`;
    case "interview":
      return `${prefix}若手薬剤師と話せる機会をご案内したいと思って連絡しました。現場の雰囲気や入社後の働き方をかなり具体的に聞けます。`;
    case "internship":
      return `${prefix}インターンシップや実務に近い体験の案内が合いそうだと思って連絡しました。薬局で働くイメージをつかみやすい内容です。`;
    case "event":
      return `${prefix}次のイベント案内が合いそうだと思って連絡しました。まだ迷っている段階でも参加しやすい内容なので、興味があれば候補日を送ります。`;
    default:
      return `${prefix}今後のイベントや個別相談について、合いそうな案内を一度お送りできたらと思って連絡しました。気になる内容だけ確認でも大丈夫です！`;
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

function polishAction(value: string) {
  return value
    .replace(/^次に?/g, "")
    .replace(/してください。?$/g, "")
    .replace(/です。?$/g, "")
    .trim();
}

function clean(value: string | null | undefined) {
  return localizeSampleText(value)?.trim() || "";
}
