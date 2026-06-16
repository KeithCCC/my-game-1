export type DroneType = 'light' | 'heavy';
export type DroneStatus = 'planning' | 'running' | 'clear' | 'failed';

export type DronePoint = {
  x: number;
  y: number;
};

export type Drone = DronePoint & {
  type: DroneType;
};

export type DroneSpec = {
  cost: number;
  range: number;
  damage: number;
};

export type DroneEnemy = {
  id: number;
  hp: number;
  pathIndex: number;
};

export type DroneLevel = {
  width: number;
  height: number;
  path: DronePoint[];
  blocked: DronePoint[];
  enemyHp: number;
  enemyCount: number;
  powerLimit: number;
  allowedDrones: DroneType[];
};

export type DroneGameState = DroneLevel & {
  levelIndex: number;
  pathStart: DronePoint;
  base: DronePoint;
  drones: Drone[];
  activeEnemies: DroneEnemy[];
  spawnedEnemies: number;
  baseBreaches: number;
  powerUsed: number;
  enemiesDefeated: number;
  status: DroneStatus;
  resultMessage: string;
};

export type DroneWaveEvent =
  | { type: 'spawn'; enemyId: number; hp: number; pathIndex: number }
  | { type: 'move'; enemyId: number; fromPathIndex: number; pathIndex: number; hp: number }
  | {
      type: 'hit';
      enemyId: number;
      droneType: DroneType;
      drone: DronePoint;
      pathIndex: number;
      damage: number;
      hpBefore: number;
      hpAfter: number;
    }
  | { type: 'stopped'; enemyId: number; pathIndex: number }
  | { type: 'breach'; enemyId: number; pathIndex: number }
  | { type: 'result'; status: Extract<DroneStatus, 'clear' | 'failed'>; message: string };

const DRONES: Record<DroneType, DroneSpec> = {
  light: { cost: 1, range: 1, damage: 1 },
  heavy: { cost: 2, range: 2, damage: 2 },
};

const LEVELS: DroneLevel[] = [
  {
    width: 5,
    height: 5,
    path: rowPath(2),
    blocked: [{ x: 0, y: 4 }],
    enemyHp: 3,
    enemyCount: 2,
    powerLimit: 3,
    allowedDrones: ['light', 'heavy'],
  },
  {
    width: 5,
    height: 5,
    path: rowPath(1),
    blocked: [{ x: 2, y: 3 }],
    enemyHp: 4,
    enemyCount: 3,
    powerLimit: 4,
    allowedDrones: ['light', 'heavy'],
  },
  {
    width: 5,
    height: 5,
    path: [
      { x: 0, y: 4 },
      { x: 1, y: 4 },
      { x: 1, y: 3 },
      { x: 2, y: 3 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 3, y: 1 },
      { x: 4, y: 1 },
    ],
    blocked: [{ x: 4, y: 4 }],
    enemyHp: 5,
    enemyCount: 3,
    powerLimit: 5,
    allowedDrones: ['light', 'heavy'],
  },
];

export function getDroneLevelCount(): number {
  return LEVELS.length;
}

export function createDroneGameState(levelIndex = 0): DroneGameState {
  const level = LEVELS[normalizeIndex(levelIndex, LEVELS.length)];
  return {
    ...cloneLevel(level),
    levelIndex: normalizeIndex(levelIndex, LEVELS.length),
    pathStart: { ...level.path[0] },
    base: { ...level.path[level.path.length - 1] },
    drones: [],
    activeEnemies: [],
    spawnedEnemies: 0,
    baseBreaches: 0,
    powerUsed: 0,
    enemiesDefeated: 0,
    status: 'planning',
    resultMessage: '',
  };
}

export function getDroneSpec(type: DroneType): DroneSpec {
  return { ...DRONES[type] };
}

export function placeDrone(state: DroneGameState, type: DroneType, x: number, y: number): boolean {
  if (state.status !== 'planning' || !state.allowedDrones.includes(type)) {
    return false;
  }
  if (!isInside(state, { x, y }) || hasPoint(state.path, { x, y }) || hasPoint(state.blocked, { x, y })) {
    return false;
  }
  if (state.drones.some((drone) => drone.x === x && drone.y === y)) {
    return false;
  }
  const cost = DRONES[type].cost;
  if (state.powerUsed + cost > state.powerLimit) {
    return false;
  }
  state.drones.push({ type, x, y });
  state.powerUsed += cost;
  return true;
}

export function removeDrone(state: DroneGameState, x: number, y: number): boolean {
  const index = state.drones.findIndex((drone) => drone.x === x && drone.y === y);
  if (index < 0) {
    return false;
  }
  const [removed] = state.drones.splice(index, 1);
  state.powerUsed -= DRONES[removed.type].cost;
  return true;
}

export function resetDronePlanning(state: DroneGameState): void {
  state.status = 'planning';
  state.activeEnemies = [];
  state.spawnedEnemies = 0;
  state.baseBreaches = 0;
  state.enemiesDefeated = 0;
  state.resultMessage = '';
}

export function runDroneWave(state: DroneGameState): void {
  const events = createDroneWaveEvents(state);
  resetDroneRuntime(state);
  events.forEach((event) => applyDroneWaveEvent(state, event));
}

export function createDroneWaveEvents(state: DroneGameState): DroneWaveEvent[] {
  const events: DroneWaveEvent[] = [];
  let breachCount = 0;

  for (let enemyIndex = 0; enemyIndex < state.enemyCount; enemyIndex += 1) {
    const enemyId = enemyIndex + 1;
    let hp = state.enemyHp;
    events.push({ type: 'spawn', enemyId, hp, pathIndex: 0 });

    for (let pathIndex = 0; pathIndex < state.path.length; pathIndex += 1) {
      if (pathIndex > 0) {
        events.push({ type: 'move', enemyId, fromPathIndex: pathIndex - 1, pathIndex, hp });
      }

      const pathCell = state.path[pathIndex];
      for (const drone of state.drones) {
        const spec = DRONES[drone.type];
        if (manhattan(drone, pathCell) <= spec.range) {
          const hpBefore = hp;
          hp = Math.max(0, hp - spec.damage);
          events.push({
            type: 'hit',
            enemyId,
            droneType: drone.type,
            drone: { x: drone.x, y: drone.y },
            pathIndex,
            damage: spec.damage,
            hpBefore,
            hpAfter: hp,
          });
        }
        if (hp <= 0) {
          break;
        }
      }

      if (hp <= 0) {
        events.push({ type: 'stopped', enemyId, pathIndex });
        break;
      }
    }

    if (hp > 0) {
      breachCount += 1;
      events.push({ type: 'breach', enemyId, pathIndex: state.path.length - 1 });
      events.push({ type: 'result', status: 'failed', message: 'Enemy reached the base' });
      return events;
    }
  }

  events.push({
    type: 'result',
    status: breachCount > 0 ? 'failed' : 'clear',
    message: breachCount > 0 ? 'Enemy reached the base' : 'All enemies stopped',
  });
  return events;
}

export function applyDroneWaveEvent(state: DroneGameState, event: DroneWaveEvent): void {
  if (event.type === 'spawn') {
    if (state.status !== 'running') {
      resetDroneRuntime(state);
    }
    state.spawnedEnemies += 1;
    state.activeEnemies.push({ id: event.enemyId, hp: event.hp, pathIndex: event.pathIndex });
    return;
  }
  if (event.type === 'move') {
    const enemy = getActiveEnemy(state, event.enemyId);
    if (enemy) {
      enemy.pathIndex = event.pathIndex;
      enemy.hp = event.hp;
    }
    return;
  }
  if (event.type === 'hit') {
    const enemy = getActiveEnemy(state, event.enemyId);
    if (enemy) {
      enemy.hp = event.hpAfter;
      enemy.pathIndex = event.pathIndex;
    }
    return;
  }
  if (event.type === 'stopped') {
    state.enemiesDefeated += 1;
    removeActiveEnemy(state, event.enemyId);
    return;
  }
  if (event.type === 'breach') {
    state.baseBreaches += 1;
    removeActiveEnemy(state, event.enemyId);
    return;
  }
  state.status = event.status;
  state.resultMessage = event.message;
}

function resetDroneRuntime(state: DroneGameState): void {
  state.status = 'running';
  state.activeEnemies = [];
  state.spawnedEnemies = 0;
  state.baseBreaches = 0;
  state.enemiesDefeated = 0;
  state.resultMessage = '';
}

export function evaluateGameResult(state: DroneGameState): DroneStatus {
  if (state.baseBreaches > 0) {
    state.status = 'failed';
    state.resultMessage = 'Enemy reached the base';
    return state.status;
  }
  if (state.spawnedEnemies < state.enemyCount || state.activeEnemies.length > 0) {
    state.status = 'running';
    state.resultMessage = '';
    return state.status;
  }
  state.status = 'clear';
  state.resultMessage = 'All enemies stopped';
  return state.status;
}

function removeActiveEnemy(state: DroneGameState, enemyId: number): void {
  state.activeEnemies = state.activeEnemies.filter((enemy) => enemy.id !== enemyId);
}

function getActiveEnemy(state: DroneGameState, enemyId: number): DroneEnemy | undefined {
  return state.activeEnemies.find((enemy) => enemy.id === enemyId);
}

function rowPath(y: number): DronePoint[] {
  return [0, 1, 2, 3, 4].map((x) => ({ x, y }));
}

function cloneLevel(level: DroneLevel): DroneLevel {
  return {
    ...level,
    path: level.path.map((point) => ({ ...point })),
    blocked: level.blocked.map((point) => ({ ...point })),
    allowedDrones: [...level.allowedDrones],
  };
}

function normalizeIndex(index: number, length: number): number {
  return ((index % length) + length) % length;
}

function isInside(state: DroneGameState, point: DronePoint): boolean {
  return point.x >= 0 && point.x < state.width && point.y >= 0 && point.y < state.height;
}

function hasPoint(points: DronePoint[], point: DronePoint): boolean {
  return points.some((candidate) => candidate.x === point.x && candidate.y === point.y);
}

function manhattan(a: DronePoint, b: DronePoint): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
