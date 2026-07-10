import { create } from "zustand";
import type { GameState, Stats, StatDelta, EventChoice, BranchOption } from "@/types/game";
import { getRandomEvent } from "@/data/events";
import { BOARD_CELLS, TOTAL_CELLS } from "@/data/board";
import { BRANCH_1_OPTIONS, getBranch2Options } from "@/data/branchOptions";
import { CELL_EVENTS } from "@/data/cellEvents";

const INITIAL_STATS: Stats = {
  knowledge: 0,
  hospitality: 0,
  trust: 0,
  planning: 0,
  leadership: 0,
  money: 3,
  satisfaction: 3,
};

interface GameStore extends GameState {
  startGame: () => void;
  rollDice: () => void;
  completeMove: () => void;
  dismissEvent: () => void;
  selectChoice: (choice: EventChoice) => void;
  dismissStatReveal: () => void;
  resetGame: () => void;
  selectBranch: (option: BranchOption) => void;
  dismissRest: () => void;
}

function applyDelta(prev: Stats, delta: StatDelta): Stats {
  return {
    knowledge: Math.max(0, prev.knowledge + (delta.knowledge ?? 0)),
    hospitality: Math.max(0, prev.hospitality + (delta.hospitality ?? 0)),
    trust: Math.max(0, prev.trust + (delta.trust ?? 0)),
    planning: Math.max(0, prev.planning + (delta.planning ?? 0)),
    leadership: Math.max(0, prev.leadership + (delta.leadership ?? 0)),
    money: Math.max(0, prev.money + (delta.money ?? 0)),
    satisfaction: Math.max(0, prev.satisfaction + (delta.satisfaction ?? 0)),
  };
}

function hasDelta(delta: StatDelta | undefined): boolean {
  if (!delta) return false;
  return Object.values(delta).some((v) => v !== 0);
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: "start",
  position: 0,
  totalCells: TOTAL_CELLS,
  stats: { ...INITIAL_STATS },
  currentEvent: null,
  eventLog: [],
  diceValue: null,
  isRolling: false,
  isMoving: false,
  movePath: [],
  pendingPosition: 0,
  statsBefore: null,
  pendingDelta: null,
  careerPath: null,
  subPath: null,
  diceBonus: 0,
  branchOptions: null,
  branchTitle: "",

  startGame: () => {
    set({
      phase: "playing",
      position: 0,
      stats: { ...INITIAL_STATS },
      currentEvent: null,
      eventLog: [],
      diceValue: null,
      isRolling: false,
      isMoving: false,
      movePath: [],
      pendingPosition: 0,
      statsBefore: null,
      pendingDelta: null,
      careerPath: null,
      subPath: null,
      diceBonus: 0,
      branchOptions: null,
      branchTitle: "",
    });
  },

  rollDice: () => {
    const state = get();
    if (state.isRolling || state.isMoving || state.phase !== "playing") return;
    const bonus = state.diceBonus;
    set({ isRolling: true, diceBonus: 0 });

    setTimeout(() => {
      const roll = Math.ceil(Math.random() * 6);
      const total = Math.min(roll + bonus, 7);
      const current = get().position;
      const dest = Math.min(current + total, TOTAL_CELLS - 1);
      const path: number[] = [];
      for (let i = current + 1; i <= dest; i++) path.push(i);

      set({
        diceValue: total,
        isRolling: false,
        isMoving: true,
        movePath: path,
        pendingPosition: dest,
      });
    }, 1500);
  },

  completeMove: () => {
    const state = get();
    const dest = state.pendingPosition;
    const cell = BOARD_CELLS[dest];

    if (cell.isGoal) {
      set({
        position: dest,
        isMoving: false,
        movePath: [],
        phase: "result",
      });
      return;
    }

    if (cell.cellType === "branch") {
      const opts = cell.index === 10
        ? BRANCH_1_OPTIONS
        : getBranch2Options(state.careerPath ?? "patient_care");
      set({
        phase: "branch",
        branchOptions: opts,
        branchTitle: cell.index === 14 ? "キャリアの岐路" : "専門性を深める",
        position: dest,
        isMoving: false,
        movePath: [],
      });
      return;
    }

    if (cell.cellType === "rest") {
      set({
        phase: "rest",
        diceBonus: state.diceBonus + 1,
        position: dest,
        isMoving: false,
        movePath: [],
      });
      return;
    }

    // マス固有イベントを優先、なければステージランダムにフォールバック
    const event = CELL_EVENTS[dest] ?? getRandomEvent(cell.stage, state.careerPath);
    set({
      position: dest,
      isMoving: false,
      movePath: [],
      currentEvent: event,
      phase: "event",
      eventLog: event
        ? [...state.eventLog, { title: event.title, emoji: event.emoji }]
        : state.eventLog,
    });
  },

  dismissEvent: () => {
    const state = get();
    const event = state.currentEvent;
    if (!event || event.choices) return;

    const delta = event.delta ?? {};
    if (hasDelta(delta)) {
      set({
        statsBefore: { ...state.stats },
        pendingDelta: delta,
        currentEvent: null,
        phase: "stat_reveal",
      });
    } else {
      set({
        currentEvent: null,
        phase: "playing",
      });
    }
  },

  selectChoice: (choice: EventChoice) => {
    const state = get();
    if (!state.currentEvent) return;

    // stepBonus は移動に使わない。選択は能力値のみに影響する。
    const pos = state.position;
    const isGoal = pos >= TOTAL_CELLS - 1;
    const updatedLog = state.eventLog.map((log, i, arr) =>
      i === arr.length - 1 ? { ...log, choiceLabel: choice.label } : log
    );

    if (hasDelta(choice.delta)) {
      set({
        statsBefore: { ...state.stats },
        pendingDelta: choice.delta,
        currentEvent: null,
        eventLog: updatedLog,
        phase: "stat_reveal",
      });
    } else {
      set({
        currentEvent: null,
        eventLog: updatedLog,
        phase: isGoal ? "result" : "playing",
      });
    }
  },

  dismissStatReveal: () => {
    const state = get();
    if (!state.statsBefore || !state.pendingDelta) {
      set({ phase: "playing", statsBefore: null, pendingDelta: null });
      return;
    }
    const updated = applyDelta(state.statsBefore, state.pendingDelta);
    const isGoal = state.position >= TOTAL_CELLS - 1;
    set({
      stats: updated,
      statsBefore: null,
      pendingDelta: null,
      phase: isGoal ? "result" : "playing",
    });
  },

  selectBranch: (option: BranchOption) => {
    const state = get();
    const updatedCareerPath = option.path ?? state.careerPath;
    const updatedSubPath = option.subPath ?? state.subPath;
    if (hasDelta(option.delta)) {
      set({
        careerPath: updatedCareerPath,
        subPath: updatedSubPath,
        branchOptions: null,
        statsBefore: { ...state.stats },
        pendingDelta: option.delta,
        phase: "stat_reveal",
      });
    } else {
      set({
        careerPath: updatedCareerPath,
        subPath: updatedSubPath,
        branchOptions: null,
        phase: "playing",
      });
    }
  },

  dismissRest: () => {
    set({ phase: "playing" });
  },

  resetGame: () => {
    set({
      phase: "start",
      position: 0,
      stats: { ...INITIAL_STATS },
      currentEvent: null,
      eventLog: [],
      diceValue: null,
      isRolling: false,
      isMoving: false,
      movePath: [],
      pendingPosition: 0,
      statsBefore: null,
      pendingDelta: null,
      careerPath: null,
      subPath: null,
      diceBonus: 0,
      branchOptions: null,
      branchTitle: "",
    });
  },
}));
