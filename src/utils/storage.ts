import AsyncStorage from '@react-native-async-storage/async-storage';

const HIGH_SCORE_KEY = 'game.highScore';
const UNLOCKED_LEVEL_KEY = 'game.unlockedLevel';

export const getHighScore = async (): Promise<number> => {
  const raw = await AsyncStorage.getItem(HIGH_SCORE_KEY);
  return raw ? Number.parseInt(raw, 10) || 0 : 0;
};

export const setHighScore = async (score: number): Promise<void> => {
  await AsyncStorage.setItem(HIGH_SCORE_KEY, String(score));
};

export const getUnlockedLevel = async (): Promise<number> => {
  const raw = await AsyncStorage.getItem(UNLOCKED_LEVEL_KEY);
  return raw ? Number.parseInt(raw, 10) || 1 : 1;
};

export const setUnlockedLevel = async (level: number): Promise<void> => {
  await AsyncStorage.setItem(UNLOCKED_LEVEL_KEY, String(level));
};
