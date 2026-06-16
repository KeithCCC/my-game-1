export type BattleActionKind = 'move' | 'attack' | 'skill';
export type BattleStatus = 'playing' | 'clear' | 'failed';

export type BattlePoint = {
  x: number;
  y: number;
};

export type BattlePlayer = BattlePoint & {
  hp: number;
};

export type BattleEnemy = BattlePoint & {
  id: string;
  hp: number;
};

export type BattleAction = BattlePoint & {
  kind: BattleActionKind;
};

export type BattleLevel = {
  gridSize: number;
  playerStart: BattlePlayer;
  enemies: BattleEnemy[];
  walls: BattlePoint[];
  moveLimit: number;
};

type BattleSnapshot = {
  player: BattlePlayer;
  enemies: BattleEnemy[];
  turnsUsed: number;
  skillUsed: boolean;
  status: BattleStatus;
};

export type BattlePuzzleState = BattleLevel & {
  levelIndex: number;
  player: BattlePlayer;
  turnsUsed: number;
  skillUsed: boolean;
  status: BattleStatus;
  history: BattleSnapshot[];
};

const LEVELS: BattleLevel[] = [
  {
    gridSize: 5,
    playerStart: { x: 0, y: 0, hp: 3 },
    enemies: [
      { id: 'e1', x: 2, y: 0, hp: 1 },
      { id: 'e2', x: 4, y: 0, hp: 1 },
    ],
    walls: [],
    moveLimit: 3,
  },
  {
    gridSize: 5,
    playerStart: { x: 1, y: 1, hp: 3 },
    enemies: [{ id: 'e1', x: 1, y: 3, hp: 2 }],
    walls: [{ x: 2, y: 2 }],
    moveLimit: 3,
  },
  {
    gridSize: 5,
    playerStart: { x: 0, y: 4, hp: 3 },
    enemies: [
      { id: 'e1', x: 1, y: 4, hp: 1 },
      { id: 'e2', x: 4, y: 4, hp: 1 },
    ],
    walls: [{ x: 2, y: 3 }],
    moveLimit: 3,
  },
  {
    gridSize: 5,
    playerStart: { x: 2, y: 2, hp: 2 },
    enemies: [
      { id: 'e1', x: 2, y: 1, hp: 1 },
      { id: 'e2', x: 2, y: 4, hp: 2 },
    ],
    walls: [],
    moveLimit: 3,
  },
  {
    gridSize: 5,
    playerStart: { x: 4, y: 4, hp: 3 },
    enemies: [
      { id: 'e1', x: 3, y: 4, hp: 1 },
      { id: 'e2', x: 0, y: 4, hp: 1 },
      { id: 'e3', x: 4, y: 1, hp: 1 },
    ],
    walls: [{ x: 2, y: 2 }],
    moveLimit: 3,
  },
];

export function getBattleLevelCount(): number {
  return LEVELS.length;
}

export function createBattlePuzzleState(levelIndex = 0): BattlePuzzleState {
  const normalized = normalizeIndex(levelIndex, LEVELS.length);
  const level = LEVELS[normalized];
  return {
    gridSize: level.gridSize,
    playerStart: { ...level.playerStart },
    enemies: level.enemies.map((enemy) => ({ ...enemy })),
    walls: level.walls.map((wall) => ({ ...wall })),
    moveLimit: level.moveLimit,
    levelIndex: normalized,
    player: { ...level.playerStart },
    turnsUsed: 0,
    skillUsed: false,
    status: 'playing',
    history: [],
  };
}

export function getValidBattleActions(state: BattlePuzzleState): BattleAction[] {
  if (state.status !== 'playing') {
    return [];
  }
  const actions: BattleAction[] = [];
  for (const point of adjacentPoints(state.player)) {
    if (isWalkable(state, point) && !livingEnemyAt(state, point.x, point.y)) {
      actions.push({ kind: 'move', ...point });
    }
    if (livingEnemyAt(state, point.x, point.y)) {
      actions.push({ kind: 'attack', ...point });
    }
  }
  if (!state.skillUsed) {
    for (const enemy of state.enemies.filter((candidate) => candidate.hp > 0)) {
      if (enemy.x === state.player.x || enemy.y === state.player.y) {
        actions.push({ kind: 'skill', x: enemy.x, y: enemy.y });
      }
    }
  }
  return actions;
}

export function applyBattleAction(state: BattlePuzzleState, action: BattleAction): boolean {
  if (!getValidBattleActions(state).some((candidate) => sameAction(candidate, action))) {
    return false;
  }
  pushHistory(state);
  if (action.kind === 'move') {
    state.player.x = action.x;
    state.player.y = action.y;
  }
  if (action.kind === 'attack') {
    damageEnemyAt(state, action.x, action.y, 1);
    resolveCounterAttack(state, action.x, action.y);
  }
  if (action.kind === 'skill') {
    state.skillUsed = true;
    damageEnemyAt(state, action.x, action.y, 99);
  }
  state.turnsUsed += 1;
  resolveBattleStatus(state);
  return true;
}

export function undoBattleAction(state: BattlePuzzleState): boolean {
  const snapshot = state.history.pop();
  if (!snapshot) {
    return false;
  }
  state.player = { ...snapshot.player };
  state.enemies = snapshot.enemies.map((enemy) => ({ ...enemy }));
  state.turnsUsed = snapshot.turnsUsed;
  state.skillUsed = snapshot.skillUsed;
  state.status = snapshot.status;
  return true;
}

export function resetBattlePuzzle(state: BattlePuzzleState): void {
  const next = createBattlePuzzleState(state.levelIndex);
  state.player = next.player;
  state.enemies = next.enemies;
  state.turnsUsed = next.turnsUsed;
  state.skillUsed = next.skillUsed;
  state.status = next.status;
  state.history = next.history;
}

function resolveBattleStatus(state: BattlePuzzleState): void {
  if (state.enemies.every((enemy) => enemy.hp <= 0)) {
    state.status = 'clear';
    return;
  }
  if (state.player.hp <= 0 || state.turnsUsed >= state.moveLimit) {
    state.status = 'failed';
  }
}

function damageEnemyAt(state: BattlePuzzleState, x: number, y: number, damage: number): void {
  const enemy = livingEnemyAt(state, x, y);
  if (enemy) {
    enemy.hp -= damage;
  }
}

function resolveCounterAttack(state: BattlePuzzleState, x: number, y: number): void {
  const enemy = livingEnemyAt(state, x, y);
  if (enemy && manhattan(state.player, enemy) === 1) {
    state.player.hp -= 1;
  }
}

function livingEnemyAt(state: BattlePuzzleState, x: number, y: number): BattleEnemy | undefined {
  return state.enemies.find((enemy) => enemy.hp > 0 && enemy.x === x && enemy.y === y);
}

function isWalkable(state: BattlePuzzleState, point: BattlePoint): boolean {
  return (
    point.x >= 0 &&
    point.x < state.gridSize &&
    point.y >= 0 &&
    point.y < state.gridSize &&
    !state.walls.some((wall) => wall.x === point.x && wall.y === point.y)
  );
}

function adjacentPoints(point: BattlePoint): BattlePoint[] {
  return [
    { x: point.x, y: point.y - 1 },
    { x: point.x + 1, y: point.y },
    { x: point.x, y: point.y + 1 },
    { x: point.x - 1, y: point.y },
  ];
}

function pushHistory(state: BattlePuzzleState): void {
  state.history.push({
    player: { ...state.player },
    enemies: state.enemies.map((enemy) => ({ ...enemy })),
    turnsUsed: state.turnsUsed,
    skillUsed: state.skillUsed,
    status: state.status,
  });
}

function sameAction(a: BattleAction, b: BattleAction): boolean {
  return a.kind === b.kind && a.x === b.x && a.y === b.y;
}

function manhattan(a: BattlePoint, b: BattlePoint): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function normalizeIndex(index: number, length: number): number {
  return ((index % length) + length) % length;
}
