export type Vec2 = {
  x: number;
  y: number;
};

export type EnemyKind =
  | 'pitchFix'
  | 'suddenWallMeeting'
  | 'investorQuestion'
  | 'dueDiligence'
  | 'lateSlack';

export type WeaponId =
  | 'memoBeam'
  | 'nemawashiAura'
  | 'reminderBolt'
  | 'deckSprint'
  | 'consensusShield';

export type RunStatus = 'running' | 'levelUp' | 'won' | 'lost';

export type Enemy = {
  id: number;
  kind: EnemyKind;
  frame: number;
  label: string;
  position: Vec2;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  xp: number;
  color: number;
  hitCooldownMs: number;
};

export type Projectile = {
  id: number;
  weaponId: WeaponId;
  position: Vec2;
  velocity: Vec2;
  radius: number;
  damage: number;
  ttlMs: number;
  pierce: number;
  color: number;
  hitEnemyIds: Set<number>;
};

export type XpOrb = {
  id: number;
  position: Vec2;
  value: number;
  radius: number;
};

export type WeaponState = {
  id: WeaponId;
  level: number;
  cooldownMs: number;
};

export type UpgradeChoice = {
  id: WeaponId;
  name: string;
  description: string;
  nextLevel: number;
};

export type PlayerState = {
  position: Vec2;
  radius: number;
  hp: number;
  maxHp: number;
  baseSpeed: number;
  invulnerableMs: number;
};

export type GameState = {
  elapsedMs: number;
  durationMs: number;
  world: {
    width: number;
    height: number;
  };
  player: PlayerState;
  enemies: Enemy[];
  projectiles: Projectile[];
  xpOrbs: XpOrb[];
  weapons: WeaponState[];
  level: number;
  xp: number;
  xpToNext: number;
  defeatedEnemies: number;
  status: RunStatus;
  pendingChoices: UpgradeChoice[];
  spawnTimerMs: number;
  nextId: number;
  auraTickMs: number;
  rng: () => number;
};

export type InputState = {
  moveX: number;
  moveY: number;
};

export type GameResult = {
  status: 'won' | 'lost';
  elapsedMs: number;
  level: number;
  defeatedEnemies: number;
};
