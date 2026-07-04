import { clamp } from '../math/ScalarUtils';
import { DEFAULT_PRNG, type RandomGenerator } from '../math/RandomUtils';

type UnlockRule<T extends string> = {
  waveNumber: number;
  type: T;
};

type SpawnPlan<T extends string> = {
  type: T;
  waveNumber: number;
  spawnIndex: number;
  spawnCount: number;
};

type WaveSpawnDirectorOptions<T extends string> = {
  baseWaveSize?: number;
  growthPerWave?: number;
  maxWaveSize?: number;
  unlockRules?: Array<UnlockRule<T>>;
  typeWeights?: Partial<Record<T, number | ((waveNumber: number) => number)>>;
  maxSpawnsPerStep?: number;
  startWaveNumber?: number;
  waveAutoStart?: boolean;
  prng?: RandomGenerator;
};

const resolveWeight = (value: number | ((waveNumber: number) => number), waveNumber: number): number =>
  typeof value === 'function' ? value(waveNumber) : value;

export class WaveSpawnDirector<T extends string> {
  private readonly baseWaveSize: number;
  private readonly growthPerWave: number;
  private readonly maxWaveSize: number;
  private readonly unlockRules: Array<UnlockRule<T>>;
  private readonly typeWeights: Partial<Record<T, number | ((waveNumber: number) => number)>>;
  private readonly maxSpawnsPerStep: number;
  private readonly startWaveNumber: number;
  private readonly waveAutoStart: boolean;
  private readonly prng: RandomGenerator;
  private waveNumber: number;
  private inProgress = false;
  private unitsToSpawn = 0;
  private unitsSpawned = 0;
  private lastSpawnedType: T | null = null;
  private activeUnits = 0;

  constructor(options: WaveSpawnDirectorOptions<T> = {}) {
    this.baseWaveSize = options.baseWaveSize ?? 3;
    this.growthPerWave = options.growthPerWave ?? 1.5;
    this.maxWaveSize = options.maxWaveSize ?? 500;
    this.unlockRules = [...(options.unlockRules ?? [{ waveNumber: 1, type: 'DEFAULT' as T }])].sort(
      (a, b) => a.waveNumber - b.waveNumber,
    );
    this.typeWeights = { ...options.typeWeights };
    this.maxSpawnsPerStep = options.maxSpawnsPerStep ?? 100;
    this.startWaveNumber = options.startWaveNumber ?? 1;
    this.waveAutoStart = options.waveAutoStart ?? true;
    this.prng = options.prng ?? DEFAULT_PRNG;
    this.waveNumber = this.startWaveNumber;

    this.reset(this.startWaveNumber);
    if (this.waveAutoStart) this.startWave(this.startWaveNumber);
  }

  reset(startWaveNumber = this.startWaveNumber): void {
    this.waveNumber = startWaveNumber;
    this.inProgress = false;
    this.unitsToSpawn = 0;
    this.unitsSpawned = 0;
    this.lastSpawnedType = null;
    this.activeUnits = 0;
  }

  startWave(waveNumber = this.waveNumber): { waveNumber: number; unitsToSpawn: number; availableTypes: T[] } {
    this.waveNumber = waveNumber;
    this.unitsToSpawn = this.getWaveSize(waveNumber);
    this.unitsSpawned = 0;
    this.lastSpawnedType = null;
    this.inProgress = true;

    return {
      waveNumber: this.waveNumber,
      unitsToSpawn: this.unitsToSpawn,
      availableTypes: this.getAvailableTypes(this.waveNumber),
    };
  }

  step({ activeUnits }: { activeUnits: number }): { spawns: Array<SpawnPlan<T>> } {
    this.activeUnits = activeUnits;
    this.completeIfDone(activeUnits);
    if (!this.inProgress && this.waveAutoStart) this.startWave(this.waveNumber);

    return {
      spawns: this.planSpawns(),
    };
  }

  getWaveSize(waveNumber = this.waveNumber): number {
    const raw = this.baseWaveSize + (waveNumber - 1) * this.growthPerWave;
    return clamp(Math.floor(raw), 1, this.maxWaveSize);
  }

  getAvailableTypes(waveNumber = this.waveNumber): T[] {
    return this.unlockRules.filter((rule) => waveNumber >= rule.waveNumber).map((rule) => rule.type);
  }

  selectType(waveNumber = this.waveNumber): T {
    const available = this.getAvailableTypes(waveNumber);
    const entries: Array<{ type: T; weight: number }> = [];
    let total = 0;

    for (const type of available) {
      const weight = resolveWeight(this.typeWeights[type] ?? 1, waveNumber);
      if (weight <= 0) continue;
      entries.push({ type, weight });
      total += weight;
    }

    if (entries.length === 0) return available[0];

    let pick = this.prng.random() * total;
    for (const entry of entries) {
      pick -= entry.weight;
      if (pick <= 0) return entry.type;
    }
    return entries[entries.length - 1].type;
  }

  planSpawns(): Array<SpawnPlan<T>> {
    if (!this.inProgress || this.unitsSpawned >= this.unitsToSpawn) return [];

    const spawns: Array<SpawnPlan<T>> = [];
    let guard = this.maxSpawnsPerStep;

    while (this.unitsSpawned < this.unitsToSpawn && guard > 0) {
      const type = this.selectType(this.waveNumber);
      spawns.push({
        type,
        waveNumber: this.waveNumber,
        spawnIndex: this.unitsSpawned,
        spawnCount: this.unitsToSpawn,
      });
      this.unitsSpawned += 1;
      this.lastSpawnedType = type;
      guard -= 1;
    }

    return spawns;
  }

  completeIfDone(activeUnits: number): { completedWaveNumber: number; nextWaveNumber: number } | null {
    if (!this.inProgress || this.unitsSpawned < this.unitsToSpawn || activeUnits > 0) return null;

    const completedWaveNumber = this.waveNumber;
    this.inProgress = false;
    this.waveNumber += 1;

    return {
      completedWaveNumber,
      nextWaveNumber: this.waveNumber,
    };
  }

  snapshot(): {
    waveNumber: number;
    inProgress: boolean;
    unitsToSpawn: number;
    unitsSpawned: number;
    pending: number;
    activeUnits: number;
    lastSpawnedType: T | null;
  } {
    return {
      waveNumber: this.waveNumber,
      inProgress: this.inProgress,
      unitsToSpawn: this.unitsToSpawn,
      unitsSpawned: this.unitsSpawned,
      pending: 0,
      activeUnits: this.activeUnits,
      lastSpawnedType: this.lastSpawnedType,
    };
  }
}

