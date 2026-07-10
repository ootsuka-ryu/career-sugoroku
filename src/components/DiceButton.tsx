"use client";
import { useEffect, useRef, useState } from "react";

interface Props {
  diceValue: number | null;
  isRolling: boolean;
  isMoving: boolean;
  disabled: boolean;
  onRoll: () => void;
  diceBonus?: number;
}

// 3×3 grid positions [row, col] for each face (0=top/left, 2=bottom/right)
const DOT_MAP: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 2], [1, 1], [2, 0]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

function DiceFace({ value, settling }: { value: number; settling: boolean }) {
  const dots = DOT_MAP[value] || DOT_MAP[1];

  return (
    <div
      className={settling ? "animate-dice-settle" : ""}
      style={{
        width: 88,
        height: 88,
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gridTemplateRows: "repeat(3, 1fr)",
        padding: 14,
        gap: 6,
        background: "var(--c-elevated)",
        border: "1px solid var(--c-border)",
        borderRadius: 10,
        boxShadow: settling
          ? "0 0 20px rgba(200,153,58,0.35), inset 0 1px 4px rgba(0,0,0,0.6)"
          : "inset 0 1px 4px rgba(0,0,0,0.6), 0 4px 14px rgba(0,0,0,0.5)",
        transition: "box-shadow 0.3s",
      }}
    >
      {[0, 1, 2].flatMap((row) =>
        [0, 1, 2].map((col) => {
          const active = dots.some(([r, c]) => r === row && c === col);
          return (
            <div
              key={`${row}-${col}`}
              style={{
                borderRadius: "50%",
                background: active ? "var(--c-gold-bright)" : "transparent",
                boxShadow: active ? "0 0 5px rgba(228,184,74,0.55)" : "none",
                transition: active ? "none" : "background 0.04s",
              }}
            />
          );
        })
      )}
    </div>
  );
}

export default function DiceButton({
  diceValue,
  isRolling,
  isMoving,
  disabled,
  onRoll,
  diceBonus = 0,
}: Props) {
  const [face, setFace] = useState<number>(diceValue ?? 1);
  const [settling, setSettling] = useState(false);
  const prevRolling = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Rolling START → begin cycling
    if (isRolling && !prevRolling.current) {
      // Deceleration schedule: (delay ms between faces)
      const delays = [
        50, 50, 55, 55, 60, 65, 70, 80, 90,
        105, 125, 150, 185, 230, 295,
      ];
      let i = 0;
      const step = () => {
        setFace(Math.ceil(Math.random() * 6));
        i++;
        if (i < delays.length) {
          timerRef.current = setTimeout(step, delays[i - 1]);
        }
      };
      step();
    }

    // Rolling END → snap to result + settle animation
    if (!isRolling && prevRolling.current && diceValue) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setFace(diceValue);
      setSettling(true);
      timerRef.current = setTimeout(() => setSettling(false), 500);
    }

    prevRolling.current = isRolling;
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isRolling, diceValue]);

  const isActive = !disabled && !isRolling && !isMoving;

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Dice face */}
      <div className="relative">
        {diceBonus > 0 && (
          <div
            style={{
              position: "absolute",
              top: -10,
              right: -14,
              background: "linear-gradient(135deg, #60c070, #3a9050)",
              color: "#fff",
              fontSize: 9,
              fontWeight: 900,
              padding: "2px 6px",
              borderRadius: 10,
              letterSpacing: "0.05em",
              zIndex: 2,
              boxShadow: "0 0 8px rgba(60,180,80,0.5)",
            }}
          >
            +{diceBonus} BONUS
          </div>
        )}
        <DiceFace value={face} settling={settling} />
        {isRolling && (
          <div
            className="absolute inset-0 rounded-[10px] pointer-events-none"
            style={{
              boxShadow: "0 0 0 1px var(--c-muted)",
              animation: "pulse-border 0.35s ease-in-out infinite alternate",
            }}
          />
        )}
      </div>

      {/* Roll result label */}
      <div style={{ minHeight: 18 }}>
        {diceValue && !isRolling && (
          <p className="text-xs tabular-nums text-center" style={{ color: "var(--c-muted)" }}>
            <span className="font-black text-base" style={{ color: "var(--c-gold)" }}>
              {diceValue}
            </span>{" "}
            マス進む
          </p>
        )}
        {isMoving && !isRolling && (
          <p className="text-xs" style={{ color: "var(--c-muted)" }}>
            Moving…
          </p>
        )}
      </div>

      {/* Roll button */}
      <button
        onClick={onRoll}
        disabled={!isActive}
        className="px-10 py-3 font-black text-sm uppercase tracking-widest transition-all duration-150 active:scale-95"
        style={{
          background: isActive
            ? "linear-gradient(135deg, var(--c-accent), #7060c8)"
            : "var(--c-elevated)",
          color: isActive ? "#fff" : "var(--c-muted)",
          border: isActive ? "none" : "1px solid var(--c-border)",
          borderRadius: 4,
          boxShadow: isActive ? "0 0 20px rgba(88,72,176,0.35)" : "none",
          cursor: isActive ? "pointer" : "not-allowed",
        }}
      >
        {isRolling ? "Rolling…" : isMoving ? "Moving…" : "Roll Dice"}
      </button>
    </div>
  );
}
