import {
  computePipeFlow,
  createPipePuzzleState,
  getPipePuzzleLevelCount,
  isPipePuzzleClear,
  rotatePipeTile,
} from '../../src/games/rotating-pipe';

describe('rotating pipe puzzle', () => {
  test('rotates pipes and computes water flow to outlets', () => {
    const state = createPipePuzzleState(0);

    expect(getPipePuzzleLevelCount()).toBe(5);
    expect(isPipePuzzleClear(state)).toBe(false);
    expect(rotatePipeTile(state, 1, 0)).toBe(true);
    expect(rotatePipeTile(state, 2, 0)).toBe(true);

    const flow = computePipeFlow(state);

    expect(flow.reachedOutlets).toEqual(['o1']);
    expect(isPipePuzzleClear(state)).toBe(true);
  });

  test('does not rotate source, outlet, or blocked cells', () => {
    const state = createPipePuzzleState(0);

    expect(rotatePipeTile(state, 0, 0)).toBe(false);
    expect(rotatePipeTile(state, 3, 0)).toBe(false);
    expect(rotatePipeTile(state, 4, 4)).toBe(false);
  });
});
