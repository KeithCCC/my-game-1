export class RandomGenerator {
  private state = 42;

  constructor(seed = 42) {
    this.seed(seed);
  }

  seed(seed = 42): this {
    this.state = seed >>> 0;
    return this;
  }

  random(): number {
    this.state += 0x6d2b79f5;
    let value = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  uniform(min: number, max: number): number {
    return min + (max - min) * this.random();
  }

  randint(min: number, max: number): number {
    return Math.floor(this.uniform(min, max + 1));
  }

  choice<T>(items: readonly T[]): T {
    return items[Math.floor(this.random() * items.length)] ?? items[0];
  }
}

export const DEFAULT_PRNG = new RandomGenerator(42);

