import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { levels } from '../src/data/config';
import { getUnlockedLevel } from '../src/utils/storage';

export default function StageSelectScreen() {
  const [unlockedLevel, setUnlockedLevel] = useState(1);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getUnlockedLevel().then((v) => {
        if (active) {
          setUnlockedLevel(v);
        }
      });
      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={levels}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const locked = item.id > unlockedLevel;
          return (
            <View style={[styles.card, locked && styles.cardLocked]}>
              <View>
                <Text style={styles.levelName}>{item.name}</Text>
                <Text style={styles.levelMeta}>Target {item.targetScore}</Text>
              </View>
              {locked ? (
                <Text style={styles.lockedText}>Locked</Text>
              ) : (
                <Link href={`/game/${item.id}`} style={styles.playLink}>
                  Play
                </Link>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0F1C',
  },
  list: {
    padding: 16,
    gap: 10,
  },
  card: {
    backgroundColor: '#1A2740',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLocked: {
    opacity: 0.6,
  },
  levelName: {
    color: '#F5F8FF',
    fontSize: 18,
    fontWeight: '700',
  },
  levelMeta: {
    color: '#A6BADF',
    marginTop: 4,
  },
  playLink: {
    backgroundColor: '#3A86FF',
    color: 'white',
    borderRadius: 10,
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontWeight: '700',
  },
  lockedText: {
    color: '#C2CCE2',
    fontWeight: '700',
  },
});
