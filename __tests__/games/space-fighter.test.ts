import {
  createSpaceFighterState,
  damageSpaceFighterPlayer,
  defeatSpaceFighterEnemy,
  getLevelEnemyPlan,
  skipSpaceFighterTransition,
  spawnNextSpaceFighterEnemy,
  updateSpaceFighter,
} from '../../src/games/space-fighter';

describe('space fighter progression', () => {
  test('level 1 spawns 19 alien tanks then one boss', () => {
    const state = createSpaceFighterState({ seed: 1 });
    const regularKinds = [];

    for (let index = 0; index < 19; index += 1) {
      const enemy = spawnNextSpaceFighterEnemy(state);
      expect(enemy?.isBoss).toBe(false);
      regularKinds.push(enemy?.kind);
      if (enemy) defeatSpaceFighterEnemy(state, enemy.id);
    }

    expect(regularKinds).toEqual(Array.from({ length: 19 }, () => 'alienTank'));
    const boss = spawnNextSpaceFighterEnemy(state);
    expect(boss?.kind).toBe('bossTank');
    expect(boss?.isBoss).toBe(true);
    expect(spawnNextSpaceFighterEnemy(state)).toBeNull();
  });

  test('level 2 spawns 24 flying objects then one boss', () => {
    const state = createSpaceFighterState({ seed: 2 });
    state.player.canFly = true;
    state.level = 2;

    const plan = getLevelEnemyPlan(2);
    expect(plan).toHaveLength(25);
    expect(plan.slice(0, 24).every((kind) => kind === 'alienFlyer')).toBe(true);
    expect(plan[24]).toBe('bossFlyer');
  });

  test('level 3 spawns 32 spaceships, 7 battleships, then one boss', () => {
    const plan = getLevelEnemyPlan(3);
    expect(plan).toHaveLength(40);
    expect(plan.filter((kind) => kind === 'alienShip')).toHaveLength(32);
    expect(plan.filter((kind) => kind === 'battleShip')).toHaveLength(7);
    expect(plan[39]).toBe('bossDreadnought');
  });

  test('defeating bosses advances through transition unlocks', () => {
    const state = createSpaceFighterState({ seed: 3 });
    for (let index = 0; index < 19; index += 1) {
      const enemy = spawnNextSpaceFighterEnemy(state);
      if (enemy) defeatSpaceFighterEnemy(state, enemy.id);
    }
    const levelOneBoss = spawnNextSpaceFighterEnemy(state);
    expect(levelOneBoss).toBeDefined();
    defeatSpaceFighterEnemy(state, levelOneBoss!.id);
    expect(state.phase).toBe('transition');
    expect(state.transition).toBe('takeoff');

    skipSpaceFighterTransition(state);
    expect(state.level).toBe(2);
    expect(state.player.canFly).toBe(true);

    for (let index = 0; index < 24; index += 1) {
      const enemy = spawnNextSpaceFighterEnemy(state);
      if (enemy) defeatSpaceFighterEnemy(state, enemy.id);
    }
    const levelTwoBoss = spawnNextSpaceFighterEnemy(state);
    defeatSpaceFighterEnemy(state, levelTwoBoss!.id);
    expect(state.transition).toBe('orbit');

    skipSpaceFighterTransition(state);
    expect(state.level).toBe(3);
    expect(state.player.rocketsUnlocked).toBe(true);
  });
});

describe('space fighter player state', () => {
  test('player is ground constrained before flight unlock', () => {
    const state = createSpaceFighterState();
    const groundY = state.groundY;
    updateSpaceFighter(state, 1000, { moveX: 0, moveY: -1 });
    expect(state.player.position.y).toBe(groundY);
  });

  test('free flight is enabled after level 1 transition', () => {
    const state = createSpaceFighterState();
    state.phase = 'transition';
    state.transition = 'takeoff';
    state.transitionTimerMs = 1;
    updateSpaceFighter(state, 16, { moveX: 0, moveY: 0 });
    const y = state.player.position.y;
    updateSpaceFighter(state, 1000, { moveX: 0, moveY: -1 });
    expect(state.player.canFly).toBe(true);
    expect(state.player.position.y).toBeLessThan(y);
  });

  test('losing a life restarts the current level checkpoint', () => {
    const state = createSpaceFighterState();
    state.level = 2;
    state.player.canFly = true;
    state.player.lives = 3;
    state.player.hp = 5;
    state.regularSpawned = 10;
    state.regularDefeated = 5;

    damageSpaceFighterPlayer(state, 10);

    expect(state.phase).toBe('playing');
    expect(state.level).toBe(2);
    expect(state.player.lives).toBe(2);
    expect(state.player.hp).toBe(state.player.maxHp);
    expect(state.regularSpawned).toBe(0);
    expect(state.regularDefeated).toBe(0);
  });

  test('zero lives ends the run', () => {
    const state = createSpaceFighterState();
    state.player.lives = 1;
    state.player.hp = 1;
    damageSpaceFighterPlayer(state, 5);
    expect(state.phase).toBe('lost');
  });
});

