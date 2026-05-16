# Missile Command Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Pop Star game slot with a classic Missile Command style wave-defense game controlled by `A`, `S`, and `D`.

**Architecture:** Keep Page Survivor's Phaser runtime unchanged. Move the new Missile Command simulation into a small TypeScript module and have `src/main.ts` only mount, update, draw, and clean up the canvas game. Use DOM for the shared landing page, back button, HUD labels, and game-over overlay.

**Tech Stack:** TypeScript, Vite, DOM Canvas 2D, Jest with ts-jest.

---

## File Structure

- Modify: `src/main.ts`
  - Rename Pop Star state and launcher to Missile Command.
  - Replace the Pop Star landing card with Missile Command copy and art.
  - Mount a `<canvas>` game surface and connect keyboard input to the simulation module.
  - Cleanly stop animation frames, event listeners, and timers when returning to the landing page.
- Create: `src/games/missile-command.ts`
  - Own the deterministic game state, wave spawning, launcher ammo, projectile updates, explosion collision, city/base destruction, scoring, and game-over rules.
  - Export small functions that can be tested without DOM or Canvas.
- Create: `__tests__/games/missile-command.test.ts`
  - Cover launcher key mapping, explosion interception, city destruction, wave advancement, and game-over behavior.
- Modify: `src/style.css`
  - Replace Pop Star classes with Missile Command classes.
  - Add landing-card art and classic black/neon game styling.
  - Keep the existing Page Survivor and shared landing styles intact.

---

### Task 1: Add Missile Command Simulation Types and Initial State

**Files:**
- Create: `src/games/missile-command.ts`
- Test: `__tests__/games/missile-command.test.ts`

- [ ] **Step 1: Write the failing initial-state test**

Create `__tests__/games/missile-command.test.ts`:

```ts
import { createMissileCommandState } from '../../src/games/missile-command';

describe('missile command simulation', () => {
  test('creates 6 cities and 3 launchers for wave 1', () => {
    const state = createMissileCommandState({ width: 900, height: 600 });

    expect(state.wave).toBe(1);
    expect(state.score).toBe(0);
    expect(state.status).toBe('playing');
    expect(state.cities).toHaveLength(6);
    expect(state.launchers).toHaveLength(3);
    expect(state.launchers.map((launcher) => launcher.key)).toEqual(['a', 's', 'd']);
    expect(state.launchers.every((launcher) => launcher.ammo === 10)).toBe(true);
    expect(state.cities.every((city) => city.alive)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- __tests__/games/missile-command.test.ts`

Expected: FAIL because `../../src/games/missile-command` does not exist.

- [ ] **Step 3: Add the minimal simulation module**

Create `src/games/missile-command.ts`:

```ts
export type MissileCommandStatus = 'playing' | 'waveComplete' | 'gameOver';

export type Vec2 = {
  x: number;
  y: number;
};

export type City = {
  id: number;
  position: Vec2;
  alive: boolean;
};

export type LauncherKey = 'a' | 's' | 'd';

export type Launcher = {
  id: number;
  key: LauncherKey;
  position: Vec2;
  ammo: number;
  alive: boolean;
};

export type EnemyMissile = {
  id: number;
  start: Vec2;
  position: Vec2;
  target: Vec2;
  speed: number;
  alive: boolean;
};

export type PlayerMissile = {
  id: number;
  start: Vec2;
  position: Vec2;
  target: Vec2;
  speed: number;
  active: boolean;
};

export type Explosion = {
  id: number;
  position: Vec2;
  ageMs: number;
  durationMs: number;
  maxRadius: number;
};

export type MissileCommandState = {
  width: number;
  height: number;
  wave: number;
  score: number;
  status: MissileCommandStatus;
  cities: City[];
  launchers: Launcher[];
  enemies: EnemyMissile[];
  playerMissiles: PlayerMissile[];
  explosions: Explosion[];
  nextId: number;
  waveRemainingToSpawn: number;
  spawnCooldownMs: number;
};

export function createMissileCommandState(size: { width: number; height: number }): MissileCommandState {
  const groundY = size.height - 42;
  const cityY = size.height - 34;

  return {
    width: size.width,
    height: size.height,
    wave: 1,
    score: 0,
    status: 'playing',
    cities: [0, 1, 2, 3, 4, 5].map((index) => ({
      id: index,
      position: {
        x: size.width * (0.16 + index * 0.136),
        y: cityY,
      },
      alive: true,
    })),
    launchers: [
      { id: 0, key: 'a', position: { x: size.width * 0.08, y: groundY }, ammo: 10, alive: true },
      { id: 1, key: 's', position: { x: size.width * 0.5, y: groundY }, ammo: 10, alive: true },
      { id: 2, key: 'd', position: { x: size.width * 0.92, y: groundY }, ammo: 10, alive: true },
    ],
    enemies: [],
    playerMissiles: [],
    explosions: [],
    nextId: 1,
    waveRemainingToSpawn: 8,
    spawnCooldownMs: 500,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- __tests__/games/missile-command.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/games/missile-command.ts __tests__/games/missile-command.test.ts
git commit -m "Add missile command simulation state"
```

---

### Task 2: Add Launcher Firing Logic for A/S/D

**Files:**
- Modify: `src/games/missile-command.ts`
- Test: `__tests__/games/missile-command.test.ts`

- [ ] **Step 1: Write failing launcher tests**

Append these tests inside the existing `describe` block:

```ts
  test('fires from the launcher mapped to the pressed key', () => {
    const state = createMissileCommandState({ width: 900, height: 600 });

    const fired = firePlayerMissile(state, 's', { x: 450, y: 180 });

    expect(fired).toBe(true);
    expect(state.launchers[1].ammo).toBe(9);
    expect(state.playerMissiles).toHaveLength(1);
    expect(state.playerMissiles[0].start).toEqual(state.launchers[1].position);
    expect(state.playerMissiles[0].target).toEqual({ x: 450, y: 180 });
  });

  test('does not fire from a destroyed or empty launcher', () => {
    const state = createMissileCommandState({ width: 900, height: 600 });
    state.launchers[0].ammo = 0;
    state.launchers[2].alive = false;

    expect(firePlayerMissile(state, 'a', { x: 100, y: 100 })).toBe(false);
    expect(firePlayerMissile(state, 'd', { x: 800, y: 100 })).toBe(false);
    expect(state.playerMissiles).toHaveLength(0);
  });
```

Update the import:

```ts
import { createMissileCommandState, firePlayerMissile } from '../../src/games/missile-command';
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- __tests__/games/missile-command.test.ts`

Expected: FAIL because `firePlayerMissile` is not exported.

- [ ] **Step 3: Implement launcher firing**

Add to `src/games/missile-command.ts`:

```ts
export function firePlayerMissile(state: MissileCommandState, key: LauncherKey, target: Vec2): boolean {
  if (state.status !== 'playing') {
    return false;
  }

  const launcher = state.launchers.find((candidate) => candidate.key === key);
  if (!launcher || !launcher.alive || launcher.ammo <= 0) {
    return false;
  }

  launcher.ammo -= 1;
  state.playerMissiles.push({
    id: state.nextId++,
    start: { ...launcher.position },
    position: { ...launcher.position },
    target: clampTarget(state, target),
    speed: 520,
    active: true,
  });
  return true;
}

function clampTarget(state: MissileCommandState, target: Vec2): Vec2 {
  return {
    x: Math.max(0, Math.min(state.width, target.x)),
    y: Math.max(0, Math.min(state.height - 80, target.y)),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- __tests__/games/missile-command.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/games/missile-command.ts __tests__/games/missile-command.test.ts
git commit -m "Add missile command launcher firing"
```

---

### Task 3: Add Update Loop, Explosions, and Enemy Interception

**Files:**
- Modify: `src/games/missile-command.ts`
- Test: `__tests__/games/missile-command.test.ts`

- [ ] **Step 1: Write failing interception test**

Append:

```ts
  test('player explosion destroys enemy missiles and awards score', () => {
    const state = createMissileCommandState({ width: 900, height: 600 });
    state.enemies.push({
      id: 101,
      start: { x: 450, y: 0 },
      position: { x: 450, y: 200 },
      target: { x: 450, y: 566 },
      speed: 80,
      alive: true,
    });
    state.explosions.push({
      id: 102,
      position: { x: 450, y: 200 },
      ageMs: 120,
      durationMs: 700,
      maxRadius: 58,
    });

    updateMissileCommand(state, 16);

    expect(state.enemies).toHaveLength(0);
    expect(state.score).toBe(100);
  });
```

Update the import:

```ts
import {
  createMissileCommandState,
  firePlayerMissile,
  updateMissileCommand,
} from '../../src/games/missile-command';
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- __tests__/games/missile-command.test.ts`

Expected: FAIL because `updateMissileCommand` is not exported.

- [ ] **Step 3: Implement movement, explosion creation, and interception**

Add to `src/games/missile-command.ts`:

```ts
export function updateMissileCommand(state: MissileCommandState, deltaMs: number): void {
  if (state.status !== 'playing') {
    return;
  }

  updatePlayerMissiles(state, deltaMs);
  updateEnemyMissiles(state, deltaMs);
  updateExplosions(state, deltaMs);
  resolveExplosionHits(state);
  resolveWaveState(state);
}

function updatePlayerMissiles(state: MissileCommandState, deltaMs: number): void {
  for (const missile of state.playerMissiles) {
    moveToward(missile.position, missile.target, missile.speed, deltaMs);
    if (distance(missile.position, missile.target) <= 4) {
      missile.active = false;
      state.explosions.push({
        id: state.nextId++,
        position: { ...missile.target },
        ageMs: 0,
        durationMs: 700,
        maxRadius: 58,
      });
    }
  }
  state.playerMissiles = state.playerMissiles.filter((missile) => missile.active);
}

function updateEnemyMissiles(state: MissileCommandState, deltaMs: number): void {
  for (const enemy of state.enemies) {
    moveToward(enemy.position, enemy.target, enemy.speed, deltaMs);
    if (distance(enemy.position, enemy.target) <= 5) {
      enemy.alive = false;
      destroyTargetAt(state, enemy.target);
      state.explosions.push({
        id: state.nextId++,
        position: { ...enemy.target },
        ageMs: 0,
        durationMs: 520,
        maxRadius: 42,
      });
    }
  }
  state.enemies = state.enemies.filter((enemy) => enemy.alive);
}

function updateExplosions(state: MissileCommandState, deltaMs: number): void {
  for (const explosion of state.explosions) {
    explosion.ageMs += deltaMs;
  }
  state.explosions = state.explosions.filter((explosion) => explosion.ageMs < explosion.durationMs);
}

function resolveExplosionHits(state: MissileCommandState): void {
  for (const enemy of state.enemies) {
    const hit = state.explosions.some((explosion) => {
      return distance(enemy.position, explosion.position) <= getExplosionRadius(explosion);
    });
    if (hit) {
      enemy.alive = false;
      state.score += 100;
    }
  }
  state.enemies = state.enemies.filter((enemy) => enemy.alive);
}

export function getExplosionRadius(explosion: Explosion): number {
  const progress = Math.min(1, explosion.ageMs / explosion.durationMs);
  const pulse = progress < 0.55 ? progress / 0.55 : (1 - progress) / 0.45;
  return Math.max(0, explosion.maxRadius * pulse);
}

function moveToward(position: Vec2, target: Vec2, speed: number, deltaMs: number): void {
  const dx = target.x - position.x;
  const dy = target.y - position.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) {
    return;
  }
  const step = Math.min(length, (speed * deltaMs) / 1000);
  position.x += (dx / length) * step;
  position.y += (dy / length) * step;
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
```

Also add temporary empty helpers below, to be completed in later tasks:

```ts
function destroyTargetAt(_state: MissileCommandState, _target: Vec2): void {
}

function resolveWaveState(_state: MissileCommandState): void {
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- __tests__/games/missile-command.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/games/missile-command.ts __tests__/games/missile-command.test.ts
git commit -m "Add missile command interception"
```

---

### Task 4: Add Enemy Spawning, City/Base Hits, Wave Advancement, and Game Over

**Files:**
- Modify: `src/games/missile-command.ts`
- Test: `__tests__/games/missile-command.test.ts`

- [ ] **Step 1: Write failing progression tests**

Append:

```ts
  test('enemy missile impact destroys the targeted city', () => {
    const state = createMissileCommandState({ width: 900, height: 600 });
    const target = state.cities[0].position;
    state.enemies.push({
      id: 201,
      start: { x: target.x, y: 0 },
      position: { x: target.x, y: target.y - 1 },
      target: { ...target },
      speed: 90,
      alive: true,
    });

    updateMissileCommand(state, 32);

    expect(state.cities[0].alive).toBe(false);
  });

  test('advances to the next wave after all spawned enemies are gone', () => {
    const state = createMissileCommandState({ width: 900, height: 600 });
    state.waveRemainingToSpawn = 0;
    state.spawnCooldownMs = 0;
    state.enemies = [];
    state.playerMissiles = [];
    state.explosions = [];

    updateMissileCommand(state, 16);

    expect(state.wave).toBe(2);
    expect(state.status).toBe('playing');
    expect(state.waveRemainingToSpawn).toBe(11);
    expect(state.launchers.every((launcher) => launcher.ammo === 10)).toBe(true);
  });

  test('ends the game when all cities are destroyed', () => {
    const state = createMissileCommandState({ width: 900, height: 600 });
    state.cities.forEach((city) => {
      city.alive = false;
    });

    updateMissileCommand(state, 16);

    expect(state.status).toBe('gameOver');
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- __tests__/games/missile-command.test.ts`

Expected: FAIL because city destruction and wave advancement helpers are still empty.

- [ ] **Step 3: Implement spawning and progression**

Replace the empty helpers in `src/games/missile-command.ts` with:

```ts
function destroyTargetAt(state: MissileCommandState, target: Vec2): void {
  const allTargets = [...state.cities, ...state.launchers];
  const victim = allTargets.find((candidate) => {
    return candidate.alive && distance(candidate.position, target) <= 18;
  });
  if (victim) {
    victim.alive = false;
  }
}

function resolveWaveState(state: MissileCommandState): void {
  if (state.cities.every((city) => !city.alive)) {
    state.status = 'gameOver';
    return;
  }

  if (
    state.waveRemainingToSpawn <= 0 &&
    state.enemies.length === 0 &&
    state.playerMissiles.length === 0 &&
    state.explosions.length === 0
  ) {
    state.wave += 1;
    state.waveRemainingToSpawn = getEnemyCountForWave(state.wave);
    state.spawnCooldownMs = 650;
    state.launchers.forEach((launcher) => {
      if (launcher.alive) {
        launcher.ammo = 10;
      }
    });
  }
}

export function spawnEnemyMissile(state: MissileCommandState): boolean {
  if (state.status !== 'playing' || state.waveRemainingToSpawn <= 0) {
    return false;
  }

  const targets = [...state.cities, ...state.launchers].filter((target) => target.alive);
  if (targets.length === 0) {
    state.status = 'gameOver';
    return false;
  }

  const target = targets[Math.floor(Math.random() * targets.length)];
  const start = { x: Math.random() * state.width, y: 0 };
  state.enemies.push({
    id: state.nextId++,
    start,
    position: { ...start },
    target: { ...target.position },
    speed: 44 + state.wave * 8,
    alive: true,
  });
  state.waveRemainingToSpawn -= 1;
  return true;
}

function getEnemyCountForWave(wave: number): number {
  return 8 + (wave - 1) * 3;
}
```

Add spawning near the top of `updateMissileCommand`, after the status guard:

```ts
  state.spawnCooldownMs -= deltaMs;
  if (state.spawnCooldownMs <= 0 && state.waveRemainingToSpawn > 0) {
    spawnEnemyMissile(state);
    state.spawnCooldownMs = Math.max(220, 950 - state.wave * 70);
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- __tests__/games/missile-command.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/games/missile-command.ts __tests__/games/missile-command.test.ts
git commit -m "Add missile command waves and damage"
```

---

### Task 5: Replace Pop Star Mounting with Missile Command Canvas

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Rename state and imports**

At the top of `src/main.ts`, replace the Pop Star type with:

```ts
import {
  createMissileCommandState,
  firePlayerMissile,
  getExplosionRadius,
  updateMissileCommand,
  type LauncherKey,
  type MissileCommandState,
} from './games/missile-command';

type MountedGameState = {
  cleanup: () => void;
};
```

Replace:

```ts
let popStarState: PopStarState | undefined;
```

with:

```ts
let mountedGameState: MountedGameState | undefined;
```

- [ ] **Step 2: Update cleanup**

In `clearCurrentGame`, replace:

```ts
  popStarState?.cleanup();
  popStarState = undefined;
```

with:

```ts
  mountedGameState?.cleanup();
  mountedGameState = undefined;
```

Replace:

```ts
  document.body.classList.remove('is-playing-page-survivor', 'is-playing-pop-star');
```

with:

```ts
  document.body.classList.remove('is-playing-page-survivor', 'is-playing-missile-command');
```

- [ ] **Step 3: Replace landing card data and click handler**

Replace the second game button in `showLanding` with:

```html
        <button class="game-card missile-card" type="button" data-game="missile-command">
          <span class="game-card-art missile-art" aria-hidden="true">
            <span class="missile-city one"></span>
            <span class="missile-city two"></span>
            <span class="missile-city three"></span>
            <span class="missile-trail enemy"></span>
            <span class="missile-trail defender"></span>
            <span class="missile-blast"></span>
          </span>
          <span class="game-card-body">
            <strong>ミサイルコマンド</strong>
            <span>A / S / Dで左・中央・右の基地から迎撃ミサイルを発射し、都市を守るクラシック防衛ゲーム。</span>
          </span>
        </button>
```

Replace:

```ts
    if (button?.dataset.game === 'pop-star') {
      startPopStar();
    }
```

with:

```ts
    if (button?.dataset.game === 'missile-command') {
      startMissileCommand();
    }
```

- [ ] **Step 4: Replace `startPopStar` with `startMissileCommand`**

Delete the whole `startPopStar` function and add:

```ts
function startMissileCommand(): void {
  clearCurrentGame();

  if (!gameRoot || !hudRoot) {
    return;
  }

  document.body.classList.add('is-playing-missile-command');
  const root = document.createElement('main');
  root.className = 'missile-command-game';
  root.innerHTML = `
    <section class="missile-stage" aria-label="ミサイルコマンド">
      <canvas class="missile-canvas" data-canvas></canvas>
      <div class="missile-hud">
        <div><span>Score</span><strong data-score>0</strong></div>
        <div><span>Wave</span><strong data-wave>1</strong></div>
        <div><span>Cities</span><strong data-cities>6</strong></div>
        <div><span>Missiles</span><strong data-ammo>30</strong></div>
      </div>
      <div class="missile-help">A / S / D: fire from left / center / right base</div>
      <div class="missile-result" data-result hidden>
        <h1>Game Over</h1>
        <p data-result-text></p>
        <button class="primary-button" type="button" data-retry>Retry</button>
      </div>
    </section>
  `;
  gameRoot.appendChild(root);
  hudRoot.appendChild(createBackButton());

  const canvas = root.querySelector<HTMLCanvasElement>('[data-canvas]');
  const context = canvas?.getContext('2d');
  const scoreEl = root.querySelector<HTMLElement>('[data-score]');
  const waveEl = root.querySelector<HTMLElement>('[data-wave]');
  const citiesEl = root.querySelector<HTMLElement>('[data-cities]');
  const ammoEl = root.querySelector<HTMLElement>('[data-ammo]');
  const result = root.querySelector<HTMLElement>('[data-result]');
  const resultText = root.querySelector<HTMLElement>('[data-result-text]');
  const retry = root.querySelector<HTMLButtonElement>('[data-retry]');

  if (!canvas || !context) {
    return;
  }

  let state = createMissileCommandState({ width: 900, height: 600 });
  let animationId = 0;
  let lastFrame = performance.now();

  const resize = (): void => {
    const rect = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * scale));
    canvas.height = Math.max(1, Math.floor(rect.height * scale));
    context.setTransform(scale, 0, 0, scale, 0, 0);
    state.width = rect.width;
    state.height = rect.height;
  };

  const keydown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    if (key !== 'a' && key !== 's' && key !== 'd') {
      return;
    }
    event.preventDefault();
    const launcher = state.launchers.find((candidate) => candidate.key === key);
    if (!launcher) {
      return;
    }
    const target = chooseAutoTarget(state, launcher.position.x);
    firePlayerMissile(state, key as LauncherKey, target);
  };

  const loop = (now: number): void => {
    const delta = Math.min(now - lastFrame, 40);
    lastFrame = now;
    updateMissileCommand(state, delta);
    drawMissileCommand(context, state);
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
  window.addEventListener('resize', resize);
  window.addEventListener('keydown', keydown);
  resize();
  animationId = requestAnimationFrame(loop);

  mountedGameState = {
    cleanup: () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', keydown);
      root.remove();
    },
  };
}
```

- [ ] **Step 5: Add render helpers below `startMissileCommand`**

Add:

```ts
function chooseAutoTarget(state: MissileCommandState, launcherX: number): { x: number; y: number } {
  const activeEnemies = state.enemies.filter((enemy) => enemy.alive);
  const closest = activeEnemies
    .map((enemy) => ({
      enemy,
      distance: Math.abs(enemy.position.x - launcherX) + enemy.position.y * 0.25,
    }))
    .sort((a, b) => a.distance - b.distance)[0]?.enemy;

  if (closest) {
    return { ...closest.position };
  }

  return { x: launcherX, y: state.height * 0.35 };
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

function drawMissileCommand(context: CanvasRenderingContext2D, state: MissileCommandState): void {
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
    context.strokeStyle = '#f5e86b';
    context.lineWidth = 3;
    context.beginPath();
    context.arc(explosion.position.x, explosion.position.y, getExplosionRadius(explosion), 0, Math.PI * 2);
    context.stroke();
  }
}
```

- [ ] **Step 6: Run the build**

Run: `npm run build`

Expected: PASS with no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add src/main.ts
git commit -m "Replace pop star runtime with missile command"
```

---

### Task 6: Replace Pop Star Styles with Classic Missile Command UI

**Files:**
- Modify: `src/style.css`

- [ ] **Step 1: Remove Pop Star selectors**

Remove these selector groups from `src/style.css`:

```css
.pop-art
.pop-orbit
.pop-star-shape
.pop-star-shape.small
.pop-star-shape.small.one
.pop-star-shape.small.two
.pop-star-game
.pop-stage
.pop-scoreboard
.pop-scoreboard div
.pop-scoreboard span
.pop-scoreboard strong
.pop-playfield
.falling-star
.falling-star:nth-child(3n)
.falling-star:nth-child(3n + 1)
.falling-star:hover,
.falling-star:focus-visible
.falling-star.is-popped
.pop-result
.pop-result h1
.pop-result p
```

Also replace `.pop-orbit` and `.pop-star-shape` in the combined selector:

```css
.pixel-player,
.pixel-enemy,
.pixel-beam,
.pop-orbit,
.pop-star-shape {
```

with:

```css
.pixel-player,
.pixel-enemy,
.pixel-beam,
.missile-city,
.missile-trail,
.missile-blast {
```

- [ ] **Step 2: Add Missile Command landing-card styles**

Add near the existing card-art styles:

```css
.missile-art {
  background:
    linear-gradient(90deg, rgba(70, 255, 111, 0.1) 0 1px, transparent 1px 100%),
    linear-gradient(0deg, rgba(70, 255, 111, 0.1) 0 1px, transparent 1px 100%),
    linear-gradient(160deg, #050807, #102018);
  background-size: 24px 24px, 24px 24px, auto;
}

.missile-city {
  bottom: 22px;
  width: 54px;
  height: 24px;
  background: #46ff6f;
  box-shadow:
    10px -13px 0 -5px #46ff6f,
    24px -8px 0 -4px #46ff6f;
}

.missile-city.one {
  left: 14%;
}

.missile-city.two {
  left: 43%;
}

.missile-city.three {
  right: 13%;
}

.missile-trail {
  width: 124px;
  height: 2px;
  transform-origin: left center;
}

.missile-trail.enemy {
  left: 25%;
  top: 18%;
  background: #ff5d5d;
  transform: rotate(42deg);
  box-shadow: 0 0 14px rgba(255, 93, 93, 0.74);
}

.missile-trail.defender {
  left: 50%;
  bottom: 30%;
  background: #64d8ff;
  transform: rotate(-44deg);
  box-shadow: 0 0 14px rgba(100, 216, 255, 0.74);
}

.missile-blast {
  left: 52%;
  top: 36%;
  width: 62px;
  height: 62px;
  border: 3px solid #f5e86b;
  border-radius: 50%;
  box-shadow:
    0 0 18px rgba(245, 232, 107, 0.8),
    inset 0 0 18px rgba(245, 232, 107, 0.34);
}
```

- [ ] **Step 3: Add Missile Command game styles**

Add:

```css
.missile-command-game {
  width: 100%;
  height: 100%;
  color: #f7fbf1;
  background: #050807;
}

.missile-stage {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #050807;
}

.missile-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.missile-hud {
  position: absolute;
  left: 18px;
  top: 18px;
  z-index: 4;
  display: flex;
  gap: 10px;
  pointer-events: none;
}

.missile-hud div {
  min-width: 96px;
  padding: 10px 12px;
  border: 1px solid rgba(70, 255, 111, 0.28);
  border-radius: 8px;
  background: rgba(5, 8, 7, 0.78);
  box-shadow: 0 0 24px rgba(70, 255, 111, 0.12);
}

.missile-hud span {
  display: block;
  color: #96f7a8;
  font-size: 11px;
  font-weight: 800;
}

.missile-hud strong {
  display: block;
  margin-top: 2px;
  color: #f7fbf1;
  font-size: 25px;
  line-height: 1;
}

.missile-help {
  position: absolute;
  left: 18px;
  bottom: 16px;
  color: rgba(247, 251, 241, 0.68);
  font-size: 13px;
  pointer-events: none;
}

.missile-result {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 8;
  width: min(420px, calc(100% - 36px));
  transform: translate(-50%, -50%);
  padding: 26px;
  border: 1px solid rgba(70, 255, 111, 0.3);
  border-radius: 8px;
  background: rgba(5, 8, 7, 0.9);
  text-align: center;
  box-shadow: 0 0 60px rgba(70, 255, 111, 0.16);
}

.missile-result h1 {
  margin: 0 0 10px;
  font-size: 40px;
  line-height: 1;
}

.missile-result p {
  margin: 0 0 18px;
  color: #dce8d4;
  line-height: 1.7;
}
```

- [ ] **Step 4: Replace mobile Pop Star scoreboard rules**

In the `@media (max-width: 720px)` block, replace:

```css
  .pop-scoreboard {
    left: 10px;
    top: 10px;
    right: 10px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .pop-scoreboard div {
    min-width: 0;
  }
```

with:

```css
  .missile-hud {
    left: 10px;
    top: 10px;
    right: 10px;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .missile-hud div {
    min-width: 0;
    padding: 8px;
  }

  .missile-hud strong {
    font-size: 20px;
  }

  .missile-help {
    left: 10px;
    right: 82px;
    bottom: 14px;
  }
```

- [ ] **Step 5: Run the build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/style.css
git commit -m "Style missile command replacement"
```

---

### Task 7: Browser Verification and Tuning

**Files:**
- Modify if needed: `src/main.ts`
- Modify if needed: `src/games/missile-command.ts`
- Modify if needed: `src/style.css`

- [ ] **Step 1: Start the dev server**

Run: `npm run dev -- --port 5173 --strictPort`

Expected: Vite reports `Local: http://localhost:5173/`.

- [ ] **Step 2: Verify landing page**

Open: `http://127.0.0.1:5173`

Expected:
- Two cards are visible: Page Survivor and Missile Command.
- No Pop Star text or pink star art remains.
- Missile Command card copy mentions `A / S / D`.
- Mobile width still shows both cards without horizontal overflow.

- [ ] **Step 3: Verify Missile Command launch**

Click the Missile Command card.

Expected:
- The canvas fills the viewport.
- HUD shows `Score`, `Wave`, `Cities`, and `Missiles`.
- The back button returns to the landing page.
- Enemy red missiles begin falling without user input.
- Green cities and yellow bases are visible at the bottom.

- [ ] **Step 4: Verify keyboard firing**

Press `A`, `S`, and `D`.

Expected:
- Blue defense trails launch from the left, center, and right bases.
- The `Missiles` HUD count decreases by one for each successful launch.
- Explosions appear near a sensible enemy target when enemies exist.

- [ ] **Step 5: Verify gameplay outcomes**

Play until at least one enemy is intercepted and at least one city is destroyed.

Expected:
- Destroying an enemy increases `Score` by 100.
- Enemy impact darkens or removes the target city/base.
- After a wave clears, `Wave` increases and active launchers refill to 10 ammo.
- When all cities are destroyed, the game-over overlay appears with score and wave.

- [ ] **Step 6: Run final checks**

Run:

```bash
npm test -- __tests__/games/missile-command.test.ts
npm run build
```

Expected:
- Missile Command tests pass.
- Production build passes.

- [ ] **Step 7: Commit verification fixes**

If files changed during tuning:

```bash
git add src/main.ts src/games/missile-command.ts src/style.css __tests__/games/missile-command.test.ts
git commit -m "Tune missile command gameplay"
```

If no files changed, do not create an empty commit.

---

## Self-Review

- Spec coverage: The plan covers Pop Star replacement, `A/S/D` launcher controls, 6 cities, 3 bases, wave progression, classic black/neon visuals, HUD, back navigation, tests, build, and browser verification.
- Placeholder scan: No `TBD`, `TODO`, or unspecified implementation steps remain.
- Type consistency: The plan consistently uses `MissileCommandState`, `LauncherKey`, `firePlayerMissile`, `updateMissileCommand`, and `getExplosionRadius`.
