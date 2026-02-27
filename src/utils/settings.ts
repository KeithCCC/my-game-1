import AsyncStorage from '@react-native-async-storage/async-storage';
import type { InputMode } from '../core';

const INPUT_MODE_KEY = 'game.inputMode';

export const getInputMode = async (fallback: InputMode): Promise<InputMode> => {
  const raw = await AsyncStorage.getItem(INPUT_MODE_KEY);
  if (raw === 'oneTap' || raw === 'confirmTap') {
    return raw;
  }
  return fallback;
};

export const setInputMode = async (mode: InputMode): Promise<void> => {
  await AsyncStorage.setItem(INPUT_MODE_KEY, mode);
};
