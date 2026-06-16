import Phaser from 'phaser';
import './style.css';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { MenuScene } from './scenes/MenuScene';
import { ResultScene } from './scenes/ResultScene';
import {
  createMissileCommandState,
  firePlayerMissile,
  getExplosionRadius,
  updateMissileCommand,
  type LauncherKey,
  type MissileCommandState,
} from './games/missile-command';
import {
  createSokobanState,
  getSokobanLevelCount,
  getSokobanTile,
  moveSokoban,
  nextSokobanLevel,
  resetSokobanLevel,
  undoSokobanMove,
  type SokobanDirection,
  type SokobanState,
  type SokobanTile,
} from './games/sokoban';
import {
  mountDronePlacement,
  mountFactoryLine,
  mountNumberMerge,
  mountRotatingPipe,
  mountThreeMoveBattle,
} from './puzzle-games-ui';
import { mountSuperStarTrek } from './super-star-trek-ui';

type MountedGameState = {
  cleanup: () => void;
};

type GameId =
  | 'page-survivor'
  | 'missile-command'
  | 'sokoban'
  | 'drone-placement'
  | 'factory-line'
  | 'number-merge'
  | 'rotating-pipe'
  | 'three-move-battle'
  | 'super-star-trek';

type GameCard = {
  id: GameId;
  className: string;
  title: string;
  description: string;
  art: string;
  start: () => void;
};

const appRoot = document.querySelector<HTMLDivElement>('#app');
const gameRoot = document.querySelector<HTMLDivElement>('#game');
const hudRoot = document.querySelector<HTMLDivElement>('#hud-root');

let phaserGame: Phaser.Game | undefined;
let mountedGameState: MountedGameState | undefined;

const pageSurvivorConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#17211f',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  render: {
    antialias: true,
    pixelArt: false,
  },
  scene: [BootScene, MenuScene, GameScene, ResultScene],
};

const GAME_BODY_CLASSES = [
  'is-playing-page-survivor',
  'is-playing-missile-command',
  'is-playing-sokoban',
  'is-playing-puzzle',
  'is-playing-trek',
];

const GAME_CARDS: GameCard[] = [
  {
    id: 'page-survivor',
    className: 'survivor-card',
    title: 'Page Survivor',
    description: 'Survive waves of enemies, level up, and strengthen your weapons before time runs out.',
    art: `
      <span class="pixel-player"></span>
      <span class="pixel-enemy one"></span>
      <span class="pixel-enemy two"></span>
      <span class="pixel-beam"></span>
    `,
    start: startPageSurvivor,
  },
  {
    id: 'missile-command',
    className: 'missile-card',
    title: 'Missile Command',
    description: 'Use A / S / D to fire from the left, center, and right bases in a classic city-defense game.',
    art: `
      <span class="missile-city one"></span>
      <span class="missile-city two"></span>
      <span class="missile-city three"></span>
      <span class="missile-trail enemy"></span>
      <span class="missile-trail defender"></span>
      <span class="missile-blast"></span>
    `,
    start: startMissileCommand,
  },
  {
    id: 'sokoban',
    className: 'sokoban-card',
    title: 'Sokoban',
    description: 'Push crates onto every goal across 22 compact neon warehouse puzzles.',
    art: `
      <span class="sokoban-wall one"></span>
      <span class="sokoban-wall two"></span>
      <span class="sokoban-wall three"></span>
      <span class="sokoban-goal one"></span>
      <span class="sokoban-goal two"></span>
      <span class="sokoban-box one"></span>
      <span class="sokoban-box two"></span>
      <span class="sokoban-player"></span>
    `,
    start: startSokoban,
  },
  {
    id: 'drone-placement',
    className: 'drone-card puzzle-card',
    title: 'Drone Placement',
    description: 'Place light and heavy drones around a path, then run the wave before enemies reach the goal.',
    art: renderPuzzleCardArt('D', 'L', 'H'),
    start: () => startMountedPuzzle((root) => mountDronePlacement(root, showLanding)),
  },
  {
    id: 'factory-line',
    className: 'factory-card puzzle-card',
    title: 'Factory Line',
    description: 'Place and rotate line tiles so materials pass every machine and reach the output.',
    art: renderPuzzleCardArt('S', '-', 'L'),
    start: () => startMountedPuzzle((root) => mountFactoryLine(root, showLanding)),
  },
  {
    id: 'number-merge',
    className: 'merge-card puzzle-card',
    title: 'Number Merge',
    description: 'Slide and combine matching numbers in a compact 2048-style puzzle until you make 128.',
    art: renderPuzzleCardArt('2', '4', '8'),
    start: () => startMountedPuzzle((root) => mountNumberMerge(root, showLanding)),
  },
  {
    id: 'rotating-pipe',
    className: 'pipe-card puzzle-card',
    title: 'Rotating Pipe',
    description: 'Rotate fixed pipe pieces to carry water from the source to every outlet.',
    art: renderPuzzleCardArt('S', '+', 'O'),
    start: () => startMountedPuzzle((root) => mountRotatingPipe(root, showLanding)),
  },
  {
    id: 'three-move-battle',
    className: 'battle-card puzzle-card',
    title: 'Three-Move Battle',
    description: 'Solve small tactical boards by defeating every enemy in three actions or fewer.',
    art: renderPuzzleCardArt('P', 'E', '*'),
    start: () => startMountedPuzzle((root) => mountThreeMoveBattle(root, showLanding)),
  },
  {
    id: 'super-star-trek',
    className: 'trek-card',
    title: 'Super Star Trek',
    description: 'Command the Enterprise with classic text commands, scans, phasers, torpedoes, and shields.',
    art: `
      <span class="trek-card-terminal">
        <span>STARDATE 3421</span>
        <span>QUAD 4-3 SEC 5-5</span>
        <span>&gt; SRS</span>
        <span>&lt;*&gt; . . +++</span>
      </span>
    `,
    start: startSuperStarTrek,
  },
];

function clearCurrentGame(): void {
  mountedGameState?.cleanup();
  mountedGameState = undefined;

  if (phaserGame) {
    phaserGame.destroy(true);
    phaserGame = undefined;
  }

  document.body.querySelectorAll(':scope > .screen').forEach((screen) => screen.remove());
  gameRoot?.replaceChildren();
  hudRoot?.replaceChildren();
  document.body.classList.remove(...GAME_BODY_CLASSES);
}

function createBackButton(): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = 'game-back-button';
  button.type = 'button';
  button.textContent = 'Game Select';
  button.addEventListener('click', showLanding);
  return button;
}

function showLanding(): void {
  clearCurrentGame();

  if (!appRoot || !gameRoot) {
    return;
  }

  const landing = document.createElement('main');
  landing.className = 'landing-screen';
  landing.innerHTML = `
    <section class="landing-hero" aria-labelledby="landing-title">
      <div class="landing-copy">
        <h1 id="landing-title">Choose a game</h1>
        <p>Launch arcade, warehouse, and compact puzzle games from this selector.</p>
      </div>
      <div class="game-card-grid" aria-label="Game selection">
        ${GAME_CARDS.map(renderGameCard).join('')}
      </div>
    </section>
  `;
  gameRoot.appendChild(landing);
  landing.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const gameId = target.closest<HTMLButtonElement>('[data-game]')?.dataset.game;
    GAME_CARDS.find((card) => card.id === gameId)?.start();
  });
}

function renderGameCard(card: GameCard): string {
  return `
    <button class="game-card ${card.className}" type="button" data-game="${card.id}">
      <span class="game-card-art ${card.id}-art" aria-hidden="true">${card.art}</span>
      <span class="game-card-body">
        <strong>${card.title}</strong>
        <span>${card.description}</span>
      </span>
    </button>
  `;
}

function renderPuzzleCardArt(first: string, second: string, third: string): string {
  return `
    <span class="puzzle-art-grid">
      <span>${first}</span><span></span><span>${second}</span>
      <span></span><span class="is-hot">${third}</span><span></span>
      <span>${second}</span><span></span><span>${first}</span>
    </span>
  `;
}

function startMountedPuzzle(mount: (root: HTMLElement) => MountedGameState): void {
  clearCurrentGame();
  if (!gameRoot) {
    return;
  }
  document.body.classList.add('is-playing-puzzle');
  mountedGameState = mount(gameRoot);
}

function startSuperStarTrek(): void {
  clearCurrentGame();
  if (!gameRoot) {
    return;
  }
  document.body.classList.add('is-playing-trek');
  mountedGameState = mountSuperStarTrek(gameRoot, showLanding);
}

function startPageSurvivor(): void {
  clearCurrentGame();
  document.body.classList.add('is-playing-page-survivor');
  phaserGame = new Phaser.Game(pageSurvivorConfig);
  hudRoot?.appendChild(createBackButton());
}

function startMissileCommand(): void {
  clearCurrentGame();

  if (!gameRoot || !hudRoot) {
    return;
  }

  document.body.classList.add('is-playing-missile-command');
  const root = document.createElement('main');
  root.className = 'missile-command-game';
  root.innerHTML = `
    <section class="missile-stage" aria-label="Missile Command">
      <canvas class="missile-canvas" data-canvas></canvas>
      <div class="missile-hud">
        <div><span>Score</span><strong data-score>0</strong></div>
        <div><span>Wave</span><strong data-wave>1</strong></div>
        <div><span>Cities</span><strong data-cities>6</strong></div>
        <div><span>Missiles</span><strong data-ammo>30</strong></div>
      </div>
      <div class="missile-controls">
        <button class="missile-control-button" type="button" data-pause>Pause</button>
        <button class="missile-control-button" type="button" data-menu>Main Menu</button>
      </div>
      <div class="missile-help" data-help>Move mouse to aim. A / S / D: fire from left / center / right base</div>
      <div class="missile-pause-banner" data-paused hidden>Paused</div>
      <div class="missile-result" data-result hidden>
        <h1>Game Over</h1>
        <p data-result-text></p>
        <button class="primary-button" type="button" data-retry>Retry</button>
      </div>
    </section>
  `;
  gameRoot.appendChild(root);

  const canvas = root.querySelector<HTMLCanvasElement>('[data-canvas]');
  const context = canvas?.getContext('2d');
  const scoreEl = root.querySelector<HTMLElement>('[data-score]');
  const waveEl = root.querySelector<HTMLElement>('[data-wave]');
  const citiesEl = root.querySelector<HTMLElement>('[data-cities]');
  const ammoEl = root.querySelector<HTMLElement>('[data-ammo]');
  const result = root.querySelector<HTMLElement>('[data-result]');
  const resultText = root.querySelector<HTMLElement>('[data-result-text]');
  const retry = root.querySelector<HTMLButtonElement>('[data-retry]');
  const pauseButton = root.querySelector<HTMLButtonElement>('[data-pause]');
  const menuButton = root.querySelector<HTMLButtonElement>('[data-menu]');
  const pausedBanner = root.querySelector<HTMLElement>('[data-paused]');
  const helpText = root.querySelector<HTMLElement>('[data-help]');

  if (!canvas || !context) {
    return;
  }

  let state = createMissileCommandState({ width: 900, height: 600 });
  let isMobile = isMobileMissileCommandMode();
  let animationId = 0;
  let lastFrame = performance.now();
  let isPaused = false;
  let lastTouchFireAt = 0;
  let pointer = { x: 450, y: 210 };
  if (helpText && isMobile) {
    helpText.textContent = 'Tap to aim and fire. The best base is selected automatically.';
  }

  const resize = (): void => {
    const rect = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * scale));
    canvas.height = Math.max(1, Math.floor(rect.height * scale));
    context.setTransform(scale, 0, 0, scale, 0, 0);
    resizeMissileCommandState(state, rect.width, rect.height);
    isMobile = isMobileMissileCommandMode();
    if (helpText) {
      helpText.textContent = isMobile
        ? 'Tap to aim and fire. The best base is selected automatically.'
        : 'Move mouse to aim. A / S / D: fire from left / center / right base';
    }
  };

  const resizeMissileCommandState = (currentState: MissileCommandState, width: number, height: number): void => {
    if (width <= 0 || height <= 0) {
      return;
    }
    const scaleX = width / currentState.width;
    const scaleY = height / currentState.height;
    currentState.enemies.forEach((enemy) => {
      scalePoint(enemy.start, scaleX, scaleY);
      scalePoint(enemy.position, scaleX, scaleY);
      scalePoint(enemy.target, scaleX, scaleY);
    });
    currentState.playerMissiles.forEach((missile) => {
      scalePoint(missile.start, scaleX, scaleY);
      scalePoint(missile.position, scaleX, scaleY);
      scalePoint(missile.target, scaleX, scaleY);
    });
    currentState.explosions.forEach((explosion) => {
      scalePoint(explosion.position, scaleX, scaleY);
    });
    currentState.width = width;
    currentState.height = height;
    layoutMissileCommandDefenses(currentState);
    pointer = clampAimPoint(currentState, pointer);
  };

  const pointermove = (event: PointerEvent): void => {
    const rect = canvas.getBoundingClientRect();
    pointer = clampAimPoint(state, {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  };

  const pointerdown = (event: PointerEvent): void => {
    if (!isMobile || isPaused || state.status !== 'playing') {
      return;
    }
    event.preventDefault();
    const now = performance.now();
    if (now - lastTouchFireAt < 180) {
      return;
    }
    lastTouchFireAt = now;
    const rect = canvas.getBoundingClientRect();
    pointer = clampAimPoint(state, {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
    const launcher = chooseMobileLauncher(state, pointer);
    if (launcher) {
      firePlayerMissile(state, launcher.key, pointer);
    }
  };

  const keydown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    if (key === 'p') {
      toggleMissilePause();
      return;
    }
    if (key !== 'a' && key !== 's' && key !== 'd') {
      return;
    }
    event.preventDefault();
    if (!isPaused) {
      firePlayerMissile(state, key as LauncherKey, pointer);
    }
  };

  const toggleMissilePause = (): void => {
    isPaused = !isPaused;
    if (pauseButton) {
      pauseButton.textContent = isPaused ? 'Resume' : 'Pause';
      pauseButton.setAttribute('aria-pressed', String(isPaused));
    }
    if (pausedBanner) {
      pausedBanner.hidden = !isPaused;
    }
  };

  const loop = (now: number): void => {
    const delta = Math.min(now - lastFrame, 40);
    lastFrame = now;
    if (!isPaused) {
      updateMissileCommand(state, delta);
    }
    drawMissileCommand(context, state, pointer, isPaused);
    updateMissileHud(state, scoreEl, waveEl, citiesEl, ammoEl);

    if (state.status === 'gameOver') {
      if (result && resultText) {
        resultText.textContent = `Score ${state.score}. Wave ${state.wave}.`;
        result.hidden = false;
      }
      return;
    }

    animationId = requestAnimationFrame(loop);
  };

  retry?.addEventListener('click', startMissileCommand);
  pauseButton?.addEventListener('click', toggleMissilePause);
  menuButton?.addEventListener('click', showLanding);
  canvas.addEventListener('pointermove', pointermove);
  canvas.addEventListener('pointerdown', pointerdown);
  window.addEventListener('resize', resize);
  window.addEventListener('keydown', keydown);
  resize();
  animationId = requestAnimationFrame(loop);

  mountedGameState = {
    cleanup: () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener('pointermove', pointermove);
      canvas.removeEventListener('pointerdown', pointerdown);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', keydown);
      root.remove();
    },
  };
}

function startSokoban(): void {
  clearCurrentGame();

  if (!gameRoot) {
    return;
  }

  document.body.classList.add('is-playing-sokoban');
  const root = document.createElement('main');
  root.className = 'sokoban-game';
  root.innerHTML = `
    <section class="sokoban-shell" aria-label="Sokoban">
      <header class="sokoban-topbar">
        <div>
          <span>Sokoban</span>
          <strong data-level>Level 1 / ${getSokobanLevelCount()}</strong>
        </div>
        <div>
          <span>Moves</span>
          <strong data-moves>0</strong>
        </div>
        <nav class="sokoban-actions" aria-label="Sokoban controls">
          <button class="sokoban-button" type="button" data-action="undo">Undo</button>
          <button class="sokoban-button" type="button" data-action="reset">Reset</button>
          <button class="sokoban-button" type="button" data-action="menu">Main Menu</button>
        </nav>
      </header>
      <div class="sokoban-board-wrap">
        <div class="sokoban-board" data-board role="grid" aria-label="Sokoban board"></div>
        <div class="sokoban-complete" data-complete hidden>
          <h1>Level Clear</h1>
          <p data-complete-text></p>
          <button class="primary-button" type="button" data-action="next">Next Level</button>
        </div>
      </div>
      <div class="sokoban-help">WASD / Arrow keys move. Z undo. R reset.</div>
      <div class="sokoban-pad" aria-label="Touch movement controls">
        <button class="sokoban-pad-button up" type="button" data-move="up">Up</button>
        <button class="sokoban-pad-button left" type="button" data-move="left">Left</button>
        <button class="sokoban-pad-button down" type="button" data-move="down">Down</button>
        <button class="sokoban-pad-button right" type="button" data-move="right">Right</button>
      </div>
    </section>
  `;
  gameRoot.appendChild(root);

  const board = root.querySelector<HTMLElement>('[data-board]');
  const levelEl = root.querySelector<HTMLElement>('[data-level]');
  const movesEl = root.querySelector<HTMLElement>('[data-moves]');
  const complete = root.querySelector<HTMLElement>('[data-complete]');
  const completeText = root.querySelector<HTMLElement>('[data-complete-text]');
  let state = createSokobanState(0);

  const render = (): void => {
    renderSokoban(root, state, board, levelEl, movesEl, complete, completeText);
  };

  const tryMove = (direction: SokobanDirection): void => {
    if (moveSokoban(state, direction)) {
      render();
    }
  };

  const handleAction = (action: string | undefined): void => {
    if (action === 'undo') {
      undoSokobanMove(state);
      render();
      return;
    }
    if (action === 'reset') {
      resetSokobanLevel(state);
      render();
      return;
    }
    if (action === 'next') {
      nextSokobanLevel(state);
      render();
      return;
    }
    if (action === 'menu') {
      showLanding();
    }
  };

  const click = (event: MouseEvent): void => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const moveButton = target.closest<HTMLButtonElement>('[data-move]');
    const move = moveButton?.dataset.move;
    if (isSokobanDirection(move)) {
      tryMove(move);
      return;
    }
    handleAction(target.closest<HTMLButtonElement>('[data-action]')?.dataset.action);
  };

  const keydown = (event: KeyboardEvent): void => {
    const direction = getSokobanDirectionFromKey(event.key);
    if (direction) {
      event.preventDefault();
      tryMove(direction);
      return;
    }
    if (event.key.toLowerCase() === 'z') {
      event.preventDefault();
      undoSokobanMove(state);
      render();
      return;
    }
    if (event.key.toLowerCase() === 'r') {
      event.preventDefault();
      resetSokobanLevel(state);
      render();
      return;
    }
    if (event.key === 'Enter' && state.status === 'complete') {
      event.preventDefault();
      nextSokobanLevel(state);
      render();
    }
  };

  root.addEventListener('click', click);
  window.addEventListener('keydown', keydown);
  render();

  mountedGameState = {
    cleanup: () => {
      root.removeEventListener('click', click);
      window.removeEventListener('keydown', keydown);
      root.remove();
    },
  };
}

function renderSokoban(
  root: HTMLElement,
  state: SokobanState,
  board: HTMLElement | null,
  levelEl: HTMLElement | null,
  movesEl: HTMLElement | null,
  complete: HTMLElement | null,
  completeText: HTMLElement | null,
): void {
  if (levelEl) {
    levelEl.textContent = `Level ${state.levelIndex + 1} / ${getSokobanLevelCount()}`;
  }
  if (movesEl) {
    movesEl.textContent = String(state.moves);
  }
  if (complete) {
    complete.hidden = state.status !== 'complete';
  }
  if (completeText) {
    completeText.textContent = `Solved in ${state.moves} moves.`;
  }
  root.querySelector<HTMLButtonElement>('[data-action="undo"]')?.toggleAttribute('disabled', state.history.length === 0);

  if (!board) {
    return;
  }

  board.style.setProperty('--sokoban-cols', String(state.width));
  board.style.setProperty('--sokoban-rows', String(state.height));
  const cells: string[] = [];
  for (let y = 0; y < state.height; y += 1) {
    for (let x = 0; x < state.width; x += 1) {
      const tile = getSokobanTile(state, x, y);
      cells.push(
        `<span class="sokoban-tile ${getSokobanTileClass(tile)}" role="gridcell" aria-label="${getSokobanTileLabel(tile)}"></span>`,
      );
    }
  }
  board.innerHTML = cells.join('');
}

function getSokobanDirectionFromKey(key: string): SokobanDirection | undefined {
  const normalized = key.toLowerCase();
  if (normalized === 'arrowup' || normalized === 'w') return 'up';
  if (normalized === 'arrowdown' || normalized === 's') return 'down';
  if (normalized === 'arrowleft' || normalized === 'a') return 'left';
  if (normalized === 'arrowright' || normalized === 'd') return 'right';
  return undefined;
}

function isSokobanDirection(value: string | undefined): value is SokobanDirection {
  return value === 'up' || value === 'down' || value === 'left' || value === 'right';
}

function getSokobanTileClass(tile: SokobanTile): string {
  return `is-${tile.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
}

function getSokobanTileLabel(tile: SokobanTile): string {
  if (tile === 'boxOnGoal') return 'box on goal';
  if (tile === 'playerOnGoal') return 'player on goal';
  return tile;
}

function isMobileMissileCommandMode(): boolean {
  return (
    window.matchMedia('(max-width: 720px)').matches ||
    window.matchMedia('(pointer: coarse)').matches
  );
}

function chooseMobileLauncher(
  state: MissileCommandState,
  target: { x: number; y: number },
): MissileCommandState['launchers'][number] | undefined {
  return state.launchers
    .filter((launcher) => launcher.alive && launcher.ammo > 0)
    .map((launcher) => ({
      launcher,
      distance: Math.abs(launcher.position.x - target.x),
    }))
    .sort((a, b) => a.distance - b.distance)[0]?.launcher;
}

function clampAimPoint(state: MissileCommandState, point: { x: number; y: number }): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(state.width, point.x)),
    y: Math.max(0, Math.min(state.height - 80, point.y)),
  };
}

function updateMissileHud(
  state: MissileCommandState,
  scoreEl: HTMLElement | null,
  waveEl: HTMLElement | null,
  citiesEl: HTMLElement | null,
  ammoEl: HTMLElement | null,
): void {
  if (scoreEl) scoreEl.textContent = String(state.score);
  if (waveEl) waveEl.textContent = String(state.wave);
  if (citiesEl) citiesEl.textContent = String(state.cities.filter((city) => city.alive).length);
  if (ammoEl) ammoEl.textContent = String(state.launchers.reduce((total, launcher) => total + launcher.ammo, 0));
}

function scalePoint(point: { x: number; y: number }, scaleX: number, scaleY: number): void {
  point.x *= scaleX;
  point.y *= scaleY;
}

function layoutMissileCommandDefenses(state: MissileCommandState): void {
  const groundY = state.height - 42;
  const cityY = state.height - 34;
  state.cities.forEach((city, index) => {
    city.position.x = state.width * (0.16 + index * 0.136);
    city.position.y = cityY;
  });
  const launcherXs = [0.08, 0.5, 0.92];
  state.launchers.forEach((launcher, index) => {
    launcher.position.x = state.width * launcherXs[index];
    launcher.position.y = groundY;
  });
}

function drawMissileCommand(
  context: CanvasRenderingContext2D,
  state: MissileCommandState,
  pointer: { x: number; y: number },
  isPaused: boolean,
): void {
  context.clearRect(0, 0, state.width, state.height);
  context.fillStyle = '#050807';
  context.fillRect(0, 0, state.width, state.height);

  context.strokeStyle = 'rgba(87, 255, 126, 0.14)';
  context.lineWidth = 1;
  for (let x = 0; x < state.width; x += 36) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, state.height);
    context.stroke();
  }
  for (let y = 0; y < state.height; y += 36) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(state.width, y);
    context.stroke();
  }

  context.strokeStyle = '#46ff6f';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(0, state.height - 28);
  context.lineTo(state.width, state.height - 28);
  context.stroke();

  for (const city of state.cities) {
    context.fillStyle = city.alive ? '#46ff6f' : '#233025';
    context.fillRect(city.position.x - 20, city.position.y - 16, 40, 16);
    context.fillRect(city.position.x - 12, city.position.y - 28, 10, 12);
    context.fillRect(city.position.x + 4, city.position.y - 24, 12, 8);
  }

  for (const launcher of state.launchers) {
    context.fillStyle = launcher.alive ? '#f5e86b' : '#3a3324';
    context.beginPath();
    context.moveTo(launcher.position.x, launcher.position.y - 32);
    context.lineTo(launcher.position.x - 28, launcher.position.y);
    context.lineTo(launcher.position.x + 28, launcher.position.y);
    context.closePath();
    context.fill();
    context.fillStyle = '#050807';
    context.font = '700 14px Inter, sans-serif';
    context.textAlign = 'center';
    context.fillText(launcher.key.toUpperCase(), launcher.position.x, launcher.position.y - 8);
    context.fillStyle = launcher.alive ? '#f7fbf1' : '#716a54';
    context.font = '800 12px Inter, sans-serif';
    context.fillText(`${launcher.ammo} left`, launcher.position.x, launcher.position.y + 18);
  }

  for (const enemy of state.enemies) {
    context.strokeStyle = '#ff5d5d';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(enemy.start.x, enemy.start.y);
    context.lineTo(enemy.position.x, enemy.position.y);
    context.stroke();
  }

  for (const missile of state.playerMissiles) {
    context.strokeStyle = '#64d8ff';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(missile.start.x, missile.start.y);
    context.lineTo(missile.position.x, missile.position.y);
    context.stroke();
  }

  for (const explosion of state.explosions) {
    drawMissileExplosion(context, explosion);
  }

  drawAimReticle(context, pointer);

  if (isPaused) {
    context.fillStyle = 'rgba(5, 8, 7, 0.36)';
    context.fillRect(0, 0, state.width, state.height);
  }
}

function drawAimReticle(context: CanvasRenderingContext2D, pointer: { x: number; y: number }): void {
  context.strokeStyle = 'rgba(245, 232, 107, 0.86)';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(pointer.x - 14, pointer.y);
  context.lineTo(pointer.x + 14, pointer.y);
  context.moveTo(pointer.x, pointer.y - 14);
  context.lineTo(pointer.x, pointer.y + 14);
  context.stroke();
  context.beginPath();
  context.arc(pointer.x, pointer.y, 9, 0, Math.PI * 2);
  context.stroke();
}

function drawMissileExplosion(
  context: CanvasRenderingContext2D,
  explosion: MissileCommandState['explosions'][number],
): void {
  const radius = getExplosionRadius(explosion);
  const progress = Math.min(1, explosion.ageMs / explosion.durationMs);
  const alpha = Math.max(0, 1 - progress);
  const color = explosion.source === 'player' ? '245, 232, 107' : '255, 93, 93';

  const gradient = context.createRadialGradient(
    explosion.position.x,
    explosion.position.y,
    0,
    explosion.position.x,
    explosion.position.y,
    Math.max(radius, 1),
  );
  gradient.addColorStop(0, `rgba(${color}, ${0.34 * alpha})`);
  gradient.addColorStop(0.55, `rgba(${color}, ${0.14 * alpha})`);
  gradient.addColorStop(1, `rgba(${color}, 0)`);
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(explosion.position.x, explosion.position.y, radius, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = `rgba(${color}, ${0.92 * alpha})`;
  context.lineWidth = 3;
  context.beginPath();
  context.arc(explosion.position.x, explosion.position.y, radius, 0, Math.PI * 2);
  context.stroke();

  context.strokeStyle = `rgba(255, 255, 255, ${0.5 * alpha})`;
  context.lineWidth = 1;
  context.beginPath();
  context.arc(explosion.position.x, explosion.position.y, radius * 0.58, 0, Math.PI * 2);
  context.stroke();

  for (let i = 0; i < 10; i += 1) {
    const angle = progress * Math.PI * 3 + (Math.PI * 2 * i) / 10 + explosion.id * 0.17;
    const inner = radius * 0.32;
    const outer = radius * (0.72 + (i % 3) * 0.1);
    context.strokeStyle = `rgba(${color}, ${0.62 * alpha})`;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(explosion.position.x + Math.cos(angle) * inner, explosion.position.y + Math.sin(angle) * inner);
    context.lineTo(explosion.position.x + Math.cos(angle) * outer, explosion.position.y + Math.sin(angle) * outer);
    context.stroke();
  }
}

showLanding();
