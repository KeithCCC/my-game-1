import type { AnimationPlan, Board, Group, InputMode, LevelConfig, Pos } from '../core';

export type GamePhase = 'idle' | 'animating' | 'cleared' | 'result';

export type ActiveAnimation = {
  kind: 'clearing' | 'moving';
  progress: number;
  plan: AnimationPlan;
};

export type GameState = {
  board: Board;
  sourceBoard: Board;
  score: number;
  level: LevelConfig;
  phase: GamePhase;
  selectedGroup: Group | null;
  inputMode: InputMode;
  animation: ActiveAnimation | null;
};

export type GameAction =
  | { type: 'SET_INPUT_MODE'; mode: InputMode }
  | { type: 'SET_SELECTED_GROUP'; group: Group | null }
  | { type: 'START_CLEAR_ANIMATION'; sourceBoard: Board; clearedBoard: Board; plan: AnimationPlan; scoreDelta: number }
  | { type: 'START_MOVE_ANIMATION'; board: Board; plan: AnimationPlan }
  | { type: 'TICK_ANIMATION'; progress: number }
  | { type: 'END_ANIMATION' }
  | { type: 'SET_PHASE'; phase: GamePhase }
  | { type: 'SET_SCORE'; score: number }
  | { type: 'SET_LEVEL'; level: LevelConfig; board: Board; inputMode: InputMode }
  | { type: 'SET_BOARD'; board: Board; sourceBoard?: Board };

export type CellTapPayload = Pos;
