export type PipeDirection = 'north' | 'east' | 'south' | 'west';
export type PipeTileType = 'source' | 'outlet' | 'pipe' | 'empty' | 'blocked';
export type PipeShape = 'straight' | 'elbow' | 'tee' | 'cross' | 'cap';

export type PipePoint = {
  x: number;
  y: number;
};

export type PipeCell = PipePoint & {
  type: PipeTileType;
  shape?: PipeShape;
  rotation?: number;
  id?: string;
  connections?: PipeDirection[];
};

export type PipePuzzleLevel = {
  size: number;
  cells: PipeCell[];
};

export type PipePuzzleState = PipePuzzleLevel & {
  levelIndex: number;
  moveCount: number;
};

export type PipeFlow = {
  reached: PipePoint[];
  reachedOutlets: string[];
};

const LEVELS: PipePuzzleLevel[] = [
  {
    size: 5,
    cells: [
      { type: 'source', x: 0, y: 0, connections: ['east'] },
      { type: 'pipe', shape: 'straight', x: 1, y: 0, rotation: 0 },
      { type: 'pipe', shape: 'straight', x: 2, y: 0, rotation: 0 },
      { type: 'outlet', id: 'o1', x: 3, y: 0, connections: ['west'] },
      { type: 'blocked', x: 4, y: 4 },
    ],
  },
  {
    size: 5,
    cells: [
      { type: 'source', x: 0, y: 2, connections: ['east'] },
      { type: 'pipe', shape: 'elbow', x: 1, y: 2, rotation: 0 },
      { type: 'pipe', shape: 'straight', x: 1, y: 1, rotation: 1 },
      { type: 'outlet', id: 'o1', x: 1, y: 0, connections: ['south'] },
    ],
  },
  {
    size: 5,
    cells: [
      { type: 'source', x: 2, y: 4, connections: ['north'] },
      { type: 'pipe', shape: 'tee', x: 2, y: 3, rotation: 0 },
      { type: 'outlet', id: 'o1', x: 1, y: 3, connections: ['east'] },
      { type: 'outlet', id: 'o2', x: 3, y: 3, connections: ['west'] },
    ],
  },
  {
    size: 5,
    cells: [
      { type: 'source', x: 0, y: 4, connections: ['east'] },
      { type: 'pipe', shape: 'straight', x: 1, y: 4, rotation: 1 },
      { type: 'pipe', shape: 'elbow', x: 2, y: 4, rotation: 0 },
      { type: 'outlet', id: 'o1', x: 2, y: 3, connections: ['south'] },
    ],
  },
  {
    size: 5,
    cells: [
      { type: 'source', x: 4, y: 2, connections: ['west'] },
      { type: 'pipe', shape: 'cross', x: 3, y: 2, rotation: 0 },
      { type: 'outlet', id: 'o1', x: 2, y: 2, connections: ['east'] },
      { type: 'outlet', id: 'o2', x: 3, y: 1, connections: ['south'] },
      { type: 'outlet', id: 'o3', x: 3, y: 3, connections: ['north'] },
    ],
  },
];

const DELTAS: Record<PipeDirection, PipePoint> = {
  north: { x: 0, y: -1 },
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
};

const OPPOSITE: Record<PipeDirection, PipeDirection> = {
  north: 'south',
  east: 'west',
  south: 'north',
  west: 'east',
};

export function getPipePuzzleLevelCount(): number {
  return LEVELS.length;
}

export function createPipePuzzleState(levelIndex = 0): PipePuzzleState {
  const normalized = normalizeIndex(levelIndex, LEVELS.length);
  return {
    size: LEVELS[normalized].size,
    cells: LEVELS[normalized].cells.map((cell) => ({
      ...cell,
      connections: cell.connections ? [...cell.connections] : undefined,
    })),
    levelIndex: normalized,
    moveCount: 0,
  };
}

export function rotatePipeTile(state: PipePuzzleState, x: number, y: number): boolean {
  const cell = getPipeCell(state, x, y);
  if (!cell || cell.type !== 'pipe') {
    return false;
  }
  cell.rotation = normalizeRotation((cell.rotation ?? 0) + 1);
  state.moveCount += 1;
  return true;
}

export function computePipeFlow(state: PipePuzzleState): PipeFlow {
  const source = state.cells.find((cell) => cell.type === 'source');
  if (!source) {
    return { reached: [], reachedOutlets: [] };
  }
  const queue: PipePoint[] = [source];
  const seen = new Set<string>([key(source)]);
  const reached: PipePoint[] = [];
  const reachedOutlets: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    reached.push(current);
    const cell = getPipeCell(state, current.x, current.y);
    if (cell?.type === 'outlet' && cell.id) {
      reachedOutlets.push(cell.id);
    }
    for (const direction of getPipeConnections(state, current.x, current.y)) {
      const delta = DELTAS[direction];
      const next = { x: current.x + delta.x, y: current.y + delta.y };
      if (!isInside(state, next) || seen.has(key(next))) {
        continue;
      }
      if (getPipeConnections(state, next.x, next.y).includes(OPPOSITE[direction])) {
        seen.add(key(next));
        queue.push(next);
      }
    }
  }
  return { reached, reachedOutlets };
}

export function isPipePuzzleClear(state: PipePuzzleState): boolean {
  const flow = computePipeFlow(state);
  const outletIds = state.cells
    .filter((cell) => cell.type === 'outlet')
    .map((cell) => cell.id)
    .filter((id): id is string => Boolean(id));
  return outletIds.every((id) => flow.reachedOutlets.includes(id));
}

export function getPipeConnections(state: PipePuzzleState, x: number, y: number): PipeDirection[] {
  const cell = getPipeCell(state, x, y);
  if (!cell || cell.type === 'empty' || cell.type === 'blocked') {
    return [];
  }
  if (cell.type !== 'pipe') {
    return cell.connections ?? [];
  }
  return getShapeConnections(cell.shape ?? 'straight', cell.rotation ?? 0);
}

export function getPipeCell(state: PipePuzzleState, x: number, y: number): PipeCell | undefined {
  return state.cells.find((cell) => cell.x === x && cell.y === y);
}

function getShapeConnections(shape: PipeShape, rotation: number): PipeDirection[] {
  const base: Record<PipeShape, PipeDirection[]> = {
    straight: ['north', 'south'],
    elbow: ['north', 'east'],
    tee: ['north', 'east', 'south'],
    cross: ['north', 'east', 'south', 'west'],
    cap: ['north'],
  };
  return base[shape].map((direction) => rotateDirection(direction, rotation));
}

function rotateDirection(direction: PipeDirection, rotation: number): PipeDirection {
  const order: PipeDirection[] = ['north', 'east', 'south', 'west'];
  return order[(order.indexOf(direction) + normalizeRotation(rotation)) % order.length];
}

function normalizeRotation(rotation: number): number {
  return ((rotation % 4) + 4) % 4;
}

function normalizeIndex(index: number, length: number): number {
  return ((index % length) + length) % length;
}

function isInside(state: PipePuzzleState, point: PipePoint): boolean {
  return point.x >= 0 && point.x < state.size && point.y >= 0 && point.y < state.size;
}

function key(point: PipePoint): string {
  return `${point.x},${point.y}`;
}
