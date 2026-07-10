"use client";
import type { Stats } from "@/types/game";

interface Props {
  stats: Stats;
  prevStats?: Stats | null;
}

const STAT_DEFS: {
  key: keyof Stats;
  label: string;
  color: string;
}[] = [
  { key: "knowledge", label: "KNOWLEDGE", color: "#3a7090" },
  { key: "hospitality", label: "HOSPITALITY", color: "#903060" },
  { key: "trust", label: "TRUST", color: "#3a9060" },
  { key: "planning", label: "PLANNING", color: "#907a30" },
  { key: "leadership", label: "LEADERSHIP", color: "#c8993a" },
  { key: "money", label: "MONEY", color: "#3a6090" },
  { key: "satisfaction", label: "SATISFACTION", color: "#5848b0" },
];

const MAX = 12;

export default function StatsPanel({ stats, prevStats }: Props) {
  return (
    <div
      className="p-4 space-y-2"
      style={{
        background: "var(--c-surface)",
        border: "1px solid var(--c-border)",
        borderRadius: "4px",
      }}
    >
      <h2
        className="text-[10px] font-bold uppercase tracking-widest mb-3"
        style={{ color: "var(--c-muted)" }}
      >
        Status
      </h2>
      {STAT_DEFS.map(({ key, label, color }) => {
        const value = stats[key];
        const prev = prevStats?.[key];
        const changed = prev !== undefined && prev !== value;
        const pct = Math.min((value / MAX) * 100, 100);
        return (
          <div key={key} className="flex items-center gap-2">
            <span
              className="text-[9px] font-bold uppercase tracking-wider w-20 shrink-0"
              style={{ color: "var(--c-muted)" }}
            >
              {label}
            </span>
            <div
              className="flex-1 overflow-hidden"
              style={{
                height: "4px",
                background: "var(--c-elevated)",
                borderRadius: "2px",
              }}
            >
              <div
                className="h-full transition-all duration-700"
                style={{ width: `${pct}%`, background: color, borderRadius: "2px" }}
              />
            </div>
            <span
              className={`text-xs font-bold w-5 text-right tabular-nums ${changed ? "animate-value-flash" : ""}`}
              style={{ color: changed ? "var(--c-gold-bright)" : "var(--c-text)" }}
            >
              {value}
            </span>
          </div>
        );
      })}
    </div>
  );
}
