"use client";
import type { Stats, StageId } from "@/types/game";

interface Props {
  stats: Stats;
  stage: StageId;
  size?: "sm" | "md" | "lg";
}

function getDominantStat(stats: Stats): keyof Stats {
  const keys: (keyof Stats)[] = [
    "knowledge", "hospitality", "trust", "planning", "leadership",
  ];
  return keys.reduce((a, b) => stats[a] >= stats[b] ? a : b);
}

type AvatarConfig = { emoji: string; label: string; accentColor: string };

function getAvatar(stats: Stats, stage: StageId): AvatarConfig {
  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  const dominant = getDominantStat(stats);

  if (stage === "selection") {
    return { emoji: "🧑‍🎓", label: "薬学生", accentColor: "#5848b0" };
  }
  if (stage === "offer") {
    return { emoji: "📚", label: "内定者", accentColor: "#3a6090" };
  }
  if (stage === "year1") {
    return { emoji: "🧑‍⚕️", label: "新人薬剤師", accentColor: "#3a9060" };
  }
  if (total < 10) {
    return { emoji: "🧑‍⚕️", label: "薬剤師", accentColor: "#3a9060" };
  }

  const avatarMap: Record<string, AvatarConfig> = {
    knowledge: { emoji: "🔬", label: "スペシャリスト", accentColor: "#2a7090" },
    hospitality: { emoji: "😊", label: "接客のプロ", accentColor: "#903060" },
    trust: { emoji: "🤝", label: "信頼の薬剤師", accentColor: "#308070" },
    planning: { emoji: "🧑‍💻", label: "DX推進者", accentColor: "#4848a0" },
    leadership: { emoji: "👑", label: "リーダー候補", accentColor: "#c8993a" },
  };

  return avatarMap[dominant] ?? { emoji: "🧑‍⚕️", label: "薬剤師", accentColor: "#3a9060" };
}

export default function Character({ stats, stage, size = "md" }: Props) {
  const avatar = getAvatar(stats, stage);

  const sizeMap = {
    sm: { outer: 48, emoji: "text-2xl" },
    md: { outer: 64, emoji: "text-3xl" },
    lg: { outer: 80, emoji: "text-4xl" },
  }[size];

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="rounded-sm flex items-center justify-center"
        style={{
          width: sizeMap.outer,
          height: sizeMap.outer,
          background: "var(--c-elevated)",
          border: `1px solid ${avatar.accentColor}`,
          boxShadow: `0 0 8px ${avatar.accentColor}44`,
        }}
      >
        <span className={sizeMap.emoji}>{avatar.emoji}</span>
      </div>
      <span
        className="text-[10px] font-bold uppercase tracking-wide"
        style={{ color: "var(--c-muted)" }}
      >
        {avatar.label}
      </span>
    </div>
  );
}
