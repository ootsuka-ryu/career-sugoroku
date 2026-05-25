export const motivationRanks = [
  "専願",
  "併願",
  "A",
  "B",
  "B-",
  "C",
  "C-",
  "Dアリ",
  "D-",
  "Eナシ",
  "E-",
  "見送り",
  "返信有→無"
] as const;

export type MotivationRank = (typeof motivationRanks)[number];

export const candidateStages = [
  { value: "friend_added", label: "友だち追加" },
  { value: "initial_survey", label: "初回アンケート" },
  { value: "seminar_attended", label: "説明会参加" },
  { value: "interview", label: "面談" },
  { value: "store_visit", label: "店舗見学" },
  { value: "applied", label: "応募" },
  { value: "offered", label: "内定" },
  { value: "declined", label: "辞退" },
  { value: "closed", label: "終了" }
] as const;

export const declineReasons = [
  "距離",
  "給与",
  "雰囲気",
  "他社決定",
  "業態違い",
  "勤務地",
  "連絡不通",
  "その他"
] as const;

export function getCandidateStageLabel(value?: string | null) {
  return candidateStages.find((stage) => stage.value === value)?.label ?? "友だち追加";
}

export function isHighMotivationRank(value?: string | null) {
  return value === "専願" || value === "併願" || value === "A" || value === "B";
}

export function legacyMotivationLevelToRank(value?: number | null) {
  const map: Record<number, MotivationRank> = {
    5: "A",
    4: "B",
    3: "C",
    2: "D-",
    1: "Eナシ"
  };
  return value ? map[value] ?? null : null;
}

export function getMotivationRankLabel(rank?: string | null, legacyLevel?: number | null) {
  return rank || legacyMotivationLevelToRank(legacyLevel) || "-";
}
