export type WeaponId = 'memo' | 'orbit' | 'bolt' | 'pulse';
export type UpgradeId = WeaponId | 'focus' | 'haste' | 'magnet' | 'armor' | 'coffee';
export type Point = { x: number; y: number };
export type Input = { x: number; y: number; dash: boolean };
export type Enemy = Point & {
  id: number; kind: number; hp: number; maxHp: number; speed: number; radius: number;
  damage: number; xp: number; boss: number; cooldown: number; flash: number; attack: number;
  phase?: number; shield?: number; charge?: { angle: number; remaining: number };
};
export type Shot = Point & { id: number; vx: number; vy: number; damage: number; radius: number; life: number; pierce: number; enemy: boolean; color: string; hits: number[] };
export type Pickup = Point & { id: number; kind: 'xp' | 'coffee' | 'magnet' | 'chest'; value: number };
export type Hazard = Point & {
  id: number; kind: 'circle' | 'lane' | 'volley'; angle: number; radius: number; width: number;
  length: number; warning: number; life: number; damage: number; fired: boolean;
  owner?: number;
};
export type Effect = Point & { text?: string; color: string; radius: number; life: number; maxLife: number };
export type SoundEvent = 'shot' | 'hit' | 'hurt' | 'pickup' | 'upgrade' | 'evolve' | 'dash' | 'boss' | 'warning' | 'burst' | 'win' | 'lose' | 'heal';
export type Run = {
  status: 'playing' | 'upgrade' | 'won' | 'lost'; time: number; seed: number; id: number;
  player: Point & { hp: number; maxHp: number; invulnerable: number; dashCooldown: number; dashTime: number; facing: number; dx: number; dy: number };
  levels: Record<UpgradeId, number>; cooldowns: Record<WeaponId, number>; evolved: WeaponId[];
  level: number; xp: number; xpNext: number; choices: UpgradeId[]; kills: number; bosses: number;
  enemies: Enemy[]; shots: Shot[]; pickups: Pickup[]; hazards: Hazard[]; effects: Effect[];
  sounds: SoundEvent[]; milestones: number[]; spawnClock: number; supplyClock: number;
  banner: string; bannerTime: number; shake: number; damageDealt: number;
};
export const WORLD = { width: 2400, height: 1800 };
export const WEAPONS: WeaponId[] = ['memo', 'orbit', 'bolt', 'pulse'];
export const UPGRADES: Record<UpgradeId, { name: string; icon: string; description: string; max: number; color: string; evolution?: string; partner?: UpgradeId }> = {
  memo: { name: '議事録ビーム', icon: '✦', description: '最も近い敵へ自動連射。威力と弾数が増える。', max: 5, color: '#ffd278', evolution: '全社共有レーザー', partner: 'focus' },
  orbit: { name: '根回しオーラ', icon: '◎', description: '周囲を回る書類が敵を迎撃。接近戦を強化。', max: 5, color: '#74e6c8', evolution: '全方位合意フィールド', partner: 'armor' },
  bolt: { name: 'リマインド弾', icon: '↗', description: '敵を貫く通知を扇状に発射。群れに強い。', max: 5, color: '#89caff', evolution: '一斉送信ストーム', partner: 'haste' },
  pulse: { name: '定時チャイム', icon: '◈', description: '周期的な衝撃波で周囲の敵を押し返す。', max: 5, color: '#d7afff', evolution: 'ノー残業宣言', partner: 'magnet' },
  focus: { name: '集中力', icon: '✧', description: '全武器の威力 +18%。議事録ビームの進化条件。', max: 3, color: '#ffd278' },
  haste: { name: '仕事の効率化', icon: '»', description: '攻撃間隔とダッシュ待機を短縮、移動速度 +6%。', max: 3, color: '#89caff' },
  magnet: { name: '情報収集', icon: '◇', description: '経験値の回収範囲 +45。定時チャイムの進化条件。', max: 3, color: '#d7afff' },
  armor: { name: '合意形成シールド', icon: '⬡', description: '被ダメージ軽減、最大HP +15、その分回復。', max: 3, color: '#74e6c8' },
  coffee: { name: '休憩コーヒー', icon: '+', description: 'HPを35回復。能力が最大になった後の休憩。', max: Infinity, color: '#f4c88a' },
};
export function random(s: Run): number {
  s.seed = (Math.imul(1664525, s.seed) + 1013904223) >>> 0;
  return s.seed / 4294967296;
}
export const clamp = (n: number, a: number, b: number): number => Math.min(b, Math.max(a, n));
export const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);
export function effect(s: Run, p: Point, color: string, radius: number, text?: string): void {
  s.effects.push({ x: p.x, y: p.y, color, radius, text, life: text ? .75 : .4, maxLife: text ? .75 : .4 });
}
export function announce(s: Run, text: string, sound?: SoundEvent): void {
  s.banner = text; s.bannerTime = 4;
  if (sound) s.sounds.push(sound);
}
