import {
  type AnimationPlan,
  type Board,
  type Cell,
  type GameConfig,
  type Group,
  type Pos,
  type ScoringConfig,
  type StepAfterClearResult,
} from './types';
import { mulberry32 } from './random';

export const toIndex = (board: Board, row: number, col: number): number => row * board.cols + col;

export const isInside = (board: Board, row: number, col: number): boolean =>
  row >= 0 && row < board.rows && col >= 0 && col < board.cols;

export const cloneBoard = (board: Board): Board => ({
  rows: board.rows,
  cols: board.cols,
  cells: [...board.cells],
});

export const getCell = (board: Board, row: number, col: number): Cell => {
  if (!isInside(board, row, col)) {
    return null;
  }
  return board.cells[toIndex(board, row, col)];
};

export const createEmptyBoard = (rows: number, cols: number): Board => ({
  rows,
  cols,
  cells: new Array(rows * cols).fill(null),
});

const neighbors = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
];

const serializePos = (pos: Pos): string => `${pos.row},${pos.col}`;

const findConnected = (board: Board, start: Pos, visited: Set<string>): Group | null => {
  const startCell = getCell(board, start.row, start.col);
  if (!startCell) {
    return null;
  }

  const key = serializePos(start);
  if (visited.has(key)) {
    return null;
  }

  const stack: Pos[] = [start];
  const positions: Pos[] = [];
  visited.add(key);

  while (stack.length > 0) {
    const current = stack.pop() as Pos;
    const currentCell = getCell(board, current.row, current.col);
    if (!currentCell || currentCell.color !== startCell.color) {
      continue;
    }

    positions.push(current);

    for (const d of neighbors) {
      const nr = current.row + d.row;
      const nc = current.col + d.col;
      if (!isInside(board, nr, nc)) {
        continue;
      }
      const nPos = { row: nr, col: nc };
      const nKey = serializePos(nPos);
      if (visited.has(nKey)) {
        continue;
      }
      const nCell = getCell(board, nr, nc);
      if (nCell && nCell.color === startCell.color) {
        visited.add(nKey);
        stack.push(nPos);
      }
    }
  }

  return {
    color: startCell.color,
    positions,
  };
};

export const findGroups = (board: Board, minSize = 2): Group[] => {
  const visited = new Set<string>();
  const groups: Group[] = [];

  for (let row = 0; row < board.rows; row += 1) {
    for (let col = 0; col < board.cols; col += 1) {
      const cell = getCell(board, row, col);
      if (!cell) {
        continue;
      }
      const group = findConnected(board, { row, col }, visited);
      if (group && group.positions.length >= minSize) {
        groups.push(group);
      }
    }
  }

  return groups;
};

export const pickGroup = (board: Board, pos: Pos, minSize = 2): Group | null => {
  if (!isInside(board, pos.row, pos.col)) {
    return null;
  }
  const visited = new Set<string>();
  const group = findConnected(board, pos, visited);
  if (!group || group.positions.length < minSize) {
    return null;
  }
  return group;
};

export const hasAnyMove = (board: Board): boolean => {
  for (let row = 0; row < board.rows; row += 1) {
    for (let col = 0; col < board.cols; col += 1) {
      const cell = getCell(board, row, col);
      if (!cell) {
        continue;
      }
      const right = getCell(board, row, col + 1);
      const down = getCell(board, row + 1, col);
      if ((right && right.color === cell.color) || (down && down.color === cell.color)) {
        return true;
      }
    }
  }
  return false;
};

export const applyClear = (board: Board, group: Group): { board: Board; clearedCount: number } => {
  const next = cloneBoard(board);
  for (const pos of group.positions) {
    next.cells[toIndex(next, pos.row, pos.col)] = null;
  }
  return {
    board: next,
    clearedCount: group.positions.length,
  };
};

export const applyGravity = (
  board: Board,
): {
  board: Board;
  moved: boolean;
  falls: AnimationPlan['falls'];
} => {
  const next = createEmptyBoard(board.rows, board.cols);
  const falls: AnimationPlan['falls'] = [];
  let moved = false;

  for (let col = 0; col < board.cols; col += 1) {
    let writeRow = board.rows - 1;
    for (let row = board.rows - 1; row >= 0; row -= 1) {
      const cell = getCell(board, row, col);
      if (!cell) {
        continue;
      }
      next.cells[toIndex(next, writeRow, col)] = cell;
      if (writeRow !== row) {
        moved = true;
        falls.push({
          id: cell.id,
          fromRow: row,
          toRow: writeRow,
          col,
        });
      }
      writeRow -= 1;
    }
  }

  return { board: next, moved, falls };
};

export const applyShiftLeft = (
  board: Board,
): {
  board: Board;
  moved: boolean;
  shifts: AnimationPlan['shifts'];
} => {
  const next = createEmptyBoard(board.rows, board.cols);
  const shifts: AnimationPlan['shifts'] = [];
  let moved = false;
  let writeCol = 0;

  for (let col = 0; col < board.cols; col += 1) {
    let hasAnyCell = false;
    for (let row = 0; row < board.rows; row += 1) {
      if (getCell(board, row, col)) {
        hasAnyCell = true;
        break;
      }
    }
    if (!hasAnyCell) {
      continue;
    }

    for (let row = 0; row < board.rows; row += 1) {
      const cell = getCell(board, row, col);
      if (!cell) {
        continue;
      }
      next.cells[toIndex(next, row, writeCol)] = cell;
      if (writeCol !== col) {
        moved = true;
        shifts.push({
          id: cell.id,
          fromCol: col,
          toCol: writeCol,
          row,
        });
      }
    }
    writeCol += 1;
  }

  return { board: next, moved, shifts };
};

export const stepAfterClear = (board: Board, group: Group): StepAfterClearResult => {
  const cleared = applyClear(board, group);
  const gravity = applyGravity(cleared.board);
  const shifted = applyShiftLeft(gravity.board);

  return {
    board: shifted.board,
    clearedBoard: cleared.board,
    clearedCount: cleared.clearedCount,
    animationsPlan: {
      clearedIds: group.positions
        .map((p) => getCell(board, p.row, p.col))
        .filter((cell): cell is Exclude<Cell, null> => Boolean(cell))
        .map((cell) => cell.id),
      falls: gravity.falls,
      shifts: shifted.shifts,
    },
  };
};

export const calcScore = (groupSize: number, scoring: ScoringConfig): number =>
  groupSize * groupSize * scoring.baseMultiplier;

export const calcClearBonus = (
  remainder: number,
  maxCells: number,
  scoring: ScoringConfig,
): number => Math.max(0, maxCells - remainder) * scoring.bonusPerRemovedRemainder;

const buildBoard = (rows: number, cols: number, colorCount: number, rng: () => number): Board => {
  const board = createEmptyBoard(rows, cols);
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const color = Math.floor(rng() * colorCount);
      board.cells[toIndex(board, row, col)] = {
        id: `${row}-${col}-${Math.floor(rng() * 1_000_000)}`,
        color,
      };
    }
  }
  return board;
};

export const generateBoard = (config: GameConfig, seed = Date.now()): Board => {
  const limit = Math.max(1, config.boardRegenerateLimit);
  for (let i = 0; i < limit; i += 1) {
    const rng = mulberry32(seed + i * 17);
    const board = buildBoard(config.rows, config.cols, config.colorCount, rng);
    if (hasAnyMove(board)) {
      return board;
    }
  }

  const rng = mulberry32(seed + limit * 17);
  return buildBoard(config.rows, config.cols, config.colorCount, rng);
};

export const countRemaining = (board: Board): number => board.cells.filter(Boolean).length;
