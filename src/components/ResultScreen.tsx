"use client";
import type { Stats } from "@/types/game";
import { diagnoseCareer, getCareerScores } from "@/data/careers";

interface Props {
  stats: Stats;
  eventLog: { title: string; emoji: string; choiceLabel?: string }[];
  onReset: () => void;
}

const STAT_LABELS: Record<keyof Stats, string> = {
  knowledge: "KNOWLEDGE",
  hospitality: "HOSPITALITY",
  trust: "TRUST",
  planning: "PLANNING",
  leadership: "LEADERSHIP",
  money: "MONEY",
  satisfaction: "SATISFACTION",
};

export default function ResultScreen({ stats, eventLog, onReset }: Props) {
  const career = diagnoseCareer(stats);
  const scores = getCareerScores(stats);
  const maxScore = scores[0]?.score ?? 1;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start p-4 py-8"
      style={{ background: "var(--c-bg)" }}
    >
      <div className="w-full max-w-md space-y-4">
        {/* Career result */}
        <div
          className="p-5 text-center"
          style={{
            background: "var(--c-surface)",
            border: "1px solid var(--c-border)",
            borderRadius: "4px",
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--c-muted)" }}>
            Career Diagnosis
          </p>
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="text-4xl">{career.emoji}</span>
            <span className="text-xl font-black" style={{ color: "var(--c-gold-bright)" }}>
              {career.name}
            </span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--c-muted)" }}>
            {career.description}
          </p>
        </div>

        {/* Stats */}
        <div
          className="p-4"
          style={{
            background: "var(--c-surface)",
            border: "1px solid var(--c-border)",
            borderRadius: "4px",
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--c-muted)" }}>
            Final Status
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(stats) as (keyof Stats)[]).map((key) => (
              <div
                key={key}
                className="flex items-center gap-2 px-3 py-2"
                style={{
                  background: "var(--c-elevated)",
                  border: "1px solid var(--c-border)",
                  borderRadius: "4px",
                }}
              >
                <span className="text-[9px] font-bold uppercase tracking-wide flex-1" style={{ color: "var(--c-muted)" }}>
                  {STAT_LABELS[key]}
                </span>
                <span className="text-sm font-black tabular-nums" style={{ color: "var(--c-text)" }}>
                  {stats[key]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Career aptitude ranking */}
        <div
          className="p-4"
          style={{
            background: "var(--c-surface)",
            border: "1px solid var(--c-border)",
            borderRadius: "4px",
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--c-muted)" }}>
            Career Aptitude
          </p>
          <div className="space-y-2.5">
            {scores.slice(0, 5).map(({ career: c, score }, i) => (
              <div key={c.id} className="flex items-center gap-2">
                <span className="text-xs w-4 text-center font-bold tabular-nums" style={{ color: "var(--c-muted)" }}>
                  {i + 1}
                </span>
                <span className="text-base">{c.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="text-xs font-bold"
                      style={{ color: i === 0 ? "var(--c-gold)" : "var(--c-muted)" }}
                    >
                      {c.name}
                    </span>
                    <span className="text-[10px] tabular-nums" style={{ color: "var(--c-muted)" }}>
                      {score}pt
                    </span>
                  </div>
                  <div
                    className="overflow-hidden"
                    style={{ height: "3px", background: "var(--c-elevated)", borderRadius: "1px" }}
                  >
                    <div
                      className="h-full transition-all duration-1000"
                      style={{
                        width: `${Math.max((score / maxScore) * 100, 5)}%`,
                        background: i === 0 ? "var(--c-gold)" : "var(--c-border)",
                        borderRadius: "1px",
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Event log */}
        {eventLog.length > 0 && (
          <div
            className="p-4"
            style={{
              background: "var(--c-surface)",
              border: "1px solid var(--c-border)",
              borderRadius: "4px",
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--c-muted)" }}>
              Career Log ({eventLog.length})
            </p>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {eventLog.map((e, i) => (
                <div key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--c-muted)" }}>
                  <span>{e.emoji}</span>
                  <div>
                    <span>{e.title}</span>
                    {e.choiceLabel && (
                      <span className="ml-1" style={{ color: "var(--c-accent)" }}>
                        → {e.choiceLabel}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onReset}
          className="w-full py-3 font-bold text-sm uppercase tracking-widest transition-all duration-150 active:scale-95 cursor-pointer"
          style={{
            background: "linear-gradient(135deg, var(--c-accent), #7060c8)",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
          }}
        >
          Play Again
        </button>
      </div>
    </div>
  );
}
