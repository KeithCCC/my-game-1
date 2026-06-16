import {
  createDroneGameState,
  createDroneWaveEvents,
  evaluateGameResult,
  getDroneSpec,
  getDroneLevelCount,
  placeDrone,
  applyDroneWaveEvent,
  removeDrone,
  resetDronePlanning,
  runDroneWave,
} from '../../src/games/drone-placement';

describe('drone placement puzzle', () => {
  test('places and removes drones while enforcing path and power limits', () => {
    const state = createDroneGameState(0);

    expect(getDroneLevelCount()).toBe(3);
    expect(placeDrone(state, 'heavy', 2, 2)).toBe(false);
    expect(placeDrone(state, 'light', 1, 1)).toBe(true);
    expect(placeDrone(state, 'heavy', 1, 3)).toBe(true);
    expect(placeDrone(state, 'heavy', 3, 1)).toBe(false);
    expect(state.powerUsed).toBe(3);

    expect(removeDrone(state, 1, 1)).toBe(true);
    expect(state.powerUsed).toBe(2);
  });

  test('resolves a winning and losing wave', () => {
    const winner = createDroneGameState(0);
    placeDrone(winner, 'heavy', 1, 1);
    placeDrone(winner, 'light', 3, 3);

    runDroneWave(winner);

    expect(winner.status).toBe('clear');
    expect(winner.enemiesDefeated).toBe(winner.enemyCount);

    const loser = createDroneGameState(0);
    runDroneWave(loser);

    expect(loser.status).toBe('failed');
  });

  test('does not clear until all enemies are spawned and no active enemies remain', () => {
    const state = createDroneGameState(0);
    state.spawnedEnemies = state.enemyCount;
    state.activeEnemies = [{ id: 1, hp: 1, pathIndex: 2 }];
    state.baseBreaches = 0;

    evaluateGameResult(state);

    expect(state.status).toBe('running');
    expect(state.resultMessage).toBe('');
  });

  test('fails immediately when any enemy reaches the base', () => {
    const state = createDroneGameState(0);
    state.spawnedEnemies = 1;
    state.activeEnemies = [];
    state.baseBreaches = 1;

    evaluateGameResult(state);

    expect(state.status).toBe('failed');
    expect(state.resultMessage).toBe('Enemy reached the base');
  });

  test('clears only when all spawned enemies have been stopped', () => {
    const state = createDroneGameState(0);
    state.spawnedEnemies = state.enemyCount;
    state.activeEnemies = [];
    state.baseBreaches = 0;

    evaluateGameResult(state);

    expect(state.status).toBe('clear');
    expect(state.resultMessage).toBe('All enemies stopped');
  });

  test('exposes drone stats and path endpoints for player feedback', () => {
    const state = createDroneGameState(0);

    expect(getDroneSpec('light')).toEqual({ cost: 1, range: 1, damage: 1 });
    expect(getDroneSpec('heavy')).toEqual({ cost: 2, range: 2, damage: 2 });
    expect(state.pathStart).toEqual({ x: 0, y: 2 });
    expect(state.base).toEqual({ x: 4, y: 2 });
  });

  test('creates replayable wave events that explain hits and clear results', () => {
    const state = createDroneGameState(0);
    placeDrone(state, 'heavy', 1, 1);
    placeDrone(state, 'light', 3, 3);

    const events = createDroneWaveEvents(state);

    expect(events[0]).toMatchObject({ type: 'spawn', enemyId: 1, hp: 3, pathIndex: 0 });
    expect(events.some((event) => event.type === 'hit' && event.enemyId === 1 && event.hpBefore > event.hpAfter)).toBe(true);
    expect(events.some((event) => event.type === 'stopped' && event.enemyId === 1)).toBe(true);
    expect(events.at(-1)).toMatchObject({ type: 'result', status: 'clear', message: 'All enemies stopped' });
  });

  test('applies wave events one by one so counters update during playback', () => {
    const state = createDroneGameState(0);
    placeDrone(state, 'heavy', 1, 1);
    const events = createDroneWaveEvents(state);
    const spawn = events.find((event) => event.type === 'spawn');
    const move = events.find((event) => event.type === 'move');

    expect(spawn).toBeDefined();
    expect(move).toBeDefined();
    if (!spawn || !move) {
      throw new Error('Expected spawn and move events');
    }
    applyDroneWaveEvent(state, spawn);

    expect(state.status).toBe('running');
    expect(state.spawnedEnemies).toBe(1);
    expect(state.activeEnemies).toEqual([{ id: 1, hp: 3, pathIndex: 0 }]);

    applyDroneWaveEvent(state, move);

    expect(state.activeEnemies[0].pathIndex).toBe(1);
  });

  test('creates breach events and failure result when an enemy reaches base', () => {
    const state = createDroneGameState(0);

    const events = createDroneWaveEvents(state);

    expect(events.some((event) => event.type === 'breach' && event.enemyId === 1)).toBe(true);
    expect(events.at(-1)).toMatchObject({ type: 'result', status: 'failed', message: 'Enemy reached the base' });
  });

  test('returns to planning after a result without removing placed drones', () => {
    const state = createDroneGameState(0);
    placeDrone(state, 'light', 1, 1);
    runDroneWave(state);

    expect(state.status).toBe('failed');
    resetDronePlanning(state);

    expect(state.status).toBe('planning');
    expect(state.drones).toEqual([{ type: 'light', x: 1, y: 1 }]);
    expect(state.powerUsed).toBe(1);
    expect(state.activeEnemies).toEqual([]);
    expect(state.spawnedEnemies).toBe(0);
    expect(state.baseBreaches).toBe(0);
  });
});
