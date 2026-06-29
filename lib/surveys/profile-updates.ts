import type { Json } from "@/lib/supabase/database.types";

type SurveyQuestionForProfile = {
  id: string;
  label: string | null;
  validation_type?: string | null;
  settings_jsonb?: Json | null;
};

type ProfileTarget =
  | "real_name"
  | "display_name"
  | "kana"
  | "university"
  | "graduation_year"
  | "grade"
  | "phone"
  | "email"
  | "desired_area"
  | "desired_job_type";

const profileTargets = new Set<ProfileTarget>([
  "real_name",
  "display_name",
  "kana",
  "university",
  "graduation_year",
  "grade",
  "phone",
  "email",
  "desired_area",
  "desired_job_type"
]);

export function buildStudentProfileUpdateFromSurveyAnswers(
  questions: SurveyQuestionForProfile[],
  answers: Record<string, Json>,
  respondentName?: string | null
) {
  const update: Record<string, unknown> = {};

  if (respondentName) {
    update.real_name = respondentName;
    update.display_name = respondentName;
  }

  for (const question of questions) {
    const label = String(question.label ?? "");
    const lowerLabel = label.toLowerCase();
    const answer = answers[question.id];
    const answerText = getAnswerText(answer);
    if (!answerText) continue;

    const explicitTargets = getProfileTargets(question.settings_jsonb);
    if (explicitTargets.length > 0) {
      applyProfileTargets(update, explicitTargets, answerText);
      continue;
    }

    const isKanaLabel =
      includesAny(label, ["ふりがな", "フリガナ", "カナ"]) ||
      includesAny(lowerLabel, ["kana", "furigana"]);

    if (isKanaLabel) {
      update.kana = answerText;
      continue;
    }

    if (includesAny(label, ["志望度", "確度"]) || lowerLabel.includes("motivation")) {
      const value = Number(answerText);
      if (value >= 1 && value <= 5) update.motivation_level = value;
    }

    if (includesAny(label, ["氏名", "名前", "お名前"]) || lowerLabel.includes("name")) {
      update.real_name = answerText;
      update.display_name = answerText;
    }

    if (
      includesAny(label, ["大学", "学校"]) ||
      includesAny(lowerLabel, ["university", "college", "school"])
    ) {
      update.university = answerText;
    }

    if (label.includes("学年") || includesAny(lowerLabel, ["grade", "school year"])) {
      const graduationYear = parseGraduationYear(answerText);
      if (graduationYear) {
        update.graduation_year = graduationYear;
      } else {
        update.grade = answerText;
      }
    }

    if (
      includesAny(label, ["卒業", "卒年", "何卒"]) ||
      lowerLabel.includes("graduation")
    ) {
      const graduationYear = parseGraduationYear(answerText);
      if (graduationYear) update.graduation_year = graduationYear;
    }

    if (
      question.validation_type === "email" ||
      includesAny(label, ["メール", "メールアドレス"]) ||
      includesAny(lowerLabel, ["email", "mail"])
    ) {
      update.email = answerText;
    }

    if (
      question.validation_type === "phone" ||
      includesAny(label, ["電話", "電話番号", "携帯"]) ||
      includesAny(lowerLabel, ["phone", "tel"])
    ) {
      update.phone = answerText;
    }
  }

  return update;
}

function getProfileTargets(settings: Json | undefined | null): ProfileTarget[] {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return [];
  const raw =
    (settings as { profileTargets?: unknown; profile_targets?: unknown }).profileTargets ??
    (settings as { profileTargets?: unknown; profile_targets?: unknown }).profile_targets;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (value): value is ProfileTarget =>
      typeof value === "string" && profileTargets.has(value as ProfileTarget)
  );
}

function applyProfileTargets(
  update: Record<string, unknown>,
  targets: ProfileTarget[],
  answerText: string
) {
  for (const target of targets) {
    if (target === "graduation_year") {
      const year = parseGraduationYear(answerText);
      if (year) update.graduation_year = year;
      continue;
    }
    update[target] = answerText;
  }
}

function includesAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle));
}

function getAnswerText(answer: Json) {
  if (Array.isArray(answer)) {
    return answer.map((value) => String(value ?? "").trim()).filter(Boolean).join("、");
  }

  return String(answer ?? "").trim();
}

function parseGraduationYear(answer: string) {
  const normalized = answer.replace(/[０-９]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0)
  );

  const fullYearMatch = normalized.match(/20\d{2}/);
  if (fullYearMatch) {
    const year = Number(fullYearMatch[0]);
    return year >= 2020 && year <= 2040 ? year : null;
  }

  const shortYearMatch = normalized.match(/(?:^|[^\d])(\d{2})\s*(?:卒|年卒|年3月|年３月)?/);
  if (shortYearMatch) {
    const year = 2000 + Number(shortYearMatch[1]);
    return year >= 2020 && year <= 2040 ? year : null;
  }

  return null;
}
