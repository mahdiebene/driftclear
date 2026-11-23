import type {
  AchievementDefinition,
  AchievementId,
  CareerStats,
  LiveryId,
  TruckLiveryDefinition,
  UpgradeLevels,
} from './types';

export const TRUCK_LIVERIES: TruckLiveryDefinition[] = [
  {
    id: 'crimson',
    name: 'Alpine Crimson',
    tagline: 'Heritage municipal cherry red & warm ivory trim',
    primaryHex: 0xd64531,
    trimHex: 0xf4ead8,
    bladeHex: 0xefb026,
    swatchPrimary: '#d64531',
    swatchTrim: '#f4ead8',
    cost: 0,
    minLevel: 1,
  },
  {
    id: 'cobalt',
    name: 'Glacier Cobalt',
    tagline: 'Deep alpine navy with crisp frost-white striping',
    primaryHex: 0x2563eb,
    trimHex: 0xe2f1ff,
    bladeHex: 0xf59e0b,
    swatchPrimary: '#2563eb',
    swatchTrim: '#e2f1ff',
    cost: 120,
    minLevel: 2,
  },
  {
    id: 'pine',
    name: 'Nordic Pine',
    tagline: 'Evergreen timber patrol finish with warm brass trim',
    primaryHex: 0x1f6f54,
    trimHex: 0xf5deb3,
    bladeHex: 0xeab308,
    swatchPrimary: '#1f6f54',
    swatchTrim: '#f5deb3',
    cost: 220,
    minLevel: 3,
  },
  {
    id: 'gold',
    name: 'Summit Gold',
    tagline: 'Championship mountain gold with midnight obsidian trim',
    primaryHex: 0xd99b26,
    trimHex: 0x1f2937,
    bladeHex: 0xfef08a,
    swatchPrimary: '#d99b26',
    swatchTrim: '#1f2937',
    cost: 360,
    minLevel: 5,
  },
];

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'firstSwath',
    title: 'First Swath',
    description: 'Clear 40 snow tiles across any alpine city',
    rewardCoins: 35,
    target: 40,
  },
  {
    id: 'driftBuster',
    title: 'Drift Buster',
    description: 'Smash through 15 heavy snowdrifts',
    rewardCoins: 60,
    target: 15,
  },
  {
    id: 'blizzardSurvivor',
    title: 'Storm Chaser',
    description: 'Clear 35 snow tiles during a Heavy Blizzard',
    rewardCoins: 80,
    target: 35,
  },
  {
    id: 'iceMelter',
    title: 'Salt Specialist',
    description: 'Melt 4 Black-Ice patches with your salt spreader [E]',
    rewardCoins: 75,
    target: 4,
  },
  {
    id: 'roadsideHero',
    title: 'Roadside Hero',
    description: 'Complete 3 live municipal dispatch missions',
    rewardCoins: 100,
    target: 3,
  },
  {
    id: 'comboVirtuoso',
    title: 'Flow Virtuoso',
    description: 'Reach a 4x Frost Master combo multiplier',
    rewardCoins: 75,
    target: 4,
  },
  {
    id: 'districtChampion',
    title: 'District Champion',
    description: 'Clear any city district to its goal target',
    rewardCoins: 110,
    target: 1,
  },
  {
    id: 'masterMechanic',
    title: 'Master Mechanic',
    description: 'Upgrade any plow system to Level 4',
    rewardCoins: 90,
    target: 4,
  },
  {
    id: 'snowKing',
    title: 'Alpine Legend',
    description: 'Reach 5,000 shift score in a single run',
    rewardCoins: 120,
    target: 5000,
  },
  {
    id: 'fullSweep',
    title: 'Spotless Streets',
    description: 'Clear 95% or more of a city district',
    rewardCoins: 150,
    target: 95,
  },
];

export function createInitialCareerStats(): CareerStats {
  return {
    totalTilesCleared: 0,
    totalDriftsBusted: 0,
    blizzardTilesCleared: 0,
    icePatchesMelted: 0,
    missionsCompleted: 0,
    carsRescued: 0,
    districtsCleared: 0,
    districtStars: {},
  };
}

export function getLiveryDefinition(id: LiveryId): TruckLiveryDefinition {
  return TRUCK_LIVERIES.find((l) => l.id === id) ?? TRUCK_LIVERIES[0];
}

export function canUnlockLivery(
  id: LiveryId,
  unlocked: LiveryId[],
  coins: number,
  driverLevel: number
): boolean {
  if (unlocked.includes(id)) return true;
  const def = getLiveryDefinition(id);
  return driverLevel >= def.minLevel && coins >= def.cost;
}

export function getAchievementProgress(
  id: AchievementId,
  stats: CareerStats,
  upgrades: UpgradeLevels,
  bestScore: number,
  maxMultiplier: number,
  clearedPercent: number
): number {
  switch (id) {
    case 'firstSwath':
      return stats.totalTilesCleared;
    case 'driftBuster':
      return stats.totalDriftsBusted;
    case 'blizzardSurvivor':
      return stats.blizzardTilesCleared;
    case 'iceMelter':
      return stats.icePatchesMelted;
    case 'roadsideHero':
      return stats.missionsCompleted;
    case 'comboVirtuoso':
      return maxMultiplier;
    case 'districtChampion':
      return stats.districtsCleared;
    case 'masterMechanic':
      return Math.max(...Object.values(upgrades));
    case 'snowKing':
      return bestScore;
    case 'fullSweep':
      return clearedPercent;
  }
}

/**
 * Evaluates all career achievements and returns any newly unlocked ones.
 */
export function evaluateAchievements(
  stats: CareerStats,
  upgrades: UpgradeLevels,
  bestScore: number,
  maxMultiplier: number,
  clearedPercent: number,
  alreadyUnlocked: AchievementId[]
): AchievementDefinition[] {
  const unlockedSet = new Set(alreadyUnlocked);
  const newlyUnlocked: AchievementDefinition[] = [];

  for (let i = 0; i < ACHIEVEMENTS.length; i++) {
    const def = ACHIEVEMENTS[i];
    if (unlockedSet.has(def.id)) continue;
    const current = getAchievementProgress(
      def.id,
      stats,
      upgrades,
      bestScore,
      maxMultiplier,
      clearedPercent
    );
    if (current >= def.target) {
      newlyUnlocked.push(def);
    }
  }

  return newlyUnlocked;
}

/**
 * Computes 1–3 shift stars when a district is cleared:
 * - Star 1: Met target snow clearance %
 * - Star 2: Beat par shift time OR completed >= 2 dispatch missions
 * - Star 3: High efficiency (beat par time AND (cleared >= target+6% OR combo >= 3x OR >= 3 missions))
 */
export function calculateShiftStars(
  won: boolean,
  clearedPercent: number,
  targetPercent: number,
  elapsedSeconds: number,
  parSeconds: number,
  missionsCompleted: number,
  maxMultiplier: number
): number {
  if (!won || clearedPercent < targetPercent) return 0;
  let stars = 1;
  if (elapsedSeconds <= parSeconds || missionsCompleted >= 2) {
    stars = 2;
  }
  if (
    stars === 2 &&
    (clearedPercent >= Math.min(98, targetPercent + 6) ||
      maxMultiplier >= 3 ||
      missionsCompleted >= 3)
  ) {
    stars = 3;
  }
  return stars;
}
