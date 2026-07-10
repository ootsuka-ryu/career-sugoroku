"use client";
import type { GameEvent, EventChoice, StatDelta } from "@/types/game";

const STAT_LABELS: Record<string, string> = {
  knowledge: "📖知識",
  hospitality: "😊接客",
  trust: "🤝信頼",
  planning: "💡計画",
  leadership: "⭐統率",
  money: "💰所持金",
  satisfaction: "✨満足",
};

function DeltaBadges({ delta }: { delta: StatDelta }) {
  const entries = Object.entries(delta).filter(([, v]) => v !== 0 && v !== undefined);
  if (entries.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
      {entries.map(([key, val]) => {
        const positive = (val ?? 0) > 0;
        const label = key === "money"
          ? `${positive ? "+" : ""}${(val ?? 0) * 100}万円`
          : `${positive ? "+" : ""}${val}`;
        return (
          <span
            key={key}
            style={{
              display: "inline-flex", alignItems: "center", gap: 3,
              padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: positive ? "rgba(60,200,100,0.18)" : "rgba(220,60,60,0.18)",
              border: `1px solid ${positive ? "rgba(60,200,100,0.50)" : "rgba(220,60,60,0.50)"}`,
              color: positive ? "#3CDC68" : "#FF6060",
            }}
          >
            {STAT_LABELS[key] ?? key} {label}
          </span>
        );
      })}
    </div>
  );
}

interface Props {
  event: GameEvent;
  onDismiss: () => void;
  onChoose: (choice: EventChoice) => void;
}

export default function EventCard({ event, onDismiss, onChoose }: Props) {
  const hasChoices = !!event.choices && event.choices.length > 0;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50">
      <div
        className="animate-slide-up"
        style={{
          background: "var(--c-surface)",
          borderTop: "1px solid var(--c-border)",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        <div className="max-w-2xl mx-auto p-5 space-y-5">

          {/* Header */}
          <div
            className="flex items-start gap-3 animate-fade-in-up"
            style={{ animationFillMode: "both" }}
          >
            <span className="text-2xl mt-0.5 shrink-0">{event.emoji}</span>
            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-widest mb-1"
                style={{ color: "var(--c-muted)" }}
              >
                Event
              </p>
              <h2 className="text-base font-bold leading-snug" style={{ color: "var(--c-text)" }}>
                {event.title}
              </h2>
              <p
                className="text-sm mt-1.5 leading-relaxed animate-fade-in-up"
                style={{ color: "var(--c-muted)", animationDelay: "80ms", animationFillMode: "both", whiteSpace: "pre-line" }}
              >
                {event.description}
              </p>
              {!hasChoices && event.delta && <DeltaBadges delta={event.delta} />}
            </div>
          </div>

          {hasChoices ? (
            /* ── 選択肢UI ─ 能力値は意図的に非表示 ── */
            <div className="space-y-2">
              <p
                className="text-[10px] font-bold uppercase tracking-widest animate-fade-in-up"
                style={{ color: "var(--c-muted)", animationDelay: "140ms", animationFillMode: "both" }}
              >
                あなたならどうする？
              </p>
              {event.choices!.map((choice, i) => (
                <button
                  key={choice.id}
                  onClick={() => onChoose(choice)}
                  className="w-full text-left p-4 transition-all duration-150 active:scale-[0.99] cursor-pointer animate-fade-in-up"
                  style={{
                    background: "var(--c-elevated)",
                    border: "1px solid var(--c-border)",
                    borderRadius: 4,
                    animationDelay: `${220 + i * 130}ms`,
                    animationFillMode: "both",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--c-accent)";
                    (e.currentTarget as HTMLElement).style.background = "rgba(88,72,176,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--c-border)";
                    (e.currentTarget as HTMLElement).style.background = "var(--c-elevated)";
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5 shrink-0">{choice.emoji}</span>
                    <div>
                      <p className="font-bold text-sm" style={{ color: "var(--c-text)" }}>
                        {choice.label}
                      </p>
                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--c-muted)" }}>
                        {choice.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            /* ── 自動発動イベント ── */
            <button
              onClick={onDismiss}
              className="w-full py-3 font-bold text-sm uppercase tracking-widest
                transition-all duration-150 active:scale-95 cursor-pointer animate-fade-in-up"
              style={{
                background: "linear-gradient(135deg, var(--c-accent), #7060c8)",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                animationDelay: "180ms",
                animationFillMode: "both",
              }}
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
