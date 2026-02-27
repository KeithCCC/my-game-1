import configJson from '../../data/config.json';
import levelsJson from '../../data/levels.json';
import type { GameConfig, LevelConfig } from '../core';

type AppConfig = GameConfig & {
  palette: string[];
};

export const appConfig = configJson as AppConfig;
export const levels = levelsJson as LevelConfig[];

export const getLevelById = (id: number): LevelConfig | undefined =>
  levels.find((level) => level.id === id);
