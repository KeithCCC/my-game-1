import {
  createSokobanState,
  getSokobanLevelCount,
  getSokobanTile,
  moveSokoban,
  nextSokobanLevel,
  resetSokobanLevel,
  type SokobanDirection,
  type SokobanState,
  undoSokobanMove,
} from '../../src/games/sokoban';

describe('sokoban simulation', () => {
  test('parses built-in levels with boxes and goals', () => {
    const state = createSokobanState(0);

    expect(getSokobanLevelCount()).toBeGreaterThanOrEqual(20);
    expect(state.levelIndex).toBe(0);
    expect(state.width).toBeGreaterThan(0);
    expect(state.height).toBeGreaterThan(0);
    expect(state.boxes.length).toBeGreaterThan(0);
    expect(state.goals.length).toBe(state.boxes.length);
    expect(getSokobanTile(state, state.player.x, state.player.y)).toBe('player');
  });

  test('allows walking onto empty floor', () => {
    const state = createSokobanState(0);
    state.player = { x: 2, y: 2 };

    const moved = moveSokoban(state, 'right');

    expect(moved).toBe(true);
    expect(state.player).toEqual({ x: 3, y: 2 });
    expect(state.moves).toBe(1);
  });

  test('blocks movement into walls', () => {
    const state = createSokobanState(0);
    state.player = { x: 1, y: 1 };

    const moved = moveSokoban(state, 'up');

    expect(moved).toBe(false);
    expect(state.player).toEqual({ x: 1, y: 1 });
    expect(state.moves).toBe(0);
  });

  test('pushes one box into empty floor', () => {
    const state = createSokobanState(0);
    state.player = { x: 2, y: 2 };
    state.boxes = [{ x: 3, y: 2 }];

    const moved = moveSokoban(state, 'right');

    expect(moved).toBe(true);
    expect(state.player).toEqual({ x: 3, y: 2 });
    expect(state.boxes).toEqual([{ x: 4, y: 2 }]);
    expect(state.moves).toBe(1);
  });

  test('blocks pushes into walls or other boxes', () => {
    const wallState = createSokobanState(0);
    wallState.player = { x: 4, y: 1 };
    wallState.boxes = [{ x: 5, y: 1 }];

    expect(moveSokoban(wallState, 'right')).toBe(false);
    expect(wallState.boxes).toEqual([{ x: 5, y: 1 }]);

    const boxState = createSokobanState(0);
    boxState.player = { x: 2, y: 2 };
    boxState.boxes = [
      { x: 3, y: 2 },
      { x: 4, y: 2 },
    ];

    expect(moveSokoban(boxState, 'right')).toBe(false);
    expect(boxState.player).toEqual({ x: 2, y: 2 });
    expect(boxState.moves).toBe(0);
  });

  test('marks boxes and player on goals in tile projection', () => {
    const state = createSokobanState(0);
    state.goals = [
      { x: 2, y: 2 },
      { x: 3, y: 2 },
    ];
    state.player = { x: 2, y: 2 };
    state.boxes = [{ x: 3, y: 2 }];

    expect(getSokobanTile(state, 2, 2)).toBe('playerOnGoal');
    expect(getSokobanTile(state, 3, 2)).toBe('boxOnGoal');
  });

  test('completes a level when every box is on a goal', () => {
    const state = createSokobanState(0);
    state.player = { x: 2, y: 2 };
    state.boxes = [{ x: 3, y: 2 }];
    state.goals = [{ x: 4, y: 2 }];

    const moved = moveSokoban(state, 'right');

    expect(moved).toBe(true);
    expect(state.status).toBe('complete');
  });

  test('undo restores the previous player, boxes, and move count', () => {
    const state = createSokobanState(0);
    state.player = { x: 2, y: 2 };
    state.boxes = [{ x: 3, y: 2 }];

    moveSokoban(state, 'right');
    const undone = undoSokobanMove(state);

    expect(undone).toBe(true);
    expect(state.player).toEqual({ x: 2, y: 2 });
    expect(state.boxes).toEqual([{ x: 3, y: 2 }]);
    expect(state.moves).toBe(0);
    expect(state.status).toBe('playing');
  });

  test('reset restores the current level initial state', () => {
    const state = createSokobanState(0);
    const initialPlayer = { ...state.player };
    const initialBoxes = state.boxes.map((box) => ({ ...box }));

    moveSokoban(state, 'right');
    resetSokobanLevel(state);

    expect(state.player).toEqual(initialPlayer);
    expect(state.boxes).toEqual(initialBoxes);
    expect(state.moves).toBe(0);
    expect(state.history).toHaveLength(0);
    expect(state.status).toBe('playing');
  });

  test('advances to the next level and wraps after the final level', () => {
    const state = createSokobanState(0);
    const firstWidth = state.width;

    nextSokobanLevel(state);

    expect(state.levelIndex).toBe(1);
    expect(state.moves).toBe(0);
    expect(state.status).toBe('playing');
    expect(state.width).not.toBe(0);

    const final = createSokobanState(getSokobanLevelCount() - 1);
    nextSokobanLevel(final);

    expect(final.levelIndex).toBe(0);
    expect(final.width).toBe(firstWidth);
  });

  test('all built-in levels are solvable', () => {
    const unsolved: number[] = [];

    for (let levelIndex = 0; levelIndex < getSokobanLevelCount(); levelIndex += 1) {
      if (!canSolveLevel(createSokobanState(levelIndex))) {
        unsolved.push(levelIndex + 1);
      }
    }

    expect(unsolved).toEqual([]);
  });
});

const DIRECTIONS: SokobanDirection[] = ['up', 'down', 'left', 'right'];

function canSolveLevel(initial: SokobanState): boolean {
  const queue = [cloneState(initial)];
  const seen = new Set<string>([stateKey(initial)]);

  while (queue.length > 0 && seen.size < 50_000) {
    const current = queue.shift();
    if (!current) {
      break;
    }
    if (current.status === 'complete') {
      return true;
    }

    for (const direction of DIRECTIONS) {
      const next = cloneState(current);
      if (!moveSokoban(next, direction)) {
        continue;
      }
      const key = stateKey(next);
      if (!seen.has(key)) {
        seen.add(key);
        queue.push(next);
      }
    }
  }

  return false;
}

function cloneState(state: SokobanState): SokobanState {
  return {
    ...state,
    walls: state.walls.map((point) => ({ ...point })),
    goals: state.goals.map((point) => ({ ...point })),
    boxes: state.boxes.map((point) => ({ ...point })),
    player: { ...state.player },
    history: [],
  };
}

function stateKey(state: SokobanState): string {
  const boxes = state.boxes
    .map((box) => `${box.x},${box.y}`)
    .sort()
    .join('|');
  return `${state.player.x},${state.player.y}:${boxes}`;
}
