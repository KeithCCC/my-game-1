export type Point = { x: number; y: number };
export type ThreatKind = 'ballistic' | 'interceptor' | 'splitter' | 'drone' | 'warhead';
export type Threat = Point & {
  id: number; kind: ThreatKind; startX: number; startY: number;
  targetId: number; progress: number; trail: Point[];
};
export type Blast = Point & { age: number; duration: number; radius: number; friendly: boolean };
export type Defense = {
  width: number; height: number; seed: number; nextId: number; time: number;
  wave: number; score: number; combo: number; comboTimer: number; bestCombo: number;
  phase: 'combat' | 'recovery' | 'over'; countdown: number; remaining: number;
  spawnTimer: number; spawned: number; notice: string; noticeTimer: number;
  cities: (Point & { alive: boolean })[];
  bases: (Point & { ammo: number })[];
  enemies: Threat[];
  shots: (Point & { target: Point; start: Point })[];
  blasts: Blast[];
  kills: number; fired: number;
};

export function createDefense(width: number, height: number, seed = 79421): Defense {
  return {
    width, height, seed, nextId: 1, time: 0, wave: 1, score: 0, combo: 0,
    comboTimer: 0, bestCombo: 0, phase: 'combat', countdown: 0, remaining: 10,
    spawnTimer: 2400, spawned: 0, notice: 'SECTOR 01 / DEFEND THE CITY', noticeTimer: 3200,
    cities: [0.19, 0.3, 0.4, 0.6, 0.7, 0.81].map(x => ({ x: width * x, y: height - 55, alive: true })),
    bases: [0.07, 0.5, 0.93].map(x => ({ x: width * x, y: height - 40, ammo: 14 })),
    enemies: [], shots: [], blasts: [], kills: 0, fired: 0,
  };
}

function random(s: Defense): number {
  s.seed = (s.seed * 1664525 + 1013904223) >>> 0;
  return s.seed / 4294967296;
}

export function spawnThreat(s: Defense, kind: ThreatKind, origin?: Point, targetId?: number): Threat {
  const targets = s.cities.map((c, i) => c.alive ? i : -1).filter(i => i >= 0);
  const target = targetId ?? targets[Math.floor(random(s) * targets.length)] ?? 0;
  const start = origin ?? { x: s.width * (0.08 + random(s) * 0.84), y: -12 };
  const e: Threat = {
    id: s.nextId++, kind, startX: start.x, startY: start.y, x: start.x, y: start.y,
    targetId: target, progress: 0, trail: [],
  };
  s.enemies.push(e);
  return e;
}

export function fireDefense(s: Defense, target: Point, baseIndex?: number): boolean {
  if (s.phase !== 'combat') return false;
  const base = baseIndex === undefined
    ? s.bases.filter(b => b.ammo > 0).sort((a, b) => Math.abs(a.x - target.x) - Math.abs(b.x - target.x))[0]
    : s.bases[baseIndex];
  if (!base || base.ammo <= 0) return false;
  base.ammo--;
  s.fired++;
  s.shots.push({ x: base.x, y: base.y - 22, start: { x: base.x, y: base.y - 22 }, target: {
    x: Math.max(0, Math.min(s.width, target.x)), y: Math.max(0, Math.min(s.height - 90, target.y)),
  } });
  return true;
}

export function blastRadius(b: Blast): number {
  const t = b.age / b.duration;
  return b.radius * Math.max(0, Math.min(1, t / 0.22, (1 - t) / 0.3));
}

export function stepDefense(s: Defense, delta: number): void {
  if (s.phase === 'over') return;
  const dt = Math.max(0, Math.min(40, delta));
  s.time += dt;
  s.noticeTimer = Math.max(0, s.noticeTimer - dt);
  s.comboTimer -= dt;
  if (s.comboTimer <= 0) s.combo = 0;
  s.blasts.forEach(b => b.age += dt);
  s.blasts = s.blasts.filter(b => b.age < b.duration);
  if (s.phase === 'recovery') {
    s.countdown -= dt;
    if (s.countdown <= 0) {
      s.wave++;
      s.phase = 'combat';
      s.remaining = Math.min(32, 10 + (s.wave - 1) * 3);
      s.spawned = 0;
      s.spawnTimer = 1300;
      s.bases.forEach(b => b.ammo = 14);
      const introductions = ['BALLISTIC THREATS', 'FAST INTERCEPTORS INBOUND', 'MIRV SPLITTERS / HIT BEFORE SEPARATION', 'WEAVING DRONES DETECTED'];
      s.notice = introductions[Math.min(3, s.wave - 1)];
      s.noticeTimer = 3200;
    }
    return;
  }
  s.spawnTimer -= dt;
  if (s.remaining > 0 && s.spawnTimer <= 0) {
    const n = s.spawned++;
    const kind: ThreatKind = s.wave >= 4 && n % 5 === 0 ? 'drone'
      : s.wave >= 3 && n % 4 === 0 ? 'splitter'
      : s.wave >= 2 && n % 3 === 0 ? 'interceptor' : 'ballistic';
    spawnThreat(s, kind);
    s.remaining--;
    // Three-threat salvos followed by a gap give the player time to reposition.
    s.spawnTimer = n % 3 === 2 ? 2000 : Math.max(360, 1050 - s.wave * 65);
  }
  s.shots = s.shots.filter(shot => {
    const distance = Math.hypot(shot.target.x - shot.x, shot.target.y - shot.y);
    const step = Math.max(440, s.height * 0.95) * dt / 1000;
    if (distance <= step) {
      s.blasts.push({ ...shot.target, age: 0, duration: 1100, radius: Math.max(34, Math.min(68, s.width * 0.085)), friendly: true });
      return false;
    }
    shot.x += (shot.target.x - shot.x) / distance * step;
    shot.y += (shot.target.y - shot.y) / distance * step;
    return true;
  });
  const survivors: Threat[] = [];
  const children: { origin: Point; target: number }[] = [];
  for (const e of s.enemies) {
    e.trail.push({ x: e.x, y: e.y });
    if (e.trail.length > 28) e.trail.shift();
    const speed = { ballistic: 1, interceptor: 1.65, splitter: 0.85, drone: 1.05, warhead: 1.4 }[e.kind];
    e.progress = Math.min(1, e.progress + dt / Math.max(5800, 13500 - s.wave * 440) * speed);
    const target = s.cities[e.targetId];
    e.x = e.startX + (target.x - e.startX) * e.progress;
    e.y = e.startY + (target.y - e.startY) * e.progress;
    if (e.kind === 'drone') e.x += Math.sin(e.progress * Math.PI * 10) * Math.sin(e.progress * Math.PI) * Math.min(65, s.width * 0.09);
    if (s.blasts.some(b => b.friendly && Math.hypot(b.x - e.x, b.y - e.y) <= blastRadius(b))) {
      s.combo++;
      s.bestCombo = Math.max(s.bestCombo, s.combo);
      s.comboTimer = 1900;
      s.score += (e.kind === 'splitter' ? 250 : e.kind === 'ballistic' || e.kind === 'warhead' ? 100 : 175) + Math.min(8, s.combo - 1) * 25;
      s.kills++;
      s.blasts.push({ x: e.x, y: e.y, age: 0, duration: 400, radius: 22, friendly: false });
      continue;
    }
    if (e.kind === 'splitter' && e.progress >= 0.46) {
      const alive = s.cities.map((c, i) => c.alive ? i : -1).filter(i => i >= 0);
      for (let i = 0; i < Math.min(3, alive.length); i++) children.push({ origin: { x: e.x, y: e.y }, target: alive[(e.targetId + i) % alive.length] });
      continue;
    }
    if (e.progress >= 1) {
      target.alive = false;
      s.blasts.push({ x: e.x, y: e.y, age: 0, duration: 1100, radius: 65, friendly: false });
      s.combo = 0;
      continue;
    }
    survivors.push(e);
  }
  s.enemies = survivors;
  children.forEach(c => spawnThreat(s, 'warhead', c.origin, c.target));
  if (s.cities.every(c => !c.alive)) s.phase = 'over';
  else if (s.remaining === 0 && s.enemies.length === 0 && s.shots.length === 0 && s.blasts.length === 0) {
    s.phase = 'recovery';
    s.countdown = 3200;
    s.score += s.cities.filter(c => c.alive).length * 150;
    s.notice = 'SECTOR SECURED / RELOADING BATTERIES';
    s.noticeTimer = 3200;
  }
}

export function resizeDefense(s: Defense, width: number, height: number): void {
  const sx = width / s.width, sy = height / s.height;
  for (const e of s.enemies) {
    e.x *= sx; e.y *= sy; e.startX *= sx; e.startY *= sy;
    e.trail.forEach(p => { p.x *= sx; p.y *= sy; });
  }
  s.shots.forEach(p => {
    for (const point of [p, p.start, p.target]) { point.x *= sx; point.y *= sy; }
  });
  s.blasts.forEach(p => { p.x *= sx; p.y *= sy; });
  s.cities.forEach(c => { c.x *= sx; c.y = height - 55; });
  s.bases.forEach(b => { b.x *= sx; b.y = height - 40; });
  s.width = width; s.height = height;
}
