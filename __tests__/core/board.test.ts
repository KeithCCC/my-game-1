import {
  applyGravity,
  applyShiftLeft,
  calcScore,
  findGroups,
  generateBoard,
  hasAnyMove,
  pickGroup,
  stepAfterClear,
  type Board,
  type GameConfig,
} from '../../src/core';

const createBoardFromColors = (matrix: number[][]): Board => {
  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 0;
  const cells = matrix.flatMap((line, row) =>
    line.map((color, col) =>
      color < 0
        ? null
        : {
            id: `${row}-${col}`,
            color,
          },
    ),
  );
  return { rows, cols, cells };
};

describe('core board logic', () => {
  it('findGroups returns only groups >= 2', () => {
    const board = createBoardFromColors([
      [0, 0, 1],
      [2, 1, 1],
      [3, 4, 5],
    ]);

    const groups = findGroups(board, 2);
    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.positions.length).sort((a, b) => a - b)).toEqual([2, 3]);
  });

  it('pickGroup ignores single cell', () => {
    const board = createBoardFromColors([
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
    ]);
    expect(pickGroup(board, { row: 0, col: 0 }, 2)).toBeNull();
  });

  it('gravity drops cells while preserving vertical order', () => {
    const board = createBoardFromColors([
      [0, -1],
      [1, -1],
      [-1, 2],
    ]);

    const moved = applyGravity(board);
    const colors = moved.board.cells.map((c) => (c ? c.color : -1));
    expect(colors).toEqual([-1, -1, 0, -1, 1, 2]);
    expect(moved.falls.length).toBeGreaterThan(0);
  });

  it('shiftLeft compacts non-empty columns', () => {
    const board = createBoardFromColors([
      [0, -1, 1],
      [2, -1, 3],
      [-1, -1, 4],
    ]);

    const moved = applyShiftLeft(board);
    const colors = moved.board.cells.map((c) => (c ? c.color : -1));
    expect(colors).toEqual([0, 1, -1, 2, 3, -1, -1, 4, -1]);
    expect(moved.shifts.length).toBeGreaterThan(0);
  });

  it('stepAfterClear returns board and animation plan', () => {
    const board = createBoardFromColors([
      [0, 0, 1],
      [2, 1, 1],
      [3, 4, 5],
    ]);
    const group = pickGroup(board, { row: 0, col: 0 }, 2);
    expect(group).not.toBeNull();

    const result = stepAfterClear(board, group!);
    expect(result.clearedCount).toBe(2);
    expect(result.animationsPlan.clearedIds.length).toBe(2);
    expect(result.board.cells.some((c) => c === null)).toBe(true);
  });

  it('calcScore uses n*n*multiplier', () => {
    const score = calcScore(5, {
      baseMultiplier: 12,
      bonusPerRemovedRemainder: 5,
      minGroupSize: 2,
    });
    expect(score).toBe(300);
  });

  it('hasAnyMove can detect board without move', () => {
    const noMove = createBoardFromColors([
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
    ]);
    const withMove = createBoardFromColors([
      [0, 1, 2],
      [3, 4, 4],
      [6, 7, 8],
    ]);

    expect(hasAnyMove(noMove)).toBe(false);
    expect(hasAnyMove(withMove)).toBe(true);
  });

  it('generateBoard is seed reproducible and starts with available move', () => {
    const config: GameConfig = {
      rows: 10,
      cols: 10,
      colorCount: 5,
      boardRegenerateLimit: 30,
      inputModeDefault: 'oneTap',
      scoring: {
        baseMultiplier: 10,
        bonusPerRemovedRemainder: 5,
        minGroupSize: 2,
      },
      animation: {
        clearMs: 200,
        moveMs: 260,
      },
    };

    const a = generateBoard(config, 777);
    const b = generateBoard(config, 777);
    expect(a.cells.map((c) => c?.color ?? -1)).toEqual(b.cells.map((c) => c?.color ?? -1));
    expect(hasAnyMove(a)).toBe(true);
  });
});
