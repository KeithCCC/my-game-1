import { announce, clamp, distance, effect, random, WORLD, type Enemy, type Input, type Run } from './model';
import { checkLevel, collectExperience, offerUpgrades } from './progression';
import { updateWeapons, updateShots, updateHazards, updateBoss, hurtPlayer } from './combat';

export function createRun(seed = Date.now()): Run {
  return {
    status: 'playing', time: 0, seed: seed >>> 0, id: 1,
    player: { x: 1200, y: 900, hp: 100, maxHp: 100, invulnerable: 0, dashCooldown: 0, dashTime: 0, facing: 1, dx: 1, dy: 0 },
    levels: { memo: 1, orbit: 0, bolt: 0, pulse: 0, focus: 0, haste: 0, magnet: 0, armor: 0, coffee: 0 },
    cooldowns: { memo: 0, orbit: 0, bolt: 0, pulse: 0 }, evolved: [],
    level: 1, xp: 0, xpNext: 10, choices: [], kills: 0, bosses: 0,
    enemies: [], shots: [], pickups: [], hazards: [], effects: [], sounds: [], milestones: [],
    spawnClock: .5, supplyClock: 25, banner: '17:55　定時まで、あと5分。', bannerTime: 4, shake: 0, damageDealt: 0,
  };
}

export function spawnBoss(s: Run, tier: number): Enemy {
  let p = spawnPosition(s, 420);
  if (distance(p, s.player) < 300) {
    p = { x: s.player.x + (s.player.x < WORLD.width / 2 ? 350 : -350), y: s.player.y + (s.player.y < WORLD.height / 2 ? 350 : -350) };
  }
  const hp = [0, 1100, 3200, 18000][tier];
  const boss: Enemy = { ...p, id: s.id++, kind: tier + 1, boss: tier, hp, maxHp: hp, speed: 42 + tier * 4, radius: 40 + tier * 4, damage: 18, xp: 35, cooldown: 2, flash: 0, attack: 0, phase: 1, shield: 1.4 };
  s.enemies.push(boss);
  // Make space around each entrance, while retaining earlier bosses if the player fled.
  s.enemies = s.enemies.filter(e => e.boss || distance(e, s.player) > 180);
  announce(s, ['', '中ボス：詰めてくる課長', '中ボス：粗探しする部長', '最終会議：緊急招集の社長'][tier], 'boss');
  return boss;
}

function spawnPosition(s: Run, radius: number): { x: number; y: number } {
  const angle = random(s) * Math.PI * 2;
  return { x: clamp(s.player.x + Math.cos(angle) * radius, 40, WORLD.width - 40), y: clamp(s.player.y + Math.sin(angle) * radius, 40, WORLD.height - 40) };
}
function spawnEnemy(s: Run): void {
  if (s.enemies.length >= 145) return;
  const stage = Math.min(4, Math.floor(s.time / 55));
  const kind = Math.floor(random(s) * (stage + 1));
  const p = spawnPosition(s, 570 + random(s) * 180);
  // At the world edge clamping must not create an enemy directly on the player.
  if (distance(p, s.player) < 260) return;
  const hp = [22, 38, 48, 100, 30][kind] * (1 + s.time / 370);
  s.enemies.push({ ...p, id: s.id++, kind, boss: 0, hp, maxHp: hp, radius: kind === 3 ? 24 : 18,
    speed: [65, 58, 78, 46, 127][kind] + stage * 4, damage: 9 + kind * 2, xp: kind === 3 ? 5 : 2,
    cooldown: 2 + random(s) * 2, flash: 0, attack: 0 });
}

export function updateRun(s: Run, delta: number, input: Input): void {
  if (s.status !== 'playing' || !Number.isFinite(delta) || delta <= 0) return;
  const dt = Math.min(delta, .05);
  s.time += dt;
  s.bannerTime = Math.max(0, s.bannerTime - dt);
  s.shake = Math.max(0, s.shake - dt);
  s.effects.forEach(e => e.life -= dt);
  s.effects = s.effects.filter(e => e.life > 0).slice(-95);
  updatePlayer(s, dt, input);
  for (const time of [90, 180, 300]) {
    if (s.time >= time && !s.milestones.includes(time)) {
      s.milestones.push(time);
      spawnBoss(s, time === 90 ? 1 : time === 180 ? 2 : 3);
    }
  }
  for (const time of [45, 135, 225, 270]) {
    if (s.time >= time && !s.milestones.includes(time)) {
      s.milestones.push(time);
      announce(s, time === 270 ? '締切ラッシュ！ あと30秒。' : time === 135 ? '会議包囲網。ダッシュで突破！' : time === 225 ? '最終準備：回復と経験値を回収しよう' : '通知が増加。装備を整えよう');
      if (time === 135 || time === 270) for (let i = 0; i < 24; i++) spawnEnemy(s);
    }
  }
  s.spawnClock -= dt;
  if (s.spawnClock <= 0) {
    const count = s.time >= 300 ? 2 : 2 + Math.floor(s.time / 65);
    for (let i = 0; i < count; i++) spawnEnemy(s);
    s.spawnClock = s.time >= 300 ? 1.6 : Math.max(.5, 1.15 - s.time / 550);
  }
  s.supplyClock -= dt;
  if (s.supplyClock <= 0) {
    const p = spawnPosition(s, 180);
    s.pickups.push({ ...p, id: s.id++, kind: Math.floor(s.time / 25) % 2 ? 'coffee' : 'magnet', value: 0 });
    s.supplyClock = 25;
  }
  for (const e of s.enemies) {
    e.flash = Math.max(0, e.flash - dt);
    if (e.hp <= 0) continue;
    const d = Math.max(1, distance(e, s.player));
    const windingUp = e.boss && s.hazards.some(h => h.owner === e.id && h.kind === 'lane' && h.warning > 0);
    const moving = !e.boss || (e.cooldown > .7 && !e.charge && !windingUp);
    if (moving && !(e.kind === 1 && d < 270)) {
      e.x += (s.player.x - e.x) / d * e.speed * dt;
      e.y += (s.player.y - e.y) / d * e.speed * dt;
    }
    if (e.boss) updateBoss(s, e, dt);
    else if (e.kind === 1) {
      e.cooldown -= dt;
      if (e.cooldown <= 0 && d < 650) {
        const angle = Math.atan2(s.player.y - e.y, s.player.x - e.x);
        s.shots.push({ x: e.x, y: e.y, id: s.id++, vx: Math.cos(angle) * 135, vy: Math.sin(angle) * 135, radius: 7, damage: 12, life: 5, enemy: true, color: '#ff8b91', pierce: 0, hits: [] });
        e.cooldown = 3.2;
      }
    }
    if (d < e.radius + 15) hurtPlayer(s, e.damage);
  }
  updateWeapons(s, dt);
  updateShots(s, dt);
  updateHazards(s, dt);
  resolveDeaths(s);
  if (s.player.hp <= 0) { s.player.hp = 0; s.status = 'lost'; s.sounds.push('lose'); return; }
  if (s.status !== 'playing') return;
  collectPickups(s, dt);
  checkLevel(s);
  s.shots = s.shots.slice(-450);
  s.hazards = s.hazards.slice(-55);
  // Merge old experience rather than discard the player's earned rewards.
  if (s.pickups.length > 350) {
    const xp = s.pickups.filter(p => p.kind === 'xp');
    const excess = Math.min(s.pickups.length - 350, xp.length - 1);
    if (excess > 0) {
      const merged = new Set(xp.slice(0, excess));
      xp[excess].value += [...merged].reduce((total, p) => total + p.value, 0);
      s.pickups = s.pickups.filter(p => !merged.has(p));
    }
  }
  s.sounds = s.sounds.slice(-24);
}

function updatePlayer(s: Run, dt: number, input: Input): void {
  const p = s.player;
  p.invulnerable = Math.max(0, p.invulnerable - dt);
  p.dashCooldown = Math.max(0, p.dashCooldown - dt);
  p.dashTime = Math.max(0, p.dashTime - dt);
  const length = Math.hypot(input.x, input.y);
  if (length) { p.dx = input.x / length; p.dy = input.y / length; if (input.x) p.facing = Math.sign(input.x); }
  if (input.dash && p.dashCooldown <= 0) {
    p.dashTime = .2; p.dashCooldown = 2.8 - s.levels.haste * .25; p.invulnerable = .3;
    s.sounds.push('dash'); effect(s, p, '#83ffe1', 60);
  }
  const speed = 210 * (1 + s.levels.haste * .06);
  if (p.dashTime > 0 || length) {
    const amount = dt * speed * (p.dashTime > 0 ? 3.7 : 1);
    p.x = clamp(p.x + p.dx * amount, 45, WORLD.width - 45);
    p.y = clamp(p.y + p.dy * amount, 45, WORLD.height - 45);
  }
}

function resolveDeaths(s: Run): void {
  for (const e of s.enemies) {
    if (e.hp > 0) continue;
    s.kills++;
    effect(s, e, e.boss ? '#ffd278' : '#8dd5bc', e.boss ? 110 : 28);
    s.pickups.push({ x: e.x, y: e.y, id: s.id++, kind: 'xp', value: e.xp });
    if (e.boss) {
      s.bosses++;
      s.pickups.push({ x: e.x + 25, y: e.y, id: s.id++, kind: 'chest', value: 0 });
      s.pickups.push({ x: e.x - 25, y: e.y, id: s.id++, kind: 'coffee', value: 0 });
      announce(s, '会議終了！ 報酬の稟議書を回収しよう', 'evolve');
      if (e.boss === 3 && s.time >= 300) { s.status = 'won'; s.sounds.push('win'); }
    }
  }
  s.enemies = s.enemies.filter(e => e.hp > 0);
}
function collectPickups(s: Run, dt: number): void {
  const keep = [];
  let magnet = false;
  for (const p of s.pickups) {
    const d = distance(s.player, p);
    const reach = p.kind === 'xp' ? 85 + s.levels.magnet * 45 : 60;
    if (d < reach && d > 20) {
      const step = Math.min(d, dt * 560);
      p.x += (s.player.x - p.x) / d * step;
      p.y += (s.player.y - p.y) / d * step;
    }
    if (distance(s.player, p) > 24 || s.status !== 'playing') { keep.push(p); continue; }
    if (p.kind === 'xp') { collectExperience(s, p.value); s.sounds.push('pickup'); }
    if (p.kind === 'coffee') { s.player.hp = Math.min(s.player.maxHp, s.player.hp + 30); effect(s, s.player, '#74e6c8', 40, '+30 HP'); s.sounds.push('heal'); }
    if (p.kind === 'magnet') { magnet = true; s.sounds.push('heal'); }
    if (p.kind === 'chest') { offerUpgrades(s); announce(s, '特別報酬：能力をひとつ獲得'); }
  }
  if (magnet) {
    for (const p of keep) if (p.kind === 'xp') collectExperience(s, p.value);
    s.pickups = keep.filter(p => p.kind !== 'xp');
    effect(s, s.player, '#d7afff', 250, '経験値 一括回収');
  } else s.pickups = keep;
}
