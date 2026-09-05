import { createRun, updateRun, spawnBoss } from '../../src/games/page-survivor-2/simulation';
import { chooseUpgrade, offerUpgrades, isEvolved } from '../../src/games/page-survivor-2/progression';
import { insideHazard } from '../../src/games/page-survivor-2/combat';

const idle = { x: 0, y: 0, dash: false };

test('upgrade selection freezes both the clock and incoming attacks', () => {
  const s = createRun(1);
  offerUpgrades(s);
  const x = s.player.x;
  updateRun(s, .05, { x: 1, y: 0, dash: true });
  expect(s.time).toBe(0);
  expect(s.player.x).toBe(x);
  expect(s.status).toBe('upgrade');
});

test('only an offered upgrade is applied, and a choice resumes the run', () => {
  const s = createRun(3);
  offerUpgrades(s);
  const choices = [...s.choices];
  expect(new Set(choices).size).toBe(3);
  const absent = (['memo', 'orbit', 'bolt', 'pulse', 'focus', 'haste', 'magnet', 'armor'] as const).find(id => !choices.includes(id))!;
  chooseUpgrade(s, absent);
  expect(s.status).toBe('upgrade');
  const before = s.levels[choices[0]];
  chooseUpgrade(s, choices[0]);
  expect(s.levels[choices[0]]).toBe(before + 1);
  expect(s.status).toBe('playing');
});

test('weapon evolution requires both the weapon and matching support', () => {
  const s = createRun();
  s.levels.memo = 5;
  s.levels.focus = 1;
  expect(isEvolved(s, 'memo')).toBe(false);
  s.levels.focus = 2;
  expect(isEvolved(s, 'memo')).toBe(true);
  expect(isEvolved(s, 'orbit')).toBe(false);
});

test('dash grants immunity and cannot be repeated during its cooldown', () => {
  const s = createRun();
  updateRun(s, .05, { x: 1, y: 0, dash: true });
  expect(s.player.invulnerable).toBeGreaterThan(0);
  const first = s.player.dashCooldown;
  updateRun(s, .05, { x: 1, y: 0, dash: true });
  expect(s.player.dashCooldown).toBeLessThan(first);
});

test('a telegraphed area is safe until its warning expires', () => {
  const s = createRun();
  s.hazards.push({ id: 100, x: s.player.x, y: s.player.y, angle: 0, kind: 'circle', radius: 80, width: 0, length: 0, warning: 1, life: .25, damage: 20, fired: false });
  updateRun(s, .05, idle);
  expect(s.player.hp).toBe(100);
  s.hazards[0].warning = .01;
  updateRun(s, .05, idle);
  expect(s.player.hp).toBe(80);
});

test('surviving five minutes starts the CEO fight rather than awarding victory', () => {
  const s = createRun();
  s.time = 299.99;
  s.milestones = [90, 180];
  updateRun(s, .02, idle);
  expect(s.status).toBe('playing');
  expect(s.enemies.some(e => e.boss === 3)).toBe(true);
  expect(s.milestones.filter(t => t === 300)).toHaveLength(1);
  updateRun(s, .02, idle);
  expect(s.enemies.filter(e => e.boss === 3)).toHaveLength(1);
});

test('defeating the final boss finishes the run after five minutes', () => {
  const s = createRun();
  s.time = 301;
  s.milestones = [90, 180, 300];
  const boss = spawnBoss(s, 3);
  boss.hp = 0;
  updateRun(s, .02, idle);
  expect(s.status).toBe('won');
});

test('same seed and inputs reproduce the run, and terminal states stop advancing', () => {
  const a = createRun(77), b = createRun(77);
  for (let i = 0; i < 200; i++) {
    updateRun(a, .02, idle);
    updateRun(b, .02, idle);
  }
  expect(a.enemies).toEqual(b.enemies);
  a.status = 'lost';
  const time = a.time;
  updateRun(a, .05, idle);
  expect(a.time).toBe(time);
});

test('three weapon and support slots keep incompatible new skills out of choices', () => {
  const s = createRun(9);
  s.levels.orbit = 1; s.levels.bolt = 1;
  s.levels.focus = 1; s.levels.armor = 1; s.levels.haste = 1;
  for (let i = 0; i < 15; i++) {
    offerUpgrades(s);
    expect(s.choices).not.toContain('pulse');
    expect(s.choices).not.toContain('magnet');
    s.status = 'playing';
  }
});

test('boss lane warning locks direction and produces a real charge after warning', () => {
  const s = createRun(2);
  const b = spawnBoss(s, 1);
  b.attack = 1; b.cooldown = 0;
  updateRun(s, .02, idle);
  const lane = s.hazards.find(h => h.kind === 'lane')!;
  expect(lane).toBeDefined();
  const angle = lane.angle;
  s.player.x += 100;
  updateRun(s, .02, idle);
  expect(lane.angle).toBe(angle);
  lane.warning = .01;
  updateRun(s, .02, idle);
  const x = b.x, y = b.y;
  updateRun(s, .05, idle);
  expect(Math.hypot(b.x - x, b.y - y)).toBeGreaterThan(15);
});

test('boss arrivals at arena corners never materialize on the player', () => {
  for (let seed = 0; seed < 30; seed++) {
    const s = createRun(seed * 7919); s.player.x = 45; s.player.y = 45;
    const boss = spawnBoss(s, 1);
    expect(Math.hypot(boss.x - 45, boss.y - 45)).toBeGreaterThanOrEqual(260);
  }
});

test('large experience drops are merged without losing earned experience', () => {
  const s = createRun();
  s.pickups = Array.from({ length: 400 }, (_, i) => ({ id: i + 500, kind: 'xp' as const, value: 2, x: 2100, y: 1600 }));
  updateRun(s, .05, idle);
  expect(s.pickups.length).toBeLessThanOrEqual(350);
  expect(s.pickups.reduce((total, p) => total + p.value, 0)).toBe(800);
});

test('maxed equipment offers recovery and never overfills health', () => {
  const s = createRun();
  s.levels.memo = 5; s.levels.orbit = 5; s.levels.bolt = 5;
  s.levels.focus = 3; s.levels.haste = 3; s.levels.armor = 3;
  s.player.hp = 90;
  offerUpgrades(s); expect(s.choices).toEqual(['coffee']);
  chooseUpgrade(s, 'coffee'); expect(s.player.hp).toBe(100);
});

test('lethal damage yields a terminal loss, and later input cannot revive the run', () => {
  const s = createRun(); s.player.hp = 1;
  s.hazards.push({ id: 100, x: s.player.x, y: s.player.y, angle: 0, kind: 'circle', radius: 80, width: 0, length: 0, warning: 0, life: .25, damage: 20, fired: false });
  updateRun(s, .05, idle); expect(s.status).toBe('lost'); expect(s.player.hp).toBe(0);
  const time = s.time; updateRun(s, .05, {x:1,y:1,dash:true}); expect(s.time).toBe(time);
});

test('charge warning includes the boss contact footprint and the boss holds its origin', () => {
  const s = createRun(5), b = spawnBoss(s, 1);
  b.x = 900; b.y = 900; b.attack = 1; b.cooldown = 0;
  updateRun(s, .02, idle);
  const lane = s.hazards.find(h => h.kind === 'lane')!;
  s.player.x = 1100; s.player.y = 945;
  expect(insideHazard(s, lane)).toBe(true);
  const origin = {x:b.x, y:b.y};
  for (let i = 0; i < 10; i++) updateRun(s, .05, idle);
  expect({x:b.x,y:b.y}).toEqual(origin);
  expect(s.player.hp).toBe(100);
});
