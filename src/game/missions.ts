import type {
  ActiveMission,
  BlackIcePatch,
  MissionKind,
  NeighborhoodConfig,
  SnowCellData,
} from './types';

function seededRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function overlapsAnyObstacle(
  x: number,
  z: number,
  clearance: number,
  config: NeighborhoodConfig
): boolean {
  for (let i = 0; i < config.obstacles.length; i++) {
    const o = config.obstacles[i];
    if (
      Math.abs(x - o.x) < o.halfW + clearance &&
      Math.abs(z - o.z) < o.halfD + clearance
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Generates deterministic, road-aligned Black Ice slick patches along major city avenues
 * and outer ring intersections without ever overlapping buildings or the starting apron.
 */
export function createBlackIcePatches(config: NeighborhoodConfig): BlackIcePatch[] {
  const rand = seededRand(config.seed + 7919);
  const r = config.roads;
  const ring = r.ringCenter;
  const crossZ = r.crossAveZ[0] ?? 0;
  const crossZ2 = r.crossAveZ[1] ?? -ring * 0.45;

  const candidates: Array<{ x: number; z: number; radius: number }> = [
    { x: 0, z: 3.4, radius: 2.35 },
    { x: -ring, z: crossZ, radius: 2.5 },
    { x: ring, z: crossZ, radius: 2.5 },
    { x: 0, z: -ring, radius: 2.6 },
    { x: -ring * 0.52, z: ring, radius: 2.35 },
    { x: ring * 0.52, z: -ring, radius: 2.35 },
    { x: -ring, z: -ring * 0.55, radius: 2.4 },
    { x: ring, z: ring * 0.55, radius: 2.4 },
    { x: -ring * 0.55, z: crossZ2, radius: 2.3 },
    { x: ring * 0.55, z: crossZ2, radius: 2.3 },
  ];

  const patches: BlackIcePatch[] = [];
  const desiredCount = Math.min(8, 5 + config.index);

  for (let i = 0; i < candidates.length && patches.length < desiredCount; i++) {
    const c = candidates[i];
    const jitterX = (rand() - 0.5) * 1.1;
    const jitterZ = (rand() - 0.5) * 1.1;
    const px = c.x + jitterX;
    const pz = c.z + jitterZ;

    // Keep clear of spawn apron and all obstacles
    if (Math.hypot(px - config.spawnX, pz - config.spawnZ) < 6.0) continue;
    if (overlapsAnyObstacle(px, pz, c.radius * 0.55, config)) continue;

    let tooClose = false;
    for (let j = 0; j < patches.length; j++) {
      if (Math.hypot(px - patches[j].x, pz - patches[j].z) < 7.5) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    patches.push({
      id: patches.length + 1,
      x: px,
      z: pz,
      radius: c.radius,
      melted: false,
      meltProgress: 0,
    });
  }

  return patches;
}

/**
 * Checks if the snowplow truck is currently driving across an unmelted black-ice patch.
 */
export function checkBlackIceContact(
  x: number,
  z: number,
  patches: BlackIcePatch[]
): BlackIcePatch | null {
  for (let i = 0; i < patches.length; i++) {
    const p = patches[i];
    if (p.melted) continue;
    const dx = x - p.x;
    const dz = z - p.z;
    if (dx * dx + dz * dz <= (p.radius + 0.65) * (p.radius + 0.65)) {
      return p;
    }
  }
  return null;
}

/**
 * Applies rock-salt spread from behind the truck onto nearby black-ice patches.
 * Returns IDs of patches that finished melting on this step.
 */
export function applySaltToPatches(
  truckX: number,
  truckZ: number,
  truckAngle: number,
  patches: BlackIcePatch[],
  dt: number
): number[] {
  const fwdX = Math.sin(truckAngle);
  const fwdZ = Math.cos(truckAngle);
  // Salt spreader fan sits slightly behind and around the rear axle
  const saltX = truckX - fwdX * 1.1;
  const saltZ = truckZ - fwdZ * 1.1;
  const reach = 2.65;

  const newlyMelted: number[] = [];
  for (let i = 0; i < patches.length; i++) {
    const p = patches[i];
    if (p.melted) continue;
    const distTruck = Math.hypot(truckX - p.x, truckZ - p.z);
    const distSalt = Math.hypot(saltX - p.x, saltZ - p.z);
    if (Math.min(distTruck, distSalt) <= p.radius + reach) {
      p.meltProgress = Math.min(1, p.meltProgress + dt * 2.4);
      if (p.meltProgress >= 1) {
        p.melted = true;
        newlyMelted.push(p.id);
      }
    }
  }
  return newlyMelted;
}

export function countRemainingSnowInRadius(
  cells: SnowCellData[],
  cx: number,
  cz: number,
  radius: number
): { remaining: number; total: number } {
  const r2 = radius * radius;
  let remaining = 0;
  let total = 0;
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    if (c.initialKind === 'none') continue;
    const dx = c.wx - cx;
    const dz = c.wz - cz;
    if (dx * dx + dz * dz <= r2) {
      total += 1;
      if (c.kind === 'snow' || c.kind === 'drift' || c.kind === 'golden') {
        remaining += 1;
      }
    }
  }
  return { remaining, total };
}

const MISSION_ROTATION: readonly MissionKind[] = [
  'rescueCar',
  'priorityZone',
  'deIce',
  'driftRush',
];

/**
 * Generates the next dynamic municipal dispatch mission anchored to real landmarks
 * and remaining snow/ice in the current district.
 */
export function spawnNextMission(
  config: NeighborhoodConfig,
  missionSeq: number,
  cells: SnowCellData[],
  icePatches: BlackIcePatch[],
  currentDriftsBusted: number,
  currentIceMelted: number
): ActiveMission {
  const unmeltedIce = icePatches.filter((p) => !p.melted);
  let kind = MISSION_ROTATION[missionSeq % MISSION_ROTATION.length];
  if (kind === 'deIce' && unmeltedIce.length < 2) {
    kind = 'rescueCar';
  }

  const r = config.roads;
  const ring = r.ringCenter;

  if (kind === 'rescueCar') {
    const rescueSpots = [
      { x: 0, z: -ring, label: 'North Ring Blvd' },
      { x: -ring, z: 0, label: 'West Alpine Ave' },
      { x: ring, z: 0, label: 'East Market Ave' },
      { x: -ring * 0.55, z: ring, label: 'South Quarter' },
      { x: ring * 0.55, z: -ring, label: 'Clocktower North' },
    ];
    let bestSpot = rescueSpots[missionSeq % rescueSpots.length];
    let bestSnow = -1;
    for (let i = 0; i < rescueSpots.length; i++) {
      const s = rescueSpots[(missionSeq + i) % rescueSpots.length];
      if (overlapsAnyObstacle(s.x, s.z, 1.8, config)) continue;
      const count = countRemainingSnowInRadius(cells, s.x, s.z, 4.4);
      if (count.remaining >= 4) {
        bestSpot = s;
        bestSnow = count.remaining;
        break;
      }
      if (count.remaining > bestSnow) {
        bestSpot = s;
        bestSnow = count.remaining;
      }
    }
    const targetTiles = Math.max(3, Math.min(8, bestSnow > 0 ? Math.ceil(bestSnow * 0.65) : 5));
    const snap = countRemainingSnowInRadius(cells, bestSpot.x, bestSpot.z, 4.4);
    const alreadyCleared = snap.total - snap.remaining;

    return {
      id: missionSeq + 1,
      kind: 'rescueCar',
      title: 'Rescue Snowed-In Car',
      subtitle: `Clear snow around stranded sedan on ${bestSpot.label}`,
      x: bestSpot.x,
      z: bestSpot.z,
      radius: 4.4,
      progress: 0,
      target: targetTiles,
      rewardCoins: 85 + config.index * 20,
      rewardXp: 75 + config.index * 15,
      bonusTimeSec: 18,
      baselineCleared: alreadyCleared,
      baselineDrifts: currentDriftsBusted,
      baselineIce: currentIceMelted,
    };
  }

  if (kind === 'priorityZone') {
    const zones = [
      { x: r.plazaX, z: r.plazaZ + r.plazaRadius + 1.8, label: 'Clock Tower Plaza' },
      { x: -ring * 0.62, z: r.crossAveZ[0] ?? 0, label: 'Bakery & Café Frontage' },
      { x: ring * 0.62, z: r.crossAveZ[0] ?? 0, label: 'Depot Approach' },
      { x: 0, z: ring - 2.2, label: 'City Gate Boulevard' },
    ];
    let best = zones[missionSeq % zones.length];
    let bestRem = -1;
    for (let i = 0; i < zones.length; i++) {
      const zc = zones[(missionSeq + i) % zones.length];
      const count = countRemainingSnowInRadius(cells, zc.x, zc.z, 5.2);
      if (count.remaining >= 8) {
        best = zc;
        bestRem = count.remaining;
        break;
      }
      if (count.remaining > bestRem) {
        best = zc;
        bestRem = count.remaining;
      }
    }
    const snap = countRemainingSnowInRadius(cells, best.x, best.z, 5.2);
    const targetTiles = Math.max(4, Math.min(14, Math.ceil(Math.max(4, snap.remaining) * 0.65)));

    return {
      id: missionSeq + 1,
      kind: 'priorityZone',
      title: `Priority: ${best.label}`,
      subtitle: 'Clear snow inside the glowing municipal ring',
      x: best.x,
      z: best.z,
      radius: 5.2,
      progress: 0,
      target: targetTiles,
      rewardCoins: 95 + config.index * 20,
      rewardXp: 85 + config.index * 15,
      bonusTimeSec: 18,
      baselineCleared: snap.total - snap.remaining,
      baselineDrifts: currentDriftsBusted,
      baselineIce: currentIceMelted,
    };
  }

  if (kind === 'deIce') {
    const targetPatch = unmeltedIce[0];
    const targetCount = Math.min(2, unmeltedIce.length);
    return {
      id: missionSeq + 1,
      kind: 'deIce',
      title: 'Salt Black-Ice Slicks',
      subtitle: 'Hold [E] near glowing blue ice to melt patches',
      x: targetPatch.x,
      z: targetPatch.z,
      radius: 3.4,
      progress: 0,
      target: targetCount,
      rewardCoins: 80 + config.index * 15,
      rewardXp: 70 + config.index * 15,
      bonusTimeSec: 16,
      baselineCleared: 0,
      baselineDrifts: currentDriftsBusted,
      baselineIce: currentIceMelted,
    };
  }

  // driftRush
  const targetDrifts = 5 + config.index;
  return {
    id: missionSeq + 1,
    kind: 'driftRush',
    title: 'Deep Snowdrift Blitz',
    subtitle: `Bust through ${targetDrifts} heavy snowdrifts anywhere`,
    x: 0,
    z: 0,
    radius: 0,
    progress: 0,
    target: targetDrifts,
    rewardCoins: 90 + config.index * 20,
    rewardXp: 80 + config.index * 15,
    bonusTimeSec: 16,
    baselineCleared: 0,
    baselineDrifts: currentDriftsBusted,
    baselineIce: currentIceMelted,
  };
}

/**
 * Evaluates live progress on the active municipal dispatch mission.
 * Returns whether the mission just completed.
 */
export function evaluateMissionProgress(
  mission: ActiveMission,
  cells: SnowCellData[],
  currentDriftsBusted: number,
  currentIceMelted: number,
  truckX: number,
  truckZ: number
): { completed: boolean; progress: number } {
  let progress = mission.progress;

  if (mission.kind === 'rescueCar' || mission.kind === 'priorityZone') {
    const snap = countRemainingSnowInRadius(cells, mission.x, mission.z, mission.radius);
    const clearedNow = snap.total - snap.remaining;
    progress = Math.max(0, clearedNow - mission.baselineCleared);
    // Also complete immediately if all snow in the zone is cleared OR for rescueCar if player arrives right next to it with <= 1 tile left
    if (snap.remaining === 0) {
      progress = mission.target;
    } else if (
      mission.kind === 'rescueCar' &&
      snap.remaining <= 2 &&
      Math.hypot(truckX - mission.x, truckZ - mission.z) < 4.5
    ) {
      progress = mission.target;
    }
  } else if (mission.kind === 'driftRush') {
    progress = Math.max(0, currentDriftsBusted - mission.baselineDrifts);
  } else if (mission.kind === 'deIce') {
    progress = Math.max(0, currentIceMelted - mission.baselineIce);
  }

  mission.progress = Math.min(mission.target, progress);
  return {
    completed: mission.progress >= mission.target,
    progress: mission.progress,
  };
}
