import { WEAPON_DEFS } from './config';
import type { GameState, UpgradeChoice, WeaponId } from './types';

const ALL_WEAPONS = Object.keys(WEAPON_DEFS) as WeaponId[];

export function getWeaponLevel(state: GameState, id: WeaponId): number {
  return state.weapons.find((weapon) => weapon.id === id)?.level ?? 0;
}

export function getUpgradeChoices(state: GameState): UpgradeChoice[] {
  const available = ALL_WEAPONS.filter((id) => getWeaponLevel(state, id) < WEAPON_DEFS[id].maxLevel);
  const weighted = available
    .map((id) => ({ id, sort: state.rng() + (getWeaponLevel(state, id) === 0 ? -0.18 : 0) }))
    .sort((a, b) => a.sort - b.sort)
    .slice(0, 3);

  return weighted.map(({ id }) => {
    const nextLevel = getWeaponLevel(state, id) + 1;
    return {
      id,
      name: WEAPON_DEFS[id].name,
      description: WEAPON_DEFS[id].description,
      nextLevel,
    };
  });
}

export function applyUpgrade(state: GameState, id: WeaponId): void {
  const existing = state.weapons.find((weapon) => weapon.id === id);
  if (existing) {
    existing.level = Math.min(existing.level + 1, WEAPON_DEFS[id].maxLevel);
    existing.cooldownMs = 0;
  } else {
    state.weapons.push({ id, level: 1, cooldownMs: 0 });
  }
  state.pendingChoices = [];
  state.status = 'running';
}

export function xpNeededForLevel(level: number): number {
  return 10 + level * 8;
}
