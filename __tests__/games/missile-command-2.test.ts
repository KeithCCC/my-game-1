import { createDefense, spawnThreat, stepDefense, fireDefense } from '../../src/games/missile-command-2/model';

describe('Missile Command 2', () => {
  test('splitters release three independent warheads after the warning altitude', () => {
    const s = createDefense(900, 600, 42);
    s.remaining = 0;
    const e = spawnThreat(s, 'splitter');
    e.progress = 0.47;
    stepDefense(s, 16);
    expect(s.enemies).toHaveLength(3);
    expect(s.enemies.every(e => e.kind === 'warhead')).toBe(true);
    expect(new Set(s.enemies.map(e => e.targetId)).size).toBe(3);
  });
  test('intercepting a splitter before separation prevents its children', () => {
    const s = createDefense(900, 600, 42);
    s.remaining = 0;
    const e = spawnThreat(s, 'splitter');
    s.blasts.push({ x: e.x, y: e.y, age: 200, duration: 1000, radius: 80, friendly: true });
    stepDefense(s, 16);
    expect(s.enemies).toHaveLength(0);
    expect(s.score).toBe(250);
  });
  test('drones weave while fast missiles advance faster than ballistic missiles', () => {
    const s = createDefense(900, 600, 42);
    s.remaining = 0;
    const a = spawnThreat(s, 'ballistic');
    const b = spawnThreat(s, 'interceptor');
    const d = spawnThreat(s, 'drone');
    for (let i = 0; i < 20; i++) stepDefense(s, 40);
    expect(b.progress).toBeGreaterThan(a.progress);
    const straightX = d.startX + (s.cities[d.targetId].x - d.startX) * d.progress;
    expect(Math.abs(d.x - straightX)).toBeGreaterThan(0.1);
  });
  test('a depleted battery cannot fire and a recovery interval refills it', () => {
    const s = createDefense(900, 600);
    s.bases[0].ammo = 0;
    expect(fireDefense(s, { x: 300, y: 200 }, 0)).toBe(false);
    s.remaining = 0;
    stepDefense(s, 16);
    expect(s.phase).toBe('recovery');
    for (let i = 0; i < 100; i++) stepDefense(s, 40);
    expect(s.wave).toBe(2);
    expect(s.bases[0].ammo).toBe(14);
  });
  test('impact destroys the selected city and the last city ends the run', () => {
    const s = createDefense(900, 600);
    s.remaining = 0;
    s.cities.forEach((c, i) => c.alive = i === 0);
    const e = spawnThreat(s, 'ballistic');
    e.progress = 0.999;
    stepDefense(s, 40);
    expect(s.phase).toBe('over');
    expect(s.cities[0].alive).toBe(false);
  });
  test('enemy impacts do not score kills, friendly blasts reward multiple interceptions', () => {
    const s = createDefense(900, 600);
    s.remaining = 0;
    const e = spawnThreat(s, 'ballistic');
    s.blasts.push({ x: e.x, y: e.y, age: 200, duration: 1000, radius: 80, friendly: false });
    stepDefense(s, 16);
    expect(s.enemies).toHaveLength(1);
    expect(s.score).toBe(0);
    s.blasts[0].friendly = true;
    const other = spawnThreat(s, 'ballistic');
    other.startX = e.startX;
    stepDefense(s, 16);
    expect(s.score).toBe(225);
    expect(s.combo).toBe(2);
  });
});
