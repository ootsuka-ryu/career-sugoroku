export type RecruitingMetricKey =
  | "entry"
  | "pool"
  | "next"
  | "is"
  | "interview"
  | "selection"
  | "offer"
  | "offerAccepted"
  | "hired";

export type RecruitingMetric = {
  key: RecruitingMetricKey;
  label: string;
};

export const recruitingMetrics: RecruitingMetric[] = [
  { key: "entry", label: "エントリー" },
  { key: "pool", label: "母集団" },
  { key: "next", label: "ネクスト" },
  { key: "is", label: "IS" },
  { key: "interview", label: "薬剤師インタビュー" },
  { key: "selection", label: "選考会" },
  { key: "offer", label: "内定出し" },
  { key: "offerAccepted", label: "内定内諾" },
  { key: "hired", label: "入社人数" }
];

export const studentFunnelFlagFields = [
  { name: "funnel_entry", label: "エントリー" },
  { name: "funnel_uncontacted", label: "未母集団" },
  { name: "funnel_pool", label: "母集団" },
  { name: "funnel_next", label: "ネクストあり" },
  { name: "funnel_is", label: "IS参加" },
  { name: "funnel_pharmacist_interview", label: "薬剤師インタビュー" },
  { name: "funnel_selection", label: "選考会" },
  { name: "funnel_offer", label: "内定出し" },
  { name: "funnel_offer_accepted", label: "内定内諾" },
  { name: "funnel_hired", label: "入社" }
] as const;

export type StudentFunnelFlagName = (typeof studentFunnelFlagFields)[number]["name"];

export type RecruitingMetricCounts = Record<RecruitingMetricKey, number>;

export function emptyRecruitingMetricCounts(): RecruitingMetricCounts {
  return {
    entry: 0,
    pool: 0,
    next: 0,
    is: 0,
    interview: 0,
    selection: 0,
    offer: 0,
    offerAccepted: 0,
    hired: 0
  };
}

export function getPreviousYearMonthlyCounts(graduationYear: number, month: number) {
  if (graduationYear !== 2028) return null;
  return previousYear2027ByMonth[month] ?? null;
}

export const previousYear2027ByMonth: Record<number, Partial<RecruitingMetricCounts>> = {
  3: { entry: 201, pool: 75, next: 30, is: 2 },
  4: { entry: 231, pool: 113, next: 56, is: 2 },
  5: { entry: 313, pool: 150, next: 78, is: 2 },
  6: { entry: 380, pool: 208, next: 88, is: 2, interview: 2 },
  7: { entry: 468, pool: 265, next: 116, is: 2, interview: 4 },
  8: { entry: 562, pool: 308, next: 142, is: 3, interview: 7, selection: 2, offer: 2, offerAccepted: 1 },
  9: { entry: 628, pool: 364, next: 153, is: 4, interview: 8, selection: 2, offer: 2, offerAccepted: 2 },
  10: { entry: 690, pool: 422, next: 155, is: 4, interview: 9, selection: 2, offer: 2, offerAccepted: 2 },
  11: { entry: 744, pool: 462, next: 189, is: 4, interview: 10, selection: 3, offer: 3, offerAccepted: 2 },
  12: { entry: 783, pool: 490, next: 192, is: 4, interview: 14, selection: 3, offer: 3, offerAccepted: 3 },
  1: { entry: 803, pool: 501, next: 194, is: 4, interview: 15, selection: 5, offer: 4, offerAccepted: 3 },
  2: { entry: 816, pool: 510, next: 198, is: 4, interview: 17, selection: 6, offer: 6, offerAccepted: 4 }
};

export function formatRate(numerator: number, denominator: number) {
  if (!denominator) return "-";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}
