export type Vector2 = {
  x: number;
  y: number;
};

export type MeteorPaintPowerupKind = 'shield' | 'burst' | 'haste';

export type MeteorPaintMeteor = {
  id: number;
  position: Vector2;
  velocity: Vector2;
  radius: number;
  color: number;
  warningMs: number;
};

export type MeteorPaintSplash = {
  id: number;
  position: Vector2;
  radius: number;
  color: number;
  ageMs: number;
  durationMs: number;
};

export type MeteorPaintPowerup = {
  id: number;
  kind: MeteorPaintPowerupKind;
  position: Vector2;
  radius: number;
  ageMs: number;
};

export type MeteorPaintTrailDot = {
  id: number;
  position: Vector2;
  color: number;
  ageMs: number;
  durationMs: number;
};

export type MeteorPaintState = {
  width: number;
  height: number;
  elapsedMs: number;
  score: number;
  wave: number;
  status: 'playing' | 'gameOver';
  player: {
    position: Vector2;
    radius: number;
    speed: number;
    hp: number;
    maxHp: number;
    shieldMs: number;
    burstCooldownMs: number;
    hasteMs: number;
  };
  meteors: MeteorPaintMeteor[];
  splashes: MeteorPaintSplash[];
  powerups: MeteorPaintPowerup[];
  trail: MeteorPaintTrailDot[];
  nextMeteorMs: number;
  nextPowerupMs: number;
  nextId: number;
};

export type MeteorPaintInput = {
  moveX: number;
  moveY: number;
  burst: boolean;
};

const PALETTE = [0xff4f8b, 0x35d6ff, 0xffd166, 0x7cf75a, 0xa985ff, 0xff7a3d, 0x26f2c8];

export function createMeteorPaintState(size: { width: number; height: number }): MeteorPaintState {
  return {
    width: size.width,
    height: size.height,
    elapsedMs: 0,
    score: 0,
    wave: 1,
    status: 'playing',
    player: {
      position: { x: size.width / 2, y: size.height / 2 },
      radius: 18,
      speed: 310,
      hp: 5,
      maxHp: 5,
      shieldMs: 0,
      burstCooldownMs: 0,
      hasteMs: 0,
    },
    meteors: [],
    splashes: [],
    powerups: [],
    trail: [],
    nextMeteorMs: 400,
    nextPowerupMs: 5200,
    nextId: 1,
  };
}

export function updateMeteorPaint(state: MeteorPaintState, deltaMs: number, input: MeteorPaintInput): void {
  if (state.status !== 'playing') {
    return;
  }

  const delta = Math.min(deltaMs, 40);
  state.elapsedMs += delta;
  state.wave = 1 + Math.floor(state.elapsedMs / 18000);
  state.score += delta * 0.012;
  state.player.shieldMs = Math.max(0, state.player.shieldMs - delta);
  state.player.burstCooldownMs = Math.max(0, state.player.burstCooldownMs - delta);
  state.player.hasteMs = Math.max(0, state.player.hasteMs - delta);
  updatePlayer(state, delta, input);
  updateSpawners(state, delta);
  updateMeteors(state, delta);
  updateEffects(state, delta);
  collectPowerups(state);
}

export function resizeMeteorPaintState(state: MeteorPaintState, width: number, height: number): void {
  state.width = width;
  state.height = height;
  state.player.position.x = clamp(state.player.position.x, state.player.radius, width - state.player.radius);
  state.player.position.y = clamp(state.player.position.y, state.player.radius, height - state.player.radius);
}

function updatePlayer(state: MeteorPaintState, delta: number, input: MeteorPaintInput): void {
  const length = Math.hypot(input.moveX, input.moveY);
  const speed = state.player.speed * (state.player.hasteMs > 0 ? 1.35 : 1);
  if (length > 0) {
    state.player.position.x += (input.moveX / length) * speed * (delta / 1000);
    state.player.position.y += (input.moveY / length) * speed * (delta / 1000);
  }
  state.player.position.x = clamp(state.player.position.x, state.player.radius, state.width - state.player.radius);
  state.player.position.y = clamp(state.player.position.y, state.player.radius, state.height - state.player.radius);

  if (length > 0 || state.elapsedMs % 120 < delta) {
    state.trail.push({
      id: state.nextId++,
      position: { ...state.player.position },
      color: PALETTE[Math.floor(state.elapsedMs / 240) % PALETTE.length],
      ageMs: 0,
      durationMs: 1400,
    });
  }

  if (input.burst && state.player.burstCooldownMs <= 0) {
    state.player.burstCooldownMs = 6000;
    const color = PALETTE[(state.wave + state.meteors.length) % PALETTE.length];
    addSplash(state, state.player.position.x, state.player.position.y, 128, color, 900);
    state.meteors = state.meteors.filter((meteor) => {
      const hit = distance(meteor.position, state.player.position) < 136 + meteor.radius;
      if (hit) {
        state.score += 70;
      }
      return !hit;
    });
  }
}

function updateSpawners(state: MeteorPaintState, delta: number): void {
  state.nextMeteorMs -= delta;
  while (state.nextMeteorMs <= 0) {
    spawnMeteor(state);
    const interval = Math.max(240, 850 - state.wave * 58);
    state.nextMeteorMs += interval + seededWave(state.nextId) * 260;
  }

  state.nextPowerupMs -= delta;
  if (state.nextPowerupMs <= 0) {
    spawnPowerup(state);
    state.nextPowerupMs = 5600 + seededWave(state.nextId) * 3600;
  }
}

function updateMeteors(state: MeteorPaintState, delta: number): void {
  const remaining: MeteorPaintMeteor[] = [];
  for (const meteor of state.meteors) {
    meteor.warningMs = Math.max(0, meteor.warningMs - delta);
    meteor.position.x += meteor.velocity.x * (delta / 1000);
    meteor.position.y += meteor.velocity.y * (delta / 1000);

    if (distance(meteor.position, state.player.position) < meteor.radius + state.player.radius) {
      if (state.player.shieldMs <= 0) {
        state.player.hp -= 1;
      }
      state.player.shieldMs = Math.max(state.player.shieldMs, 850);
      addSplash(state, meteor.position.x, meteor.position.y, meteor.radius * 4.2, meteor.color, 1400);
      if (state.player.hp <= 0) {
        state.status = 'gameOver';
      }
      continue;
    }

    if (
      meteor.position.x < -80 ||
      meteor.position.x > state.width + 80 ||
      meteor.position.y < -80 ||
      meteor.position.y > state.height + 80
    ) {
      addSplash(state, clamp(meteor.position.x, 0, state.width), clamp(meteor.position.y, 0, state.height), meteor.radius * 4.6, meteor.color, 1800);
      state.score += 22;
      continue;
    }
    remaining.push(meteor);
  }
  state.meteors = remaining;
}

function updateEffects(state: MeteorPaintState, delta: number): void {
  state.splashes.forEach((splash) => {
    splash.ageMs += delta;
  });
  state.splashes = state.splashes.filter((splash) => splash.ageMs < splash.durationMs).slice(-90);

  state.trail.forEach((dot) => {
    dot.ageMs += delta;
  });
  state.trail = state.trail.filter((dot) => dot.ageMs < dot.durationMs).slice(-140);

  state.powerups.forEach((powerup) => {
    powerup.ageMs += delta;
  });
  state.powerups = state.powerups.filter((powerup) => powerup.ageMs < 12000);
}

function collectPowerups(state: MeteorPaintState): void {
  state.powerups = state.powerups.filter((powerup) => {
    if (distance(powerup.position, state.player.position) > powerup.radius + state.player.radius) {
      return true;
    }
    if (powerup.kind === 'shield') {
      state.player.shieldMs = 5000;
    } else if (powerup.kind === 'haste') {
      state.player.hasteMs = 5000;
    } else {
      state.player.burstCooldownMs = 0;
    }
    state.score += 110;
    addSplash(state, powerup.position.x, powerup.position.y, 78, getPowerupColor(powerup.kind), 950);
    return false;
  });
}

function spawnMeteor(state: MeteorPaintState): void {
  const side = Math.floor(seededWave(state.nextId * 3) * 4);
  const start = getEdgePoint(state, side, 52);
  const target = {
    x: state.player.position.x + (seededWave(state.nextId * 7) - 0.5) * Math.min(420, state.width * 0.38),
    y: state.player.position.y + (seededWave(state.nextId * 11) - 0.5) * Math.min(420, state.height * 0.38),
  };
  const dx = target.x - start.x;
  const dy = target.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const speed = 190 + state.wave * 18 + seededWave(state.nextId * 13) * 110;
  state.meteors.push({
    id: state.nextId++,
    position: start,
    velocity: { x: (dx / length) * speed, y: (dy / length) * speed },
    radius: 16 + seededWave(state.nextId * 17) * 14,
    color: PALETTE[state.nextId % PALETTE.length],
    warningMs: 850,
  });
}

function spawnPowerup(state: MeteorPaintState): void {
  const kinds: MeteorPaintPowerupKind[] = ['shield', 'burst', 'haste'];
  state.powerups.push({
    id: state.nextId++,
    kind: kinds[state.nextId % kinds.length],
    position: {
      x: 56 + seededWave(state.nextId * 19) * Math.max(1, state.width - 112),
      y: 92 + seededWave(state.nextId * 23) * Math.max(1, state.height - 154),
    },
    radius: 18,
    ageMs: 0,
  });
}

function addSplash(
  state: MeteorPaintState,
  x: number,
  y: number,
  radius: number,
  color: number,
  durationMs: number,
): void {
  state.splashes.push({
    id: state.nextId++,
    position: { x, y },
    radius,
    color,
    ageMs: 0,
    durationMs,
  });
}

export function getPowerupColor(kind: MeteorPaintPowerupKind): number {
  if (kind === 'shield') return 0x35d6ff;
  if (kind === 'haste') return 0x7cf75a;
  return 0xffd166;
}

function getEdgePoint(state: MeteorPaintState, side: number, margin: number): Vector2 {
  if (side === 0) return { x: -margin, y: seededWave(state.nextId) * state.height };
  if (side === 1) return { x: state.width + margin, y: seededWave(state.nextId) * state.height };
  if (side === 2) return { x: seededWave(state.nextId) * state.width, y: -margin };
  return { x: seededWave(state.nextId) * state.width, y: state.height + margin };
}

function distance(a: Vector2, b: Vector2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function seededWave(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}
