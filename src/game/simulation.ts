import { DEBUG_DURATION_MS, GAME_DURATION_MS, PLAYER_START, WAVE_TABLE, WORLD } from './config';
import { clamp, distanceSq, normalize } from './math';
import { applyUpgrade as applyUpgradeToState, getUpgradeChoices, getWeaponLevel, xpNeededForLevel } from './progression';
import { getWave, spawnWave } from './waves';
import type { GameResult, GameState, InputState, Projectile, Vec2, WeaponId } from './types';

type CreateOptions = {
  debug?: boolean;
  rng?: () => number;
};

export function createGameState(options: CreateOptions = {}): GameState {
  const durationMs = options.debug ? DEBUG_DURATION_MS : GAME_DURATION_MS;
  return {
    elapsedMs: 0,
    durationMs,
    world: WORLD,
    player: {
      position: { x: WORLD.width / 2, y: WORLD.height / 2 },
      radius: PLAYER_START.radius,
      hp: PLAYER_START.hp,
      maxHp: PLAYER_START.hp,
      baseSpeed: PLAYER_START.speed,
      invulnerableMs: 0,
    },
    enemies: [],
    projectiles: [],
    xpOrbs: [],
    weapons: [{ id: 'memoBeam', level: 1, cooldownMs: 0 }],
    level: 1,
    xp: 0,
    xpToNext: xpNeededForLevel(1),
    defeatedEnemies: 0,
    status: 'running',
    pendingChoices: [],
    spawnTimerMs: 0,
    nextId: 1,
    auraTickMs: 0,
    rng: options.rng ?? Math.random,
  };
}

export function applyUpgrade(state: GameState, id: WeaponId): void {
  applyUpgradeToState(state, id);
}

export function getResult(state: GameState): GameResult | null {
  if (state.status !== 'won' && state.status !== 'lost') {
    return null;
  }
  return {
    status: state.status,
    elapsedMs: state.elapsedMs,
    level: state.level,
    defeatedEnemies: state.defeatedEnemies,
  };
}

export function updateGame(state: GameState, dtMs: number, input: InputState): void {
  if (state.status !== 'running') {
    return;
  }

  state.elapsedMs = Math.min(state.durationMs, state.elapsedMs + dtMs);
  if (state.elapsedMs >= state.durationMs) {
    state.status = 'won';
    return;
  }

  updatePlayer(state, dtMs, input);
  updateSpawns(state, dtMs);
  updateEnemies(state, dtMs);
  updateWeapons(state, dtMs);
  updateProjectiles(state, dtMs);
  updateXp(state);
  clearDeadEnemies(state);

  if (state.player.hp <= 0) {
    state.player.hp = 0;
    state.status = 'lost';
  }
}

function updatePlayer(state: GameState, dtMs: number, input: InputState): void {
  const movement = normalize({ x: input.moveX, y: input.moveY });
  const sprintLevel = getWeaponLevel(state, 'deckSprint');
  const speed = state.player.baseSpeed * (1 + sprintLevel * 0.13);
  const step = speed * (dtMs / 1000);
  state.player.position.x = clamp(state.player.position.x + movement.x * step, 24, state.world.width - 24);
  state.player.position.y = clamp(state.player.position.y + movement.y * step, 24, state.world.height - 24);
  state.player.invulnerableMs = Math.max(0, state.player.invulnerableMs - dtMs);
}

function updateSpawns(state: GameState, dtMs: number): void {
  state.spawnTimerMs -= dtMs;
  while (state.spawnTimerMs <= 0) {
    spawnWave(state);
    state.spawnTimerMs += getWave(state.elapsedMs).spawnEveryMs;
  }
}

function updateEnemies(state: GameState, dtMs: number): void {
  const dt = dtMs / 1000;
  const shieldLevel = getWeaponLevel(state, 'consensusShield');
  const damageMultiplier = Math.max(0.48, 1 - shieldLevel * 0.12);
  for (const enemy of state.enemies) {
    enemy.hitCooldownMs = Math.max(0, enemy.hitCooldownMs - dtMs);
    const direction = normalize({
      x: state.player.position.x - enemy.position.x,
      y: state.player.position.y - enemy.position.y,
    });
    enemy.position.x += direction.x * enemy.speed * dt;
    enemy.position.y += direction.y * enemy.speed * dt;

    const contactDistance = state.player.radius + enemy.radius;
    if (
      state.player.invulnerableMs <= 0 &&
      enemy.hitCooldownMs <= 0 &&
      distanceSq(state.player.position, enemy.position) <= contactDistance * contactDistance
    ) {
      state.player.hp -= Math.round(enemy.damage * damageMultiplier);
      state.player.invulnerableMs = 520 + shieldLevel * 110;
      enemy.hitCooldownMs = 640;
    }
  }
}

function updateWeapons(state: GameState, dtMs: number): void {
  for (const weapon of state.weapons) {
    weapon.cooldownMs -= dtMs;
    if (weapon.id === 'memoBeam' && weapon.cooldownMs <= 0) {
      fireAtNearest(state, 'memoBeam', 430, 14 + weapon.level * 5, 7, 0xf6f0a8, 0);
      weapon.cooldownMs = Math.max(280, 950 - weapon.level * 105);
    }
    if (weapon.id === 'reminderBolt' && weapon.cooldownMs <= 0) {
      fireAtNearest(state, 'reminderBolt', 520, 10 + weapon.level * 4, 6, 0x7de3ff, 1 + weapon.level);
      weapon.cooldownMs = Math.max(430, 1450 - weapon.level * 120);
    }
  }

  const auraLevel = getWeaponLevel(state, 'nemawashiAura');
  if (auraLevel > 0) {
    state.auraTickMs -= dtMs;
    if (state.auraTickMs <= 0) {
      const radius = 86 + auraLevel * 24;
      const damage = 4 + auraLevel * 3;
      for (const enemy of state.enemies) {
        if (distanceSq(state.player.position, enemy.position) <= radius * radius) {
          enemy.hp -= damage;
        }
      }
      state.auraTickMs = 230;
    }
  }
}

function fireAtNearest(
  state: GameState,
  weaponId: WeaponId,
  speed: number,
  damage: number,
  radius: number,
  color: number,
  pierce: number,
): void {
  const target = state.enemies
    .filter((enemy) => enemy.hp > 0)
    .sort((a, b) => distanceSq(state.player.position, a.position) - distanceSq(state.player.position, b.position))[0];

  if (!target) {
    return;
  }

  const direction = normalize({
    x: target.position.x - state.player.position.x,
    y: target.position.y - state.player.position.y,
  });
  const projectile: Projectile = {
    id: state.nextId++,
    weaponId,
    position: { ...state.player.position },
    velocity: { x: direction.x * speed, y: direction.y * speed },
    radius,
    damage,
    ttlMs: 1600,
    pierce,
    color,
    hitEnemyIds: new Set<number>(),
  };
  state.projectiles.push(projectile);
}

function updateProjectiles(state: GameState, dtMs: number): void {
  const dt = dtMs / 1000;
  for (const projectile of state.projectiles) {
    projectile.position.x += projectile.velocity.x * dt;
    projectile.position.y += projectile.velocity.y * dt;
    projectile.ttlMs -= dtMs;

    for (const enemy of state.enemies) {
      if (enemy.hp <= 0 || projectile.hitEnemyIds.has(enemy.id)) {
        continue;
      }
      const hitDistance = projectile.radius + enemy.radius;
      if (distanceSq(projectile.position, enemy.position) <= hitDistance * hitDistance) {
        enemy.hp -= projectile.damage;
        projectile.hitEnemyIds.add(enemy.id);
        projectile.pierce -= 1;
        if (projectile.pierce < 0) {
          projectile.ttlMs = 0;
          break;
        }
      }
    }
  }

  state.projectiles = state.projectiles.filter(
    (projectile) =>
      projectile.ttlMs > 0 &&
      projectile.position.x > -80 &&
      projectile.position.x < state.world.width + 80 &&
      projectile.position.y > -80 &&
      projectile.position.y < state.world.height + 80,
  );
}

function updateXp(state: GameState): void {
  for (const orb of state.xpOrbs) {
    const pullDistance = 120;
    if (distanceSq(state.player.position, orb.position) <= pullDistance * pullDistance) {
      const direction = normalize({
        x: state.player.position.x - orb.position.x,
        y: state.player.position.y - orb.position.y,
      });
      orb.position.x += direction.x * 8;
      orb.position.y += direction.y * 8;
    }
  }

  const collected: number[] = [];
  for (const orb of state.xpOrbs) {
    const collectDistance = state.player.radius + orb.radius;
    if (distanceSq(state.player.position, orb.position) <= collectDistance * collectDistance) {
      state.xp += orb.value;
      collected.push(orb.id);
    }
  }

  if (collected.length > 0) {
    state.xpOrbs = state.xpOrbs.filter((orb) => !collected.includes(orb.id));
  }

  while (state.xp >= state.xpToNext && state.status === 'running') {
    state.xp -= state.xpToNext;
    state.level += 1;
    state.xpToNext = xpNeededForLevel(state.level);
    state.pendingChoices = getUpgradeChoices(state);
    state.status = 'levelUp';
  }
}

function clearDeadEnemies(state: GameState): void {
  const survivors = [];
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) {
      state.defeatedEnemies += 1;
      state.xpOrbs.push({
        id: state.nextId++,
        position: { ...enemy.position },
        value: enemy.xp,
        radius: 8,
      });
    } else {
      survivors.push(enemy);
    }
  }
  state.enemies = survivors;
}

export function getCurrentWaveName(state: GameState): string {
  const wave = getWave(state.elapsedMs);
  if (wave === WAVE_TABLE[WAVE_TABLE.length - 1]) {
    return 'デモデイ前夜';
  }
  if (state.elapsedMs >= 180_000) {
    return '投資委員会前';
  }
  if (state.elapsedMs >= 105_000) {
    return '質問対応ラッシュ';
  }
  if (state.elapsedMs >= 45_000) {
    return '壁打ち増加';
  }
  return '資料修正タイム';
}

export function getAuraRadius(state: GameState): number {
  const level = getWeaponLevel(state, 'nemawashiAura');
  return level > 0 ? 86 + level * 24 : 0;
}

export function getPlayerSpeed(state: GameState): number {
  return state.player.baseSpeed * (1 + getWeaponLevel(state, 'deckSprint') * 0.13);
}
