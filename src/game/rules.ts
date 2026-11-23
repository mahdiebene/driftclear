import type {
  CellKind,
  ComboState,
  NeighborhoodConfig,
  ObstacleBox,
  SnowCellData,
  TruckStats,
  UpgradeDefinition,
  UpgradeId,
  UpgradeLevels,
} from './types';

export const UPGRADE_DEFINITIONS: UpgradeDefinition[] = [
  {
    id: 'bladeWidth',
    name: 'Wide Plow Blade',
    shortDesc: 'Physically widens your steel plow blade to carve highway-wide lanes',
    maxLevel: 8,
    costs: [45, 95, 165, 260, 390, 560, 780],
    statLabel: (lv) => `${(2.6 + (lv - 1) * 0.48).toFixed(1)}m swath`,
  },
  {
    id: 'enginePower',
    name: 'Alpine Turbo Engine',
    shortDesc: 'Increases top drive speed, responsive steering, and acceleration',
    maxLevel: 8,
    costs: [40, 85, 150, 240, 360, 520, 720],
    statLabel: (lv) => `${Math.round(9.2 + (lv - 1) * 1.1)} m/s`,
  },
  {
    id: 'heatedBlade',
    name: 'Heated Copper Edge',
    shortDesc: 'Melts straight through heavy snowdrifts with zero slowdown',
    maxLevel: 8,
    costs: [55, 115, 195, 300, 440, 620, 850],
    statLabel: (lv) => (lv >= 7 ? '0% drag' : `${Math.max(0, 42 - (lv - 1) * 7)}% drag`),
  },
  {
    id: 'snowBlower',
    name: 'Side Snow Blower',
    shortDesc: 'Adds heated side-throw chutes that sweep wider edges beside the truck',
    maxLevel: 8,
    costs: [60, 125, 215, 330, 480, 670, 910],
    statLabel: (lv) => (lv === 1 ? 'Base scoop' : `+${((lv - 1) * 0.24).toFixed(2)}m reach`),
  },
  {
    id: 'comboCharm',
    name: 'Frost Coin & XP Charm',
    shortDesc: 'Boosts Coin & XP payout per snow tile and extends combo streaks',
    maxLevel: 8,
    costs: [50, 105, 185, 285, 420, 590, 810],
    statLabel: (lv) => `+${(lv - 1) * 20}% Coins/XP`,
  },
  {
    id: 'turboTank',
    name: 'Alpine Nitro Tank',
    shortDesc: 'Longer turbo boost bursts and faster tank recharge across big towns',
    maxLevel: 8,
    costs: [45, 95, 170, 265, 395, 565, 785],
    statLabel: (lv) => `${100 + (lv - 1) * 22}% turbo`,
  },
];

export const INITIAL_UPGRADES: UpgradeLevels = {
  bladeWidth: 1,
  enginePower: 1,
  heatedBlade: 1,
  snowBlower: 1,
  comboCharm: 1,
  turboTank: 1,
};

export function getUpgradeDefinition(id: UpgradeId): UpgradeDefinition {
  const def = UPGRADE_DEFINITIONS.find((u) => u.id === id);
  if (!def) {
    throw new Error(`Unknown upgrade id: ${id}`);
  }
  return def;
}

export function getNextUpgradeCost(id: UpgradeId, currentLevel: number): number | null {
  const def = getUpgradeDefinition(id);
  if (currentLevel >= def.maxLevel) return null;
  return def.costs[currentLevel - 1] ?? null;
}

export function canPurchaseUpgrade(
  id: UpgradeId,
  upgrades: UpgradeLevels,
  coins: number,
  skillPoints = 0
): boolean {
  const cost = getNextUpgradeCost(id, upgrades[id]);
  if (cost === null) return false;
  return skillPoints > 0 || coins >= cost;
}

export function purchaseUpgrade(
  id: UpgradeId,
  upgrades: UpgradeLevels,
  coins: number,
  skillPoints = 0
): {
  upgrades: UpgradeLevels;
  coins: number;
  skillPoints: number;
  usedSkillPoint: boolean;
  purchased: boolean;
} {
  const cost = getNextUpgradeCost(id, upgrades[id]);
  if (cost === null) {
    return { upgrades, coins, skillPoints, usedSkillPoint: false, purchased: false };
  }
  if (skillPoints > 0) {
    return {
      upgrades: {
        ...upgrades,
        [id]: upgrades[id] + 1,
      },
      coins,
      skillPoints: skillPoints - 1,
      usedSkillPoint: true,
      purchased: true,
    };
  }
  if (coins < cost) {
    return { upgrades, coins, skillPoints, usedSkillPoint: false, purchased: false };
  }
  return {
    upgrades: {
      ...upgrades,
      [id]: upgrades[id] + 1,
    },
    coins: coins - cost,
    skillPoints,
    usedSkillPoint: false,
    purchased: true,
  };
}

export function canAffordAnyUpgrade(
  upgrades: UpgradeLevels,
  coins: number,
  skillPoints = 0
): boolean {
  return UPGRADE_DEFINITIONS.some((def) => canPurchaseUpgrade(def.id, upgrades, coins, skillPoints));
}

export function getXpRequiredForLevel(level: number): number {
  const lv = Math.max(1, Math.floor(level));
  return Math.round(90 + (lv - 1) * 55 + Math.pow(lv - 1, 1.35) * 28);
}

export function getDriverRank(level: number): string {
  if (level >= 15) return 'Summit Legend';
  if (level >= 11) return 'Blizzard Ace';
  if (level >= 8) return 'Alpine Captain';
  if (level >= 5) return 'Drift Breaker';
  if (level >= 3) return 'Village Sweeper';
  return 'Rookie Plow';
}

export function addExperience(
  currentLevel: number,
  currentXp: number,
  gainedXp: number
): {
  level: number;
  xp: number;
  xpToNext: number;
  levelsGained: number;
  skillPointsEarned: number;
  bonusCoins: number;
  rank: string;
} {
  let level = Math.max(1, Math.floor(currentLevel));
  let xp = Math.max(0, currentXp) + Math.max(0, gainedXp);
  let levelsGained = 0;
  let bonusCoins = 0;

  let needed = getXpRequiredForLevel(level);
  while (xp >= needed) {
    xp -= needed;
    level += 1;
    levelsGained += 1;
    bonusCoins += 25 + level * 10;
    needed = getXpRequiredForLevel(level);
  }

  return {
    level,
    xp,
    xpToNext: needed,
    levelsGained,
    skillPointsEarned: levelsGained,
    bonusCoins,
    rank: getDriverRank(level),
  };
}

export function getTruckStats(upgrades: UpgradeLevels): TruckStats {
  const bw = upgrades.bladeWidth - 1;
  const eng = upgrades.enginePower - 1;
  const heat = upgrades.heatedBlade - 1;
  const blower = upgrades.snowBlower - 1;
  const charm = upgrades.comboCharm - 1;
  const tank = upgrades.turboTank - 1;

  return {
    bladeWidth: 2.6 + bw * 0.48,
    bladeDepth: 1.15 + heat * 0.14,
    blowerReach: blower * 0.24,
    maxSpeed: 9.2 + eng * 1.1,
    boostSpeed: 14.8 + eng * 1.45 + tank * 0.35,
    boostDrainRate: Math.max(0.14, 0.34 - tank * 0.028),
    boostRegenRate: 0.24 + tank * 0.048,
    turnSpeed: 7.8 + eng * 0.65,
    driftSlowdown: Math.max(0, 0.42 - heat * 0.07),
    comboDuration: 3.0 + charm * 0.45,
    coinMultiplier: 1 + charm * 0.2,
    xpMultiplier: 1 + charm * 0.2,
    heatedGlow: Math.min(1, heat / 6),
  };
}

export function getComboTier(comboCount: number): { multiplier: number; label: string } {
  if (comboCount >= 90) return { multiplier: 5, label: 'Blizzard Legend' };
  if (comboCount >= 50) return { multiplier: 4, label: 'Frost Master' };
  if (comboCount >= 24) return { multiplier: 3, label: 'Cozy Flow' };
  if (comboCount >= 8) return { multiplier: 2, label: 'Crisp Streak' };
  return { multiplier: 1, label: '' };
}

export function advanceComboOnClear(
  current: ComboState,
  tilesCleared: number,
  bonusStreak: number,
  comboDuration: number
): { next: ComboState; tieredUp: boolean } {
  const prevMultiplier = current.multiplier;
  const nextCount = current.count + tilesCleared + bonusStreak;
  const tier = getComboTier(nextCount);
  const next: ComboState = {
    count: nextCount,
    multiplier: tier.multiplier,
    tierLabel: tier.label,
    timer: comboDuration,
    maxTimer: comboDuration,
  };
  return {
    next,
    tieredUp: tier.multiplier > prevMultiplier,
  };
}

export function tickComboTimer(current: ComboState, dt: number): ComboState {
  if (current.count <= 0) return current;
  const remaining = current.timer - dt;
  if (remaining <= 0) {
    return {
      count: 0,
      multiplier: 1,
      tierLabel: '',
      timer: 0,
      maxTimer: current.maxTimer,
    };
  }
  return {
    ...current,
    timer: remaining,
  };
}

export function calculateCellReward(
  kind: CellKind,
  comboMultiplier: number,
  coinMultiplier: number,
  xpMultiplier = 1
): { coins: number; score: number; xp: number; bonusStreak: number } {
  if (kind === 'snow') {
    const coins = Math.max(1, Math.round(2 * comboMultiplier * coinMultiplier));
    const score = Math.round(10 * comboMultiplier);
    const xp = Math.max(2, Math.round(3 * (1 + (comboMultiplier - 1) * 0.35) * xpMultiplier));
    return { coins, score, xp, bonusStreak: 0 };
  }
  if (kind === 'drift') {
    const coins = Math.max(5, Math.round(7 * comboMultiplier * coinMultiplier));
    const score = Math.round(35 * comboMultiplier);
    const xp = Math.max(6, Math.round(10 * (1 + (comboMultiplier - 1) * 0.4) * xpMultiplier));
    return { coins, score, xp, bonusStreak: 2 };
  }
  if (kind === 'golden') {
    const coins = Math.max(18, Math.round(24 * comboMultiplier * coinMultiplier));
    const score = Math.round(130 * comboMultiplier);
    const xp = Math.max(24, Math.round(34 * (1 + (comboMultiplier - 1) * 0.45) * xpMultiplier));
    return { coins, score, xp, bonusStreak: 10 };
  }
  return { coins: 0, score: 0, xp: 0, bonusStreak: 0 };
}

export function calculateClearedPercent(clearedSnowTiles: number, totalSnowTiles: number): number {
  if (totalSnowTiles <= 0) return 100;
  return Math.min(100, Math.round((clearedSnowTiles / totalSnowTiles) * 100));
}

export function checkShiftOutcome(params: {
  clearedPercent: number;
  targetPercent: number;
  timeRemaining?: number;
}): 'ongoing' | 'victory' | 'timeout' {
  if (params.clearedPercent >= params.targetPercent) {
    return 'victory';
  }
  if (params.timeRemaining !== undefined && params.timeRemaining <= 0) {
    return 'timeout';
  }
  return 'ongoing';
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const NEIGHBORHOODS: NeighborhoodConfig[] = [
  {
    index: 0,
    name: 'Pinebrook City',
    subtitle: 'Alpine old-town boulevards, stone city gate, cafés & central clock roundabout',
    gridSize: 44,
    cellSize: 1.0,
    targetPercent: 80,
    shiftSeconds: 240,
    spawnX: 0,
    spawnZ: 13.8,
    spawnAngle: Math.PI, // Spawn prominently on Main Avenue just past the South City Gate!
    seed: 104729,
    driftDensity: 0.19,
    goldenCount: 12,
    roads: {
      mainAveHalfW: 3.6,
      crossAveZ: [-1.0],
      crossAveHalfW: 3.2,
      ringCenter: 18.0,
      ringHalfW: 2.9,
      plazaX: 0,
      plazaZ: -1.0,
      plazaRadius: 3.4,
      blocks: [
        { x: -9.4, z: -9.6, w: 9.8, d: 9.0 },
        { x: 9.4, z: -9.6, w: 9.8, d: 9.0 },
        { x: -9.4, z: 8.7, w: 9.8, d: 9.8 },
        { x: 9.4, z: 8.7, w: 9.8, d: 9.8 },
      ],
    },
    obstacles: [
      // Central Clock Tower Roundabout Landmark
      { id: 'tower-center', x: 0, z: -1.0, halfW: 2.3, halfD: 2.3, kind: 'tower' },

      // NW Urban Block: 3-story Townhouse, Bakery Cafe, Alpine Cottage & Festive Plaza Tree
      { id: 'townhouse-nw1', x: -12.1, z: -12.0, halfW: 2.2, halfD: 1.9, kind: 'townhouse', rotationY: 0, style: 0 },
      { id: 'cafe-nw', x: -6.7, z: -12.0, halfW: 2.2, halfD: 1.9, kind: 'cafe', rotationY: 0, style: 0 },
      { id: 'cottage-nw', x: -12.1, z: -6.8, halfW: 2.2, halfD: 1.9, kind: 'cottage', rotationY: 0, style: 0 },
      { id: 'plazaTree-nw', x: -6.7, z: -6.8, halfW: 0.9, halfD: 0.9, kind: 'plazaTree' },

      // NE Urban Block: Municipal Plow Garage Depot, Townhouse & Festive Plaza Tree
      { id: 'townhouse-ne1', x: 6.7, z: -12.0, halfW: 2.2, halfD: 1.9, kind: 'townhouse', rotationY: 0, style: 1 },
      { id: 'garage-ne', x: 12.1, z: -12.0, halfW: 2.3, halfD: 1.9, kind: 'garage', rotationY: 0 },
      { id: 'plazaTree-ne', x: 6.7, z: -6.8, halfW: 0.9, halfD: 0.9, kind: 'plazaTree' },

      // SW Urban Block: Shopping Boulevard Townhouses, Corner Café & Cozy Residence
      { id: 'townhouse-sw1', x: -12.1, z: 5.9, halfW: 2.2, halfD: 1.9, kind: 'townhouse', rotationY: 0, style: 2 },
      { id: 'townhouse-sw2', x: -6.7, z: 5.9, halfW: 2.2, halfD: 1.9, kind: 'townhouse', rotationY: 0, style: 1 },
      { id: 'cafe-sw', x: -12.1, z: 11.4, halfW: 2.2, halfD: 1.9, kind: 'cafe', rotationY: 0, style: 1 },
      { id: 'cottage-sw', x: -6.7, z: 11.4, halfW: 2.2, halfD: 1.9, kind: 'cottage', rotationY: 0, style: 1 },

      // SE Urban Block: Market Café, Tall Townhouses & Residence
      { id: 'cafe-se', x: 6.7, z: 5.9, halfW: 2.2, halfD: 1.9, kind: 'cafe', rotationY: 0, style: 2 },
      { id: 'townhouse-se1', x: 12.1, z: 5.9, halfW: 2.2, halfD: 1.9, kind: 'townhouse', rotationY: 0, style: 0 },
      { id: 'cottage-se', x: 6.7, z: 11.4, halfW: 2.2, halfD: 1.9, kind: 'cottage', rotationY: 0, style: 2 },
      { id: 'townhouse-se2', x: 12.1, z: 11.4, halfW: 2.2, halfD: 1.9, kind: 'townhouse', rotationY: 0, style: 2 },

      // Snow-Dusted Parked Winter Cars tucked cleanly along outer avenue curbs
      { id: 'car-w1', x: -15.6, z: 8.6, halfW: 0.72, halfD: 1.35, kind: 'parkedCar', rotationY: 0, style: 0 },
      { id: 'car-e1', x: 15.6, z: 8.6, halfW: 0.72, halfD: 1.35, kind: 'parkedCar', rotationY: Math.PI, style: 1 },
      { id: 'car-n1', x: -9.4, z: -15.2, halfW: 1.35, halfD: 0.72, kind: 'parkedCar', rotationY: Math.PI * 0.5, style: 2 },

      // Double-Globe City Boulevard Lamps lining Main Avenue & Cross Avenue curbs
      { id: 'lamp-1', x: -4.4, z: 14.5, halfW: 0.4, halfD: 0.4, kind: 'lamp' },
      { id: 'lamp-2', x: 4.4, z: 14.5, halfW: 0.4, halfD: 0.4, kind: 'lamp' },
      { id: 'lamp-3', x: -4.4, z: 3.1, halfW: 0.4, halfD: 0.4, kind: 'lamp' },
      { id: 'lamp-4', x: 4.4, z: 3.1, halfW: 0.4, halfD: 0.4, kind: 'lamp' },
      { id: 'lamp-5', x: -4.4, z: -14.8, halfW: 0.4, halfD: 0.4, kind: 'lamp' },
      { id: 'lamp-6', x: 4.4, z: -14.8, halfW: 0.4, halfD: 0.4, kind: 'lamp' },
      { id: 'lamp-7', x: -15.2, z: -4.1, halfW: 0.4, halfD: 0.4, kind: 'lamp' },
      { id: 'lamp-8', x: 15.2, z: -4.1, halfW: 0.4, halfD: 0.4, kind: 'lamp' },

      // Streetlife: Sidewalk Benches, Postboxes & Snowmen
      { id: 'bench-1', x: -9.4, z: -4.0, halfW: 0.75, halfD: 0.42, kind: 'bench', rotationY: 0 },
      { id: 'bench-2', x: 9.4, z: 3.0, halfW: 0.75, halfD: 0.42, kind: 'bench', rotationY: Math.PI },
      { id: 'snowman-1', x: -9.4, z: 14.6, halfW: 0.6, halfD: 0.6, kind: 'snowman' },
      { id: 'snowman-2', x: 9.4, z: 14.6, halfW: 0.6, halfD: 0.6, kind: 'snowman' },
    ],
  },
  {
    index: 1,
    name: 'Lantern Quarter',
    subtitle: 'Grand uptown avenue blocks with twin shopping rows and deep winter drifts',
    gridSize: 48,
    cellSize: 1.0,
    targetPercent: 84,
    shiftSeconds: 280,
    spawnX: 0,
    spawnZ: 15.5,
    spawnAngle: Math.PI,
    seed: 224737,
    driftDensity: 0.25,
    goldenCount: 16,
    roads: {
      mainAveHalfW: 3.8,
      crossAveZ: [-1.0],
      crossAveHalfW: 3.4,
      ringCenter: 20.0,
      ringHalfW: 3.0,
      plazaX: 0,
      plazaZ: -1.0,
      plazaRadius: 3.5,
      blocks: [
        { x: -10.4, z: -10.6, w: 11.4, d: 10.2 },
        { x: 10.4, z: -10.6, w: 11.4, d: 10.2 },
        { x: -10.4, z: 9.6, w: 11.4, d: 10.8 },
        { x: 10.4, z: 9.6, w: 11.4, d: 10.8 },
      ],
    },
    obstacles: [
      { id: 'tower-center', x: 0, z: -1.0, halfW: 2.3, halfD: 2.3, kind: 'tower' },

      // NW Quarter
      { id: 'townhouse-nw1', x: -13.2, z: -13.0, halfW: 2.2, halfD: 1.9, kind: 'townhouse', rotationY: 0, style: 1 },
      { id: 'townhouse-nw2', x: -7.5, z: -13.0, halfW: 2.2, halfD: 1.9, kind: 'townhouse', rotationY: 0, style: 2 },
      { id: 'cafe-nw', x: -13.2, z: -7.8, halfW: 2.2, halfD: 1.9, kind: 'cafe', rotationY: 0, style: 0 },
      { id: 'plazaTree-nw', x: -7.5, z: -7.8, halfW: 0.9, halfD: 0.9, kind: 'plazaTree' },

      // NE Quarter (with Municipal Plow Depot)
      { id: 'cafe-ne', x: 7.5, z: -13.0, halfW: 2.2, halfD: 1.9, kind: 'cafe', rotationY: 0, style: 1 },
      { id: 'garage-ne', x: 13.2, z: -13.0, halfW: 2.3, halfD: 1.9, kind: 'garage', rotationY: 0 },
      { id: 'plazaTree-ne', x: 7.5, z: -7.8, halfW: 0.9, halfD: 0.9, kind: 'plazaTree' },

      // SW Quarter
      { id: 'townhouse-sw1', x: -13.2, z: 6.7, halfW: 2.2, halfD: 1.9, kind: 'townhouse', rotationY: 0, style: 0 },
      { id: 'cafe-sw', x: -7.5, z: 6.7, halfW: 2.2, halfD: 1.9, kind: 'cafe', rotationY: 0, style: 2 },
      { id: 'cottage-sw', x: -13.2, z: 12.2, halfW: 2.2, halfD: 1.9, kind: 'cottage', rotationY: 0, style: 2 },
      { id: 'townhouse-sw2', x: -7.5, z: 12.2, halfW: 2.2, halfD: 1.9, kind: 'townhouse', rotationY: 0, style: 1 },

      // SE Quarter
      { id: 'townhouse-se1', x: 7.5, z: 6.7, halfW: 2.2, halfD: 1.9, kind: 'townhouse', rotationY: 0, style: 2 },
      { id: 'townhouse-se2', x: 13.2, z: 6.7, halfW: 2.2, halfD: 1.9, kind: 'townhouse', rotationY: 0, style: 0 },
      { id: 'cafe-se', x: 7.5, z: 12.2, halfW: 2.2, halfD: 1.9, kind: 'cafe', rotationY: 0, style: 0 },
      { id: 'cottage-se', x: 13.2, z: 12.2, halfW: 2.2, halfD: 1.9, kind: 'cottage', rotationY: 0, style: 1 },

      // Parked Winter Cars
      { id: 'car-w1', x: -16.8, z: 9.5, halfW: 0.72, halfD: 1.35, kind: 'parkedCar', rotationY: 0, style: 3 },
      { id: 'car-e1', x: 16.8, z: 9.5, halfW: 0.72, halfD: 1.35, kind: 'parkedCar', rotationY: Math.PI, style: 0 },
      { id: 'car-w2', x: -16.8, z: -10.4, halfW: 0.72, halfD: 1.35, kind: 'parkedCar', rotationY: 0, style: 1 },
      { id: 'car-n1', x: -10.4, z: -16.4, halfW: 1.35, halfD: 0.72, kind: 'parkedCar', rotationY: Math.PI * 0.5, style: 2 },

      // Boulevard Lamps & Streetlife
      { id: 'lamp-1', x: -4.6, z: 15.6, halfW: 0.4, halfD: 0.4, kind: 'lamp' },
      { id: 'lamp-2', x: 4.6, z: 15.6, halfW: 0.4, halfD: 0.4, kind: 'lamp' },
      { id: 'lamp-3', x: -4.6, z: 3.6, halfW: 0.4, halfD: 0.4, kind: 'lamp' },
      { id: 'lamp-4', x: 4.6, z: 3.6, halfW: 0.4, halfD: 0.4, kind: 'lamp' },
      { id: 'lamp-5', x: -4.6, z: -16.2, halfW: 0.4, halfD: 0.4, kind: 'lamp' },
      { id: 'lamp-6', x: 4.6, z: -16.2, halfW: 0.4, halfD: 0.4, kind: 'lamp' },
      { id: 'lamp-7', x: -16.5, z: -4.8, halfW: 0.4, halfD: 0.4, kind: 'lamp' },
      { id: 'lamp-8', x: 16.5, z: -4.8, halfW: 0.4, halfD: 0.4, kind: 'lamp' },
      { id: 'bench-1', x: -10.4, z: -4.8, halfW: 0.75, halfD: 0.42, kind: 'bench', rotationY: 0 },
      { id: 'bench-2', x: 10.4, z: 3.6, halfW: 0.75, halfD: 0.42, kind: 'bench', rotationY: Math.PI },
      { id: 'snowman-1', x: -10.4, z: 15.8, halfW: 0.6, halfD: 0.6, kind: 'snowman' },
      { id: 'snowman-2', x: 10.4, z: 15.8, halfW: 0.6, halfD: 0.6, kind: 'snowman' },
    ],
  },
  {
    index: 2,
    name: 'Frostmill Metro',
    subtitle: 'Expansive winter capital with wide ring boulevards, grand townhouses & blizzards',
    gridSize: 52,
    cellSize: 1.0,
    targetPercent: 86,
    shiftSeconds: 320,
    spawnX: 0,
    spawnZ: 17.2,
    spawnAngle: Math.PI,
    seed: 350377,
    driftDensity: 0.30,
    goldenCount: 20,
    roads: {
      mainAveHalfW: 3.9,
      crossAveZ: [-1.0],
      crossAveHalfW: 3.5,
      ringCenter: 22.0,
      ringHalfW: 3.1,
      plazaX: 0,
      plazaZ: -1.0,
      plazaRadius: 3.6,
      blocks: [
        { x: -11.4, z: -11.6, w: 13.0, d: 11.4 },
        { x: 11.4, z: -11.6, w: 13.0, d: 11.4 },
        { x: -11.4, z: 10.6, w: 13.0, d: 12.2 },
        { x: 11.4, z: 10.6, w: 13.0, d: 12.2 },
      ],
    },
    obstacles: [
      { id: 'tower-center', x: 0, z: -1.0, halfW: 2.3, halfD: 2.3, kind: 'tower' },

      // NW Metro Block
      { id: 'townhouse-nw1', x: -15.0, z: -14.6, halfW: 2.2, halfD: 1.9, kind: 'townhouse', rotationY: 0, style: 2 },
      { id: 'townhouse-nw2', x: -9.5, z: -14.6, halfW: 2.2, halfD: 1.9, kind: 'townhouse', rotationY: 0, style: 0 },
      { id: 'cafe-nw', x: -15.0, z: -8.8, halfW: 2.2, halfD: 1.9, kind: 'cafe', rotationY: 0, style: 1 },
      { id: 'plazaTree-nw', x: -8.2, z: -8.5, halfW: 0.9, halfD: 0.9, kind: 'plazaTree' },

      // NE Metro Block
      { id: 'townhouse-ne1', x: 8.5, z: -14.6, halfW: 2.2, halfD: 1.9, kind: 'townhouse', rotationY: 0, style: 1 },
      { id: 'garage-ne', x: 14.5, z: -14.6, halfW: 2.3, halfD: 1.9, kind: 'garage', rotationY: 0 },
      { id: 'plazaTree-ne', x: 8.2, z: -8.5, halfW: 0.9, halfD: 0.9, kind: 'plazaTree' },

      // SW Metro Block
      { id: 'townhouse-sw1', x: -15.0, z: 7.4, halfW: 2.2, halfD: 1.9, kind: 'townhouse', rotationY: 0, style: 1 },
      { id: 'cafe-sw', x: -8.5, z: 7.4, halfW: 2.2, halfD: 1.9, kind: 'cafe', rotationY: 0, style: 0 },
      { id: 'townhouse-sw2', x: -15.0, z: 13.6, halfW: 2.2, halfD: 1.9, kind: 'townhouse', rotationY: 0, style: 0 },
      { id: 'cottage-sw', x: -8.5, z: 13.6, halfW: 2.2, halfD: 1.9, kind: 'cottage', rotationY: 0, style: 0 },

      // SE Metro Block
      { id: 'cafe-se', x: 8.5, z: 7.4, halfW: 2.2, halfD: 1.9, kind: 'cafe', rotationY: 0, style: 2 },
      { id: 'townhouse-se1', x: 15.0, z: 7.4, halfW: 2.2, halfD: 1.9, kind: 'townhouse', rotationY: 0, style: 2 },
      { id: 'cottage-se', x: 8.5, z: 13.6, halfW: 2.2, halfD: 1.9, kind: 'cottage', rotationY: 0, style: 1 },
      { id: 'townhouse-se2', x: 15.0, z: 13.6, halfW: 2.2, halfD: 1.9, kind: 'townhouse', rotationY: 0, style: 1 },

      // Parked Winter Cars along Metro curbs
      { id: 'car-w1', x: -18.5, z: 10.5, halfW: 0.72, halfD: 1.35, kind: 'parkedCar', rotationY: 0, style: 2 },
      { id: 'car-e1', x: 18.5, z: 10.5, halfW: 0.72, halfD: 1.35, kind: 'parkedCar', rotationY: Math.PI, style: 3 },
      { id: 'car-w2', x: -18.5, z: -11.5, halfW: 0.72, halfD: 1.35, kind: 'parkedCar', rotationY: 0, style: 0 },
      { id: 'car-n1', x: -12.0, z: -18.0, halfW: 1.35, halfD: 0.72, kind: 'parkedCar', rotationY: Math.PI * 0.5, style: 1 },

      // Boulevard Lamps & Streetlife
      { id: 'lamp-1', x: -4.8, z: 17.2, halfW: 0.4, halfD: 0.4, kind: 'lamp' },
      { id: 'lamp-2', x: 4.8, z: 17.2, halfW: 0.4, halfD: 0.4, kind: 'lamp' },
      { id: 'lamp-3', x: -4.8, z: 3.8, halfW: 0.4, halfD: 0.4, kind: 'lamp' },
      { id: 'lamp-4', x: 4.8, z: 3.8, halfW: 0.4, halfD: 0.4, kind: 'lamp' },
      { id: 'lamp-5', x: -4.8, z: -17.8, halfW: 0.4, halfD: 0.4, kind: 'lamp' },
      { id: 'lamp-6', x: 4.8, z: -17.8, halfW: 0.4, halfD: 0.4, kind: 'lamp' },
      { id: 'lamp-7', x: -18.2, z: -5.2, halfW: 0.4, halfD: 0.4, kind: 'lamp' },
      { id: 'lamp-8', x: 18.2, z: -5.2, halfW: 0.4, halfD: 0.4, kind: 'lamp' },
      { id: 'bench-1', x: -11.6, z: -5.2, halfW: 0.75, halfD: 0.42, kind: 'bench', rotationY: 0 },
      { id: 'bench-2', x: 11.6, z: 3.8, halfW: 0.75, halfD: 0.42, kind: 'bench', rotationY: Math.PI },
      { id: 'snowman-1', x: -11.6, z: 17.5, halfW: 0.6, halfD: 0.6, kind: 'snowman' },
      { id: 'snowman-2', x: 11.6, z: 17.5, halfW: 0.6, halfD: 0.6, kind: 'snowman' },
    ],
  },
];

export function isPointInsideObstacle(
  wx: number,
  wz: number,
  obstacles: ObstacleBox[],
  padding = 0.55
): boolean {
  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i];
    const p =
      o.kind === 'lamp' || o.kind === 'snowman' || o.kind === 'bench'
        ? Math.min(padding, 0.35)
        : o.kind === 'parkedCar' || o.kind === 'plazaTree'
          ? Math.min(padding, 0.45)
          : padding;
    if (
      Math.abs(wx - o.x) <= o.halfW + p &&
      Math.abs(wz - o.z) <= o.halfD + p
    ) {
      return true;
    }
  }
  return false;
}

export function generateSnowGrid(config: NeighborhoodConfig): {
  cells: SnowCellData[];
  totalSnowTiles: number;
} {
  const rand = mulberry32(config.seed);
  const cells: SnowCellData[] = [];
  const half = (config.gridSize * config.cellSize) / 2;
  const playableIndices: number[] = [];
  const garageObs = config.obstacles.find((o) => o.kind === 'garage');

  for (let gz = 0; gz < config.gridSize; gz++) {
    for (let gx = 0; gx < config.gridSize; gx++) {
      const wx = -half + (gx + 0.5) * config.cellSize;
      const wz = -half + (gz + 0.5) * config.cellSize;

      // Leave clean breathing margin inside curb/fence border so snow never clips fences
      if (
        Math.abs(wx) > half - 0.55 ||
        Math.abs(wz) > half - 0.55 ||
        isPointInsideObstacle(wx, wz, config.obstacles, 0.62)
      ) {
        cells.push({
          gx,
          gz,
          wx,
          wz,
          kind: 'none',
          initialKind: 'none',
          height: 0,
          clearAnim: 0,
          bermBoost: 0,
          pushX: 0,
          pushZ: 0,
        });
        continue;
      }

      // Keep welcoming South Gateway Entry Boulevard through the City Gate + spawn apron + garage pad cleared
      const inGatewayEntry =
        Math.abs(wx) <= config.roads.mainAveHalfW + 0.1 && wz >= config.spawnZ - 0.8;
      const distToSpawn = Math.hypot(wx - config.spawnX, wz - config.spawnZ);
      const distToGaragePad = garageObs
        ? Math.hypot(wx - garageObs.x, wz - (garageObs.z + 3.4))
        : 99;
      if (inGatewayEntry || distToSpawn <= 2.2 || distToGaragePad <= 2.0) {
        cells.push({
          gx,
          gz,
          wx,
          wz,
          kind: 'cleared',
          initialKind: 'cleared',
          height: 0,
          clearAnim: 0,
          bermBoost: 0,
          pushX: 0,
          pushZ: 0,
        });
        continue;
      }

      // Smooth windblown wave noise for natural drift bands
      const wave =
        Math.sin(wx * 0.22 + config.seed * 0.01) * Math.cos(wz * 0.20 - 0.6) +
        Math.sin((wx + wz) * 0.16) * 0.5;
      const isDrift = wave > 0.70 - config.driftDensity * 1.4 && rand() < 0.72;
      const kind: CellKind = isDrift ? 'drift' : 'snow';
      const height = kind === 'drift' ? 0.88 + rand() * 0.22 : 0.32 + rand() * 0.10;

      const idx = cells.length;
      playableIndices.push(idx);
      cells.push({
        gx,
        gz,
        wx,
        wz,
        kind,
        initialKind: kind,
        height,
        clearAnim: 1,
        bermBoost: 0,
        pushX: 0,
        pushZ: 0,
      });
    }
  }

  // Place sparkling golden cocoa/gift snow mounds at well-spaced spots across the town
  let placedGolden = 0;
  const goldenPositions: Array<{ wx: number; wz: number }> = [];
  for (let attempt = 0; attempt < 500 && placedGolden < config.goldenCount; attempt++) {
    const pick = playableIndices[Math.floor(rand() * playableIndices.length)];
    const cell = cells[pick];
    if (!cell || cell.kind === 'golden') continue;
    if (Math.hypot(cell.wx - config.spawnX, cell.wz - config.spawnZ) < 6.0) continue;
    const tooClose = goldenPositions.some((p) => Math.hypot(p.wx - cell.wx, p.wz - cell.wz) < 6.5);
    if (tooClose) continue;

    cell.kind = 'golden';
    cell.initialKind = 'golden';
    cell.height = 0.66;
    goldenPositions.push({ wx: cell.wx, wz: cell.wz });
    placedGolden++;
  }

  return {
    cells,
    totalSnowTiles: playableIndices.length,
  };
}

/**
 * Resolves circle vs obstacle AABB & world-bounds collisions cleanly, sliding smoothly.
 */
export function resolveTruckCollisions(
  x: number,
  z: number,
  radius: number,
  obstacles: ObstacleBox[],
  arenaHalfExtent: number
): { x: number; z: number; collided: boolean } {
  let nx = x;
  let nz = z;
  let collided = false;

  const limit = arenaHalfExtent - radius;
  if (nx < -limit) {
    nx = -limit;
    collided = true;
  } else if (nx > limit) {
    nx = limit;
    collided = true;
  }
  if (nz < -limit) {
    nz = -limit;
    collided = true;
  } else if (nz > limit) {
    nz = limit;
    collided = true;
  }

  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i];
    const minX = o.x - o.halfW;
    const maxX = o.x + o.halfW;
    const minZ = o.z - o.halfD;
    const maxZ = o.z + o.halfD;

    const closestX = Math.max(minX, Math.min(nx, maxX));
    const closestZ = Math.max(minZ, Math.min(nz, maxZ));
    const dx = nx - closestX;
    const dz = nz - closestZ;
    const distSq = dx * dx + dz * dz;

    if (distSq < radius * radius) {
      collided = true;
      if (distSq > 1e-6) {
        const dist = Math.sqrt(distSq);
        const push = radius - dist;
        nx += (dx / dist) * push;
        nz += (dz / dist) * push;
      } else {
        const penLeft = Math.abs(nx - minX);
        const penRight = Math.abs(maxX - nx);
        const penTop = Math.abs(nz - minZ);
        const penBottom = Math.abs(maxZ - nz);
        const minPen = Math.min(penLeft, penRight, penTop, penBottom);
        if (minPen === penLeft) nx = minX - radius;
        else if (minPen === penRight) nx = maxX + radius;
        else if (minPen === penTop) nz = minZ - radius;
        else nz = maxZ + radius;
      }
    }
  }

  return { x: nx, z: nz, collided };
}

/**
 * Finds snow cells overlapping the oriented plow blade rectangle (+ optional side blower reach) in front of the truck.
 */
export function findCellsInPlowBlade(
  cells: SnowCellData[],
  gridSize: number,
  cellSize: number,
  truckX: number,
  truckZ: number,
  truckAngle: number,
  bladeWidth: number,
  bladeDepth: number,
  blowerReach = 0
): number[] {
  const fwdX = Math.sin(truckAngle);
  const fwdZ = Math.cos(truckAngle);
  const rightX = Math.cos(truckAngle);
  const rightZ = -Math.sin(truckAngle);

  // Blade sits 1.45 units in front of the truck center
  const bladeCenterX = truckX + fwdX * 1.45;
  const bladeCenterZ = truckZ + fwdZ * 1.45;
  const halfW = bladeWidth * 0.5 + blowerReach + 0.25;
  const halfD = bladeDepth * 0.5 + blowerReach * 0.45 + 0.25;
  const searchRadius = Math.hypot(halfW, halfD) + cellSize;

  const halfArena = (gridSize * cellSize) / 2;
  const minGx = Math.max(0, Math.floor((bladeCenterX - searchRadius + halfArena) / cellSize));
  const maxGx = Math.min(gridSize - 1, Math.floor((bladeCenterX + searchRadius + halfArena) / cellSize));
  const minGz = Math.max(0, Math.floor((bladeCenterZ - searchRadius + halfArena) / cellSize));
  const maxGz = Math.min(gridSize - 1, Math.floor((bladeCenterZ + searchRadius + halfArena) / cellSize));

  const hitIndices: number[] = [];
  for (let gz = minGz; gz <= maxGz; gz++) {
    for (let gx = minGx; gx <= maxGx; gx++) {
      const idx = gz * gridSize + gx;
      const cell = cells[idx];
      if (!cell) continue;
      if (cell.kind !== 'snow' && cell.kind !== 'drift' && cell.kind !== 'golden') continue;

      const relX = cell.wx - bladeCenterX;
      const relZ = cell.wz - bladeCenterZ;
      const localRight = relX * rightX + relZ * rightZ;
      const localFwd = relX * fwdX + relZ * fwdZ;

      if (Math.abs(localRight) <= halfW && Math.abs(localFwd) <= halfD) {
        hitIndices.push(idx);
      }
    }
  }
  return hitIndices;
}

export const MAX_BERM_BOOST = 0.34;

/**
 * Pushes displaced snow onto adjacent untouched snow cells along the blade's discharge vector,
 * creating realistic plowed snowbank ridges along freshly cleared lanes.
 */
export function accumulatePlowBerm(
  cells: SnowCellData[],
  gridSize: number,
  gx: number,
  gz: number,
  pushX: number,
  pushZ: number,
  amount = 0.14
): number[] {
  const modified: number[] = [];
  const stepX = Math.round(pushX);
  const stepZ = Math.round(pushZ);

  const offsets: Array<[number, number, number]> = [
    [stepX, stepZ, amount],
    [stepX, 0, amount * 0.6],
    [0, stepZ, amount * 0.6],
  ];

  const visited = new Set<number>();
  for (let i = 0; i < offsets.length; i++) {
    const [ox, oz, boost] = offsets[i];
    if (ox === 0 && oz === 0) continue;
    const nx = gx + ox;
    const nz = gz + oz;
    if (nx < 0 || nx >= gridSize || nz < 0 || nz >= gridSize) continue;
    const nIdx = nz * gridSize + nx;
    if (visited.has(nIdx)) continue;
    visited.add(nIdx);

    const neighbor = cells[nIdx];
    if (!neighbor) continue;
    if (neighbor.kind === 'snow' || neighbor.kind === 'drift' || neighbor.kind === 'golden') {
      const nextBoost = Math.min(MAX_BERM_BOOST, neighbor.bermBoost + boost);
      if (nextBoost > neighbor.bermBoost) {
        neighbor.bermBoost = nextBoost;
        modified.push(nIdx);
      }
    }
  }
  return modified;
}

/**
 * Smoothly advances progressive snow-clearing animations (shear & compression) over time
 * so plowed snow physically collapses and sweeps aside rather than popping out instantaneously.
 */
export function stepSnowClearingAnim(
  cells: SnowCellData[],
  activeIndices: number[],
  dt: number,
  clearRate = 3.1
): { stillAnimating: number[]; dirtyIndices: number[] } {
  const stillAnimating: number[] = [];
  const dirtyIndices: number[] = [];
  const delta = Math.max(0, dt) * clearRate;

  for (let i = 0; i < activeIndices.length; i++) {
    const idx = activeIndices[i];
    const cell = cells[idx];
    if (!cell) continue;
    if (cell.clearAnim <= 0) continue;

    cell.clearAnim = Math.max(0, cell.clearAnim - delta);
    dirtyIndices.push(idx);
    if (cell.clearAnim > 0) {
      stillAnimating.push(idx);
    }
  }
  return { stillAnimating, dirtyIndices };
}
