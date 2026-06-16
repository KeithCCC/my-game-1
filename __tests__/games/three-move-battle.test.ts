import {
  applyBattleAction,
  createBattlePuzzleState,
  getBattleLevelCount,
  getValidBattleActions,
  undoBattleAction,
} from '../../src/games/three-move-battle';

describe('three move battle puzzle', () => {
  test('moves, attacks, uses skill, and clears within the move limit', () => {
    const state = createBattlePuzzleState(0);

    expect(getBattleLevelCount()).toBe(5);
    expect(getValidBattleActions(state).some((action) => action.kind === 'move')).toBe(true);
    expect(applyBattleAction(state, { kind: 'move', x: 1, y: 0 })).toBe(true);
    expect(applyBattleAction(state, { kind: 'attack', x: 2, y: 0 })).toBe(true);
    expect(applyBattleAction(state, { kind: 'skill', x: 4, y: 0 })).toBe(true);

    expect(state.status).toBe('clear');
    expect(state.enemies.every((enemy) => enemy.hp <= 0)).toBe(true);
  });

  test('undo restores previous battle state and invalid actions do not spend turns', () => {
    const state = createBattlePuzzleState(0);

    expect(applyBattleAction(state, { kind: 'move', x: 4, y: 4 })).toBe(false);
    expect(state.turnsUsed).toBe(0);

    applyBattleAction(state, { kind: 'move', x: 1, y: 0 });
    expect(undoBattleAction(state)).toBe(true);

    expect(state.player).toEqual({ x: 0, y: 0, hp: 3 });
    expect(state.turnsUsed).toBe(0);
    expect(state.status).toBe('playing');
  });
});
