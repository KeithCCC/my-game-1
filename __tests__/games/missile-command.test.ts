import {
  createMissileCommandState,
  firePlayerMissile,
  spawnEnemyMissile,
  updateMissileCommand,
} from '../../src/games/missile-command';

describe('missile command simulation', () => {
  test('creates 6 cities and 3 launchers for wave 1', () => {
    const state = createMissileCommandState({ width: 900, height: 600 });

    expect(state.wave).toBe(1);
    expect(state.score).toBe(0);
    expect(state.status).toBe('playing');
    expect(state.cities).toHaveLength(6);
    expect(state.launchers).toHaveLength(3);
    expect(state.launchers.map((launcher) => launcher.key)).toEqual(['a', 's', 'd']);
    expect(state.launchers.every((launcher) => launcher.ammo === 10)).toBe(true);
    expect(state.cities.every((city) => city.alive)).toBe(true);
  });

  test('fires from the launcher mapped to the pressed key', () => {
    const state = createMissileCommandState({ width: 900, height: 600 });

    const fired = firePlayerMissile(state, 's', { x: 450, y: 180 });

    expect(fired).toBe(true);
    expect(state.launchers[1].ammo).toBe(9);
    expect(state.playerMissiles).toHaveLength(1);
    expect(state.playerMissiles[0].start).toEqual(state.launchers[1].position);
    expect(state.playerMissiles[0].target).toEqual({ x: 450, y: 180 });
  });

  test('does not fire from a destroyed or empty launcher', () => {
    const state = createMissileCommandState({ width: 900, height: 600 });
    state.launchers[0].ammo = 0;
    state.launchers[2].alive = false;

    expect(firePlayerMissile(state, 'a', { x: 100, y: 100 })).toBe(false);
    expect(firePlayerMissile(state, 'd', { x: 800, y: 100 })).toBe(false);
    expect(state.playerMissiles).toHaveLength(0);
  });

  test('player explosion destroys enemy missiles and awards score', () => {
    const state = createMissileCommandState({ width: 900, height: 600 });
    state.enemies.push({
      id: 101,
      start: { x: 450, y: 0 },
      position: { x: 450, y: 200 },
      target: { x: 450, y: 566 },
      speed: 80,
      alive: true,
    });
    state.explosions.push({
      id: 102,
      position: { x: 450, y: 200 },
      ageMs: 120,
      durationMs: 700,
      maxRadius: 58,
      source: 'player',
    });

    updateMissileCommand(state, 16);

    expect(state.enemies).toHaveLength(0);
    expect(state.score).toBe(100);
  });

  test('enemy impact explosions do not destroy other enemies or award score', () => {
    const state = createMissileCommandState({ width: 900, height: 600 });
    const target = state.cities[0].position;
    state.enemies.push(
      {
        id: 151,
        start: { x: target.x, y: 0 },
        position: { x: target.x, y: target.y - 1 },
        target: { ...target },
        speed: 90,
        alive: true,
      },
      {
        id: 152,
        start: { x: target.x + 4, y: 0 },
        position: { x: target.x + 4, y: target.y },
        target: { x: target.x + 4, y: target.y + 100 },
        speed: 0,
        alive: true,
      },
    );

    updateMissileCommand(state, 32);

    expect(state.enemies.map((enemy) => enemy.id)).toEqual([152]);
    expect(state.score).toBe(0);
  });

  test('enemy missile impact destroys the targeted city', () => {
    const state = createMissileCommandState({ width: 900, height: 600 });
    const target = state.cities[0].position;
    state.enemies.push({
      id: 201,
      start: { x: target.x, y: 0 },
      position: { x: target.x, y: target.y - 1 },
      target: { ...target },
      speed: 90,
      alive: true,
    });

    updateMissileCommand(state, 32);

    expect(state.cities[0].alive).toBe(false);
  });

  test('enemy missile impact destroys the targeted launcher', () => {
    const state = createMissileCommandState({ width: 900, height: 600 });
    const target = state.launchers[1].position;
    state.enemies.push({
      id: 202,
      start: { x: target.x, y: 0 },
      position: { x: target.x, y: target.y - 1 },
      target: { ...target },
      speed: 90,
      alive: true,
    });

    updateMissileCommand(state, 32);

    expect(state.launchers[1].alive).toBe(false);
  });

  test('spawns enemy missiles against living targets', () => {
    const state = createMissileCommandState({ width: 900, height: 600 });

    const spawned = spawnEnemyMissile(state);

    expect(spawned).toBe(true);
    expect(state.enemies).toHaveLength(1);
    expect(state.waveRemainingToSpawn).toBe(7);
    expect(state.enemies[0].position).toEqual(state.enemies[0].start);
    expect([...state.cities, ...state.launchers].some((target) => (
      target.alive &&
      target.position.x === state.enemies[0].target.x &&
      target.position.y === state.enemies[0].target.y
    ))).toBe(true);
  });

  test('spawns enemy missiles deterministically from the same seed', () => {
    const first = createMissileCommandState({ width: 900, height: 600, seed: 12345 });
    const second = createMissileCommandState({ width: 900, height: 600, seed: 12345 });

    spawnEnemyMissile(first);
    spawnEnemyMissile(first);
    spawnEnemyMissile(second);
    spawnEnemyMissile(second);

    expect(first.enemies).toEqual(second.enemies);
    expect(first.waveRemainingToSpawn).toBe(second.waveRemainingToSpawn);
  });

  test('advances to the next wave after all spawned enemies are gone', () => {
    const state = createMissileCommandState({ width: 900, height: 600 });
    state.waveRemainingToSpawn = 0;
    state.spawnCooldownMs = 0;
    state.enemies = [];
    state.playerMissiles = [];
    state.explosions = [];

    updateMissileCommand(state, 16);

    expect(state.wave).toBe(2);
    expect(state.status).toBe('playing');
    expect(state.waveRemainingToSpawn).toBe(11);
    expect(state.launchers.every((launcher) => launcher.ammo === 10)).toBe(true);
  });

  test('ends the game when all cities are destroyed', () => {
    const state = createMissileCommandState({ width: 900, height: 600 });
    state.cities.forEach((city) => {
      city.alive = false;
    });

    updateMissileCommand(state, 16);

    expect(state.status).toBe('gameOver');
  });

  test('ends the game before spawning when all cities are already destroyed', () => {
    const state = createMissileCommandState({ width: 900, height: 600 });
    state.spawnCooldownMs = 0;
    state.cities.forEach((city) => {
      city.alive = false;
    });

    updateMissileCommand(state, 16);

    expect(state.status).toBe('gameOver');
    expect(state.enemies).toHaveLength(0);
    expect(state.waveRemainingToSpawn).toBe(8);
  });
});
