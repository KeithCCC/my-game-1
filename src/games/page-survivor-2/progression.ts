import { announce, random, UPGRADES, WEAPONS, type Run, type UpgradeId, type WeaponId } from './model';

export function isEvolved(s: Run, id: WeaponId): boolean {
  return s.levels[id] >= 5 && s.levels[UPGRADES[id].partner!] >= 2;
}
export function offerUpgrades(s: Run): void {
  const supports: UpgradeId[] = ['focus', 'haste', 'magnet', 'armor'];
  const weaponSlots = WEAPONS.filter(id => s.levels[id] > 0).length;
  const supportSlots = supports.filter(id => s.levels[id] > 0).length;
  const pool = (Object.keys(UPGRADES) as UpgradeId[]).filter(id => {
    if (id === 'coffee' || s.levels[id] >= UPGRADES[id].max) return false;
    if (s.levels[id] > 0) return true;
    return supports.includes(id) ? supportSlots < 3 : weaponSlots < 3;
  });
  // Shuffle instead of random sort so a seed is reproducible across JS engines.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random(s) * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  s.choices = pool.length ? pool.slice(0, 3) : ['coffee'];
  s.status = 'upgrade';
  s.sounds.push('upgrade');
}
export function chooseUpgrade(s: Run, id: UpgradeId): void {
  if (s.status !== 'upgrade' || !s.choices.includes(id)) return;
  s.levels[id]++;
  if (id === 'armor') { s.player.maxHp += 15; s.player.hp = Math.min(s.player.maxHp, s.player.hp + 15); }
  if (id === 'coffee') s.player.hp = Math.min(s.player.maxHp, s.player.hp + 35);
  for (const weapon of WEAPONS) {
    if (isEvolved(s, weapon) && !s.evolved.includes(weapon)) {
      s.evolved.push(weapon);
      announce(s, `武器進化：${UPGRADES[weapon].evolution}`, 'evolve');
    }
  }
  s.choices = [];
  s.status = 'playing';
  s.player.invulnerable = Math.max(s.player.invulnerable, .8);
}
export function collectExperience(s: Run, value: number): void { s.xp += value; }
export function checkLevel(s: Run): void {
  if (s.status !== 'playing' || s.xp < s.xpNext) return;
  s.xp -= s.xpNext;
  s.level++;
  s.xpNext = 10 + s.level * 10;
  offerUpgrades(s);
}
