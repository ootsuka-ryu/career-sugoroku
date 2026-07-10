import type { BranchOption, CareerPath } from "@/types/game";

export const BRANCH_1_OPTIONS: BranchOption[] = [
  {
    id: "patient_care",
    path: "patient_care",
    label: "患者ケア型",
    description: "目の前の患者さんと真摯に向き合い、薬を通じて人の生活を支える薬剤師になりたい。",
    emoji: "🏥",
    delta: { trust: 2, hospitality: 1 },
  },
  {
    id: "management",
    path: "management",
    label: "マネジメント型",
    description: "スタッフをまとめ、業務を改善し、組織全体のパフォーマンスを上げていきたい。",
    emoji: "📊",
    delta: { leadership: 2, planning: 1 },
  },
  {
    id: "dx",
    path: "dx",
    label: "DX・イノベーション型",
    description: "テクノロジーで薬局を変革し、ITと薬学の橋渡し役として未来を切り拓きたい。",
    emoji: "💻",
    delta: { knowledge: 2, planning: 2 },
  },
];

const BRANCH_2_OPTIONS_MAP: Record<CareerPath, BranchOption[]> = {
  patient_care: [
    {
      id: "home_specialist",
      subPath: "home_specialist",
      label: "在宅専門家",
      description: "在宅医療の現場で患者さんの生活を薬で支える専門家を目指す。",
      emoji: "🏠",
      delta: { trust: 3, knowledge: 1 },
    },
    {
      id: "otc_pro",
      subPath: "otc_pro",
      label: "OTC相談のプロ",
      description: "市販薬の相談に特化し、地域住民の健康を守るOTCのエキスパートへ。",
      emoji: "🧴",
      delta: { hospitality: 3, knowledge: 1 },
    },
    {
      id: "educator",
      subPath: "educator",
      label: "後輩・教育担当",
      description: "次の世代の薬剤師を育てる教育担当として、チームの底上げに貢献する。",
      emoji: "👨‍🏫",
      delta: { leadership: 2, trust: 2 },
    },
  ],
  management: [
    {
      id: "store_manager",
      subPath: "store_manager",
      label: "店舗マネージャー候補",
      description: "店舗の運営を担い、スタッフをまとめて成果を出すマネージャーを目指す。",
      emoji: "🏪",
      delta: { leadership: 3, trust: 1 },
    },
    {
      id: "recruitment_pro",
      subPath: "recruitment_pro",
      label: "採用プロフェッショナル",
      description: "採用戦略を設計し、会社の未来を担う人材を発掘するプロへ。",
      emoji: "🎓",
      delta: { planning: 3, hospitality: 1 },
    },
    {
      id: "community",
      subPath: "community",
      label: "地域連携スペシャリスト",
      description: "医師・介護職と連携し、地域全体の医療を支えるハブ人材になる。",
      emoji: "🤝",
      delta: { trust: 3, planning: 1 },
    },
  ],
  dx: [
    {
      id: "systems",
      subPath: "systems",
      label: "システム設計",
      description: "薬局のITシステムを設計・改善し、業務効率を根本から変える。",
      emoji: "⚙️",
      delta: { planning: 3, knowledge: 2 },
    },
    {
      id: "data_analysis",
      subPath: "data_analysis",
      label: "データ分析",
      description: "処方データや患者情報を分析し、データドリブンな薬局運営を実現する。",
      emoji: "📊",
      delta: { knowledge: 3, planning: 2 },
    },
    {
      id: "new_business",
      subPath: "new_business",
      label: "新規事業開発",
      description: "薬局の新サービスやビジネスモデルを企画し、業界に新しい風を吹き込む。",
      emoji: "🚀",
      delta: { planning: 3, leadership: 1 },
    },
  ],
};

export function getBranch2Options(path: CareerPath): BranchOption[] {
  return BRANCH_2_OPTIONS_MAP[path];
}
