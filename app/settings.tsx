import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { appConfig } from '../src/data/config';
import { useGame } from '../src/state/GameContext';
import type { InputMode } from '../src/core';
import { getInputMode, setInputMode } from '../src/utils/settings';

export default function SettingsScreen() {
  const { state, dispatch } = useGame();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInputMode(appConfig.inputModeDefault).then((mode) => {
      dispatch({ type: 'SET_INPUT_MODE', mode });
      setLoading(false);
    });
  }, [dispatch]);

  const chooseMode = async (mode: InputMode) => {
    dispatch({ type: 'SET_INPUT_MODE', mode });
    await setInputMode(mode);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Input Mode</Text>
      <Text style={styles.sub}>Choose how blocks are removed.</Text>
      <Pressable
        style={[styles.option, state.inputMode === 'oneTap' && styles.optionActive]}
        onPress={() => chooseMode('oneTap')}
        disabled={loading}
      >
        <Text style={styles.optionTitle}>One Tap (Default)</Text>
        <Text style={styles.optionBody}>Tap valid group once to clear immediately.</Text>
      </Pressable>
      <Pressable
        style={[styles.option, state.inputMode === 'confirmTap' && styles.optionActive]}
        onPress={() => chooseMode('confirmTap')}
        disabled={loading}
      >
        <Text style={styles.optionTitle}>Highlight + Confirm</Text>
        <Text style={styles.optionBody}>First tap highlights, second tap confirms the same group.</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 12,
    backgroundColor: '#0A0F1C',
  },
  header: {
    color: '#F5F8FF',
    fontSize: 24,
    fontWeight: '800',
  },
  sub: {
    color: '#A6BADF',
    marginBottom: 6,
  },
  option: {
    backgroundColor: '#1A2740',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1A2740',
  },
  optionActive: {
    borderColor: '#3A86FF',
  },
  optionTitle: {
    color: '#F5F8FF',
    fontWeight: '700',
    marginBottom: 4,
  },
  optionBody: {
    color: '#C8D7F5',
  },
});
