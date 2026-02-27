export type ColorId = number;

export type Cell = {
  id: string;
  color: ColorId;
} | null;

export type Pos = {
  row: number;
  col: number;
};

export type Board = {
  rows: number;
  cols: number;
  cells: Cell[];
};

export type Group = {
  color: ColorId;
  positions: Pos[];
};

export type ScoringConfig = {
  baseMultiplier: number;
  bonusPerRemovedRemainder: number;
  minGroupSize: number;
};

export type AnimationConfig = {
  clearMs: number;
  moveMs: number;
};

export type InputMode = 'oneTap' | 'confirmTap';

export type GameConfig = {
  rows: number;
  cols: number;
  colorCount: number;
  scoring: ScoringConfig;
  animation: AnimationConfig;
  inputModeDefault: InputMode;
  boardRegenerateLimit: number;
};

export type LevelConfig = {
  id: number;
  name: string;
  targetScore: number;
  paletteSeed?: number;
};

export type FallMove = {
  id: string;
  fromRow: number;
  toRow: number;
  col: number;
};

export type ShiftMove = {
  id: string;
  fromCol: number;
  toCol: number;
  row: number;
};

export type AnimationPlan = {
  clearedIds: string[];
  falls: FallMove[];
  shifts: ShiftMove[];
};

export type StepAfterClearResult = {
  board: Board;
  clearedBoard: Board;
  animationsPlan: AnimationPlan;
  clearedCount: number;
};
