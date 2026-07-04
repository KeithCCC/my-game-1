import { RandomGenerator } from '../gameblocks/modules/math/RandomUtils';
import { clamp } from '../gameblocks/modules/math/ScalarUtils';

export type SpaceFighterLevel = 1 | 2 | 3;

export type SpaceFighterEnemyKind =
  | 'alienTank'
  | 'alienFlyer'
  | 'alienShip'
  | 'battleShip'
  | 'bossTank'
  | 'bossFlyer'
  | 'bossDreadnought';

export type SpaceFighterPhase = 'playing' | 'transition' | 'won' | 'lost';

export type SpaceFighterTransition = 'takeoff' | 'orbit' | 'victory';

export type SpaceFighterVec2 = {
  x: number;
  y: number;
};

export type SpaceFighterInput = {
  moveX: number;
  moveY: number;
};

export type SpaceFighterEnemy = {
  id: number;
  kind: SpaceFighterEnemyKind;
  level: SpaceFighterLevel;
  position: SpaceFighterVec2;
  velocity: SpaceFighterVec2;
  radius: number;
  hp: number;
  maxHp: number;
  damage: number;
  score: number;
  isBoss: boolean;
  fireCooldownMs: number;
};

export type SpaceFighterProjectile = {
  id: number;
  owner: 'player' | 'enemy';
  weapon: 'cannon' | 'rocket' | 'plasma';
  position: SpaceFighterVec2;
  velocity: SpaceFighterVec2;
  radius: number;
  damage: number;
  ttlMs: number;
};

export type SpaceFighterExplosion = {
  id: number;
  position: SpaceFighterVec2;
  ageMs: number;
  durationMs: number;
  radius: number;
};

export type SpaceFighterLevelDef = {
  level: SpaceFighterLevel;
  name: string;
  totalEnemies: number;
  regularPlan: SpaceFighterEnemyKind[];
  bossKind: SpaceFighterEnemyKind;
  environment: 'ground' | 'sky' | 'space';
};

export type SpaceFighterState = {
  phase: SpaceFighterPhase;
  level: SpaceFighterLevel;
  transition: SpaceFighterTransition | null;
  transitionTimerMs: number;
  width: number;
  height: number;
  groundY: number;
  cameraX: number;
  player: {
    position: SpaceFighterVec2;
    radius: number;
    hp: number;
    maxHp: number;
    lives: number;
    canFly: boolean;
    rocketsUnlocked: boolean;
    invulnerableMs: number;
    cannonCooldownMs: number;
    rocketCooldownMs: number;
  };
  enemies: SpaceFighterEnemy[];
  projectiles: SpaceFighterProjectile[];
  explosions: SpaceFighterExplosion[];
  regularSpawned: number;
  regularDefeated: number;
  bossSpawned: boolean;
  bossDefeated: boolean;
  spawnTimerMs: number;
  nextId: number;
  score: number;
  rng: RandomGenerator;
};

type CreateOptions = {
  seed?: number;
  width?: number;
  height?: number;
};

const LEVEL_ONE_PLAN = Array.from({ length: 19 }, () => 'alienTank' as const);
const LEVEL_TWO_PLAN = Array.from({ length: 24 }, () => 'alienFlyer' as const);
const LEVEL_THREE_PLAN: SpaceFighterEnemyKind[] = [
  ...Array.from({ length: 32 }, () => 'alienShip' as const),
  ...Array.from({ length: 7 }, () => 'battleShip' as const),
];

export const SPACE_FIGHTER_LEVELS: Record<SpaceFighterLevel, SpaceFighterLevelDef> = {
  1: {
    level: 1,
    name: 'Alien Badlands',
    totalEnemies: 20,
    regularPlan: LEVEL_ONE_PLAN,
    bossKind: 'bossTank',
    environment: 'ground',
  },
  2: {
    level: 2,
    name: 'Stratosphere Breakout',
    totalEnemies: 25,
    regularPlan: LEVEL_TWO_PLAN,
    bossKind: 'bossFlyer',
    environment: 'sky',
  },
  3: {
    level: 3,
    name: 'Orbital Fleet',
    totalEnemies: 40,
    regularPlan: LEVEL_THREE_PLAN,
    bossKind: 'bossDreadnought',
    environment: 'space',
  },
};

const ENEMY_STATS: Record<
  SpaceFighterEnemyKind,
  {
    hp: number;
    radius: number;
    speed: number;
    damage: number;
    score: number;
  }
> = {
  alienTank: { hp: 26, radius: 20, speed: 70, damage: 12, score: 100 },
  alienFlyer: { hp: 22, radius: 18, speed: 105, damage: 11, score: 130 },
  alienShip: { hp: 30, radius: 18, speed: 120, damage: 13, score: 160 },
  battleShip: { hp: 82, radius: 30, speed: 62, damage: 20, score: 360 },
  bossTank: { hp: 260, radius: 42, speed: 46, damage: 26, score: 1200 },
  bossFlyer: { hp: 330, radius: 46, speed: 58, damage: 28, score: 1600 },
  bossDreadnought: { hp: 520, radius: 58, speed: 42, damage: 34, score: 2600 },
};

export function createSpaceFighterState(options: CreateOptions = {}): SpaceFighterState {
  const width = options.width ?? 960;
  const height = options.height ?? 540;
  const groundY = height - 64;
  return {
    phase: 'playing',
    level: 1,
    transition: null,
    transitionTimerMs: 0,
    width,
    height,
    groundY,
    cameraX: 0,
    player: {
      position: { x: 150, y: groundY },
      radius: 20,
      hp: 120,
      maxHp: 120,
      lives: 3,
      canFly: false,
      rocketsUnlocked: false,
      invulnerableMs: 0,
      cannonCooldownMs: 0,
      rocketCooldownMs: 0,
    },
    enemies: [],
    projectiles: [],
    explosions: [],
    regularSpawned: 0,
    regularDefeated: 0,
    bossSpawned: false,
    bossDefeated: false,
    spawnTimerMs: 0,
    nextId: 1,
    score: 0,
    rng: new RandomGenerator(options.seed ?? 7),
  };
}

export function getSpaceFighterLevelDef(level: SpaceFighterLevel): SpaceFighterLevelDef {
  return SPACE_FIGHTER_LEVELS[level];
}

export function getLevelEnemyPlan(level: SpaceFighterLevel): SpaceFighterEnemyKind[] {
  const def = getSpaceFighterLevelDef(level);
  return [...def.regularPlan, def.bossKind];
}

export function updateSpaceFighter(state: SpaceFighterState, dtMs: number, input: SpaceFighterInput): void {
  const dt = Math.min(dtMs, 40);

  if (state.phase === 'transition') {
    updateTransition(state, dt);
    return;
  }
  if (state.phase !== 'playing') {
    return;
  }

  updatePlayer(state, dt, input);
  updateSpawns(state, dt);
  updateEnemies(state, dt);
  updateWeapons(state, dt);
  updateProjectiles(state, dt);
  updateExplosions(state, dt);
}

export function skipSpaceFighterTransition(state: SpaceFighterState): void {
  if (state.phase !== 'transition' || !state.transition) {
    return;
  }
  completeTransition(state);
}

export function damageSpaceFighterPlayer(state: SpaceFighterState, damage: number): void {
  if (state.player.invulnerableMs > 0 || state.phase !== 'playing') {
    return;
  }
  state.player.hp -= damage;
  state.player.invulnerableMs = 900;
  if (state.player.hp <= 0) {
    loseLife(state);
  }
}

export function spawnNextSpaceFighterEnemy(state: SpaceFighterState): SpaceFighterEnemy | null {
  const def = getSpaceFighterLevelDef(state.level);
  if (state.regularSpawned < def.regularPlan.length) {
    const kind = def.regularPlan[state.regularSpawned];
    state.regularSpawned += 1;
    const enemy = createEnemy(state, kind, false);
    state.enemies.push(enemy);
    return enemy;
  }

  if (!state.bossSpawned && state.regularDefeated >= def.regularPlan.length) {
    state.bossSpawned = true;
    const enemy = createEnemy(state, def.bossKind, true);
    state.enemies.push(enemy);
    return enemy;
  }

  return null;
}

export function defeatSpaceFighterEnemy(state: SpaceFighterState, enemyId: number): void {
  const enemy = state.enemies.find((candidate) => candidate.id === enemyId);
  if (!enemy) {
    return;
  }
  enemy.hp = 0;
  removeDefeatedEnemies(state);
}

export function restartSpaceFighterLevel(state: SpaceFighterState): void {
  const lives = state.player.lives;
  const canFly = state.player.canFly;
  const rocketsUnlocked = state.player.rocketsUnlocked;
  const level = state.level;
  const score = state.score;
  const nextId = state.nextId;
  const rng = state.rng;
  const width = state.width;
  const height = state.height;
  const groundY = state.groundY;

  Object.assign(state, createSpaceFighterState({ width, height }));
  state.level = level;
  state.player.lives = lives;
  state.player.canFly = canFly;
  state.player.rocketsUnlocked = rocketsUnlocked;
  state.score = score;
  state.nextId = nextId;
  state.rng = rng;
  state.groundY = groundY;
  state.player.position.y = canFly ? height * 0.62 : groundY;
}

function updateTransition(state: SpaceFighterState, dtMs: number): void {
  state.transitionTimerMs = Math.max(0, state.transitionTimerMs - dtMs);
  if (state.transitionTimerMs <= 0) {
    completeTransition(state);
  }
}

function completeTransition(state: SpaceFighterState): void {
  if (state.transition === 'takeoff') {
    state.player.canFly = true;
    startLevel(state, 2);
    return;
  }
  if (state.transition === 'orbit') {
    state.player.rocketsUnlocked = true;
    startLevel(state, 3);
    return;
  }
  state.phase = 'won';
  state.transition = null;
  state.transitionTimerMs = 0;
}

function startLevel(state: SpaceFighterState, level: SpaceFighterLevel): void {
  state.phase = 'playing';
  state.level = level;
  state.transition = null;
  state.transitionTimerMs = 0;
  state.enemies = [];
  state.projectiles = [];
  state.explosions = [];
  state.regularSpawned = 0;
  state.regularDefeated = 0;
  state.bossSpawned = false;
  state.bossDefeated = false;
  state.spawnTimerMs = 0;
  state.player.hp = state.player.maxHp;
  state.player.invulnerableMs = 1200;
  state.player.position.x = 150;
  state.player.position.y = state.player.canFly ? state.height * 0.62 : state.groundY;
}

function updatePlayer(state: SpaceFighterState, dtMs: number, input: SpaceFighterInput): void {
  const dt = dtMs / 1000;
  const len = Math.hypot(input.moveX, input.moveY) || 1;
  const speed = state.player.canFly ? 255 : 210;
  state.player.position.x = clamp(state.player.position.x + (input.moveX / len) * speed * dt, 55, state.width - 85);

  if (state.player.canFly) {
    state.player.position.y = clamp(state.player.position.y + (input.moveY / len) * speed * dt, 76, state.height - 92);
  } else {
    state.player.position.y = state.groundY;
  }

  state.player.invulnerableMs = Math.max(0, state.player.invulnerableMs - dtMs);
  state.cameraX += dtMs * (0.06 + state.level * 0.012);
}

function updateSpawns(state: SpaceFighterState, dtMs: number): void {
  state.spawnTimerMs -= dtMs;
  const maxActive = state.bossSpawned ? 5 : 7;
  while (state.spawnTimerMs <= 0 && state.enemies.length < maxActive) {
    const spawned = spawnNextSpaceFighterEnemy(state);
    if (!spawned) {
      return;
    }
    state.spawnTimerMs += spawned.isBoss ? 900 : 620;
  }
}

function updateEnemies(state: SpaceFighterState, dtMs: number): void {
  const dt = dtMs / 1000;
  for (const enemy of state.enemies) {
    enemy.fireCooldownMs -= dtMs;
    enemy.position.x += enemy.velocity.x * dt;
    enemy.position.y += enemy.velocity.y * dt;

    if (state.player.canFly) {
      const dy = state.player.position.y - enemy.position.y;
      enemy.position.y += clamp(dy, -60, 60) * dt * (enemy.isBoss ? 0.28 : 0.55);
    } else if (enemy.kind === 'alienTank' || enemy.kind === 'bossTank') {
      enemy.position.y = state.groundY;
    }

    if (enemy.position.x < -80) {
      enemy.position.x = state.width + 80;
      enemy.position.y = getEnemySpawnY(state, enemy.kind);
    }

    const contactDistance = state.player.radius + enemy.radius;
    if (distanceSq(enemy.position, state.player.position) <= contactDistance * contactDistance) {
      damageSpaceFighterPlayer(state, enemy.damage);
      enemy.hp -= enemy.isBoss ? 0 : 30;
    }

    if (enemy.fireCooldownMs <= 0 && (enemy.isBoss || enemy.kind === 'battleShip')) {
      fireEnemyShot(state, enemy);
      enemy.fireCooldownMs = enemy.isBoss ? 760 : 1250;
    }
  }
}

function updateWeapons(state: SpaceFighterState, dtMs: number): void {
  state.player.cannonCooldownMs -= dtMs;
  state.player.rocketCooldownMs -= dtMs;

  const target = findNearestEnemy(state);
  if (!target) {
    return;
  }

  if (state.player.cannonCooldownMs <= 0) {
    firePlayerShot(state, target, 'cannon');
    state.player.cannonCooldownMs = 185;
  }

  const rocketTarget = state.enemies
    .filter((enemy) => enemy.isBoss || enemy.kind === 'battleShip')
    .sort((a, b) => distanceSq(state.player.position, a.position) - distanceSq(state.player.position, b.position))[0];
  if (state.player.rocketsUnlocked && rocketTarget && state.player.rocketCooldownMs <= 0) {
    firePlayerShot(state, rocketTarget, 'rocket');
    state.player.rocketCooldownMs = 980;
  }
}

function updateProjectiles(state: SpaceFighterState, dtMs: number): void {
  const dt = dtMs / 1000;
  for (const projectile of state.projectiles) {
    projectile.position.x += projectile.velocity.x * dt;
    projectile.position.y += projectile.velocity.y * dt;
    projectile.ttlMs -= dtMs;

    if (projectile.owner === 'player') {
      for (const enemy of state.enemies) {
        const hitDistance = projectile.radius + enemy.radius;
        if (distanceSq(projectile.position, enemy.position) <= hitDistance * hitDistance) {
          enemy.hp -= projectile.damage;
          projectile.ttlMs = 0;
          state.explosions.push({
            id: state.nextId++,
            position: { ...projectile.position },
            ageMs: 0,
            durationMs: 340,
            radius: projectile.weapon === 'rocket' ? 34 : 18,
          });
          break;
        }
      }
    } else {
      const hitDistance = projectile.radius + state.player.radius;
      if (distanceSq(projectile.position, state.player.position) <= hitDistance * hitDistance) {
        damageSpaceFighterPlayer(state, projectile.damage);
        projectile.ttlMs = 0;
      }
    }
  }

  state.projectiles = state.projectiles.filter(
    (projectile) =>
      projectile.ttlMs > 0 &&
      projectile.position.x > -120 &&
      projectile.position.x < state.width + 160 &&
      projectile.position.y > -120 &&
      projectile.position.y < state.height + 120,
  );
  removeDefeatedEnemies(state);
}

function updateExplosions(state: SpaceFighterState, dtMs: number): void {
  for (const explosion of state.explosions) {
    explosion.ageMs += dtMs;
  }
  state.explosions = state.explosions.filter((explosion) => explosion.ageMs < explosion.durationMs);
}

function removeDefeatedEnemies(state: SpaceFighterState): void {
  const survivors: SpaceFighterEnemy[] = [];
  for (const enemy of state.enemies) {
    if (enemy.hp > 0) {
      survivors.push(enemy);
      continue;
    }

    state.score += enemy.score;
    state.explosions.push({
      id: state.nextId++,
      position: { ...enemy.position },
      ageMs: 0,
      durationMs: enemy.isBoss ? 900 : 420,
      radius: enemy.radius * 1.8,
    });

    if (enemy.isBoss) {
      state.bossDefeated = true;
      beginLevelClear(state);
    } else {
      state.regularDefeated += 1;
    }
  }
  state.enemies = survivors;
}

function beginLevelClear(state: SpaceFighterState): void {
  state.enemies = [];
  state.projectiles = [];
  state.phase = 'transition';
  state.transitionTimerMs = 3800;
  if (state.level === 1) {
    state.transition = 'takeoff';
  } else if (state.level === 2) {
    state.transition = 'orbit';
  } else {
    state.transition = 'victory';
  }
}

function loseLife(state: SpaceFighterState): void {
  state.player.lives -= 1;
  if (state.player.lives <= 0) {
    state.player.hp = 0;
    state.phase = 'lost';
    return;
  }
  restartSpaceFighterLevel(state);
}

function createEnemy(state: SpaceFighterState, kind: SpaceFighterEnemyKind, isBoss: boolean): SpaceFighterEnemy {
  const stats = ENEMY_STATS[kind];
  const speed = stats.speed + state.level * 8;
  return {
    id: state.nextId++,
    kind,
    level: state.level,
    position: {
      x: state.width + (isBoss ? 160 : state.rng.uniform(40, 260)),
      y: getEnemySpawnY(state, kind),
    },
    velocity: {
      x: -(isBoss ? speed * 0.45 : speed),
      y: 0,
    },
    radius: stats.radius,
    hp: stats.hp,
    maxHp: stats.hp,
    damage: stats.damage,
    score: stats.score,
    isBoss,
    fireCooldownMs: isBoss ? 500 : state.rng.uniform(900, 1500),
  };
}

function getEnemySpawnY(state: SpaceFighterState, kind: SpaceFighterEnemyKind): number {
  if (kind === 'alienTank' || kind === 'bossTank') {
    return state.groundY;
  }
  if (kind === 'battleShip' || kind === 'bossDreadnought') {
    return state.rng.uniform(120, state.height - 150);
  }
  return state.rng.uniform(92, state.height - 128);
}

function findNearestEnemy(state: SpaceFighterState): SpaceFighterEnemy | undefined {
  return state.enemies
    .filter((enemy) => enemy.position.x > state.player.position.x - 20)
    .sort((a, b) => distanceSq(state.player.position, a.position) - distanceSq(state.player.position, b.position))[0];
}

function firePlayerShot(
  state: SpaceFighterState,
  target: SpaceFighterEnemy,
  weapon: SpaceFighterProjectile['weapon'],
): void {
  const origin = {
    x: state.player.position.x + 24,
    y: state.player.position.y - (state.player.canFly ? 0 : 12),
  };
  const direction = normalize({
    x: target.position.x - origin.x,
    y: target.position.y - origin.y,
  });
  const speed = weapon === 'rocket' ? 420 : 640;
  state.projectiles.push({
    id: state.nextId++,
    owner: 'player',
    weapon,
    position: origin,
    velocity: { x: direction.x * speed, y: direction.y * speed },
    radius: weapon === 'rocket' ? 8 : 4,
    damage: weapon === 'rocket' ? 54 : 12,
    ttlMs: weapon === 'rocket' ? 1800 : 1100,
  });
}

function fireEnemyShot(state: SpaceFighterState, enemy: SpaceFighterEnemy): void {
  const direction = normalize({
    x: state.player.position.x - enemy.position.x,
    y: state.player.position.y - enemy.position.y,
  });
  state.projectiles.push({
    id: state.nextId++,
    owner: 'enemy',
    weapon: 'plasma',
    position: { x: enemy.position.x - enemy.radius, y: enemy.position.y },
    velocity: { x: direction.x * 310, y: direction.y * 310 },
    radius: enemy.isBoss ? 7 : 5,
    damage: enemy.isBoss ? 15 : 10,
    ttlMs: 1800,
  });
}

function normalize(vector: SpaceFighterVec2): SpaceFighterVec2 {
  const length = Math.hypot(vector.x, vector.y);
  if (length <= 1e-6) {
    return { x: 1, y: 0 };
  }
  return { x: vector.x / length, y: vector.y / length };
}

function distanceSq(a: SpaceFighterVec2, b: SpaceFighterVec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

