import {
  createSuperStarTrekState,
  executeSuperStarTrekCommand,
  getGalaxyRecord,
  getLongRangeScan,
  getShortRangeScan,
  type SuperStarTrekState,
} from '../../src/games/super-star-trek';

function clearCurrentQuadrant(state: SuperStarTrekState): void {
  const quadrant = state.galaxy[state.enterprise.quadrant.y][state.enterprise.quadrant.x];
  quadrant.klingons = 0;
  quadrant.starbases = 0;
  quadrant.stars = 0;
  quadrant.sectors = Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => 'empty'));
  quadrant.sectors[state.enterprise.sector.y][state.enterprise.sector.x] = 'enterprise';
}

describe('super star trek simulation', () => {
  test('creates deterministic galaxy records from a seed', () => {
    const first = createSuperStarTrekState({ seed: 1701 });
    const second = createSuperStarTrekState({ seed: 1701 });
    const different = createSuperStarTrekState({ seed: 42 });

    expect(getGalaxyRecord(first)).toEqual(getGalaxyRecord(second));
    expect(getGalaxyRecord(first)).not.toEqual(getGalaxyRecord(different));
    expect(first.klingonsRemaining).toBeGreaterThan(0);
    expect(first.enterprise.energy).toBe(3000);
    expect(first.enterprise.torpedoes).toBe(10);
  });

  test('renders short and long range scans and marks scanned quadrants', () => {
    const state = createSuperStarTrekState({ seed: 1701 });

    const shortScan = getShortRangeScan(state);
    const longScan = getLongRangeScan(state);

    expect(shortScan).toHaveLength(8);
    expect(shortScan.join('\n')).toContain('<*>' );
    expect(longScan).toHaveLength(3);
    expect(longScan[1]).toMatch(/\d{3}/);
    expect(state.galaxy[state.enterprise.quadrant.y][state.enterprise.quadrant.x].scanned).toBe(true);
  });

  test('parses commands, reports unknown commands, and transfers shields', () => {
    const state = createSuperStarTrekState({ seed: 1701 });

    expect(executeSuperStarTrekCommand(state, 'SHE 600')).toMatchObject({ accepted: true, command: 'SHE' });
    expect(state.enterprise.shields).toBe(600);
    expect(state.enterprise.energy).toBe(2400);

    const down = executeSuperStarTrekCommand(state, 'SHE 100');
    expect(down.messages.join('\n')).toContain('SHIELDS NOW AT 100');
    expect(state.enterprise.shields).toBe(100);
    expect(state.enterprise.energy).toBe(2900);

    expect(executeSuperStarTrekCommand(state, 'XYZ')).toMatchObject({ accepted: false, command: 'UNKNOWN' });
  });

  test('navigation consumes time and energy while crossing quadrant boundaries', () => {
    const state = createSuperStarTrekState({ seed: 1701 });
    clearCurrentQuadrant(state);
    state.enterprise.quadrant = { x: 3, y: 3 };
    state.enterprise.sector = { x: 7, y: 7 };
    state.galaxy[3][3].sectors[7][7] = 'enterprise';
    const energy = state.enterprise.energy;
    const stardate = state.stardate;

    const result = executeSuperStarTrekCommand(state, 'NAV 1 1');

    expect(result.accepted).toBe(true);
    expect(state.enterprise.quadrant).toEqual({ x: 4, y: 3 });
    expect(state.enterprise.sector.x).toBeGreaterThanOrEqual(0);
    expect(state.enterprise.energy).toBeLessThan(energy);
    expect(state.stardate).toBeGreaterThan(stardate);
  });

  test('docking at an adjacent starbase restores resources and repairs systems', () => {
    const state = createSuperStarTrekState({ seed: 1701 });
    clearCurrentQuadrant(state);
    const quadrant = state.galaxy[state.enterprise.quadrant.y][state.enterprise.quadrant.x];
    quadrant.sectors[4][5] = 'starbase';
    quadrant.starbases = 1;
    state.enterprise.sector = { x: 4, y: 4 };
    quadrant.sectors[4][4] = 'enterprise';
    state.enterprise.energy = 500;
    state.enterprise.shields = 200;
    state.enterprise.torpedoes = 2;
    state.systems.warp = -1;

    executeSuperStarTrekCommand(state, 'SRS');

    expect(state.condition).toBe('DOCKED');
    expect(state.enterprise.energy).toBe(3000);
    expect(state.enterprise.shields).toBe(0);
    expect(state.enterprise.torpedoes).toBe(10);
    expect(state.systems.warp).toBe(0);
  });

  test('phasers damage nearby Klingons and trigger retaliation from survivors', () => {
    const state = createSuperStarTrekState({ seed: 1701 });
    clearCurrentQuadrant(state);
    const quadrant = state.galaxy[state.enterprise.quadrant.y][state.enterprise.quadrant.x];
    quadrant.sectors[4][5] = 'klingon';
    quadrant.klingons = 1;
    state.klingonsRemaining = 1;
    state.enterprise.sector = { x: 4, y: 4 };
    state.enterprise.shields = 200;
    state.enterprise.energy = 2200;

    const result = executeSuperStarTrekCommand(state, 'PHA 500');

    expect(result.messages.join('\n')).toContain('KLINGON DESTROYED');
    expect(state.klingonsRemaining).toBe(0);
    expect(state.status).toBe('won');
  });

  test('photon torpedoes can hit Klingons or be absorbed by stars', () => {
    const hit = createSuperStarTrekState({ seed: 1701 });
    clearCurrentQuadrant(hit);
    let quadrant = hit.galaxy[hit.enterprise.quadrant.y][hit.enterprise.quadrant.x];
    hit.enterprise.sector = { x: 2, y: 2 };
    quadrant.sectors[2][2] = 'enterprise';
    quadrant.sectors[2][5] = 'klingon';
    quadrant.klingons = 1;
    hit.klingonsRemaining = 1;

    executeSuperStarTrekCommand(hit, 'TOR 1');

    expect(hit.klingonsRemaining).toBe(0);
    expect(hit.enterprise.torpedoes).toBe(9);

    const blocked = createSuperStarTrekState({ seed: 1701 });
    clearCurrentQuadrant(blocked);
    quadrant = blocked.galaxy[blocked.enterprise.quadrant.y][blocked.enterprise.quadrant.x];
    blocked.enterprise.sector = { x: 2, y: 2 };
    quadrant.sectors[2][2] = 'enterprise';
    quadrant.sectors[2][4] = 'star';
    quadrant.sectors[2][5] = 'klingon';
    quadrant.klingons = 1;
    blocked.klingonsRemaining = 1;

    const result = executeSuperStarTrekCommand(blocked, 'TOR 1');

    expect(result.messages.join('\n')).toContain('ABSORBED BY A STAR');
    expect(blocked.klingonsRemaining).toBe(1);
  });

  test('deadline loss and damage reports are surfaced through commands', () => {
    const state = createSuperStarTrekState({ seed: 1701 });
    state.finalStardate = state.stardate;
    state.systems.phasers = -0.5;

    const report = executeSuperStarTrekCommand(state, 'DAM');
    executeSuperStarTrekCommand(state, 'NAV 1 0.2');

    expect(report.messages.join('\n')).toContain('PHASERS');
    expect(state.status).toBe('lost');
  });
});
