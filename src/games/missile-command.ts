export type MissileCommandStatus = 'playing' | 'gameOver';

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

export type ExplosionSource = 'player' | 'enemy';

export type Explosion = {
  id: number;
  position: Vec2;
  ageMs: number;
  durationMs: number;
  maxRadius: number;
  source: ExplosionSource;
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
  rngSeed: number;
};

export function createMissileCommandState(size: { width: number; height: number; seed?: number }): MissileCommandState {
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
    rngSeed: size.seed ?? 0x12345678,
  };
}

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

export function updateMissileCommand(state: MissileCommandState, deltaMs: number): void {
  if (state.status !== 'playing') {
    return;
  }

  if (resolveGameOverState(state)) {
    return;
  }

  state.spawnCooldownMs -= deltaMs;
  if (state.spawnCooldownMs <= 0 && state.waveRemainingToSpawn > 0) {
    spawnEnemyMissile(state);
    state.spawnCooldownMs = Math.max(220, 950 - state.wave * 70);
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
        source: 'player',
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
        source: 'enemy',
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
      return explosion.source === 'player' && distance(enemy.position, explosion.position) <= getExplosionRadius(explosion);
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

function destroyTargetAt(state: MissileCommandState, target: Vec2): void {
  const allTargets = [...state.cities, ...state.launchers];
  const victim = allTargets.find((candidate) => {
    return candidate.alive && distance(candidate.position, target) <= 18;
  });
  if (victim) {
    victim.alive = false;
  }
}

function resolveGameOverState(state: MissileCommandState): boolean {
  if (state.cities.every((city) => !city.alive)) {
    state.status = 'gameOver';
    return true;
  }
  return false;
}

function resolveWaveState(state: MissileCommandState): void {
  if (resolveGameOverState(state)) {
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

  if (resolveGameOverState(state)) {
    return false;
  }

  const targets = [...state.cities, ...state.launchers].filter((target) => target.alive);
  if (targets.length === 0) {
    state.status = 'gameOver';
    return false;
  }

  const target = targets[Math.floor(nextRandom(state) * targets.length)];
  const start = { x: nextRandom(state) * state.width, y: 0 };
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

function nextRandom(state: MissileCommandState): number {
  state.rngSeed = (state.rngSeed * 1664525 + 1013904223) >>> 0;
  return state.rngSeed / 0x100000000;
}
