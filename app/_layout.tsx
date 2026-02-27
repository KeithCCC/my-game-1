import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GameProvider } from '../src/state/GameContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GameProvider>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#152238' },
            headerTintColor: '#F6F7FB',
            contentStyle: { backgroundColor: '#0A0F1C' },
          }}
        >
          <Stack.Screen name="index" options={{ title: 'Chromatic Clusters' }} />
          <Stack.Screen name="stages" options={{ title: 'Stages' }} />
          <Stack.Screen name="game/[levelId]" options={{ title: 'Play' }} />
          <Stack.Screen name="result" options={{ title: 'Result' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        </Stack>
      </GameProvider>
    </SafeAreaProvider>
  );
}
