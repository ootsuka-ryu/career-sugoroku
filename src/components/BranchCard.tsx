"use client";
import type { BranchOption } from "@/types/game";

interface Props {
  title: string;
  options: BranchOption[];
  onSelect: (option: BranchOption) => void;
}

export default function BranchCard({ title, options, onSelect }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="w-full max-w-lg animate-fade-in-up"
        style={{
          background: "var(--c-surface)",
          border: "1px solid var(--c-border)",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 18px 12px",
            background: "linear-gradient(135deg, rgba(88,72,176,0.3), rgba(112,96,200,0.15))",
            borderBottom: "1px solid var(--c-border)",
          }}
        >
          <p
            className="text-[10px] font-black uppercase tracking-widest mb-1"
            style={{ color: "var(--c-accent)" }}
          >
            🔀 Career Branch
          </p>
          <h2
            className="text-xl font-black leading-tight"
            style={{ color: "var(--c-text)" }}
          >
            {title}
          </h2>
          <p className="text-xs mt-1" style={{ color: "var(--c-muted)" }}>
            この選択があなたのこれからを変える。直感で選べ。
          </p>
        </div>

        {/* Options */}
        <div className="p-4 space-y-3">
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => onSelect(option)}
              className="w-full text-left transition-all duration-150 active:scale-[0.98] cursor-pointer"
              style={{
                background: "var(--c-elevated)",
                border: "1px solid var(--c-border)",
                borderRadius: 6,
                padding: "14px 16px",
                display: "flex",
                gap: 14,
                alignItems: "flex-start",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--c-accent)";
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(88,72,176,0.12)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--c-border)";
                (e.currentTarget as HTMLButtonElement).style.background = "var(--c-elevated)";
              }}
            >
              <span style={{ fontSize: 36, lineHeight: 1, flexShrink: 0 }}>
                {option.emoji}
              </span>
              <div>
                <p
                  className="text-sm font-black mb-1"
                  style={{ color: "var(--c-text)" }}
                >
                  {option.label}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--c-muted)" }}>
                  {option.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
