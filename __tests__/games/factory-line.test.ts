import {
  checkFactoryLineClear,
  createFactoryLineState,
  getFactoryLevelCount,
  placeFactoryTile,
  rotateFactoryTile,
  traceFactoryFlow,
} from '../../src/games/factory-line';

describe('factory line connection puzzle', () => {
  test('places, rotates, and traces line tiles through required machines', () => {
    const state = createFactoryLineState(0);

    expect(getFactoryLevelCount()).toBe(3);
    expect(placeFactoryTile(state, 'straight', 1, 0, 1)).toBe(true);
    expect(placeFactoryTile(state, 'elbow', 2, 0, 1)).toBe(true);
    expect(placeFactoryTile(state, 'straight', 2, 1, 0)).toBe(true);

    expect(checkFactoryLineClear(state)).toBe(true);
    expect(traceFactoryFlow(state).machinesReached).toContain('m1');

    rotateFactoryTile(state, 1, 0);

    expect(checkFactoryLineClear(state)).toBe(false);
  });

  test('rejects placement on fixed cells or when inventory is empty', () => {
    const state = createFactoryLineState(0);

    expect(placeFactoryTile(state, 'straight', 0, 0, 1)).toBe(false);
    expect(placeFactoryTile(state, 'cross', 1, 1, 0)).toBe(false);
  });
});
