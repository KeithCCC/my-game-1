import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  calcClearBonus,
  calcScore,
  countRemaining,
  generateBoard,
  hasAnyMove,
  pickGroup,
  stepAfterClear,
  type Group,
  type Pos,
} from '../../src/core';
import { BoardCanvasSkia } from '../../src/components/BoardCanvasSkia';
import { appConfig, getLevelById } from '../../src/data/config';
import { useGame } from '../../src/state/GameContext';
import { getHighScore, setHighScore, setUnlockedLevel } from '../../src/utils/storage';

const sameGroup = (a: Group | null, b: Group | null): boolean => {
  if (!a || !b || a.positions.length !== b.positions.length) {
    return false;
  }
  const set = new Set(a.positions.map((p) => `${p.row},${p.col}`));
  return b.positions.every((p) => set.has(`${p.row},${p.col}`));
};

const runAnimation = async (
  durationMs: number,
  onFrame: (progress: number) => void,
): Promise<void> => {
  const start = Date.now();
  await new Promise<void>((resolve) => {
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(1, elapsed / durationMs);
      onFrame(progress);
      if (progress >= 1) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
};

export default function GameScreen() {
  const { levelId } = useLocalSearchParams<{ levelId: string }>();
  const router = useRouter();
  const { state, dispatch } = useGame();
  const [highScore, setHighScoreState] = useState(0);
  const runningRef = useRef(false);

  const level = useMemo(() => getLevelById(Number(levelId)) ?? getLevelById(1), [levelId]);

  useEffect(() => {
    if (!level) {
      return;
    }
    const board = generateBoard(appConfig, Date.now() + level.id * 1000);
    dispatch({ type: 'SET_LEVEL', level, board, inputMode: state.inputMode });
  }, [dispatch, level, state.inputMode]);

  useEffect(() => {
    let active = true;
    getHighScore().then((value) => {
      if (active) {
        setHighScoreState(value);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const finishTurn = useCallback(
    async (nextBoardScore: number, nextBoardHasMove: boolean, remainder: number) => {
      const maxCells = appConfig.rows * appConfig.cols;
      let finalScore = nextBoardScore;
      if (!nextBoardHasMove) {
        finalScore += calcClearBonus(remainder, maxCells, appConfig.scoring);
        dispatch({ type: 'SET_SCORE', score: finalScore });
      }

      const achieved = finalScore >= state.level.targetScore;
      if (finalScore > highScore) {
        setHighScoreState(finalScore);
        await setHighScore(finalScore);
      }

      if (achieved) {
        await setUnlockedLevel(state.level.id + 1);
      }

      if (!nextBoardHasMove || achieved) {
        dispatch({ type: 'SET_PHASE', phase: 'result' });
        router.push({
          pathname: '/result',
          params: {
            score: String(finalScore),
            target: String(state.level.targetScore),
            levelId: String(state.level.id),
            win: achieved ? '1' : '0',
          },
        });
      } else {
        dispatch({ type: 'SET_PHASE', phase: 'idle' });
      }
    },
    [dispatch, highScore, router, state.level.id, state.level.targetScore],
  );

  const executeGroup = useCallback(
    async (group: Group) => {
      if (runningRef.current || state.phase !== 'idle') {
        return;
      }
      runningRef.current = true;
      const next = stepAfterClear(state.board, group);
      const delta = calcScore(next.clearedCount, appConfig.scoring);
      const projectedScore = state.score + delta;

      dispatch({
        type: 'START_CLEAR_ANIMATION',
        sourceBoard: state.board,
        clearedBoard: next.clearedBoard,
        plan: next.animationsPlan,
        scoreDelta: delta,
      });

      await runAnimation(appConfig.animation.clearMs, (p) => {
        dispatch({ type: 'TICK_ANIMATION', progress: p });
      });

      dispatch({ type: 'START_MOVE_ANIMATION', board: next.board, plan: next.animationsPlan });
      await runAnimation(appConfig.animation.moveMs, (p) => {
        dispatch({ type: 'TICK_ANIMATION', progress: p });
      });

      dispatch({ type: 'END_ANIMATION' });
      const remainder = countRemaining(next.board);
      await finishTurn(projectedScore, hasAnyMove(next.board), remainder);
      runningRef.current = false;
    },
    [dispatch, finishTurn, state.board, state.phase, state.score],
  );

  const onTapCell = useCallback(
    async (pos: Pos) => {
      if (state.phase !== 'idle') {
        return;
      }
      const group = pickGroup(state.board, pos, appConfig.scoring.minGroupSize);
      if (!group) {
        if (state.selectedGroup) {
          dispatch({ type: 'SET_SELECTED_GROUP', group: null });
        }
        return;
      }

      if (state.inputMode === 'oneTap') {
        await executeGroup(group);
        return;
      }

      if (sameGroup(state.selectedGroup, group)) {
        await executeGroup(group);
      } else {
        dispatch({ type: 'SET_SELECTED_GROUP', group });
      }
    },
    [dispatch, executeGroup, state.board, state.inputMode, state.phase, state.selectedGroup],
  );

  if (!level) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Level not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Level {state.level.id}</Text>
        <Text style={styles.headerText}>Score {state.score}</Text>
        <Text style={styles.headerText}>Target {state.level.targetScore}</Text>
      </View>

      <BoardCanvasSkia
        board={state.board}
        sourceBoard={state.sourceBoard}
        palette={appConfig.palette}
        selectedGroup={state.selectedGroup}
        animation={state.animation}
        onTapCell={onTapCell}
      />

      <View style={styles.footer}>
        <Pressable
          style={styles.footerButton}
          onPress={() => {
            const board = generateBoard(appConfig, Date.now() + state.level.id * 3000);
            dispatch({ type: 'SET_LEVEL', level: state.level, board, inputMode: state.inputMode });
          }}
        >
          <Text style={styles.footerText}>Restart</Text>
        </Pressable>
        <Pressable style={styles.footerButtonSecondary} onPress={() => router.back()}>
          <Text style={styles.footerText}>Back</Text>
        </Pressable>
      </View>

      <Text style={styles.subInfo}>Best Score {highScore}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0F1C',
    padding: 16,
    gap: 14,
  },
  header: {
    backgroundColor: '#1A2740',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerText: {
    color: '#F5F8FF',
    fontWeight: '700',
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
  },
  footerButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#3A86FF',
    paddingVertical: 12,
    alignItems: 'center',
  },
  footerButtonSecondary: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#22314E',
    paddingVertical: 12,
    alignItems: 'center',
  },
  footerText: {
    color: '#F5F8FF',
    fontWeight: '700',
  },
  subInfo: {
    color: '#A8BDE2',
    textAlign: 'center',
  },
  error: {
    color: '#F5F8FF',
  },
});
