export type StageId =
  | "selection"
  | "offer"
  | "year1"
  | "year2"
  | "year3plus";

export type CareerTypeId =
  | "store_manager"
  | "home_specialist"
  | "otc_consultant"
  | "recruitment"
  | "educator"
  | "community"
  | "new_business"
  | "dx_specialist";

export interface Stats {
  knowledge: number;
  hospitality: number;
  trust: number;
  planning: number;
  leadership: number;
  money: number;
  satisfaction: number;
}

export interface StatDelta {
  knowledge?: number;
  hospitality?: number;
  trust?: number;
  planning?: number;
  leadership?: number;
  money?: number;
  satisfaction?: number;
}

export interface EventChoice {
  id: string;
  label: string;
  description: string;
  delta: StatDelta;
  stepBonus: number;
  emoji: string;
}

export interface GameEvent {
  id: string;
  stage: StageId;
  title: string;
  description: string;
  emoji: string;
  choices?: EventChoice[];
  delta?: StatDelta;
  preferredPaths?: CareerPath[];
}

export interface BoardCell {
  index: number;
  stage: StageId;
  isGoal?: boolean;
  isStart?: boolean;
  cellType: CellType;
}

export interface CareerType {
  id: CareerTypeId;
  name: string;
  description: string;
  emoji: string;
  color: string;
  weights: Partial<Record<keyof Stats, number>>;
}

export type CellType = "event" | "branch" | "rest";

export type CareerPath = "patient_care" | "management" | "dx";

export type SubPath =
  | "home_specialist" | "otc_pro" | "educator"
  | "store_manager" | "recruitment_pro" | "community"
  | "systems" | "data_analysis" | "new_business";

export interface BranchOption {
  id: string;
  label: string;
  description: string;
  emoji: string;
  delta: StatDelta;
  path?: CareerPath;
  subPath?: SubPath;
}

export type GamePhase = "start" | "playing" | "event" | "branch" | "rest" | "stat_reveal" | "result";

export interface GameState {
  phase: GamePhase;
  position: number;
  totalCells: number;
  stats: Stats;
  currentEvent: GameEvent | null;
  eventLog: { title: string; emoji: string; choiceLabel?: string }[];
  diceValue: number | null;
  isRolling: boolean;
  isMoving: boolean;
  movePath: number[];
  pendingPosition: number;
  statsBefore: Stats | null;
  pendingDelta: StatDelta | null;
  careerPath: CareerPath | null;
  subPath: SubPath | null;
  diceBonus: number;
  branchOptions: BranchOption[] | null;
  branchTitle: string;
}
