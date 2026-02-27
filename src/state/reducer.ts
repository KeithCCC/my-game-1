import { generateBoard, type GameConfig, type LevelConfig, type InputMode } from '../core';
import type { GameAction, GameState } from './types';

export const createInitialState = (
  config: GameConfig,
  level: LevelConfig,
  inputMode: InputMode,
  seed = Date.now(),
): GameState => {
  const board = generateBoard(config, seed + level.id * 1000);
  return {
    board,
    sourceBoard: board,
    score: 0,
    level,
    phase: 'idle',
    selectedGroup: null,
    inputMode,
    animation: null,
  };
};

export const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'SET_INPUT_MODE':
      return {
        ...state,
        inputMode: action.mode,
      };
    case 'SET_SELECTED_GROUP':
      return {
        ...state,
        selectedGroup: action.group,
      };
    case 'START_CLEAR_ANIMATION':
      return {
        ...state,
        sourceBoard: action.sourceBoard,
        board: action.clearedBoard,
        score: state.score + action.scoreDelta,
        phase: 'animating',
        selectedGroup: null,
        animation: {
          kind: 'clearing',
          progress: 0,
          plan: action.plan,
        },
      };
    case 'START_MOVE_ANIMATION':
      return {
        ...state,
        sourceBoard: state.board,
        board: action.board,
        phase: 'animating',
        animation: {
          kind: 'moving',
          progress: 0,
          plan: action.plan,
        },
      };
    case 'TICK_ANIMATION':
      if (!state.animation) {
        return state;
      }
      return {
        ...state,
        animation: {
          ...state.animation,
          progress: action.progress,
        },
      };
    case 'END_ANIMATION':
      return {
        ...state,
        phase: 'cleared',
        animation: null,
      };
    case 'SET_PHASE':
      return {
        ...state,
        phase: action.phase,
      };
    case 'SET_SCORE':
      return {
        ...state,
        score: action.score,
      };
    case 'SET_LEVEL':
      return {
        ...state,
        board: action.board,
        sourceBoard: action.board,
        level: action.level,
        score: 0,
        phase: 'idle',
        selectedGroup: null,
        inputMode: action.inputMode,
        animation: null,
      };
    case 'SET_BOARD':
      return {
        ...state,
        board: action.board,
        sourceBoard: action.sourceBoard ?? state.sourceBoard,
      };
    default:
      return state;
  }
};
