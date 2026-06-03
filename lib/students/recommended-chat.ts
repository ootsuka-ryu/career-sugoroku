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

export function buildRecommendedChatDraft(student: RecommendedChatStudent) {
  const action = extractNextAction(student.ai_next_action) || clean(student.manual_next_action);
  const name = getStudentChatName(student);
  const context = buildStudentContext(student);
  const actionText = action || inferAction(student);

  if (!actionText) return "";

  return [
    `${name}さん、こんにちは！ゴダイ薬局の採用担当です😊`,
    context
      ? `${context}を見て、今のタイミングなら${actionText}が一番イメージしやすいかなと思ってご連絡しました✨`
      : `今のタイミングなら${actionText}が一番イメージしやすいかなと思ってご連絡しました✨`,
    "無理に決めなくて大丈夫なので、",
    "①日程を見たい",
    "②まず内容だけ聞きたい",
    "③今回は見送り",
    "この中だとどれが近いですか？"
  ].join("\n");
}

export function extractNextAction(value: string | null | undefined) {
  const text = clean(value);
  if (!text) return "";

  const nextActionMatch = text.match(
    /(?:次アクション|提案[：: ]|送る文章[：: ]|案内内容[：: ])\s*([\s\S]+?)(?=\s*(?:推奨連絡手段|理由|優先度|$)[：: ]|$)/
  );
  if (nextActionMatch?.[1]) return polishAction(nextActionMatch[1]);

  if (/優先度|理由|推奨連絡手段/.test(text)) return "";
  return polishAction(text);
}

function inferAction(student: RecommendedChatStudent) {
  const isHighMotivation =
    ["A", "B"].includes(String(student.motivation_rank ?? "").toUpperCase()) ||
    Number(student.motivation_level ?? 0) >= 4;

  if (!student.funnel_next) {
    return isHighMotivation
      ? "次のZoom面談や店舗見学の候補日を一緒に見ていくこと"
      : "まずは短い説明会や店舗見学の雰囲気だけ知ってもらうこと";
  }

  if (!student.funnel_pharmacist_interview) {
    return "若手薬剤師と話せる機会や個別相談で、働き方をもう少し具体的に知ってもらうこと";
  }

  if (isHighMotivation) {
    return "選考前に不安なところを一度整理する個別相談";
  }

  return "";
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
