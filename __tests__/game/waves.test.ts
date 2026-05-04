import { WAVE_TABLE } from '../../src/game/config';
import { createGameState, updateGame } from '../../src/game/simulation';
import { getWave, pickEnemyKind } from '../../src/game/waves';

describe('waves', () => {
  test('wave settings advance over time', () => {
    expect(getWave(0)).toBe(WAVE_TABLE[0]);
    expect(getWave(250_000)).toBe(WAVE_TABLE[WAVE_TABLE.length - 1]);
  });

  test('enemy kind is picked from the active wave', () => {
    const kind = pickEnemyKind(250_000, () => 0.99);
    expect(WAVE_TABLE[WAVE_TABLE.length - 1].kinds).toContain(kind);
  });

  test('spawns enemies according to the current wave', () => {
    const state = createGameState({ rng: () => 0.5 });
    updateGame(state, 16, { moveX: 0, moveY: 0 });
    expect(state.enemies.length).toBe(WAVE_TABLE[0].groupSize);
  });
});
