export type QuadrantCoord = { x: number; y: number };
export type SectorCoord = { x: number; y: number };
export type ShipSystem = 'warp' | 'sensors' | 'phasers' | 'torpedoes' | 'shields' | 'computer';
export type CommandKind = 'NAV' | 'SRS' | 'LRS' | 'PHA' | 'TOR' | 'SHE' | 'DAM' | 'COM' | 'HELP' | 'UNKNOWN';
export type MissionStatus = 'playing' | 'won' | 'lost';
export type ShipCondition = 'GREEN' | 'YELLOW' | 'RED' | 'DOCKED';
export type SectorContent = 'empty' | 'enterprise' | 'klingon' | 'starbase' | 'star';

export type SuperStarTrekQuadrant = {
  klingons: number;
  starbases: number;
  stars: number;
  scanned: boolean;
  sectors: SectorContent[][];
};

export type SuperStarTrekState = {
  rngSeed: number;
  stardate: number;
  finalStardate: number;
  status: MissionStatus;
  condition: ShipCondition;
  klingonsRemaining: number;
  galaxy: SuperStarTrekQuadrant[][];
  enterprise: {
    quadrant: QuadrantCoord;
    sector: SectorCoord;
    energy: number;
    shields: number;
    torpedoes: number;
  };
  systems: Record<ShipSystem, number>;
  transcript: string[];
};

export type SuperStarTrekCommandResult = {
  accepted: boolean;
  command: CommandKind;
  messages: string[];
};

type Direction = { dx: number; dy: number };

const GALAXY_SIZE = 8;
const SECTOR_SIZE = 8;
const MAX_ENERGY = 3000;
const MAX_TORPEDOES = 10;
const KLINGON_HP = 220;
const COURSE_DIRECTIONS: Record<number, Direction> = {
  1: { dx: 1, dy: 0 },
  2: { dx: 1, dy: -1 },
  3: { dx: 0, dy: -1 },
  4: { dx: -1, dy: -1 },
  5: { dx: -1, dy: 0 },
  6: { dx: -1, dy: 1 },
  7: { dx: 0, dy: 1 },
  8: { dx: 1, dy: 1 },
};

export function createSuperStarTrekState(options: { seed?: number } = {}): SuperStarTrekState {
  const state: SuperStarTrekState = {
    rngSeed: options.seed ?? 0x1701,
    stardate: 3421,
    finalStardate: 3451,
    status: 'playing',
    condition: 'GREEN',
    klingonsRemaining: 0,
    galaxy: [],
    enterprise: {
      quadrant: { x: 0, y: 0 },
      sector: { x: 0, y: 0 },
      energy: MAX_ENERGY,
      shields: 0,
      torpedoes: MAX_TORPEDOES,
    },
    systems: {
      warp: 0,
      sensors: 0,
      phasers: 0,
      torpedoes: 0,
      shields: 0,
      computer: 0,
    },
    transcript: [],
  };

  state.galaxy = Array.from({ length: GALAXY_SIZE }, () =>
    Array.from({ length: GALAXY_SIZE }, () => createQuadrant(state)),
  );

  ensureMissionHasTargets(state);
  state.enterprise.quadrant = {
    x: Math.floor(nextRandom(state) * GALAXY_SIZE),
    y: Math.floor(nextRandom(state) * GALAXY_SIZE),
  };
  state.enterprise.sector = placeEnterpriseInQuadrant(state, state.enterprise.quadrant);
  updateCondition(state);
  state.transcript.push(
    `YOUR ORDERS ARE TO DESTROY ${state.klingonsRemaining} KLINGON WARSHIPS BEFORE STARDATE ${state.finalStardate}.`,
  );
  return state;
}

export function executeSuperStarTrekCommand(state: SuperStarTrekState, input: string): SuperStarTrekCommandResult {
  const tokens = input.trim().split(/\s+/).filter(Boolean);
  const command = normalizeCommand(tokens[0]);
  let messages: string[];
  let accepted = true;

  if (state.status !== 'playing' && command !== 'HELP') {
    messages = [`MISSION ${state.status.toUpperCase()}. START A NEW GAME TO CONTINUE.`];
    accepted = false;
    return recordResult(state, { accepted, command, messages });
  }

  switch (command) {
    case 'NAV':
      messages = navigate(state, Number(tokens[1]), Number(tokens[2]));
      break;
    case 'SRS':
      messages = ['SHORT RANGE SENSOR SCAN', ...getShortRangeScan(state)];
      break;
    case 'LRS':
      messages = ['LONG RANGE SENSOR SCAN', ...getLongRangeScan(state)];
      break;
    case 'PHA':
      messages = firePhasers(state, Number(tokens[1]));
      break;
    case 'TOR':
      messages = fireTorpedo(state, Number(tokens[1]));
      break;
    case 'SHE':
      messages = setShields(state, Number(tokens[1]));
      break;
    case 'DAM':
      messages = getDamageReport(state);
      break;
    case 'COM':
      messages = runComputer(state, Number(tokens[1]), tokens.slice(2).map(Number));
      break;
    case 'HELP':
      messages = getHelp();
      break;
    default:
      accepted = false;
      messages = [`UNKNOWN COMMAND: ${tokens[0] ?? ''}`, 'TRY HELP, SRS, LRS, NAV, PHA, TOR, SHE, DAM, OR COM.'];
      break;
  }

  checkMissionEnd(state);
  return recordResult(state, { accepted, command, messages });
}

export function getShortRangeScan(state: SuperStarTrekState): string[] {
  const quadrant = currentQuadrant(state);
  quadrant.scanned = true;
  updateCondition(state);
  return quadrant.sectors.map((row) => row.map(formatSector).join(' '));
}

export function getLongRangeScan(state: SuperStarTrekState): string[] {
  const rows: string[] = [];
  for (let y = state.enterprise.quadrant.y - 1; y <= state.enterprise.quadrant.y + 1; y += 1) {
    const cells: string[] = [];
    for (let x = state.enterprise.quadrant.x - 1; x <= state.enterprise.quadrant.x + 1; x += 1) {
      if (!isInsideGalaxy(x, y)) {
        cells.push('***');
        continue;
      }
      const quadrant = state.galaxy[y][x];
      quadrant.scanned = true;
      cells.push(`${quadrant.klingons}${quadrant.starbases}${quadrant.stars}`);
    }
    rows.push(cells.join(' '));
  }
  return rows;
}

export function getGalaxyRecord(state: SuperStarTrekState): string[] {
  return state.galaxy.map((row) =>
    row.map((quadrant) => `${quadrant.klingons}${quadrant.starbases}${quadrant.stars}`).join(' '),
  );
}

function createQuadrant(state: SuperStarTrekState): SuperStarTrekQuadrant {
  const klingons = nextRandom(state) < 0.2 ? 1 + Math.floor(nextRandom(state) * 3) : 0;
  const starbases = nextRandom(state) < 0.08 ? 1 : 0;
  const stars = 1 + Math.floor(nextRandom(state) * 6);
  const quadrant: SuperStarTrekQuadrant = {
    klingons,
    starbases,
    stars,
    scanned: false,
    sectors: createEmptySectors(),
  };
  placeObjects(state, quadrant, 'klingon', klingons);
  placeObjects(state, quadrant, 'starbase', starbases);
  placeObjects(state, quadrant, 'star', stars);
  state.klingonsRemaining += klingons;
  return quadrant;
}

function createEmptySectors(): SectorContent[][] {
  return Array.from({ length: SECTOR_SIZE }, () => Array.from({ length: SECTOR_SIZE }, () => 'empty'));
}

function ensureMissionHasTargets(state: SuperStarTrekState): void {
  if (state.klingonsRemaining === 0) {
    const quadrant = state.galaxy[0][0];
    quadrant.klingons = 1;
    placeObjects(state, quadrant, 'klingon', 1);
    state.klingonsRemaining = 1;
  }
  if (!state.galaxy.some((row) => row.some((quadrant) => quadrant.starbases > 0))) {
    const quadrant = state.galaxy[GALAXY_SIZE - 1][GALAXY_SIZE - 1];
    quadrant.starbases = 1;
    placeObjects(state, quadrant, 'starbase', 1);
  }
}

function placeEnterpriseInQuadrant(state: SuperStarTrekState, coord: QuadrantCoord): SectorCoord {
  const sector = randomEmptySector(state, state.galaxy[coord.y][coord.x]);
  state.galaxy[coord.y][coord.x].sectors[sector.y][sector.x] = 'enterprise';
  return sector;
}

function placeObjects(state: SuperStarTrekState, quadrant: SuperStarTrekQuadrant, content: SectorContent, count: number): void {
  for (let index = 0; index < count; index += 1) {
    const sector = randomEmptySector(state, quadrant);
    quadrant.sectors[sector.y][sector.x] = content;
  }
}

function randomEmptySector(state: SuperStarTrekState, quadrant: SuperStarTrekQuadrant): SectorCoord {
  for (let attempts = 0; attempts < 1000; attempts += 1) {
    const x = Math.floor(nextRandom(state) * SECTOR_SIZE);
    const y = Math.floor(nextRandom(state) * SECTOR_SIZE);
    if (quadrant.sectors[y][x] === 'empty') {
      return { x, y };
    }
  }
  for (let y = 0; y < SECTOR_SIZE; y += 1) {
    for (let x = 0; x < SECTOR_SIZE; x += 1) {
      if (quadrant.sectors[y][x] === 'empty') {
        return { x, y };
      }
    }
  }
  return { x: 0, y: 0 };
}

function navigate(state: SuperStarTrekState, course: number, warp: number): string[] {
  if (!isSystemWorking(state, 'warp')) return ['WARP ENGINES ARE DAMAGED.'];
  const direction = COURSE_DIRECTIONS[course];
  if (!direction || !Number.isFinite(warp) || warp <= 0 || warp > 8) {
    return ['NAV REQUIRES COURSE 1-8 AND WARP FACTOR 0.1-8.0.'];
  }
  const steps = Math.max(1, Math.round(warp * SECTOR_SIZE));
  const cost = Math.ceil(steps * 6 + warp * 12);
  if (state.enterprise.energy < cost) {
    return ['INSUFFICIENT ENERGY FOR MANEUVER.'];
  }

  const oldQuadrant = currentQuadrant(state);
  oldQuadrant.sectors[state.enterprise.sector.y][state.enterprise.sector.x] = 'empty';
  const messages: string[] = [`COURSE ${course}, WARP ${warp.toFixed(1)}.`];

  for (let step = 0; step < steps; step += 1) {
    let nextSector = {
      x: state.enterprise.sector.x + direction.dx,
      y: state.enterprise.sector.y + direction.dy,
    };
    let nextQuadrant = { ...state.enterprise.quadrant };

    while (nextSector.x < 0) {
      nextQuadrant.x -= 1;
      nextSector.x += SECTOR_SIZE;
    }
    while (nextSector.x >= SECTOR_SIZE) {
      nextQuadrant.x += 1;
      nextSector.x -= SECTOR_SIZE;
    }
    while (nextSector.y < 0) {
      nextQuadrant.y -= 1;
      nextSector.y += SECTOR_SIZE;
    }
    while (nextSector.y >= SECTOR_SIZE) {
      nextQuadrant.y += 1;
      nextSector.y -= SECTOR_SIZE;
    }

    if (!isInsideGalaxy(nextQuadrant.x, nextQuadrant.y)) {
      messages.push('EDGE OF GALAXY ENCOUNTERED.');
      break;
    }

    const nextContent = state.galaxy[nextQuadrant.y][nextQuadrant.x].sectors[nextSector.y][nextSector.x];
    if (nextContent !== 'empty') {
      messages.push(`WARP PATH BLOCKED BY ${formatContentName(nextContent)}.`);
      break;
    }

    state.enterprise.quadrant = nextQuadrant;
    state.enterprise.sector = nextSector;
  }

  currentQuadrant(state).sectors[state.enterprise.sector.y][state.enterprise.sector.x] = 'enterprise';
  state.enterprise.energy -= cost;
  state.stardate += Math.max(0.1, warp);
  repairSystems(state, warp * 0.12);
  updateCondition(state);
  messages.push(`ENTERPRISE NOW IN QUADRANT ${coordLabel(state.enterprise.quadrant)}, SECTOR ${coordLabel(state.enterprise.sector)}.`);
  if (state.condition !== 'DOCKED') {
    messages.push(...klingonRetaliation(state));
  }
  return messages;
}

function firePhasers(state: SuperStarTrekState, energy: number): string[] {
  if (!isSystemWorking(state, 'phasers')) return ['PHASER CONTROL IS DAMAGED.'];
  if (!Number.isFinite(energy) || energy <= 0) return ['PHA REQUIRES ENERGY AMOUNT.'];
  if (state.enterprise.energy < energy) return ['INSUFFICIENT ENERGY.'];
  const klingons = findSectors(currentQuadrant(state), 'klingon');
  if (klingons.length === 0) return ['SENSORS SHOW NO KLINGONS IN THIS QUADRANT.'];

  state.enterprise.energy -= energy;
  const messages = [`PHASERS LOCKED ON ${klingons.length} TARGET(S).`];
  const share = energy / klingons.length;
  klingons.forEach((klingon) => {
    const distance = getDistance(state.enterprise.sector, klingon);
    const damage = Math.round(share / Math.max(1, distance * 0.8));
    if (damage >= KLINGON_HP) {
      destroyKlingon(state, klingon);
      messages.push(`KLINGON DESTROYED AT SECTOR ${coordLabel(klingon)}.`);
    } else {
      messages.push(`KLINGON AT SECTOR ${coordLabel(klingon)} DAMAGED BY ${damage} UNITS.`);
    }
  });
  if (state.klingonsRemaining > 0) {
    messages.push(...klingonRetaliation(state));
  }
  return messages;
}

function fireTorpedo(state: SuperStarTrekState, course: number): string[] {
  if (!isSystemWorking(state, 'torpedoes')) return ['PHOTON TUBES ARE DAMAGED.'];
  const direction = COURSE_DIRECTIONS[course];
  if (!direction) return ['TOR REQUIRES COURSE 1-8.'];
  if (state.enterprise.torpedoes <= 0) return ['ALL PHOTON TORPEDOES EXPENDED.'];

  state.enterprise.torpedoes -= 1;
  const messages = [`PHOTON TORPEDO FIRED ON COURSE ${course}.`];
  let x = state.enterprise.sector.x;
  let y = state.enterprise.sector.y;
  for (let step = 0; step < SECTOR_SIZE; step += 1) {
    x += direction.dx;
    y += direction.dy;
    if (x < 0 || x >= SECTOR_SIZE || y < 0 || y >= SECTOR_SIZE) {
      messages.push('TORPEDO MISSED.');
      messages.push(...klingonRetaliation(state));
      return messages;
    }
    const content = currentQuadrant(state).sectors[y][x];
    if (content === 'klingon') {
      destroyKlingon(state, { x, y });
      messages.push(`KLINGON DESTROYED AT SECTOR ${coordLabel({ x, y })}.`);
      if (state.klingonsRemaining > 0) messages.push(...klingonRetaliation(state));
      return messages;
    }
    if (content === 'star') {
      messages.push('TORPEDO ABSORBED BY A STAR.');
      messages.push(...klingonRetaliation(state));
      return messages;
    }
    if (content === 'starbase') {
      messages.push('TORPEDO MISSED AND PASSED NEAR A STARBASE.');
      messages.push(...klingonRetaliation(state));
      return messages;
    }
  }
  messages.push('TORPEDO MISSED.');
  messages.push(...klingonRetaliation(state));
  return messages;
}

function setShields(state: SuperStarTrekState, target: number): string[] {
  if (!isSystemWorking(state, 'shields')) return ['SHIELD CONTROL IS DAMAGED.'];
  if (!Number.isFinite(target) || target < 0) return ['SHE REQUIRES A NON-NEGATIVE SHIELD LEVEL.'];
  const total = state.enterprise.energy + state.enterprise.shields;
  if (target > total) return ['INSUFFICIENT TOTAL ENERGY FOR SHIELDS.'];
  state.enterprise.energy = total - target;
  state.enterprise.shields = target;
  updateCondition(state);
  return [`SHIELDS NOW AT ${target}. ENERGY NOW ${state.enterprise.energy}.`];
}

function getDamageReport(state: SuperStarTrekState): string[] {
  const messages = ['DAMAGE CONTROL REPORT'];
  (Object.keys(state.systems) as ShipSystem[]).forEach((system) => {
    const value = state.systems[system];
    messages.push(`${system.toUpperCase().padEnd(9, ' ')} ${value < 0 ? value.toFixed(1) : 'OK'}`);
  });
  return messages;
}

function runComputer(state: SuperStarTrekState, option: number, args: number[]): string[] {
  if (!isSystemWorking(state, 'computer')) return ['LIBRARY COMPUTER IS DAMAGED.'];
  if (!Number.isFinite(option)) {
    return [
      'COM OPTIONS: 0 GALAXY RECORD, 1 STATUS, 2 TORPEDO DATA, 3 STARBASE DATA, 4 COURSE CALCULATOR.',
    ];
  }
  if (option === 0) return ['CUMULATIVE GALACTIC RECORD', ...getGalaxyRecord(state)];
  if (option === 1) {
    return [
      'STATUS REPORT',
      `${state.klingonsRemaining} KLINGONS REMAINING.`,
      `${Math.max(0, state.finalStardate - state.stardate).toFixed(1)} STARDATES REMAINING.`,
      `${countStarbases(state)} STARBASES ACTIVE.`,
    ];
  }
  if (option === 2) {
    const klingons = findSectors(currentQuadrant(state), 'klingon');
    return klingons.length
      ? ['PHOTON TORPEDO DATA', ...klingons.map((point) => formatCourseData(state.enterprise.sector, point))]
      : ['NO KLINGONS IN THIS QUADRANT.'];
  }
  if (option === 3) {
    const bases = findSectors(currentQuadrant(state), 'starbase');
    return bases.length
      ? ['STARBASE NAV DATA', ...bases.map((point) => formatCourseData(state.enterprise.sector, point))]
      : ['NO STARBASE IN THIS QUADRANT.'];
  }
  if (option === 4 && args.length >= 4) {
    return ['DIRECTION/DISTANCE CALCULATOR', formatCourseData({ x: args[0] - 1, y: args[1] - 1 }, { x: args[2] - 1, y: args[3] - 1 })];
  }
  return ['COMPUTER OPTION NOT AVAILABLE.'];
}

function getHelp(): string[] {
  return [
    'COMMANDS: NAV course warp | SRS | LRS | PHA energy | TOR course | SHE energy | DAM | COM option',
    'COURSES: 1 E, 2 NE, 3 N, 4 NW, 5 W, 6 SW, 7 S, 8 SE.',
    'MISSION: DESTROY ALL KLINGONS BEFORE THE FINAL STARDATE. DOCK NEXT TO STARBASES TO REFUEL.',
  ];
}

function klingonRetaliation(state: SuperStarTrekState): string[] {
  const klingons = findSectors(currentQuadrant(state), 'klingon');
  if (klingons.length === 0 || state.condition === 'DOCKED') return [];
  const messages: string[] = [];
  klingons.forEach((klingon) => {
    const distance = Math.max(1, getDistance(state.enterprise.sector, klingon));
    const hit = Math.round(180 / distance + nextRandom(state) * 80);
    if (state.enterprise.shields > 0) {
      const shieldHit = Math.min(state.enterprise.shields, hit);
      state.enterprise.shields -= shieldHit;
      const overflow = hit - shieldHit;
      state.enterprise.energy = Math.max(0, state.enterprise.energy - overflow);
    } else {
      state.enterprise.energy = Math.max(0, state.enterprise.energy - hit);
    }
    if (hit > 160) damageRandomSystem(state);
    messages.push(`${hit} UNIT HIT FROM KLINGON AT SECTOR ${coordLabel(klingon)}.`);
  });
  updateCondition(state);
  if (state.enterprise.energy <= 0) {
    state.status = 'lost';
    messages.push('THE ENTERPRISE HAS BEEN DESTROYED.');
  }
  return messages;
}

function destroyKlingon(state: SuperStarTrekState, sector: SectorCoord): void {
  const quadrant = currentQuadrant(state);
  quadrant.sectors[sector.y][sector.x] = 'empty';
  quadrant.klingons = Math.max(0, quadrant.klingons - 1);
  state.klingonsRemaining = Math.max(0, state.klingonsRemaining - 1);
  updateCondition(state);
}

function updateCondition(state: SuperStarTrekState): void {
  if (isDocked(state)) {
    state.condition = 'DOCKED';
    state.enterprise.energy = MAX_ENERGY;
    state.enterprise.shields = 0;
    state.enterprise.torpedoes = MAX_TORPEDOES;
    repairSystems(state, 999);
    return;
  }
  if (currentQuadrant(state).klingons > 0) {
    state.condition = 'RED';
  } else if (state.enterprise.energy < 600) {
    state.condition = 'YELLOW';
  } else {
    state.condition = 'GREEN';
  }
}

function isDocked(state: SuperStarTrekState): boolean {
  return getAdjacentSectors(state.enterprise.sector).some(
    (point) => currentQuadrant(state).sectors[point.y]?.[point.x] === 'starbase',
  );
}

function repairSystems(state: SuperStarTrekState, amount: number): void {
  (Object.keys(state.systems) as ShipSystem[]).forEach((system) => {
    if (state.systems[system] < 0) {
      state.systems[system] = Math.min(0, state.systems[system] + amount);
    }
  });
}

function damageRandomSystem(state: SuperStarTrekState): void {
  const systems = Object.keys(state.systems) as ShipSystem[];
  const system = systems[Math.floor(nextRandom(state) * systems.length)];
  state.systems[system] = Math.min(state.systems[system], -0.3 - nextRandom(state));
}

function checkMissionEnd(state: SuperStarTrekState): void {
  if (state.klingonsRemaining <= 0) {
    state.status = 'won';
    return;
  }
  if (state.stardate >= state.finalStardate || state.enterprise.energy <= 0) {
    state.status = 'lost';
  }
}

function isSystemWorking(state: SuperStarTrekState, system: ShipSystem): boolean {
  return state.systems[system] >= 0;
}

function currentQuadrant(state: SuperStarTrekState): SuperStarTrekQuadrant {
  return state.galaxy[state.enterprise.quadrant.y][state.enterprise.quadrant.x];
}

function findSectors(quadrant: SuperStarTrekQuadrant, content: SectorContent): SectorCoord[] {
  const sectors: SectorCoord[] = [];
  quadrant.sectors.forEach((row, y) => {
    row.forEach((candidate, x) => {
      if (candidate === content) sectors.push({ x, y });
    });
  });
  return sectors;
}

function getAdjacentSectors(sector: SectorCoord): SectorCoord[] {
  const sectors: SectorCoord[] = [];
  for (let y = sector.y - 1; y <= sector.y + 1; y += 1) {
    for (let x = sector.x - 1; x <= sector.x + 1; x += 1) {
      if ((x !== sector.x || y !== sector.y) && x >= 0 && x < SECTOR_SIZE && y >= 0 && y < SECTOR_SIZE) {
        sectors.push({ x, y });
      }
    }
  }
  return sectors;
}

function formatCourseData(from: SectorCoord, to: SectorCoord): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return `COURSE ${estimateCourse(dx, dy)}, DISTANCE ${Math.hypot(dx, dy).toFixed(1)} TO SECTOR ${coordLabel(to)}.`;
}

function estimateCourse(dx: number, dy: number): number {
  if (Math.abs(dx) >= Math.abs(dy) && dx >= 0) return 1;
  if (dx > 0 && dy < 0) return 2;
  if (Math.abs(dy) > Math.abs(dx) && dy < 0) return 3;
  if (dx < 0 && dy < 0) return 4;
  if (Math.abs(dx) >= Math.abs(dy) && dx < 0) return 5;
  if (dx < 0 && dy > 0) return 6;
  if (Math.abs(dy) > Math.abs(dx) && dy > 0) return 7;
  return 8;
}

function countStarbases(state: SuperStarTrekState): number {
  return state.galaxy.reduce(
    (total, row) => total + row.reduce((rowTotal, quadrant) => rowTotal + quadrant.starbases, 0),
    0,
  );
}

function formatSector(content: SectorContent): string {
  if (content === 'enterprise') return '<*>';
  if (content === 'klingon') return '+++';
  if (content === 'starbase') return '>!<';
  if (content === 'star') return ' * ';
  return ' . ';
}

function formatContentName(content: SectorContent): string {
  if (content === 'klingon') return 'A KLINGON';
  if (content === 'starbase') return 'A STARBASE';
  if (content === 'star') return 'A STAR';
  return 'AN OBJECT';
}

function normalizeCommand(input: string | undefined): CommandKind {
  const command = (input ?? '').toUpperCase();
  if (command === 'NAV' || command === 'SRS' || command === 'LRS' || command === 'PHA' || command === 'TOR' || command === 'SHE' || command === 'DAM' || command === 'COM' || command === 'HELP') {
    return command;
  }
  return 'UNKNOWN';
}

function recordResult(state: SuperStarTrekState, result: SuperStarTrekCommandResult): SuperStarTrekCommandResult {
  state.transcript.push(`> ${result.command}`);
  state.transcript.push(...result.messages);
  state.transcript = state.transcript.slice(-120);
  return result;
}

function coordLabel(coord: QuadrantCoord | SectorCoord): string {
  return `${coord.x + 1}-${coord.y + 1}`;
}

function getDistance(a: SectorCoord, b: SectorCoord): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function isInsideGalaxy(x: number, y: number): boolean {
  return x >= 0 && x < GALAXY_SIZE && y >= 0 && y < GALAXY_SIZE;
}

function nextRandom(state: { rngSeed: number }): number {
  state.rngSeed = (state.rngSeed * 1664525 + 1013904223) >>> 0;
  return state.rngSeed / 0x100000000;
}
