export type FactoryDirection = 'north' | 'east' | 'south' | 'west';
export type FactoryTileType = 'straight' | 'elbow' | 'tee' | 'cross';
export type FactoryFixedKind = 'source' | 'machine' | 'output' | 'obstacle';

export type FactoryPoint = {
  x: number;
  y: number;
};

export type FactoryFixedCell = FactoryPoint & {
  kind: FactoryFixedKind;
  id?: string;
  connections?: FactoryDirection[];
};

export type FactoryPlacedTile = FactoryPoint & {
  type: FactoryTileType;
  rotation: number;
};

export type FactoryLevel = {
  size: number;
  fixedCells: FactoryFixedCell[];
  requiredMachines: string[];
  availableTiles: Partial<Record<FactoryTileType, number>>;
  moveLimit?: number;
};

export type FactoryLineState = FactoryLevel & {
  levelIndex: number;
  placedTiles: FactoryPlacedTile[];
  moves: number;
};

export type FactoryFlowResult = {
  reached: FactoryPoint[];
  machinesReached: string[];
  outputReached: boolean;
};

const LEVELS: FactoryLevel[] = [
  {
    size: 6,
    fixedCells: [
      { kind: 'source', x: 0, y: 0, connections: ['east'] },
      { kind: 'machine', id: 'm1', x: 2, y: 2, connections: ['north', 'east'] },
      { kind: 'output', x: 3, y: 2, connections: ['west'] },
      { kind: 'obstacle', x: 4, y: 4 },
    ],
    requiredMachines: ['m1'],
    availableTiles: { straight: 2, elbow: 1, tee: 0, cross: 0 },
  },
  {
    size: 6,
    fixedCells: [
      { kind: 'source', x: 0, y: 5, connections: ['east'] },
      { kind: 'machine', id: 'm1', x: 2, y: 5, connections: ['west', 'north'] },
      { kind: 'output', x: 2, y: 3, connections: ['south'] },
    ],
    requiredMachines: ['m1'],
    availableTiles: { straight: 2, elbow: 1, tee: 0, cross: 0 },
  },
  {
    size: 6,
    fixedCells: [
      { kind: 'source', x: 0, y: 2, connections: ['east'] },
      { kind: 'machine', id: 'm1', x: 2, y: 2, connections: ['west', 'east'] },
      { kind: 'machine', id: 'm2', x: 4, y: 2, connections: ['west', 'east'] },
      { kind: 'output', x: 5, y: 2, connections: ['west'] },
    ],
    requiredMachines: ['m1', 'm2'],
    availableTiles: { straight: 3, elbow: 0, tee: 0, cross: 0 },
  },
];

const DELTAS: Record<FactoryDirection, FactoryPoint> = {
  north: { x: 0, y: -1 },
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
};

const OPPOSITE: Record<FactoryDirection, FactoryDirection> = {
  north: 'south',
  east: 'west',
  south: 'north',
  west: 'east',
};

export function getFactoryLevelCount(): number {
  return LEVELS.length;
}

export function createFactoryLineState(levelIndex = 0): FactoryLineState {
  const normalized = normalizeIndex(levelIndex, LEVELS.length);
  const level = LEVELS[normalized];
  return {
    size: level.size,
    fixedCells: level.fixedCells.map((cell) => ({ ...cell, connections: cell.connections ? [...cell.connections] : undefined })),
    requiredMachines: [...level.requiredMachines],
    availableTiles: { ...level.availableTiles },
    moveLimit: level.moveLimit,
    levelIndex: normalized,
    placedTiles: [],
    moves: 0,
  };
}

export function placeFactoryTile(
  state: FactoryLineState,
  type: FactoryTileType,
  x: number,
  y: number,
  rotation = 0,
): boolean {
  if (!isInside(state, { x, y }) || getFixedCell(state, x, y) || getPlacedTile(state, x, y)) {
    return false;
  }
  const remaining = state.availableTiles[type] ?? 0;
  if (remaining <= 0) {
    return false;
  }
  state.availableTiles[type] = remaining - 1;
  state.placedTiles.push({ type, x, y, rotation: normalizeRotation(rotation) });
  state.moves += 1;
  return true;
}

export function rotateFactoryTile(state: FactoryLineState, x: number, y: number): boolean {
  const tile = getPlacedTile(state, x, y);
  if (!tile) {
    return false;
  }
  tile.rotation = normalizeRotation(tile.rotation + 1);
  state.moves += 1;
  return true;
}

export function removeFactoryTile(state: FactoryLineState, x: number, y: number): boolean {
  const index = state.placedTiles.findIndex((tile) => tile.x === x && tile.y === y);
  if (index < 0) {
    return false;
  }
  const [removed] = state.placedTiles.splice(index, 1);
  state.availableTiles[removed.type] = (state.availableTiles[removed.type] ?? 0) + 1;
  state.moves += 1;
  return true;
}

export function checkFactoryLineClear(state: FactoryLineState): boolean {
  const flow = traceFactoryFlow(state);
  return (
    flow.outputReached &&
    state.requiredMachines.every((machineId) => flow.machinesReached.includes(machineId))
  );
}

export function traceFactoryFlow(state: FactoryLineState): FactoryFlowResult {
  const source = state.fixedCells.find((cell) => cell.kind === 'source');
  if (!source) {
    return { reached: [], machinesReached: [], outputReached: false };
  }
  const queue: FactoryPoint[] = [source];
  const seen = new Set<string>([key(source)]);
  const reached: FactoryPoint[] = [];
  const machinesReached: string[] = [];
  let outputReached = false;

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    reached.push(current);
    const fixed = getFixedCell(state, current.x, current.y);
    if (fixed?.kind === 'machine' && fixed.id && !machinesReached.includes(fixed.id)) {
      machinesReached.push(fixed.id);
    }
    if (fixed?.kind === 'output') {
      outputReached = true;
    }
    for (const direction of getFactoryConnections(state, current.x, current.y)) {
      const delta = DELTAS[direction];
      const next = { x: current.x + delta.x, y: current.y + delta.y };
      if (!isInside(state, next) || seen.has(key(next))) {
        continue;
      }
      const nextConnections = getFactoryConnections(state, next.x, next.y);
      if (nextConnections.includes(OPPOSITE[direction])) {
        seen.add(key(next));
        queue.push(next);
      }
    }
  }

  return { reached, machinesReached, outputReached };
}

export function getFactoryConnections(state: FactoryLineState, x: number, y: number): FactoryDirection[] {
  const fixed = getFixedCell(state, x, y);
  if (fixed) {
    return fixed.kind === 'obstacle' ? [] : fixed.connections ?? [];
  }
  const tile = getPlacedTile(state, x, y);
  return tile ? getTileConnections(tile.type, tile.rotation) : [];
}

function getTileConnections(type: FactoryTileType, rotation: number): FactoryDirection[] {
  const base: Record<FactoryTileType, FactoryDirection[]> = {
    straight: ['north', 'south'],
    elbow: ['east', 'south'],
    tee: ['north', 'east', 'south'],
    cross: ['north', 'east', 'south', 'west'],
  };
  return base[type].map((direction) => rotateDirection(direction, rotation));
}

function rotateDirection(direction: FactoryDirection, rotation: number): FactoryDirection {
  const order: FactoryDirection[] = ['north', 'east', 'south', 'west'];
  return order[(order.indexOf(direction) + normalizeRotation(rotation)) % order.length];
}

function getFixedCell(state: FactoryLineState, x: number, y: number): FactoryFixedCell | undefined {
  return state.fixedCells.find((cell) => cell.x === x && cell.y === y);
}

function getPlacedTile(state: FactoryLineState, x: number, y: number): FactoryPlacedTile | undefined {
  return state.placedTiles.find((tile) => tile.x === x && tile.y === y);
}

function isInside(state: FactoryLineState, point: FactoryPoint): boolean {
  return point.x >= 0 && point.x < state.size && point.y >= 0 && point.y < state.size;
}

function normalizeRotation(rotation: number): number {
  return ((rotation % 4) + 4) % 4;
}

function normalizeIndex(index: number, length: number): number {
  return ((index % length) + length) % length;
}

function key(point: FactoryPoint): string {
  return `${point.x},${point.y}`;
}
