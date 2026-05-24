export type SokobanDirection = 'up' | 'down' | 'left' | 'right';
export type SokobanStatus = 'playing' | 'complete';
export type SokobanTile = 'floor' | 'wall' | 'goal' | 'box' | 'boxOnGoal' | 'player' | 'playerOnGoal';

export type SokobanPoint = {
  x: number;
  y: number;
};

type SokobanSnapshot = {
  player: SokobanPoint;
  boxes: SokobanPoint[];
  moves: number;
  status: SokobanStatus;
};

export type SokobanState = {
  levelIndex: number;
  width: number;
  height: number;
  walls: SokobanPoint[];
  goals: SokobanPoint[];
  boxes: SokobanPoint[];
  player: SokobanPoint;
  moves: number;
  status: SokobanStatus;
  history: SokobanSnapshot[];
};

const LEVELS = [
  [
    '#######',
    '#     #',
    '# @$. #',
    '#     #',
    '#######',
  ],
  [
    '########',
    '#      #',
    '# @ $ .#',
    '#      #',
    '########',
  ],
  [
    '########',
    '#  .   #',
    '#  $   #',
    '#  @   #',
    '#      #',
    '########',
  ],
  [
    '#########',
    '#       #',
    '# @ $ . #',
    '#   $ . #',
    '#       #',
    '#########',
  ],
  [
    '#########',
    '#   .   #',
    '#   $   #',
    '# @ $ . #',
    '#       #',
    '#########',
  ],
  [
    '#########',
    '#       #',
    '# @ $   #',
    '#   # . #',
    '#       #',
    '#########',
  ],
  [
    '##########',
    '#   ..   #',
    '#   $$   #',
    '#   @    #',
    '#        #',
    '##########',
  ],
  [
    '##########',
    '#        #',
    '# @ $$   #',
    '#    ..  #',
    '#        #',
    '##########',
  ],
  [
    '##########',
    '#   #    #',
    '# @ $ .  #',
    '#   $ .  #',
    '#        #',
    '##########',
  ],
  [
    '###########',
    '#    .    #',
    '#  # $ #  #',
    '#    @    #',
    '#  # $ .  #',
    '#         #',
    '###########',
  ],
  [
    '###########',
    '#         #',
    '# @ $ .   #',
    '#   $ .   #',
    '#   $ .   #',
    '#         #',
    '###########',
  ],
  [
    '###########',
    '#  ...    #',
    '#  $$$    #',
    '#    @    #',
    '#         #',
    '###########',
  ],
  [
    '###########',
    '#         #',
    '# @ $ .   #',
    '#   $ .   #',
    '#         #',
    '###########',
  ],
  [
    '############',
    '#          #',
    '# @ $$     #',
    '#    ## .. #',
    '#          #',
    '############',
  ],
  [
    '############',
    '#   ..     #',
    '#   $$ #   #',
    '#    @ #   #',
    '#          #',
    '############',
  ],
  [
    '############',
    '#          #',
    '#  @ $ .   #',
    '#    $ .   #',
    '#    $ .   #',
    '#          #',
    '############',
  ],
  [
    '############',
    '#          #',
    '# @ $ .    #',
    '#   $ .    #',
    '#   $ .    #',
    '#          #',
    '############',
  ],
  [
    '#############',
    '#     ..    #',
    '#  ## $$    #',
    '#     @     #',
    '#    $$ ##  #',
    '#    ..     #',
    '#############',
  ],
  [
    '#############',
    '#           #',
    '# @ $ .     #',
    '#   $ .     #',
    '#   $ .     #',
    '#           #',
    '#############',
  ],
  [
    '#############',
    '#   ...     #',
    '#   $$$  #  #',
    '#     @  #  #',
    '#        #  #',
    '#           #',
    '#############',
  ],
  [
    '############',
    '#          #',
    '# @ $ .    #',
    '#   $ .    #',
    '#   $ .    #',
    '#          #',
    '############',
  ],
  [
    '##############',
    '#     ....   #',
    '#     $$$$   #',
    '#   #   @    #',
    '#            #',
    '##############',
  ],
];

const DIRECTIONS: Record<SokobanDirection, SokobanPoint> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function getSokobanLevelCount(): number {
  return LEVELS.length;
}

export function createSokobanState(levelIndex = 0): SokobanState {
  return parseLevel(normalizeLevelIndex(levelIndex));
}

export function moveSokoban(state: SokobanState, direction: SokobanDirection): boolean {
  if (state.status !== 'playing') {
    return false;
  }

  const delta = DIRECTIONS[direction];
  const target = addPoint(state.player, delta);
  if (!isWalkable(state, target)) {
    return false;
  }

  const boxIndex = findPointIndex(state.boxes, target);
  if (boxIndex >= 0) {
    const boxTarget = addPoint(target, delta);
    if (!isWalkable(state, boxTarget) || hasPoint(state.boxes, boxTarget)) {
      return false;
    }
    pushHistory(state);
    state.player = target;
    state.boxes[boxIndex] = boxTarget;
  } else {
    pushHistory(state);
    state.player = target;
  }

  state.moves += 1;
  if (isSokobanComplete(state)) {
    state.status = 'complete';
  }
  return true;
}

export function undoSokobanMove(state: SokobanState): boolean {
  const snapshot = state.history.pop();
  if (!snapshot) {
    return false;
  }
  state.player = { ...snapshot.player };
  state.boxes = snapshot.boxes.map((box) => ({ ...box }));
  state.moves = snapshot.moves;
  state.status = snapshot.status;
  return true;
}

export function resetSokobanLevel(state: SokobanState): void {
  replaceState(state, createSokobanState(state.levelIndex));
}

export function nextSokobanLevel(state: SokobanState): void {
  replaceState(state, createSokobanState(state.levelIndex + 1));
}

export function getSokobanTile(state: SokobanState, x: number, y: number): SokobanTile {
  const point = { x, y };
  if (!isInside(state, point) || hasPoint(state.walls, point)) {
    return 'wall';
  }
  const isGoal = hasPoint(state.goals, point);
  if (samePoint(state.player, point)) {
    return isGoal ? 'playerOnGoal' : 'player';
  }
  if (hasPoint(state.boxes, point)) {
    return isGoal ? 'boxOnGoal' : 'box';
  }
  return isGoal ? 'goal' : 'floor';
}

function parseLevel(levelIndex: number): SokobanState {
  const rows = LEVELS[levelIndex];
  const width = Math.max(...rows.map((row) => row.length));
  const walls: SokobanPoint[] = [];
  const goals: SokobanPoint[] = [];
  const boxes: SokobanPoint[] = [];
  let player: SokobanPoint | undefined;

  rows.forEach((row, y) => {
    for (let x = 0; x < width; x += 1) {
      const cell = row[x] ?? '#';
      if (cell === '#') {
        walls.push({ x, y });
      }
      if (cell === '.' || cell === '*' || cell === '+') {
        goals.push({ x, y });
      }
      if (cell === '$' || cell === '*') {
        boxes.push({ x, y });
      }
      if (cell === '@' || cell === '+') {
        player = { x, y };
      }
    }
  });

  if (!player) {
    throw new Error(`Sokoban level ${levelIndex + 1} has no player`);
  }
  if (boxes.length === 0 || boxes.length !== goals.length) {
    throw new Error(`Sokoban level ${levelIndex + 1} must have matching boxes and goals`);
  }

  return {
    levelIndex,
    width,
    height: rows.length,
    walls,
    goals,
    boxes,
    player,
    moves: 0,
    status: 'playing',
    history: [],
  };
}

function normalizeLevelIndex(levelIndex: number): number {
  return ((levelIndex % LEVELS.length) + LEVELS.length) % LEVELS.length;
}

function isSokobanComplete(state: SokobanState): boolean {
  return state.boxes.every((box) => hasPoint(state.goals, box));
}

function isWalkable(state: SokobanState, point: SokobanPoint): boolean {
  return isInside(state, point) && !hasPoint(state.walls, point);
}

function isInside(state: SokobanState, point: SokobanPoint): boolean {
  return point.x >= 0 && point.x < state.width && point.y >= 0 && point.y < state.height;
}

function pushHistory(state: SokobanState): void {
  state.history.push({
    player: { ...state.player },
    boxes: state.boxes.map((box) => ({ ...box })),
    moves: state.moves,
    status: state.status,
  });
}

function replaceState(target: SokobanState, source: SokobanState): void {
  target.levelIndex = source.levelIndex;
  target.width = source.width;
  target.height = source.height;
  target.walls = source.walls;
  target.goals = source.goals;
  target.boxes = source.boxes;
  target.player = source.player;
  target.moves = source.moves;
  target.status = source.status;
  target.history = source.history;
}

function addPoint(point: SokobanPoint, delta: SokobanPoint): SokobanPoint {
  return {
    x: point.x + delta.x,
    y: point.y + delta.y,
  };
}

function hasPoint(points: SokobanPoint[], point: SokobanPoint): boolean {
  return findPointIndex(points, point) >= 0;
}

function findPointIndex(points: SokobanPoint[], point: SokobanPoint): number {
  return points.findIndex((candidate) => samePoint(candidate, point));
}

function samePoint(a: SokobanPoint, b: SokobanPoint): boolean {
  return a.x === b.x && a.y === b.y;
}
