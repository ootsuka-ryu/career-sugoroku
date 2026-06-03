import type { Json } from "@/lib/supabase/database.types";

type SurveyQuestionForProfile = {
  id: string;
  label: string | null;
  validation_type?: string | null;
};

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

    const isKanaLabel =
      label.includes("ふりがな") ||
      label.includes("フリガナ") ||
      label.includes("カナ") ||
      lowerLabel.includes("kana") ||
      lowerLabel.includes("furigana");

    if (isKanaLabel) {
      update.kana = answerText;
      continue;
    }

    if (label.includes("志望度") || lowerLabel.includes("motivation")) {
      const value = Number(answerText);
      if (value >= 1 && value <= 5) update.motivation_level = value;
    }

    if (
      label.includes("氏名") ||
      label.includes("名前") ||
      lowerLabel.includes("name")
    ) {
      update.real_name = answerText;
      update.display_name = answerText;
    }

    if (
      label.includes("大学") ||
      label.includes("学校") ||
      lowerLabel.includes("university") ||
      lowerLabel.includes("college") ||
      lowerLabel.includes("school")
    ) {
      update.university = answerText;
    }

    if (
      label.includes("学年") ||
      lowerLabel.includes("grade") ||
      lowerLabel.includes("school year")
    ) {
      const graduationYear = parseGraduationYear(answerText);
      if (graduationYear) {
        update.graduation_year = graduationYear;
      } else {
        update.grade = answerText;
      }
    }

    if (
      label.includes("卒業年") ||
      label.includes("卒業年度") ||
      label.includes("卒業予定") ||
      label.includes("卒年") ||
      lowerLabel.includes("graduation")
    ) {
      const graduationYear = parseGraduationYear(answerText);
      if (graduationYear) update.graduation_year = graduationYear;
    }

    if (
      question.validation_type === "email" ||
      label.includes("メール") ||
      label.includes("mail") ||
      lowerLabel.includes("email")
    ) {
      update.email = answerText;
    }

    if (
      question.validation_type === "phone" ||
      label.includes("電話") ||
      label.includes("携帯") ||
      lowerLabel.includes("phone") ||
      lowerLabel.includes("tel")
    ) {
      update.phone = answerText;
    }
  }

  return update;
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

  const shortYearMatch = normalized.match(/(?:^|[^\d])(\d{2})\s*卒/);
  if (shortYearMatch) {
    const year = 2000 + Number(shortYearMatch[1]);
    return year >= 2020 && year <= 2040 ? year : null;
  }

  return null;
}
