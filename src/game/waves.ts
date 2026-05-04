import { ENEMY_DEFS, WAVE_TABLE, WORLD } from './config';
import type { Enemy, EnemyKind, GameState, Vec2 } from './types';

export function getWave(elapsedMs: number) {
  let active = WAVE_TABLE[0];
  for (const wave of WAVE_TABLE) {
    if (elapsedMs >= wave.fromMs) {
      active = wave;
    }
  }
  return active;
}

export function pickEnemyKind(elapsedMs: number, rng: () => number): EnemyKind {
  const wave = getWave(elapsedMs);
  return wave.kinds[Math.floor(rng() * wave.kinds.length)] ?? wave.kinds[0];
}

export function createEnemy(
  kind: EnemyKind,
  id: number,
  position: Vec2,
  elapsedMs: number,
): Enemy {
  const def = ENEMY_DEFS[kind];
  const scale = 1 + Math.min(1.25, elapsedMs / 260_000);
  return {
    id,
    kind,
    frame: def.frame,
    label: def.label,
    position,
    radius: def.radius,
    hp: Math.round(def.hp * scale),
    maxHp: Math.round(def.hp * scale),
    speed: def.speed * (1 + Math.min(0.45, elapsedMs / 420_000)),
    damage: def.damage,
    xp: def.xp,
    color: def.color,
    hitCooldownMs: 0,
  };
}

export function getSpawnPosition(player: Vec2, rng: () => number): Vec2 {
  const angle = rng() * Math.PI * 2;
  const distance = 520 + rng() * 180;
  return {
    x: Math.max(40, Math.min(WORLD.width - 40, player.x + Math.cos(angle) * distance)),
    y: Math.max(40, Math.min(WORLD.height - 40, player.y + Math.sin(angle) * distance)),
  };
}

export function spawnWave(state: GameState): void {
  const wave = getWave(state.elapsedMs);
  for (let index = 0; index < wave.groupSize; index += 1) {
    const kind = pickEnemyKind(state.elapsedMs, state.rng);
    state.enemies.push(
      createEnemy(kind, state.nextId++, getSpawnPosition(state.player.position, state.rng), state.elapsedMs),
    );
  }
}
