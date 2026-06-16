export type NumberMergeDirection = 'up' | 'down' | 'left' | 'right';
export type NumberMergeStatus = 'playing' | 'clear' | 'gameOver';
export type NumberMergeBoard = number[][];

export type NumberMergeState = {
  board: NumberMergeBoard;
  score: number;
  bestScore: number;
  target: number;
  status: NumberMergeStatus;
  rngSeed: number;
};

export type NumberMergeOptions = {
  seed?: number;
  bestScore?: number;
  skipInitialTiles?: boolean;
};

export function createNumberMergeState(options: NumberMergeOptions = {}): NumberMergeState {
  const state: NumberMergeState = {
    board: createEmptyBoard(),
    score: 0,
    bestScore: options.bestScore ?? 0,
    target: 128,
    status: 'playing',
    rngSeed: options.seed ?? 0x1234abcd,
  };
  if (!options.skipInitialTiles) {
    addRandomTile(state);
    addRandomTile(state);
  }
  return state;
}

export function moveNumberMerge(state: NumberMergeState, direction: NumberMergeDirection): boolean {
  if (state.status !== 'playing') {
    return false;
  }
  const previous = boardKey(state.board);
  const result = moveBoard(state.board, direction);
  if (boardKey(result.board) === previous) {
    if (!canMoveNumberMerge(state)) {
      state.status = 'gameOver';
    }
    return false;
  }
  state.board = result.board;
  state.score += result.scoreGained;
  state.bestScore = Math.max(state.bestScore, state.score);
  if (hasTarget(state)) {
    state.status = 'clear';
    return true;
  }
  addRandomTile(state);
  if (!canMoveNumberMerge(state)) {
    state.status = 'gameOver';
  }
  return true;
}

export function addRandomTile(state: NumberMergeState): boolean {
  const empty: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < 4; y += 1) {
    for (let x = 0; x < 4; x += 1) {
      if (state.board[y][x] === 0) {
        empty.push({ x, y });
      }
    }
  }
  if (empty.length === 0) {
    return false;
  }
  const cell = empty[0];
  state.board[cell.y][cell.x] = nextRandom(state) < 0.9 ? 2 : 4;
  return true;
}

export function canMoveNumberMerge(state: NumberMergeState): boolean {
  if (state.board.some((row) => row.some((value) => value === 0))) {
    return true;
  }
  for (let y = 0; y < 4; y += 1) {
    for (let x = 0; x < 4; x += 1) {
      const value = state.board[y][x];
      if (state.board[y][x + 1] === value || state.board[y + 1]?.[x] === value) {
        return true;
      }
    }
  }
  return false;
}

export function moveBoard(board: NumberMergeBoard, direction: NumberMergeDirection): {
  board: NumberMergeBoard;
  scoreGained: number;
} {
  let scoreGained = 0;
  const next = createEmptyBoard();
  const lines = getLines(board, direction);
  lines.forEach((line, lineIndex) => {
    const merged = mergeLine(line);
    scoreGained += merged.scoreGained;
    writeLine(next, direction, lineIndex, merged.values);
  });
  return { board: next, scoreGained };
}

function mergeLine(line: number[]): { values: number[]; scoreGained: number } {
  const values = line.filter((value) => value !== 0);
  const merged: number[] = [];
  let scoreGained = 0;
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] === values[index + 1]) {
      const value = values[index] * 2;
      merged.push(value);
      scoreGained += value;
      index += 1;
    } else {
      merged.push(values[index]);
    }
  }
  while (merged.length < 4) {
    merged.push(0);
  }
  return { values: merged, scoreGained };
}

function getLines(board: NumberMergeBoard, direction: NumberMergeDirection): number[][] {
  if (direction === 'left') {
    return board.map((row) => [...row]);
  }
  if (direction === 'right') {
    return board.map((row) => [...row].reverse());
  }
  return [0, 1, 2, 3].map((x) => {
    const column = [0, 1, 2, 3].map((y) => board[y][x]);
    return direction === 'up' ? column : column.reverse();
  });
}

function writeLine(board: NumberMergeBoard, direction: NumberMergeDirection, index: number, values: number[]): void {
  if (direction === 'left') {
    board[index] = values;
    return;
  }
  if (direction === 'right') {
    board[index] = [...values].reverse();
    return;
  }
  values.forEach((value, offset) => {
    const y = direction === 'up' ? offset : 3 - offset;
    board[y][index] = value;
  });
}

function createEmptyBoard(): NumberMergeBoard {
  return Array.from({ length: 4 }, () => [0, 0, 0, 0]);
}

function hasTarget(state: NumberMergeState): boolean {
  return state.board.some((row) => row.some((value) => value >= state.target));
}

function boardKey(board: NumberMergeBoard): string {
  return board.map((row) => row.join(',')).join('|');
}

function nextRandom(state: NumberMergeState): number {
  state.rngSeed = (state.rngSeed * 1664525 + 1013904223) >>> 0;
  return state.rngSeed / 0x100000000;
}
