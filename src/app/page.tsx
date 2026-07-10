"use client";
import { useGameStore } from "@/store/gameStore";
import { useEffect, useState, useRef } from "react";
import GameBoard from "@/components/GameBoard";
import StatsPanel from "@/components/StatsPanel";
import DiceButton from "@/components/DiceButton";
import EventCard from "@/components/EventCard";
import StatReveal from "@/components/StatReveal";
import ResultScreen from "@/components/ResultScreen";
import Character from "@/components/Character";
import BranchCard from "@/components/BranchCard";
import { BOARD_CELLS, getStageLabel, getStageAccentColor, getStageLabelShort } from "@/data/board";
import type { StageId } from "@/types/game";
import { playMoveTick, playLand, playDiceRoll, playEventReveal } from "@/sounds";

const STAGES: { id: StageId; from: number; to: number }[] = [
  { id: "selection",  from: 0,  to: 12 },
  { id: "offer",      from: 13, to: 24 },
  { id: "year1",      from: 25, to: 38 },
  { id: "year2",      from: 39, to: 51 },
  { id: "year3plus",  from: 52, to: 64 },
];

export default function Home() {
  const {
    phase,
    position,
    stats,
    currentEvent,
    eventLog,
    diceValue,
    isRolling,
    isMoving,
    movePath,
    statsBefore,
    pendingDelta,
    careerPath,
    diceBonus,
    branchOptions,
    branchTitle,
    startGame,
    rollDice,
    completeMove,
    dismissEvent,
    selectChoice,
    dismissStatReveal,
    resetGame,
    selectBranch,
    dismissRest,
  } = useGameStore();

  // Local display position for step animation
  const [displayPosition, setDisplayPosition] = useState(position);
  // Event card is delayed ~950ms after landing to build anticipation
  const [showEventCard, setShowEventCard] = useState(false);
  // Rest overlay
  const [showRestOverlay, setShowRestOverlay] = useState(false);
  const movePathRef = useRef<number[]>([]);
  const moveIndexRef = useRef(0);
  const prevIsRolling = useRef(false);

  // Sync display position when not animating
  useEffect(() => {
    if (!isMoving) {
      setDisplayPosition(position);
    }
  }, [isMoving, position]);

  // Play dice roll sound
  useEffect(() => {
    if (isRolling && !prevIsRolling.current) {
      playDiceRoll();
    }
    prevIsRolling.current = isRolling;
  }, [isRolling]);

  // Delay showing event card ~950ms after landing (builds anticipation)
  useEffect(() => {
    if (phase === "event" && currentEvent) {
      setShowEventCard(false);
      const timer = setTimeout(() => {
        setShowEventCard(true);
        playEventReveal();
      }, 950);
      return () => clearTimeout(timer);
    } else {
      setShowEventCard(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentEvent?.id]);

  // Rest phase: show overlay then auto-dismiss after 1.8s
  useEffect(() => {
    if (phase === "rest") {
      setShowRestOverlay(true);
      const timer = setTimeout(() => {
        setShowRestOverlay(false);
        dismissRest();
      }, 1800);
      return () => clearTimeout(timer);
    } else {
      setShowRestOverlay(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Step animation when isMoving starts
  useEffect(() => {
    if (!isMoving || movePath.length === 0) return;

    movePathRef.current = movePath;
    moveIndexRef.current = 0;

    const step = () => {
      const idx = moveIndexRef.current;
      const path = movePathRef.current;
      if (idx >= path.length) {
        // Animation done — play land sound, then trigger completeMove
        playLand();
        setTimeout(() => completeMove(), 120);
        return;
      }
      setDisplayPosition(path[idx]);
      playMoveTick(idx);
      moveIndexRef.current++;
      setTimeout(step, 200);
    };

    setTimeout(step, 0);
  // completeMove is stable (zustand), movePath changes each roll
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMoving]);

  if (phase === "result") {
    return <ResultScreen stats={stats} eventLog={eventLog} onReset={resetGame} />;
  }

  if (phase === "start") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ background: "var(--c-bg)" }}
      >
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-3">
            <p
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: "var(--c-muted)" }}
            >
              Career RPG
            </p>
            <h1
              className="text-3xl font-black leading-tight"
              style={{ color: "var(--c-text)" }}
            >
              薬剤師キャリア
              <br />
              <span style={{ color: "var(--c-gold-bright)" }}>すごろく</span>
            </h1>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--c-muted)" }}
            >
              選考会から入社3年目まで、<br />
              選択と挑戦であなただけのキャリアを切り拓け。
            </p>
          </div>

          <div
            className="p-4 space-y-3"
            style={{
              background: "var(--c-surface)",
              border: "1px solid var(--c-border)",
              borderRadius: "4px",
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--c-muted)" }}>
              How to Play
            </p>
            {[
              "サイコロを振ってマスを進む",
              "選択肢で自分らしい行動を選ぶ",
              "選択が能力値とマス数を変える",
              "8種のキャリアタイプに診断",
            ].map((text) => (
              <div key={text} className="flex items-center gap-2 text-sm" style={{ color: "var(--c-muted)" }}>
                <span
                  className="w-1 h-1 rounded-full shrink-0"
                  style={{ background: "var(--c-gold)" }}
                />
                <span>{text}</span>
              </div>
            ))}
          </div>

          <button
            onClick={startGame}
            className="w-full py-4 font-black text-base uppercase tracking-widest transition-all duration-150 active:scale-95 cursor-pointer"
            style={{
              background: "linear-gradient(135deg, var(--c-accent), #7060c8)",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              boxShadow: "0 0 24px rgba(88,72,176,0.4)",
            }}
          >
            Start Game
          </button>
        </div>
      </div>
    );
  }

  const currentCell = BOARD_CELLS[displayPosition];
  const progressPct = Math.round((displayPosition / (BOARD_CELLS.length - 1)) * 100);
  const currentStageId = STAGES.find((s) => displayPosition >= s.from && displayPosition <= s.to)?.id
    ?? "year3plus";

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#08080F", color: "var(--c-text)" }}
    >
      {/* ── BOARD (full-width, 16:9 ratio) ── */}
      <div style={{
        width: "100%",
        background: "linear-gradient(135deg, #1C1610 0%, #120E08 100%)",
        border: "none",
        borderBottom: "3px solid #5A4020",
        boxShadow: "0 6px 28px rgba(0,0,0,0.80)",
        position: "relative",
      }}>
        <GameBoard displayPosition={displayPosition} />

        {/* Floating HUD — top-right corner of board */}
        <div style={{
          position: "absolute",
          top: 8,
          right: 8,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          pointerEvents: "none",
        }}>
          {/* Stage badge */}
          <div style={{
            background: "rgba(8,8,20,0.88)",
            border: "1px solid rgba(255,220,60,0.35)",
            borderRadius: 6,
            padding: "4px 10px",
            fontSize: 11,
            fontWeight: 900,
            color: "var(--c-gold)",
            backdropFilter: "blur(4px)",
          }}>
            {getStageLabel(currentCell.stage)}
          </div>
          {careerPath && (
            <div style={{
              background: "rgba(8,8,20,0.88)",
              border: "1px solid rgba(88,72,176,0.5)",
              borderRadius: 6,
              padding: "3px 8px",
              fontSize: 10,
              fontWeight: 700,
              color: "var(--c-accent)",
            }}>
              {careerPath === "patient_care" ? "🏥 患者ケア型"
                : careerPath === "management" ? "📊 マネジメント型"
                : "💻 DX型"}
            </div>
          )}
        </div>

        {/* Progress bar at bottom of board */}
        <div style={{ height: 4, background: "rgba(0,0,0,0.5)" }}>
          <div
            style={{
              height: "100%",
              width: `${progressPct}%`,
              background: "linear-gradient(90deg, var(--c-gold), #FFB040)",
              transition: "width 300ms ease",
            }}
          />
        </div>
      </div>

      {/* ── CONTROLS BAR ── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 16px",
        background: "rgba(14,12,28,0.98)",
        borderBottom: "1px solid var(--c-border)",
        flexWrap: "wrap",
      }}>
        {/* Stage tabs */}
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {STAGES.map((s) => {
            const isActive = displayPosition >= s.from && displayPosition <= s.to;
            const isDone = displayPosition > s.to;
            const accent = getStageAccentColor(s.id);
            return (
              <div key={s.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: isActive ? "var(--c-gold)" : isDone ? accent : "var(--c-border)",
                }} />
                <span style={{
                  fontSize: 8, fontWeight: 700, letterSpacing: "0.04em",
                  color: isActive ? "var(--c-gold)" : isDone ? accent : "var(--c-border)",
                }}>
                  {getStageLabelShort(s.id)}
                </span>
              </div>
            );
          })}
        </div>

        <div style={{ flex: 1 }} />

        {/* Current cell name */}
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--c-text)" }}>
          {currentCell.isStart ? "🚩 START" : currentCell.isGoal ? "🏁 GOAL" : `マス${displayPosition} ${currentCell.hint}`}
        </span>

        {/* Dice result badge */}
        {diceValue && !isRolling && !isMoving && (
          <span style={{ fontSize: 12, fontWeight: 900, color: "var(--c-gold)" }}>
            🎲 {diceValue}
          </span>
        )}
      </div>

      <main style={{ display: "flex", gap: 12, padding: "10px 16px", flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* Character strip */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "8px 12px",
          background: "var(--c-surface)",
          border: "1px solid var(--c-border)",
          borderRadius: 6,
          flexShrink: 0,
        }}>
          <Character stats={stats} stage={currentCell.stage} size="sm" />
          <div>
            <p style={{ fontSize: 10, fontWeight: 900, color: "var(--c-text)", margin: 0 }}>
              {getStageLabel(currentCell.stage)}
            </p>
            <p style={{ fontSize: 9, color: "var(--c-muted)", margin: 0 }}>
              {displayPosition} / {BOARD_CELLS.length - 1} マス
            </p>
          </div>
        </div>

        {/* Dice */}
        <div style={{
          padding: "10px 14px",
          background: "var(--c-surface)",
          border: "1px solid var(--c-border)",
          borderRadius: 6,
          flexShrink: 0,
        }}>
          <DiceButton
            diceValue={diceValue}
            isRolling={isRolling}
            isMoving={isMoving}
            disabled={phase !== "playing"}
            onRoll={rollDice}
            diceBonus={diceBonus}
          />
        </div>

        {/* Stats panel */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <StatsPanel stats={stats} />
        </div>

        {/* Event log */}
        {eventLog.length > 0 && (
          <div style={{
            padding: "8px 12px",
            background: "var(--c-surface)",
            border: "1px solid var(--c-border)",
            borderRadius: 6,
            minWidth: 160,
            maxWidth: 220,
          }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "var(--c-muted)", marginBottom: 6, textTransform: "uppercase" }}>
              Recent Events
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {[...eventLog].reverse().slice(0, 3).map((e, i) => (
                <div key={i} style={{ display: "flex", gap: 4, fontSize: 10, color: "var(--c-muted)", alignItems: "flex-start" }}>
                  <span>{e.emoji}</span>
                  <span>{e.title}{e.choiceLabel && <span style={{ color: "var(--c-accent)" }}> → {e.choiceLabel}</span>}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Event card — delayed ~950ms after landing for dramatic effect */}
      {currentEvent && phase === "event" && showEventCard && (
        <EventCard
          event={currentEvent}
          onDismiss={dismissEvent}
          onChoose={selectChoice}
        />
      )}

      {/* Stat reveal overlay */}
      {phase === "stat_reveal" && statsBefore && pendingDelta && (
        <StatReveal
          statsBefore={statsBefore}
          pendingDelta={pendingDelta}
          onContinue={dismissStatReveal}
        />
      )}

      {/* Branch card overlay */}
      {phase === "branch" && branchOptions && (
        <BranchCard
          title={branchTitle}
          options={branchOptions}
          onSelect={selectBranch}
        />
      )}

      {/* Rest overlay */}
      {showRestOverlay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="animate-fade-in-up text-center p-8"
            style={{
              background: "var(--c-surface)",
              border: "1px solid rgba(60,180,80,0.5)",
              borderRadius: 10,
              boxShadow: "0 0 32px rgba(60,180,80,0.3)",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>★</div>
            <p className="text-lg font-black mb-2" style={{ color: "#60c070" }}>
              休憩マス
            </p>
            <p className="text-sm" style={{ color: "var(--c-muted)" }}>
              次のサイコロ <span style={{ color: "#60c070", fontWeight: 900 }}>+1</span> ボーナス！
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
