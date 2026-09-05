import { announce, clamp, distance, effect, UPGRADES, WEAPONS, type Enemy, type Hazard, type Run, type WeaponId } from './model';
import { isEvolved } from './progression';

export function hurtPlayer(s: Run, damage: number): void {
  if (s.player.invulnerable > 0 || s.player.hp <= 0) return;
  const dealt = Math.max(1, Math.round(damage * (1 - s.levels.armor * .13)));
  s.player.hp -= dealt;
  s.player.invulnerable = .75;
  s.shake = .16;
  s.sounds.push('hurt');
  effect(s, s.player, '#ff8b91', 36, `−${dealt}`);
}
function hit(s: Run, e: Enemy, amount: number, color: string): void {
  if (e.hp <= 0 || (e.shield ?? 0) > 0) return;
  e.hp -= amount; e.flash = .1;
  s.damageDealt += amount;
  if (s.effects.length < 65) effect(s, e, color, 15, `${Math.round(amount)}`);
}
export function orbitRadius(s: Run): number { return 64 + s.levels.orbit * 13; }
export function updateWeapons(s: Run, dt: number): void {
  const power = 1 + s.levels.focus * .18;
  const rate = 1 - s.levels.haste * .1;
  for (const id of WEAPONS) {
    s.cooldowns[id] -= dt;
    const level = s.levels[id];
    if (!level || s.cooldowns[id] > 0) continue;
    const evolved = isEvolved(s, id);
    const color = UPGRADES[id].color;
    if (id === 'orbit') {
      const count = 2 + Math.floor(level / 2);
      for (const e of s.enemies) {
        let touches = evolved && distance(e, s.player) < orbitRadius(s);
        for (let i = 0; i < count && !touches; i++) {
          const angle = s.time * 2.4 + i * Math.PI * 2 / count;
          touches = distance(e, { x: s.player.x + Math.cos(angle) * orbitRadius(s), y: s.player.y + Math.sin(angle) * orbitRadius(s) }) < e.radius + 20;
        }
        if (touches) hit(s, e, (7 + level * 3) * power, color);
      }
      s.cooldowns[id] = .23;
    } else if (id === 'pulse') {
      const radius = 125 + level * 22 + (evolved ? 95 : 0);
      for (const e of s.enemies) {
        const d = distance(e, s.player);
        if (d < radius) {
          hit(s, e, (25 + level * 13) * power * (evolved ? 1.4 : 1), color);
          if (!e.boss) { e.x += (e.x - s.player.x) / Math.max(d, 1) * 35; e.y += (e.y - s.player.y) / Math.max(d, 1) * 35; }
        }
      }
      if (evolved) s.shots = s.shots.filter(b => !b.enemy || distance(b, s.player) > radius);
      effect(s, s.player, color, radius);
      s.sounds.push('burst');
      s.cooldowns[id] = (3.4 - level * .2) * rate;
    } else {
      const target = s.enemies.filter(e => e.hp > 0 && distance(e, s.player) < 680).sort((a, b) => distance(a, s.player) - distance(b, s.player))[0];
      if (!target) continue;
      const angle = Math.atan2(target.y - s.player.y, target.x - s.player.x);
      const count = id === 'memo' ? 1 + Math.floor(level / 2) + (evolved ? 2 : 0) : 2 + Math.floor(level / 2) + (evolved ? 4 : 0);
      for (let i = 0; i < count; i++) {
        const spread = angle + (i - (count - 1) / 2) * (id === 'memo' ? .09 : .19);
        shoot(s, id, spread, (id === 'memo' ? 17 + level * 8 : 15 + level * 6) * power * (evolved ? 1.45 : 1), evolved);
      }
      s.sounds.push('shot');
      s.cooldowns[id] = (id === 'memo' ? .72 - level * .055 : 1.4 - level * .1) * rate;
    }
  }
}
function shoot(s: Run, id: WeaponId, angle: number, damage: number, evolved: boolean): void {
  const speed = id === 'memo' ? 640 : 430;
  s.shots.push({ x: s.player.x, y: s.player.y - 6, id: s.id++, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
    damage, radius: evolved ? 8 : 5, life: 1.4, pierce: id === 'bolt' ? s.levels.bolt + 1 : evolved ? 5 : 0,
    enemy: false, color: UPGRADES[id].color, hits: [] });
}
export function updateShots(s: Run, dt: number): void {
  for (const b of s.shots) {
    b.life -= dt; b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.enemy) {
      if (distance(b, s.player) < b.radius + 14) { hurtPlayer(s, b.damage); b.life = 0; }
      continue;
    }
    for (const e of s.enemies) {
      if (e.hp <= 0 || b.life <= 0 || b.hits.includes(e.id)) continue;
      if (distance(b, e) < b.radius + e.radius) {
        hit(s, e, b.damage, b.color); b.hits.push(e.id);
        b.pierce--;
        if (b.pierce < 0) b.life = 0;
      }
    }
  }
  s.shots = s.shots.filter(b => b.life > 0);
}
export function updateBoss(s: Run, e: Enemy, dt: number): void {
  e.shield = Math.max(0, (e.shield ?? 0) - dt);
  if (e.charge) {
    const move = Math.min(e.charge.remaining, 850 * dt);
    e.x = clamp(e.x + Math.cos(e.charge.angle) * move, 45, 2355);
    e.y = clamp(e.y + Math.sin(e.charge.angle) * move, 45, 1755);
    e.charge.remaining -= move;
    if (e.charge.remaining <= 0) e.charge = undefined;
    return;
  }
  if (e.hp < e.maxHp * .5 && e.phase === 1) {
    e.phase = 2; e.shield = 1.2; e.cooldown = 1.4;
    announce(s, '議論がヒートアップ！ 攻撃の予兆が短くなる', 'boss');
    effect(s, e, '#ffd278', 120);
  }
  e.cooldown -= dt;
  if (e.cooldown > 0) return;
  const enraged = e.hp < e.maxHp * .5;
  const kind = e.attack++ % (e.boss === 1 ? 2 : 3);
  const angle = Math.atan2(s.player.y - e.y, s.player.x - e.x);
  const base = { id: s.id++, owner: e.id, x: e.x, y: e.y, angle, radius: 0, width: 0, length: 0, warning: enraged ? .85 : 1.15, life: .28, damage: 20, fired: false };
  if (kind === 0) {
    const count = e.boss === 3 ? 5 : 3;
    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * 135;
      s.hazards.push({ ...base, id: s.id++, x: clamp(s.player.x + Math.cos(angle + Math.PI / 2) * offset, 45, 2355), y: clamp(s.player.y + Math.sin(angle + Math.PI / 2) * offset, 45, 1755), kind: 'circle', radius: 65 + e.boss * 9 });
    }
  } else if (kind === 1) {
    const length = Math.min(650, distance(e, s.player) + 140);
    s.hazards.push({ ...base, kind: 'lane', width: e.radius * 2, length, life: length / 850 + .12 });
  } else {
    s.hazards.push({ ...base, kind: 'volley', radius: 90, life: .12 });
  }
  s.sounds.push('warning');
  e.cooldown = (enraged ? 2.6 : 3.8) - e.boss * .15;
}
export function insideHazard(s: Run, h: Hazard): boolean {
  if (h.kind === 'circle') return distance(s.player, h) < h.radius + 15;
  if (h.kind === 'lane') {
    const x = s.player.x - h.x, y = s.player.y - h.y;
    const along = x * Math.cos(h.angle) + y * Math.sin(h.angle);
    const across = -x * Math.sin(h.angle) + y * Math.cos(h.angle);
    return along >= -15 && along <= h.length + 15 && Math.abs(across) < h.width / 2 + 15;
  }
  return false;
}
export function updateHazards(s: Run, dt: number): void {
  for (const h of s.hazards) {
    h.warning -= dt;
    if (h.warning > 0) continue;
    h.life -= dt;
    if (!h.fired) {
      h.fired = true;
      effect(s, h, '#ff8b91', h.kind === 'circle' ? h.radius : 50);
      if (h.kind === 'lane' && h.owner) {
        const owner = s.enemies.find(e => e.id === h.owner && e.hp > 0);
        if (owner) { owner.x = h.x; owner.y = h.y; owner.charge = { angle: h.angle, remaining: h.length }; }
      }
      if (h.kind === 'volley') {
        // Three missing shots leave a readable safe wedge aimed toward the player.
        for (let i = 2; i < 17; i++) {
          const a = h.angle + i * Math.PI * 2 / 18;
          s.shots.push({ id: s.id++, x: h.x, y: h.y, vx: Math.cos(a) * 170, vy: Math.sin(a) * 170,
            radius: 8, damage: 16, life: 5.5, pierce: 0, color: '#ff8b91', enemy: true, hits: [] });
        }
      }
    }
    if (insideHazard(s, h)) hurtPlayer(s, h.damage);
  }
  s.hazards = s.hazards.filter(h => h.warning > 0 || h.life > 0);
}
