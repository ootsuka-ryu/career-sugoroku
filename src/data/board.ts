import type { BoardCell, StageId, CellType } from "@/types/game";

const CELL_HINTS: Record<number, string> = {
  0:  "START",
  1:  "会社説明会",
  2:  "ES提出",
  3:  "書類通過",
  4:  "一次面接",
  5:  "GD参加",
  6:  "店舗見学",
  7:  "二次面接",
  8:  "最終面接",
  9:  "内定電話",
  10: "内定式",
  11: "内定承諾",
  12: "卒業旅行",
  13: "内定研修",
  14: "先輩訪問",
  15: "業界研修",
  16: "勉強会",
  17: "薬局見学",
  18: "国家試験",
  19: "合格発表",
  20: "入社準備",
  21: "引越し",
  22: "制服受取",
  23: "ロッカー整理",
  24: "入社前研修",
  25: "入社式",
  26: "OJT開始",
  27: "服薬指導",
  28: "OTC担当",
  29: "薬歴記録",
  30: "調剤実習",
  31: "レジ応対",
  32: "在宅同行",
  33: "地域連携",
  34: "棚卸作業",
  35: "先輩相談",
  36: "チーム会議",
  37: "患者感謝",
  38: "1年目修了",
  39: "後輩指導",
  40: "採用協力",
  41: "改善提案",
  42: "資格取得",
  43: "学会発表",
  44: "社内表彰",
  45: "プロジェクト",
  46: "エリア研修",
  47: "海外視察",
  48: "年次評価",
  49: "昇格打診",
  50: "専門薬剤師",
  51: "マネジメント",
  52: "店長候補",
  53: "店長就任",
  54: "スタッフ管理",
  55: "目標設定",
  56: "売上達成",
  57: "地域貢献",
  58: "表彰受賞",
  59: "本部異動",
  60: "新規事業",
  61: "全国PJ",
  62: "DX推進",
  63: "専門職就任",
  64: "GOAL",
};

const STAGE_RANGES: { stage: StageId; from: number; to: number }[] = [
  { stage: "selection",  from: 0,  to: 12 },
  { stage: "offer",      from: 13, to: 24 },
  { stage: "year1",      from: 25, to: 38 },
  { stage: "year2",      from: 39, to: 51 },
  { stage: "year3plus",  from: 52, to: 64 },
];

export const TOTAL_CELLS = 65;

const CELL_TYPE_MAP: Record<number, CellType> = {
  7:  "rest",
  10: "branch",
  15: "rest",
  32: "rest",
  33: "branch",
  42: "rest",
  50: "rest",
  52: "branch",
};

function getCellType(index: number): CellType {
  return CELL_TYPE_MAP[index] ?? "event";
}

export const BOARD_CELLS: (BoardCell & { hint: string })[] = Array.from(
  { length: TOTAL_CELLS },
  (_, i) => {
    if (i === 0)
      return { index: 0, stage: "selection" as StageId, isStart: true, hint: CELL_HINTS[0], cellType: "event" as CellType };
    if (i === TOTAL_CELLS - 1)
      return { index: i, stage: "year3plus" as StageId, isGoal: true, hint: CELL_HINTS[64], cellType: "event" as CellType };
    const entry = STAGE_RANGES.find((s) => i >= s.from && i <= s.to);
    return { index: i, stage: entry?.stage ?? ("year3plus" as StageId), hint: CELL_HINTS[i] ?? "", cellType: getCellType(i) };
  }
);

export function getStageLabel(stage: StageId): string {
  const m: Record<StageId, string> = {
    selection: "就活・選考編", offer: "内定者期間編",
    year1: "新入社員編", year2: "成長・挑戦編", year3plus: "店長・キャリア編",
  };
  return m[stage];
}

export function getStageLabelShort(stage: StageId): string {
  const m: Record<StageId, string> = {
    selection: "選考", offer: "内定",
    year1: "1年目", year2: "成長", year3plus: "店長〜",
  };
  return m[stage];
}

export function getStageAccentColor(stage: StageId): string {
  const m: Record<StageId, string> = {
    selection: "#5848b0", offer: "#3a6090",
    year1: "#3a9060", year2: "#907a30", year3plus: "#903a3a",
  };
  return m[stage];
}
