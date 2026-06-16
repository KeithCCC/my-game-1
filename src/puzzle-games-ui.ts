import {
  createDroneGameState,
  createDroneWaveEvents,
  applyDroneWaveEvent,
  getDroneSpec,
  getDroneLevelCount,
  placeDrone,
  removeDrone,
  resetDronePlanning,
  type DroneGameState,
  type DroneType,
  type DronePoint,
  type DroneWaveEvent,
} from './games/drone-placement';
import {
  checkFactoryLineClear,
  createFactoryLineState,
  getFactoryConnections,
  getFactoryLevelCount,
  placeFactoryTile,
  removeFactoryTile,
  rotateFactoryTile,
  traceFactoryFlow,
  type FactoryLineState,
  type FactoryTileType,
} from './games/factory-line';
import {
  createNumberMergeState,
  moveNumberMerge,
  type NumberMergeDirection,
  type NumberMergeState,
} from './games/number-merge';
import {
  computePipeFlow,
  createPipePuzzleState,
  getPipeCell,
  getPipeConnections,
  getPipePuzzleLevelCount,
  isPipePuzzleClear,
  rotatePipeTile,
  type PipePuzzleState,
} from './games/rotating-pipe';
import {
  applyBattleAction,
  createBattlePuzzleState,
  getBattleLevelCount,
  resetBattlePuzzle,
  undoBattleAction,
  type BattleActionKind,
  type BattlePuzzleState,
} from './games/three-move-battle';

export type MountedDomGame = {
  cleanup: () => void;
};

type ShowLanding = () => void;
type PuzzleInstructionKey = 'drone' | 'factory' | 'merge' | 'pipe' | 'battle';

const PUZZLE_INSTRUCTIONS: Record<PuzzleInstructionKey, { en: string[]; ja: string[] }> = {
  drone: {
    en: [
      '+ cells are build spots. Choose Light or Heavy, then click a + cell to place a drone.',
      'Arrow cells are the enemy path. Drones cannot be placed on the path or on blocked X cells.',
      'Press Start. You clear the level only if every spawned enemy is stopped before the base.',
    ],
    ja: [
      '+ \u306e\u30bb\u30eb\u306f\u914d\u7f6e\u5834\u6240\u3067\u3059\u3002Light \u307e\u305f\u306f Heavy \u3092\u9078\u3073\u3001+ \u306e\u30bb\u30eb\u3092\u30af\u30ea\u30c3\u30af\u3057\u3066\u30c9\u30ed\u30fc\u30f3\u3092\u914d\u7f6e\u3057\u307e\u3059\u3002',
      '\u77e2\u5370\u30bb\u30eb\u306f\u6575\u306e\u901a\u8def\u3067\u3059\u3002\u901a\u8def\u3084 X \u306e\u30d6\u30ed\u30c3\u30af\u30bb\u30eb\u306b\u306f\u914d\u7f6e\u3067\u304d\u307e\u305b\u3093\u3002',
      'Start \u3092\u62bc\u3057\u307e\u3059\u3002\u51fa\u73fe\u3057\u305f\u6575\u3092\u3059\u3079\u3066\u57fa\u5730\u306b\u5230\u9054\u3059\u308b\u524d\u306b\u6b62\u3081\u308b\u3068\u30af\u30ea\u30a2\u3067\u3059\u3002',
    ],
  },
  factory: {
    en: [
      'Select a tile type, use Turn to choose its rotation, then place it on an empty cell.',
      'Click a placed tile to rotate it. Shift-click a placed tile to remove it.',
      'Press Check. The line must connect the source through every required machine to the output.',
    ],
    ja: [
      '\u30bf\u30a4\u30eb\u306e\u7a2e\u985e\u3092\u9078\u3073\u3001Turn \u3067\u5411\u304d\u3092\u6c7a\u3081\u3066\u3001\u7a7a\u3044\u3066\u3044\u308b\u30bb\u30eb\u306b\u914d\u7f6e\u3057\u307e\u3059\u3002',
      '\u914d\u7f6e\u6e08\u307f\u30bf\u30a4\u30eb\u3092\u30af\u30ea\u30c3\u30af\u3059\u308b\u3068\u56de\u8ee2\u3057\u307e\u3059\u3002Shift+\u30af\u30ea\u30c3\u30af\u3067\u53d6\u308a\u9664\u3051\u307e\u3059\u3002',
      'Check \u3092\u62bc\u3057\u307e\u3059\u3002\u30e9\u30a4\u30f3\u304c\u4f9b\u7d66\u5143\u304b\u3089\u5fc5\u8981\u306a\u6a5f\u68b0\u3092\u901a\u308a\u3001\u51fa\u529b\u307e\u3067\u3064\u306a\u304c\u308c\u3070\u30af\u30ea\u30a2\u3067\u3059\u3002',
    ],
  },
  merge: {
    en: [
      'Use the arrow keys, WASD, or direction buttons to slide all tiles.',
      'Matching numbers merge once per move and add to your score.',
      'Reach 128 to clear. If the board fills with no possible merge, the game is over.',
    ],
    ja: [
      '\u77e2\u5370\u30ad\u30fc\u3001WASD\u3001\u307e\u305f\u306f\u65b9\u5411\u30dc\u30bf\u30f3\u3067\u5168\u30bf\u30a4\u30eb\u3092\u30b9\u30e9\u30a4\u30c9\u3057\u307e\u3059\u3002',
      '\u540c\u3058\u6570\u5b57\u306f1\u56de\u306e\u624b\u30671\u5ea6\u3060\u3051\u5408\u4f53\u3057\u3001\u30b9\u30b3\u30a2\u306b\u52a0\u7b97\u3055\u308c\u307e\u3059\u3002',
      '128 \u306b\u5230\u9054\u3059\u308b\u3068\u30af\u30ea\u30a2\u3067\u3059\u3002\u76e4\u9762\u304c\u57cb\u307e\u308a\u5408\u4f53\u3067\u304d\u306a\u3044\u5834\u5408\u306f\u30b2\u30fc\u30e0\u30aa\u30fc\u30d0\u30fc\u3067\u3059\u3002',
    ],
  },
  pipe: {
    en: [
      'Click pipe tiles to rotate them 90 degrees.',
      'Water flows only when neighboring pipe openings face each other.',
      'Connect the source to every outlet to clear the level.',
    ],
    ja: [
      '\u30d1\u30a4\u30d7\u30bf\u30a4\u30eb\u3092\u30af\u30ea\u30c3\u30af\u3059\u308b\u306890\u5ea6\u56de\u8ee2\u3057\u307e\u3059\u3002',
      '\u96a3\u308a\u5408\u3046\u30d1\u30a4\u30d7\u306e\u958b\u53e3\u90e8\u304c\u5411\u304d\u5408\u3063\u3066\u3044\u308b\u6642\u3060\u3051\u6c34\u304c\u6d41\u308c\u307e\u3059\u3002',
      '\u6c34\u6e90\u304b\u3089\u3059\u3079\u3066\u306e\u51fa\u53e3\u307e\u3067\u3064\u306a\u3052\u308b\u3068\u30af\u30ea\u30a2\u3067\u3059\u3002',
    ],
  },
  battle: {
    en: [
      'Select Move, Attack, or Skill, then click a target cell.',
      'Move enters an adjacent empty cell. Attack hits an adjacent enemy.',
      'Skill can be used once per level to defeat an enemy in the same row or column. Clear all enemies within 3 turns.',
    ],
    ja: [
      'Move\u3001Attack\u3001Skill \u3092\u9078\u3073\u3001\u5bfe\u8c61\u30bb\u30eb\u3092\u30af\u30ea\u30c3\u30af\u3057\u307e\u3059\u3002',
      'Move \u306f\u96a3\u306e\u7a7a\u304d\u30bb\u30eb\u3078\u79fb\u52d5\u3057\u307e\u3059\u3002Attack \u306f\u96a3\u306e\u6575\u3092\u653b\u6483\u3057\u307e\u3059\u3002',
      'Skill \u306f\u5404\u30ec\u30d9\u30eb1\u56de\u3060\u3051\u4f7f\u3048\u3001\u540c\u3058\u884c\u307e\u305f\u306f\u5217\u306e\u6575\u3092\u5012\u305b\u307e\u3059\u30023\u624b\u4ee5\u5185\u306b\u5168\u6575\u3092\u5012\u3059\u3068\u30af\u30ea\u30a2\u3067\u3059\u3002',
    ],
  },
};
export function mountDronePlacement(gameRoot: HTMLElement, showLanding: ShowLanding): MountedDomGame {
  let state = createDroneGameState(0);
  let selectedDrone: DroneType = 'light';
  let showInstructions = false;
  let combatLog: string[] = ['Choose a drone, place it on + cells, then start the wave.'];
  let feedback = 'Click a + cell to place the selected drone. Yellow outlines show covered path cells.';
  let waveEvents: DroneWaveEvent[] = [];
  let waveTimer: number | undefined;
  const root = createPuzzleRoot('drone-puzzle-game', 'Drone Placement');
  gameRoot.appendChild(root);

  const render = (): void => {
    const selectedSpec = getDroneSpec(selectedDrone);
    root.innerHTML = `
      ${renderPuzzleHeader('Drone Placement', `Level ${state.levelIndex + 1} / ${getDroneLevelCount()}`, [
        ['Power', `${state.powerUsed} / ${state.powerLimit}`],
        ['Active enemies', String(state.activeEnemies.length)],
        ['Spawned', `${state.spawnedEnemies} / ${state.enemyCount}`],
        ['Base breaches', String(state.baseBreaches)],
        ['Status', formatStatus(state.status)],
      ])}
      <div class="puzzle-toolbar">
        ${renderToggleButton('drone', 'light', selectedDrone === 'light', 'Light: cost 1 range 1 damage 1')}
        ${renderToggleButton('drone', 'heavy', selectedDrone === 'heavy', 'Heavy: cost 2 range 2 damage 2')}
        ${renderActionButton('start', state.status === 'planning' ? 'Start Wave' : state.status === 'running' ? 'Running...' : 'Replay Wave', state.status === 'running')}
        ${renderActionButton('reset', 'Reset')}
        ${renderActionButton('instructions', showInstructions ? 'Hide Instructions' : 'Instructions')}
        ${renderActionButton('menu', 'Main Menu')}
      </div>
      <div class="drone-help-strip">
        <strong>Selected ${formatStatus(selectedDrone)}</strong>
        <span>Cost ${selectedSpec.cost}, range ${selectedSpec.range}, damage ${selectedSpec.damage}</span>
        <span>${feedback}</span>
      </div>
      ${renderInstructions('drone', showInstructions)}
      <div class="drone-play-area">
        ${renderGrid(state.width, state.height, (x, y) => renderDroneCell(state, x, y, waveEvents[0]))}
        ${renderCombatLog(combatLog)}
      </div>
      ${renderPuzzleResult(
        state.status === 'planning' || state.status === 'running' ? '' : state.status === 'clear' ? 'Clear' : 'Failed',
        state.status === 'clear',
        state.resultMessage,
      )}
    `;
  };

  const clearWaveTimer = (): void => {
    if (waveTimer !== undefined) {
      window.clearTimeout(waveTimer);
      waveTimer = undefined;
    }
  };

  const stepWave = (): void => {
    const event = waveEvents.shift();
    if (!event) {
      return;
    }
    applyDroneWaveEvent(state, event);
    combatLog = [formatDroneWaveEvent(event), ...combatLog].slice(0, 6);
    feedback = event.type === 'result' ? event.message : 'Wave is running. Watch enemies move, take hits, and stop or breach.';
    render();
    if (event.type !== 'result') {
      waveTimer = window.setTimeout(stepWave, event.type === 'hit' ? 520 : 420);
    }
  };

  const startWave = (): void => {
    clearWaveTimer();
    waveEvents = createDroneWaveEvents(state);
    combatLog = ['Wave started.'];
    feedback = 'Wave is running. Watch enemy HP and the event log.';
    stepWave();
  };

  const click = (event: MouseEvent): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const droneButton = target.closest<HTMLButtonElement>('[data-drone]');
    if (droneButton?.dataset.drone === 'light' || droneButton?.dataset.drone === 'heavy') {
      selectedDrone = droneButton.dataset.drone;
      render();
      return;
    }
    const action = target.closest<HTMLButtonElement>('[data-action]')?.dataset.action;
    if (action === 'instructions') {
      showInstructions = !showInstructions;
      render();
      return;
    }
    if (action === 'start') {
      if (state.status !== 'running') {
        if (state.drones.length === 0) {
          feedback = 'No drones placed. This setup will fail unless you place drones near the path.';
        }
        startWave();
      }
      return;
    }
    if (action === 'reset') {
      clearWaveTimer();
      state = createDroneGameState(state.levelIndex);
      combatLog = ['Choose a drone, place it on + cells, then start the wave.'];
      feedback = 'Click a + cell to place the selected drone. Yellow outlines show covered path cells.';
      waveEvents = [];
      render();
      return;
    }
    if (action === 'next') {
      clearWaveTimer();
      state = createDroneGameState(state.levelIndex + 1);
      combatLog = ['New level loaded. Place drones near the path before starting the wave.'];
      feedback = 'Click a + cell to place the selected drone. Yellow outlines show covered path cells.';
      waveEvents = [];
      render();
      return;
    }
    if (action === 'menu') {
      clearWaveTimer();
      showLanding();
      return;
    }
    const cell = target.closest<HTMLButtonElement>('[data-cell]');
    if (!cell) return;
    const point = readCellPoint(cell);
    if (state.status === 'running') {
      feedback = 'Wave is running. Wait for the result before editing.';
      render();
      return;
    }
    if (state.status === 'clear' || state.status === 'failed') {
      clearWaveTimer();
      resetDronePlanning(state);
      waveEvents = [];
      combatLog = ['Setup editing resumed. Place or remove drones, then start the wave.'];
    }
    if (state.drones.some((drone) => drone.x === point.x && drone.y === point.y)) {
      removeDrone(state, point.x, point.y);
      feedback = 'Drone removed. Click another + cell to place a drone.';
    } else {
      const beforePower = state.powerUsed;
      if (placeDrone(state, selectedDrone, point.x, point.y)) {
        feedback = `${formatStatus(selectedDrone)} placed. Power ${state.powerUsed} / ${state.powerLimit}.`;
      } else {
        feedback = getDronePlacementFailure(state, selectedDrone, point, beforePower);
      }
    }
    render();
  };

  root.addEventListener('click', click);
  render();
  return {
    cleanup: () => {
      clearWaveTimer();
      cleanupRoot(root, click);
    },
  };
}

export function mountFactoryLine(gameRoot: HTMLElement, showLanding: ShowLanding): MountedDomGame {
  let state = createFactoryLineState(0);
  let selectedTile: FactoryTileType = 'straight';
  let selectedRotation = 1;
  let checked = false;
  let showInstructions = false;
  const root = createPuzzleRoot('factory-puzzle-game', 'Factory Line Connection');
  gameRoot.appendChild(root);

  const render = (): void => {
    const flow = traceFactoryFlow(state);
    const isClear = checked && checkFactoryLineClear(state);
    root.innerHTML = `
      ${renderPuzzleHeader('Factory Line', `Level ${state.levelIndex + 1} / ${getFactoryLevelCount()}`, [
        ['Moves', String(state.moves)],
        ['Machines', `${flow.machinesReached.length} / ${state.requiredMachines.length}`],
      ])}
      <div class="puzzle-toolbar">
        ${(['straight', 'elbow', 'tee', 'cross'] as FactoryTileType[]).map((type) => (
          renderToggleButton('factory-tile', type, selectedTile === type, `${type} ${state.availableTiles[type] ?? 0}`)
        )).join('')}
        ${renderActionButton('turn', `Turn ${selectedRotation}`)}
        ${renderActionButton('check', 'Check')}
        ${renderActionButton('reset', 'Reset')}
        ${renderActionButton('instructions', showInstructions ? 'Hide Instructions' : 'Instructions')}
        ${renderActionButton('menu', 'Main Menu')}
      </div>
      ${renderInstructions('factory', showInstructions)}
      ${renderGrid(state.size, state.size, (x, y) => renderFactoryCell(state, flow.reached, x, y))}
      ${renderPuzzleResult(checked ? (isClear ? 'Clear' : 'Not connected') : '', isClear)}
    `;
  };

  const click = (event: MouseEvent): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const tileButton = target.closest<HTMLButtonElement>('[data-factory-tile]');
    if (isFactoryTileType(tileButton?.dataset.factoryTile)) {
      selectedTile = tileButton.dataset.factoryTile;
      render();
      return;
    }
    const action = target.closest<HTMLButtonElement>('[data-action]')?.dataset.action;
    if (action === 'instructions') {
      showInstructions = !showInstructions;
      render();
      return;
    }
    if (action === 'turn') {
      selectedRotation = (selectedRotation + 1) % 4;
      render();
      return;
    }
    if (action === 'check') {
      checked = true;
      render();
      return;
    }
    if (action === 'reset') {
      state = createFactoryLineState(state.levelIndex);
      checked = false;
      render();
      return;
    }
    if (action === 'next') {
      state = createFactoryLineState(state.levelIndex + 1);
      checked = false;
      render();
      return;
    }
    if (action === 'menu') {
      showLanding();
      return;
    }
    const cell = target.closest<HTMLButtonElement>('[data-cell]');
    if (!cell) return;
    const point = readCellPoint(cell);
    if (cell.dataset.placed === 'true') {
      if (event.shiftKey) removeFactoryTile(state, point.x, point.y);
      else rotateFactoryTile(state, point.x, point.y);
    } else {
      placeFactoryTile(state, selectedTile, point.x, point.y, selectedRotation);
    }
    checked = false;
    render();
  };

  root.addEventListener('click', click);
  render();
  return { cleanup: () => cleanupRoot(root, click) };
}

export function mountNumberMerge(gameRoot: HTMLElement, showLanding: ShowLanding): MountedDomGame {
  let state = createMergeState();
  let showInstructions = false;
  const root = createPuzzleRoot('merge-puzzle-game', 'Number Merge');
  gameRoot.appendChild(root);

  const render = (): void => {
    root.innerHTML = `
      ${renderPuzzleHeader('Number Merge', 'Reach 128', [
        ['Score', String(state.score)],
        ['Best', String(state.bestScore)],
      ])}
      <div class="puzzle-toolbar">
        ${renderActionButton('new', 'New Game')}
        ${renderActionButton('instructions', showInstructions ? 'Hide Instructions' : 'Instructions')}
        ${renderActionButton('menu', 'Main Menu')}
      </div>
      ${renderInstructions('merge', showInstructions)}
      ${renderMergeBoard(state)}
      <div class="merge-pad">
        ${(['up', 'left', 'down', 'right'] as NumberMergeDirection[]).map((direction) => (
          `<button class="puzzle-button ${direction}" type="button" data-dir="${direction}">${direction}</button>`
        )).join('')}
      </div>
      ${renderPuzzleResult(state.status === 'playing' ? '' : state.status === 'clear' ? 'Clear' : 'Game Over', state.status === 'clear')}
    `;
  };

  const move = (direction: NumberMergeDirection): void => {
    moveNumberMerge(state, direction);
    saveBestScore(state);
    render();
  };

  const click = (event: MouseEvent): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const direction = target.closest<HTMLButtonElement>('[data-dir]')?.dataset.dir;
    if (isMergeDirection(direction)) {
      move(direction);
      return;
    }
    const action = target.closest<HTMLButtonElement>('[data-action]')?.dataset.action;
    if (action === 'instructions') {
      showInstructions = !showInstructions;
      render();
      return;
    }
    if (action === 'new') {
      state = createMergeState();
      render();
      return;
    }
    if (action === 'menu') {
      showLanding();
    }
  };

  const keydown = (event: KeyboardEvent): void => {
    const direction = getMergeDirectionFromKey(event.key);
    if (!direction) return;
    event.preventDefault();
    move(direction);
  };

  root.addEventListener('click', click);
  window.addEventListener('keydown', keydown);
  render();
  return {
    cleanup: () => {
      window.removeEventListener('keydown', keydown);
      cleanupRoot(root, click);
    },
  };
}

export function mountRotatingPipe(gameRoot: HTMLElement, showLanding: ShowLanding): MountedDomGame {
  let state = createPipePuzzleState(0);
  let showInstructions = false;
  const root = createPuzzleRoot('pipe-puzzle-game', 'Rotating Pipe Connection');
  gameRoot.appendChild(root);

  const render = (): void => {
    const flow = computePipeFlow(state);
    const clear = isPipePuzzleClear(state);
    root.innerHTML = `
      ${renderPuzzleHeader('Rotating Pipe', `Level ${state.levelIndex + 1} / ${getPipePuzzleLevelCount()}`, [
        ['Rotations', String(state.moveCount)],
        ['Outlets', `${flow.reachedOutlets.length}`],
      ])}
      <div class="puzzle-toolbar">
        ${renderActionButton('reset', 'Reset')}
        ${renderActionButton('instructions', showInstructions ? 'Hide Instructions' : 'Instructions')}
        ${renderActionButton('menu', 'Main Menu')}
      </div>
      ${renderInstructions('pipe', showInstructions)}
      ${renderGrid(state.size, state.size, (x, y) => renderPipeCell(state, flow.reached, x, y))}
      ${renderPuzzleResult(clear ? 'Clear' : '', clear)}
    `;
  };

  const click = (event: MouseEvent): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const action = target.closest<HTMLButtonElement>('[data-action]')?.dataset.action;
    if (action === 'instructions') {
      showInstructions = !showInstructions;
      render();
      return;
    }
    if (action === 'reset') {
      state = createPipePuzzleState(state.levelIndex);
      render();
      return;
    }
    if (action === 'next') {
      state = createPipePuzzleState(state.levelIndex + 1);
      render();
      return;
    }
    if (action === 'menu') {
      showLanding();
      return;
    }
    const cell = target.closest<HTMLButtonElement>('[data-cell]');
    if (!cell) return;
    const point = readCellPoint(cell);
    rotatePipeTile(state, point.x, point.y);
    render();
  };

  root.addEventListener('click', click);
  render();
  return { cleanup: () => cleanupRoot(root, click) };
}

export function mountThreeMoveBattle(gameRoot: HTMLElement, showLanding: ShowLanding): MountedDomGame {
  let state = createBattlePuzzleState(0);
  let selectedAction: BattleActionKind = 'move';
  let showInstructions = false;
  const root = createPuzzleRoot('battle-puzzle-game', 'Three-Move Battle');
  gameRoot.appendChild(root);

  const render = (): void => {
    root.innerHTML = `
      ${renderPuzzleHeader('Three-Move Battle', `Level ${state.levelIndex + 1} / ${getBattleLevelCount()}`, [
        ['Turns', `${state.turnsUsed} / ${state.moveLimit}`],
        ['HP', String(state.player.hp)],
      ])}
      <div class="puzzle-toolbar">
        ${(['move', 'attack', 'skill'] as BattleActionKind[]).map((kind) => renderToggleButton('battle-action', kind, selectedAction === kind, kind)).join('')}
        ${renderActionButton('undo', 'Undo')}
        ${renderActionButton('reset', 'Reset')}
        ${renderActionButton('instructions', showInstructions ? 'Hide Instructions' : 'Instructions')}
        ${renderActionButton('menu', 'Main Menu')}
      </div>
      ${renderInstructions('battle', showInstructions)}
      ${renderGrid(state.gridSize, state.gridSize, (x, y) => renderBattleCell(state, x, y))}
      ${renderPuzzleResult(state.status === 'playing' ? '' : state.status === 'clear' ? 'Clear' : 'Failed', state.status === 'clear')}
    `;
  };

  const click = (event: MouseEvent): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const battleButton = target.closest<HTMLButtonElement>('[data-battle-action]');
    if (isBattleActionKind(battleButton?.dataset.battleAction)) {
      selectedAction = battleButton.dataset.battleAction;
      render();
      return;
    }
    const action = target.closest<HTMLButtonElement>('[data-action]')?.dataset.action;
    if (action === 'instructions') {
      showInstructions = !showInstructions;
      render();
      return;
    }
    if (action === 'undo') {
      undoBattleAction(state);
      render();
      return;
    }
    if (action === 'reset') {
      resetBattlePuzzle(state);
      render();
      return;
    }
    if (action === 'next') {
      state = createBattlePuzzleState(state.levelIndex + 1);
      render();
      return;
    }
    if (action === 'menu') {
      showLanding();
      return;
    }
    const cell = target.closest<HTMLButtonElement>('[data-cell]');
    if (!cell) return;
    const point = readCellPoint(cell);
    applyBattleAction(state, { kind: selectedAction, x: point.x, y: point.y });
    render();
  };

  root.addEventListener('click', click);
  render();
  return { cleanup: () => cleanupRoot(root, click) };
}

function renderDroneCell(
  state: DroneGameState,
  x: number,
  y: number,
  nextEvent: DroneWaveEvent | undefined,
): string {
  const drone = state.drones.find((candidate) => candidate.x === x && candidate.y === y);
  const pathIndex = state.path.findIndex((point) => point.x === x && point.y === y);
  const isPath = pathIndex >= 0;
  const isStart = state.pathStart.x === x && state.pathStart.y === y;
  const isBase = state.base.x === x && state.base.y === y;
  const isBlocked = state.blocked.some((point) => point.x === x && point.y === y);
  const activeEnemy = state.activeEnemies.find((enemy) => {
    const point = state.path[enemy.pathIndex];
    return point?.x === x && point.y === y;
  });
  const isPlaceable = !drone && !isPath && !isBlocked;
  const isPlacedCovered = Boolean(isPath && state.drones.some((placed) => isDroneCellCovered(placed.type, placed, { x, y })));
  const isNextEventCell = Boolean(
    nextEvent &&
      'pathIndex' in nextEvent &&
      isPath &&
      state.path[nextEvent.pathIndex]?.x === x &&
      state.path[nextEvent.pathIndex]?.y === y,
  );
  const label = activeEnemy
    ? `E${activeEnemy.hp}`
    : drone
      ? (drone.type === 'heavy' ? 'H' : 'L')
      : isPath
        ? isStart
          ? 'S'
          : isBase
            ? 'B'
            : '->'
        : isBlocked
          ? 'X'
          : '+';
  const ariaLabel = getDroneCellLabel(label, x, y, isPath, isStart, isBase, isBlocked, drone?.type, activeEnemy?.hp);
  return renderGridButton(
    x,
    y,
    `puzzle-cell ${isPath ? 'is-path' : ''} ${isStart ? 'is-start' : ''} ${isBase ? 'is-base' : ''} ${isBlocked ? 'is-blocked' : ''} ${drone ? 'has-piece' : ''} ${activeEnemy ? 'has-enemy' : ''} ${isPlaceable ? 'is-placeable' : ''} ${isPlacedCovered ? 'is-covered' : ''} ${isNextEventCell ? 'is-event-cell' : ''}`,
    label,
    undefined,
    ariaLabel,
  );
}

function renderFactoryCell(state: FactoryLineState, reached: Array<{ x: number; y: number }>, x: number, y: number): string {
  const fixed = state.fixedCells.find((cell) => cell.x === x && cell.y === y);
  const placed = state.placedTiles.find((tile) => tile.x === x && tile.y === y);
  const connected = reached.some((point) => point.x === x && point.y === y);
  const label = fixed ? fixed.kind[0].toUpperCase() : placed ? tileGlyph(getFactoryConnections(state, x, y)) : '';
  return renderGridButton(
    x,
    y,
    `puzzle-cell ${fixed ? `is-${fixed.kind}` : ''} ${placed ? 'has-piece' : ''} ${connected ? 'is-flowing' : ''}`,
    label,
    placed ? 'true' : undefined,
  );
}

function renderMergeBoard(state: NumberMergeState): string {
  return `
    <div class="puzzle-grid merge-grid" style="--puzzle-cols: 4; --puzzle-rows: 4">
      ${state.board.flatMap((row) => row.map((value) => `<span class="puzzle-cell merge-tile value-${value}">${value || ''}</span>`)).join('')}
    </div>
  `;
}

function renderPipeCell(state: PipePuzzleState, reached: Array<{ x: number; y: number }>, x: number, y: number): string {
  const cell = getPipeCell(state, x, y);
  const flowing = reached.some((point) => point.x === x && point.y === y);
  const label = cell ? (cell.type === 'pipe' ? tileGlyph(getPipeConnections(state, x, y)) : cell.type[0].toUpperCase()) : '';
  return renderGridButton(x, y, `puzzle-cell ${cell ? `is-${cell.type}` : ''} ${flowing ? 'is-flowing' : ''}`, label);
}

function renderBattleCell(state: BattlePuzzleState, x: number, y: number): string {
  const wall = state.walls.some((point) => point.x === x && point.y === y);
  const enemy = state.enemies.find((candidate) => candidate.x === x && candidate.y === y && candidate.hp > 0);
  const player = state.player.x === x && state.player.y === y;
  const label = player ? 'P' : enemy ? `E${enemy.hp}` : wall ? 'X' : '';
  return renderGridButton(x, y, `puzzle-cell ${wall ? 'is-blocked' : ''} ${enemy ? 'has-enemy' : ''} ${player ? 'has-player' : ''}`, label);
}

function renderPuzzleHeader(title: string, subtitle: string, stats: Array<[string, string]>): string {
  return `
    <section class="puzzle-shell" aria-label="${title}">
      <header class="puzzle-topbar">
        <div><span>${title}</span><strong>${subtitle}</strong></div>
        ${stats.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join('')}
      </header>
    </section>
  `.replace('</section>', '');
}

function renderInstructions(key: PuzzleInstructionKey, visible: boolean): string {
  if (!visible) {
    return '';
  }
  const instructions = PUZZLE_INSTRUCTIONS[key];
  return `
    <aside class="puzzle-instructions" aria-label="Puzzle instructions">
      ${key === 'drone' ? renderDroneInstructionImages() : ''}
      <section>
        <h2>How to play</h2>
        <ol>${instructions.en.map((line) => `<li>${line}</li>`).join('')}</ol>
      </section>
      <section lang="ja">
        <h2>\u904a\u3073\u65b9</h2>
        <ol>${instructions.ja.map((line) => `<li>${line}</li>`).join('')}</ol>
      </section>
    </aside>
  `;
}

function renderDroneInstructionImages(): string {
  return `
    <div class="drone-visual-guide" aria-label="Drone placement visual guide">
      <figure>
        <div class="mini-board" aria-hidden="true">
          <span class="mini-cell build">+</span>
          <span class="mini-cell build">+</span>
          <span class="mini-cell build">+</span>
          <span class="mini-cell path">-&gt;</span>
          <span class="mini-cell path enemy">E</span>
          <span class="mini-cell path base">B</span>
          <span class="mini-cell blocked">X</span>
          <span class="mini-cell build">+</span>
          <span class="mini-cell build">+</span>
        </div>
        <figcaption>Enemies follow arrows toward base B. Stop them before they arrive.</figcaption>
      </figure>
      <figure>
        <div class="mini-board" aria-hidden="true">
          <span class="mini-cell build drone">L</span>
          <span class="mini-cell build">+</span>
          <span class="mini-cell build drone heavy">H</span>
          <span class="mini-cell path">-&gt;</span>
          <span class="mini-cell path hit">E</span>
          <span class="mini-cell path base">B</span>
          <span class="mini-cell build">+</span>
          <span class="mini-cell build">+</span>
          <span class="mini-cell build">+</span>
        </div>
        <figcaption>Place drones next to the path. L is cheap, H reaches farther and hits harder.</figcaption>
      </figure>
      <figure>
        <div class="mini-result-row" aria-hidden="true">
          <span class="mini-badge clear">Clear</span>
          <span>Spawned all enemies + Active enemies 0 + Base breaches 0</span>
        </div>
        <div class="mini-result-row" aria-hidden="true">
          <span class="mini-badge failed">Failed</span>
          <span>Any enemy reaches base B</span>
        </div>
        <figcaption lang="ja">全敵を止めればクリア。1体でも基地に到達すると失敗です。</figcaption>
      </figure>
    </div>
  `;
}

function renderPuzzleResult(label: string, clear: boolean, detail = ''): string {
  if (!label) {
    return '</section>';
  }
  return `
      <div class="puzzle-result ${clear ? 'is-clear' : 'is-failed'}">
        <strong>${label}</strong>
        ${detail ? `<p>${detail}</p>` : ''}
        ${clear ? '<button class="primary-button" type="button" data-action="next">Next Level</button>' : ''}
      </div>
    </section>
  `;
}

function renderCombatLog(entries: string[]): string {
  return `
    <aside class="drone-combat-log" aria-label="Drone combat log">
      <h2>Wave log</h2>
      <ol>
        ${entries.map((entry) => `<li>${entry}</li>`).join('')}
      </ol>
    </aside>
  `;
}

function renderGrid(width: number, height: number, cell: (x: number, y: number) => string): string {
  const cells: string[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      cells.push(cell(x, y));
    }
  }
  return `<div class="puzzle-grid" style="--puzzle-cols: ${width}; --puzzle-rows: ${height}" role="grid">${cells.join('')}</div>`;
}

function renderGridButton(x: number, y: number, className: string, label: string, placed?: string, ariaLabel?: string): string {
  const placedAttr = placed ? ` data-placed="${placed}"` : '';
  const ariaAttr = ariaLabel ? ` aria-label="${ariaLabel}"` : '';
  return `<button class="${className}" type="button" data-cell data-x="${x}" data-y="${y}"${placedAttr}${ariaAttr}>${label}</button>`;
}

function renderToggleButton(dataName: string, value: string, active: boolean, label: string): string {
  return `<button class="puzzle-button ${active ? 'is-selected' : ''}" type="button" data-${dataName}="${value}" aria-pressed="${active}">${label}</button>`;
}

function renderActionButton(action: string, label: string, disabled = false): string {
  return `<button class="puzzle-button" type="button" data-action="${action}"${disabled ? ' disabled' : ''}>${label}</button>`;
}

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function createPuzzleRoot(className: string, label: string): HTMLElement {
  const root = document.createElement('main');
  root.className = `puzzle-game ${className}`;
  root.setAttribute('aria-label', label);
  return root;
}

function cleanupRoot(root: HTMLElement, click: (event: MouseEvent) => void): void {
  root.removeEventListener('click', click);
  root.remove();
}

function readCellPoint(cell: HTMLElement): { x: number; y: number } {
  return {
    x: Number(cell.dataset.x),
    y: Number(cell.dataset.y),
  };
}

function tileGlyph(connections: string[]): string {
  const sorted = [...connections].sort().join(',');
  if (sorted === 'east,west') return '-';
  if (sorted === 'north,south') return '|';
  if (connections.length === 4) return '+';
  if (connections.length === 3) return 'T';
  if (connections.length === 1) return 'o';
  return 'L';
}

function createMergeState(): NumberMergeState {
  const bestScore = Number(window.localStorage.getItem('number-merge-best') ?? 0);
  return createNumberMergeState({ bestScore });
}

function saveBestScore(state: NumberMergeState): void {
  window.localStorage.setItem('number-merge-best', String(state.bestScore));
}

function getMergeDirectionFromKey(key: string): NumberMergeDirection | undefined {
  const normalized = key.toLowerCase();
  if (normalized === 'arrowup' || normalized === 'w') return 'up';
  if (normalized === 'arrowdown' || normalized === 's') return 'down';
  if (normalized === 'arrowleft' || normalized === 'a') return 'left';
  if (normalized === 'arrowright' || normalized === 'd') return 'right';
  return undefined;
}

function isMergeDirection(value: string | undefined): value is NumberMergeDirection {
  return value === 'up' || value === 'down' || value === 'left' || value === 'right';
}

function isFactoryTileType(value: string | undefined): value is FactoryTileType {
  return value === 'straight' || value === 'elbow' || value === 'tee' || value === 'cross';
}

function isBattleActionKind(value: string | undefined): value is BattleActionKind {
  return value === 'move' || value === 'attack' || value === 'skill';
}

function isDroneCellCovered(type: DroneType, drone: DronePoint, pathCell: DronePoint): boolean {
  const spec = getDroneSpec(type);
  return Math.abs(drone.x - pathCell.x) + Math.abs(drone.y - pathCell.y) <= spec.range;
}

function getDronePlacementFailure(
  state: DroneGameState,
  selectedDrone: DroneType,
  point: DronePoint,
  beforePower: number,
): string {
  if (state.path.some((path) => path.x === point.x && path.y === point.y)) {
    return 'Cannot build on the enemy path. Use a + build spot next to the arrows.';
  }
  if (state.blocked.some((blocked) => blocked.x === point.x && blocked.y === point.y)) {
    return 'Blocked cell. Choose a + build spot.';
  }
  if (state.drones.some((drone) => drone.x === point.x && drone.y === point.y)) {
    return 'That cell already has a drone.';
  }
  if (beforePower + getDroneSpec(selectedDrone).cost > state.powerLimit) {
    return 'Not enough power for that drone. Remove another drone or choose Light.';
  }
  return 'Click a + build spot to place a drone.';
}

function formatDroneWaveEvent(event: DroneWaveEvent): string {
  if (event.type === 'spawn') {
    return `Enemy ${event.enemyId} spawned at S with HP ${event.hp}.`;
  }
  if (event.type === 'move') {
    return `Enemy ${event.enemyId} moved to path cell ${event.pathIndex + 1}.`;
  }
  if (event.type === 'hit') {
    return `${formatStatus(event.droneType)} hit Enemy ${event.enemyId}: HP ${event.hpBefore} -> ${event.hpAfter}.`;
  }
  if (event.type === 'stopped') {
    return `Enemy ${event.enemyId} stopped before the base.`;
  }
  if (event.type === 'breach') {
    return `Enemy ${event.enemyId} reached base B.`;
  }
  return event.message;
}

function getDroneCellLabel(
  label: string,
  x: number,
  y: number,
  isPath: boolean,
  isStart: boolean,
  isBase: boolean,
  isBlocked: boolean,
  droneType: DroneType | undefined,
  enemyHp: number | undefined,
): string {
  const position = `row ${y + 1}, column ${x + 1}`;
  if (enemyHp !== undefined) return `Enemy with ${enemyHp} HP at ${position}`;
  if (droneType) return `${formatStatus(droneType)} drone at ${position}`;
  if (isStart) return `Enemy start S at ${position}`;
  if (isBase) return `Base B at ${position}`;
  if (isPath) return `Enemy path ${label} at ${position}`;
  if (isBlocked) return `Blocked cell at ${position}`;
  return `Build spot at ${position}`;
}
