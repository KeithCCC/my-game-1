import { Link, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function ResultScreen() {
  const params = useLocalSearchParams<{
    score: string;
    target: string;
    levelId: string;
    win: string;
  }>();

  const score = Number(params.score || '0');
  const target = Number(params.target || '0');
  const levelId = Number(params.levelId || '1');
  const win = params.win === '1';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{win ? 'Stage Cleared' : 'No More Moves'}</Text>
      <Text style={styles.score}>Score {score}</Text>
      <Text style={styles.target}>Target {target}</Text>

      <View style={styles.actions}>
        <Link href={`/game/${levelId}`} style={styles.actionPrimary}>
          Retry
        </Link>
        <Link href={`/game/${levelId + 1}`} style={styles.actionSecondary}>
          Next Stage
        </Link>
        <Link href="/" style={styles.actionSecondary}>
          Title
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#0A0F1C',
  },
  title: {
    color: '#F7FAFF',
    fontSize: 32,
    fontWeight: '800',
  },
  score: {
    color: '#8EE3A5',
    fontSize: 26,
    marginTop: 16,
    fontWeight: '700',
  },
  target: {
    color: '#A6BADF',
    marginTop: 8,
  },
  actions: {
    marginTop: 24,
    width: '100%',
    gap: 10,
  },
  actionPrimary: {
    textAlign: 'center',
    borderRadius: 10,
    backgroundColor: '#3A86FF',
    color: '#F7FAFF',
    paddingVertical: 12,
    fontWeight: '700',
  },
  actionSecondary: {
    textAlign: 'center',
    borderRadius: 10,
    backgroundColor: '#20314B',
    color: '#DDE8FF',
    paddingVertical: 12,
    fontWeight: '700',
  },
});
