import type { EnemyKind, WeaponId } from './types';

export const GAME_DURATION_MS = 5 * 60 * 1000;
export const DEBUG_DURATION_MS = 60 * 1000;

export const WORLD = {
  width: 2600,
  height: 1900,
};

export const PLAYER_START = {
  hp: 100,
  speed: 245,
  radius: 18,
};

export const ENEMY_DEFS: Record<
  EnemyKind,
  {
    label: string;
    frame: number;
    hp: number;
    speed: number;
    radius: number;
    damage: number;
    xp: number;
    color: number;
  }
> = {
  pitchFix: {
    label: '細かい指摘する先輩',
    frame: 0,
    hp: 18,
    speed: 84,
    radius: 15,
    damage: 9,
    xp: 4,
    color: 0xf2bd5e,
  },
  suddenWallMeeting: {
    label: '話が長いお局さん',
    frame: 5,
    hp: 32,
    speed: 70,
    radius: 20,
    damage: 13,
    xp: 6,
    color: 0x6fb7ff,
  },
  investorQuestion: {
    label: '詰めてくる課長',
    frame: 10,
    hp: 44,
    speed: 92,
    radius: 18,
    damage: 16,
    xp: 8,
    color: 0xe97878,
  },
  dueDiligence: {
    label: '粗探しする部長',
    frame: 15,
    hp: 76,
    speed: 55,
    radius: 25,
    damage: 22,
    xp: 13,
    color: 0xc59cff,
  },
  lateSlack: {
    label: '突然連絡してくる社長',
    frame: 20,
    hp: 24,
    speed: 142,
    radius: 13,
    damage: 10,
    xp: 7,
    color: 0x73e4a2,
  },
};

export const WEAPON_DEFS: Record<
  WeaponId,
  {
    name: string;
    description: string;
    maxLevel: number;
  }
> = {
  memoBeam: {
    name: '議事録ビーム',
    description: '近い相手へ自動で要点を飛ばす。レベルで威力と間隔が改善。',
    maxLevel: 5,
  },
  nemawashiAura: {
    name: '根回しオーラ',
    description: '周囲の相手に継続ダメージ。レベルで範囲が広がる。',
    maxLevel: 5,
  },
  reminderBolt: {
    name: 'リマインド弾',
    description: '貫通する通知を発射。レベルで連射と貫通数が伸びる。',
    maxLevel: 5,
  },
  deckSprint: {
    name: '資料修正スプリント',
    description: '移動速度を上げる。詰めの修正で逃げ足が速くなる。',
    maxLevel: 4,
  },
  consensusShield: {
    name: '合意形成シールド',
    description: '被ダメージを軽減し、接触後の無敵時間を伸ばす。',
    maxLevel: 4,
  },
};

export const WAVE_TABLE: Array<{
  fromMs: number;
  spawnEveryMs: number;
  groupSize: number;
  kinds: EnemyKind[];
}> = [
  { fromMs: 0, spawnEveryMs: 950, groupSize: 2, kinds: ['pitchFix'] },
  {
    fromMs: 45_000,
    spawnEveryMs: 760,
    groupSize: 3,
    kinds: ['pitchFix', 'suddenWallMeeting'],
  },
  {
    fromMs: 105_000,
    spawnEveryMs: 620,
    groupSize: 4,
    kinds: ['pitchFix', 'suddenWallMeeting', 'investorQuestion'],
  },
  {
    fromMs: 180_000,
    spawnEveryMs: 520,
    groupSize: 5,
    kinds: ['suddenWallMeeting', 'investorQuestion', 'lateSlack'],
  },
  {
    fromMs: 250_000,
    spawnEveryMs: 360,
    groupSize: 7,
    kinds: ['investorQuestion', 'dueDiligence', 'lateSlack'],
  },
];
