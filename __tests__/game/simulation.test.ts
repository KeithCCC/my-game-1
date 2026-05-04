import { createGameState, updateGame } from '../../src/game/simulation';

describe('simulation', () => {
  test('player movement is clamped inside the world', () => {
    const state = createGameState();
    state.player.position = { x: 20, y: 20 };
    updateGame(state, 1000, { moveX: -1, moveY: -1 });
    expect(state.player.position.x).toBeGreaterThanOrEqual(24);
    expect(state.player.position.y).toBeGreaterThanOrEqual(24);
  });

  test('run ends with a win at the configured duration', () => {
    const state = createGameState({ debug: true });
    state.elapsedMs = state.durationMs - 10;
    updateGame(state, 20, { moveX: 0, moveY: 0 });
    expect(state.status).toBe('won');
  });

  test('enemy contact can end the run', () => {
    const state = createGameState();
    state.player.hp = 1;
    state.enemies.push({
      id: 999,
      kind: 'pitchFix',
      frame: 0,
      label: '資料修正',
      position: { ...state.player.position },
      radius: 15,
      hp: 18,
      maxHp: 18,
      speed: 0,
      damage: 9,
      xp: 4,
      color: 0xffffff,
      hitCooldownMs: 0,
    });
    updateGame(state, 16, { moveX: 0, moveY: 0 });
    expect(state.status).toBe('lost');
  });
});
