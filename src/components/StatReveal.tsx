"use client";
import { useEffect, useState } from "react";
import type { Stats, StatDelta } from "@/types/game";
import { playStatUp, playStatDown, playFanfare } from "@/sounds";

interface Props {
  statsBefore: Stats;
  pendingDelta: StatDelta;
  onContinue: () => void;
}

const STAT_DEFS: { key: keyof StatDelta; label: string }[] = [
  { key: "knowledge", label: "KNOWLEDGE" },
  { key: "hospitality", label: "HOSPITALITY" },
  { key: "trust", label: "TRUST" },
  { key: "planning", label: "PLANNING" },
  { key: "leadership", label: "LEADERSHIP" },
  { key: "money", label: "MONEY" },
  { key: "satisfaction", label: "SATISFACTION" },
];

export default function StatReveal({ statsBefore, pendingDelta, onContinue }: Props) {
  const changedStats = STAT_DEFS.filter(
    ({ key }) => pendingDelta[key] !== undefined && pendingDelta[key] !== 0
  );

  const [visibleCount, setVisibleCount] = useState(0);
  const [displayValues, setDisplayValues] = useState<Record<string, number>>(
    Object.fromEntries(
      changedStats.map(({ key }) => [key, statsBefore[key as keyof Stats]])
    )
  );
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (changedStats.length === 0) {
      setDone(true);
      return;
    }

    let i = 0;
    const reveal = () => {
      if (i >= changedStats.length) {
        setTimeout(() => {
          setDone(true);
          playFanfare();
        }, 300);
        return;
      }
      const { key } = changedStats[i];
      const delta = pendingDelta[key] ?? 0;
      const oldVal = statsBefore[key as keyof Stats];
      const newVal = Math.max(0, oldVal + delta);

      setVisibleCount(i + 1);

      // Animate count from old to new
      const steps = Math.abs(delta);
      const stepMs = Math.min(80, 300 / steps);
      let step = 0;
      const interval = setInterval(() => {
        step++;
        const current = oldVal + Math.sign(delta) * step;
        setDisplayValues((prev) => ({ ...prev, [key]: current }));
        if (step >= steps) {
          clearInterval(interval);
          setDisplayValues((prev) => ({ ...prev, [key]: newVal }));
        }
      }, stepMs);

      if (delta > 0) {
        playStatUp(i);
      } else {
        playStatDown(i);
      }

      i++;
      setTimeout(reveal, 400);
    };

    const t = setTimeout(reveal, 400);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: "rgba(0,0,0,0.95)" }}
    >
      <div className="w-full max-w-sm px-6 flex flex-col items-center gap-8">
        {/* Title */}
        <div className="text-center">
          <p
            className="text-[10px] font-bold uppercase tracking-widest mb-2"
            style={{ color: "var(--c-muted)" }}
          >
            Result
          </p>
          <h1
            className="text-3xl font-black uppercase tracking-widest animate-ability-up"
            style={{ color: "var(--c-gold-bright)" }}
          >
            {changedStats.every(({ key }) => (pendingDelta[key] ?? 0) >= 0)
              ? "ABILITY UP"
              : "STATUS UPDATE"}
          </h1>
        </div>

        {/* Stats */}
        <div className="w-full space-y-3">
          {changedStats.map(({ key, label }, idx) => {
            const delta = pendingDelta[key] ?? 0;
            const oldVal = statsBefore[key as keyof Stats];
            const newVal = Math.max(0, oldVal + delta);
            const isVisible = idx < visibleCount;
            const currentDisplay = displayValues[key] ?? oldVal;

            return (
              <div
                key={key}
                className={isVisible ? "animate-fade-in-up" : ""}
                style={{ opacity: isVisible ? 1 : 0 }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="text-[10px] font-bold uppercase tracking-widest w-24 shrink-0"
                    style={{ color: "var(--c-muted)" }}
                  >
                    {label}
                  </span>
                  <div className="flex-1 flex items-center gap-2">
                    <span
                      className="text-sm tabular-nums"
                      style={{ color: "var(--c-muted)" }}
                    >
                      {oldVal}
                    </span>
                    <span style={{ color: "var(--c-border)" }}>→</span>
                    <span
                      className="text-lg font-black tabular-nums"
                      style={{
                        color: delta > 0 ? "var(--c-gold-bright)" : "var(--c-negative)",
                      }}
                    >
                      {currentDisplay}
                    </span>
                    <span
                      className="text-xs font-bold"
                      style={{
                        color: delta > 0 ? "var(--c-positive)" : "var(--c-negative)",
                      }}
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </span>
                  </div>
                </div>
                {/* Progress bar */}
                <div
                  className="mt-1 overflow-hidden"
                  style={{ height: "2px", background: "var(--c-elevated)", borderRadius: "1px" }}
                >
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${Math.min((newVal / 12) * 100, 100)}%`,
                      background: delta > 0 ? "var(--c-gold)" : "var(--c-negative)",
                      borderRadius: "1px",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Continue button */}
        {done && (
          <button
            onClick={onContinue}
            className="w-full py-3 font-bold text-sm uppercase tracking-widest transition-all duration-150 active:scale-95 cursor-pointer animate-fade-in-up"
            style={{
              background: "transparent",
              color: "var(--c-gold)",
              border: "1px solid var(--c-gold)",
              borderRadius: "4px",
            }}
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
