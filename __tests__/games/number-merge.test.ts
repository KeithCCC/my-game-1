import {
  canMoveNumberMerge,
  createNumberMergeState,
  moveNumberMerge,
} from '../../src/games/number-merge';

describe('number merge puzzle', () => {
  test('merges equal tiles once per move and adds score', () => {
    const state = createNumberMergeState({ seed: 1, skipInitialTiles: true });
    state.board = [
      [2, 2, 4, 4],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];

    expect(moveNumberMerge(state, 'left')).toBe(true);

    expect(state.board[0]).toEqual([4, 8, 2, 0]);
    expect(state.score).toBe(12);
  });

  test('detects clear and game over states', () => {
    const clear = createNumberMergeState({ skipInitialTiles: true });
    clear.board = [
      [64, 64, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];

    moveNumberMerge(clear, 'left');

    expect(clear.status).toBe('clear');

    const blocked = createNumberMergeState({ skipInitialTiles: true });
    blocked.board = [
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ];

    expect(canMoveNumberMerge(blocked)).toBe(false);
    expect(moveNumberMerge(blocked, 'left')).toBe(false);
    expect(blocked.status).toBe('gameOver');
  });
});
