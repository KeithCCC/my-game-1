import { createContext, useContext, useMemo, useReducer } from 'react';
import type { Dispatch, ReactNode } from 'react';
import { appConfig, getLevelById } from '../data/config';
import { createInitialState, gameReducer } from './reducer';
import type { GameAction, GameState } from './types';

type GameContextValue = {
  state: GameState;
  dispatch: Dispatch<GameAction>;
};

const defaultLevel = getLevelById(1);
if (!defaultLevel) {
  throw new Error('Missing level 1 in data/levels.json');
}

const GameContext = createContext<GameContextValue | null>(null);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(
    gameReducer,
    createInitialState(appConfig, defaultLevel, appConfig.inputModeDefault),
  );

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = (): GameContextValue => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
};
