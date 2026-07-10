import type { CareerType, Stats } from "@/types/game";

export const CAREER_TYPES: CareerType[] = [
  {
    id: "store_manager",
    name: "店舗マネジメント型",
    description:
      "スタッフをまとめ、地域で一番信頼される薬局を作るリーダー。店舗の数字から人材育成まで全部を動かす。",
    emoji: "👑",
    color: "from-amber-500 to-orange-600",
    weights: { leadership: 3, trust: 2, planning: 1 },
  },
  {
    id: "home_specialist",
    name: "在宅スペシャリスト型",
    description:
      "患者さんの自宅まで足を運び、深い知識と信頼で在宅医療を支える専門家。医師・看護師との連携が鍵。",
    emoji: "🏠",
    color: "from-cyan-500 to-blue-600",
    weights: { knowledge: 3, trust: 3, satisfaction: 1 },
  },
  {
    id: "otc_consultant",
    name: "OTC相談型",
    description:
      "市販薬のプロとして、来店するすべての人の悩みに応える薬剤師。接客力と専門知識の両立が武器。",
    emoji: "🧴",
    color: "from-pink-500 to-rose-600",
    weights: { hospitality: 3, knowledge: 2, trust: 1 },
  },
  {
    id: "recruitment",
    name: "採用プロジェクト型",
    description:
      "学生と向き合い、会社の未来を担う仲間を呼び込む採用のプロ。企画・イベント・面接まで幅広く活躍。",
    emoji: "🚀",
    color: "from-violet-500 to-purple-600",
    weights: { planning: 3, hospitality: 2, leadership: 1 },
  },
  {
    id: "educator",
    name: "教育担当型",
    description:
      "後輩・新人の成長を支え、組織全体の底上げをする研修のプロ。「人が育つ仕組み」を作るのが得意。",
    emoji: "📖",
    color: "from-green-500 to-emerald-600",
    weights: { leadership: 2, trust: 2, knowledge: 2 },
  },
  {
    id: "community",
    name: "地域連携型",
    description:
      "医療機関・行政・地域住民をつなぎ、まちの健康を支えるコーディネーター。顔の広さが最大の武器。",
    emoji: "🌏",
    color: "from-teal-500 to-cyan-600",
    weights: { trust: 3, planning: 2, satisfaction: 1 },
  },
  {
    id: "new_business",
    name: "新規事業型",
    description:
      "薬局の常識を覆す新サービスを生み出すイノベーター。アイデアと行動力で業界の未来を切り拓く。",
    emoji: "💡",
    color: "from-yellow-500 to-amber-600",
    weights: { planning: 3, leadership: 2, knowledge: 1 },
  },
  {
    id: "dx_specialist",
    name: "DX・ITシステム型",
    description:
      "AI処方支援・電子薬歴・データ分析で薬局をアップデートするデジタル変革の旗手。ITと薬の橋渡し役。",
    emoji: "💻",
    color: "from-indigo-500 to-blue-600",
    weights: { planning: 3, knowledge: 3 },
  },
];

export function diagnoseCareer(stats: Stats): CareerType {
  const statsRecord = stats as unknown as Record<string, number>;
  let bestCareer = CAREER_TYPES[0];
  let bestScore = -Infinity;

  for (const career of CAREER_TYPES) {
    let score = 0;
    for (const [key, weight] of Object.entries(career.weights)) {
      score += (statsRecord[key] ?? 0) * (weight ?? 0);
    }
    if (score > bestScore) {
      bestScore = score;
      bestCareer = career;
    }
  }
  return bestCareer;
}

export function getCareerScores(stats: Stats): { career: CareerType; score: number }[] {
  const statsRecord = stats as unknown as Record<string, number>;
  return CAREER_TYPES.map((career) => {
    let score = 0;
    for (const [key, weight] of Object.entries(career.weights)) {
      score += (statsRecord[key] ?? 0) * (weight ?? 0);
    }
    return { career, score };
  }).sort((a, b) => b.score - a.score);
}
