import { createGameState } from '../../src/game/simulation';

describe('progression', () => {
  test('level-up choices are unique and valid', () => {
    const values = [0.1, 0.2, 0.3, 0.4, 0.5];
    const state = createGameState({ rng: () => values.shift() ?? 0.9 });
    state.xp = state.xpToNext;

    const { updateGame } = require('../../src/game/simulation') as typeof import('../../src/game/simulation');
    updateGame(state, 16, { moveX: 0, moveY: 0 });

    const ids = state.pendingChoices.map((choice) => choice.id);
    expect(state.status).toBe('levelUp');
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
    expect(state.pendingChoices.every((choice) => choice.nextLevel >= 1)).toBe(true);
  });
});
