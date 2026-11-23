import { isPointInsideObstacle, mulberry32 } from './rules';
import type {
  AmbulanceEscortState,
  AvalancheEvent,
  NeighborhoodConfig,
  PickupKind,
  RoadPickup,
  SnowCellData,
  TimeOfDay,
  TruckStats,
  VehicleDefinition,
  VehicleId,
  WeatherKind,
} from './types';

export const VEHICLES: VehicleDefinition[] = [
  {
    id: 'ranger',
    name: 'Alpine Ranger 4×4',
    role: 'Nimble Utility Plow',
    description: 'Classic heritage village 4×4 with crisp handling and balanced clearing speed.',
    perkLabel: 'Agile Cornering',
    cost: 0,
    minLevel: 1,
    speedMult: 1.0,
    bladeMult: 1.0,
    saltCapMult: 1.0,
    fuelCapMult: 1.0,
    blastChargeMult: 1.0,
    driftDragMult: 1.0,
    iceImmune: false,
  },
  {
    id: 'unimog',
    name: 'Titan Unimog 6×6',
    role: 'Heavy Municipal Freighter',
    description: 'Six-wheel cab-over beast with wide V-plow, oversized salt silo, and high-torque drift armor.',
    perkLabel: '+26% Blade · 1.6× Salt & Heavy Armor',
    cost: 280,
    minLevel: 2,
    speedMult: 0.96,
    bladeMult: 1.26,
    saltCapMult: 1.6,
    fuelCapMult: 1.45,
    blastChargeMult: 1.15,
    driftDragMult: 0.45,
    iceImmune: false,
  },
  {
    id: 'snocat',
    name: 'Glacier Rotary Sno-Cat',
    role: 'Tracked Arctic Expedition',
    description: 'Twin rubber caterpillar treads with spinning rotary snow-augers. Completely immune to black-ice skids.',
    perkLabel: 'Black-Ice Immune · +40% Swath & Fast Blast',
    cost: 540,
    minLevel: 4,
    speedMult: 1.04,
    bladeMult: 1.4,
    saltCapMult: 1.35,
    fuelCapMult: 1.6,
    blastChargeMult: 1.5,
    driftDragMult: 0.15,
    iceImmune: true,
  },
];

export function getVehicleDefinition(id: VehicleId): VehicleDefinition {
  return VEHICLES.find((v) => v.id === id) ?? VEHICLES[0];
}

export function canUnlockVehicle(
  id: VehicleId,
  unlocked: VehicleId[],
  coins: number,
  driverLevel: number
): boolean {
  if (unlocked.includes(id)) return false;
  const def = getVehicleDefinition(id);
  return driverLevel >= def.minLevel && coins >= def.cost;
}

export function applyVehicleToStats(base: TruckStats, vehicleId: VehicleId): TruckStats {
  const v = getVehicleDefinition(vehicleId);
  return {
    ...base,
    bladeWidth: base.bladeWidth * v.bladeMult,
    maxSpeed: base.maxSpeed * v.speedMult,
    boostSpeed: base.boostSpeed * (0.98 + (v.speedMult - 1) * 0.8 + (vehicleId === 'snocat' ? 0.08 : 0)),
    driftSlowdown: base.driftSlowdown * v.driftDragMult,
  };
}

export interface FuelStepResult {
  fuel: number;
  lowFuel: boolean;
  empty: boolean;
  refueledNow: boolean;
}

export function stepFuelSystem(
  currentFuel: number,
  speedRatio: number,
  isBoosting: boolean,
  nearDepot: boolean,
  fuelCapMult: number,
  dt: number
): FuelStepResult {
  let fuel = Math.max(0, Math.min(1, currentFuel));
  let refueledNow = false;

  if (nearDepot) {
    const prev = fuel;
    fuel = Math.min(1, fuel + dt * 0.42);
    if (prev < 0.94 && fuel >= 0.94) {
      refueledNow = true;
    }
  } else {
    const cap = Math.max(0.5, fuelCapMult);
    // ~140-220 seconds of driving on a full tank depending on boost & vehicle tank size
    const idleBurn = 0.0012;
    const driveBurn = Math.min(1.4, Math.max(0, speedRatio)) * 0.0046;
    const boostBurn = isBoosting ? 0.0075 : 0;
    fuel = Math.max(0, fuel - ((idleBurn + driveBurn + boostBurn) / cap) * dt);
  }

  return {
    fuel,
    lowFuel: fuel <= 0.25,
    empty: fuel <= 0.005,
    refueledNow,
  };
}

export function stepBlastCharge(
  currentCharge: number,
  clearedTilesThisStep: number,
  driftsHit: boolean,
  dt: number,
  chargeMult = 1
): number {
  const passive = dt * 0.012 * chargeMult;
  const fromTiles = clearedTilesThisStep * 0.017 * chargeMult;
  const fromDrift = driftsHit ? 0.035 * chargeMult : 0;
  return Math.min(1, Math.max(0, currentCharge + passive + fromTiles + fromDrift));
}

export function findCellsInBlastRadius(
  cells: SnowCellData[],
  gridSize: number,
  cellSize: number,
  originX: number,
  originZ: number,
  radius: number
): number[] {
  const half = (gridSize * cellSize) / 2;
  const minGx = Math.max(0, Math.floor((originX - radius + half) / cellSize));
  const maxGx = Math.min(gridSize - 1, Math.floor((originX + radius + half) / cellSize));
  const minGz = Math.max(0, Math.floor((originZ - radius + half) / cellSize));
  const maxGz = Math.min(gridSize - 1, Math.floor((originZ + radius + half) / cellSize));
  const rSq = radius * radius;

  const hits: number[] = [];
  for (let gz = minGz; gz <= maxGz; gz++) {
    for (let gx = minGx; gx <= maxGx; gx++) {
      const idx = gz * gridSize + gx;
      const cell = cells[idx];
      if (!cell) continue;
      if (cell.kind !== 'snow' && cell.kind !== 'drift' && cell.kind !== 'golden') continue;
      const dx = cell.wx - originX;
      const dz = cell.wz - originZ;
      if (dx * dx + dz * dz <= rSq) {
        hits.push(idx);
      }
    }
  }
  return hits;
}

export function spawnAmbulanceEscort(config: NeighborhoodConfig): AmbulanceEscortState {
  const ring = config.roads.ringCenter;
  const garage = config.obstacles.find((o) => o.kind === 'garage');
  const destX = garage ? garage.x : ring * 0.65;
  const destZ = garage ? Math.min(ring, garage.z + 3.6) : -ring;
  const crossZ = config.roads.crossAveZ[0] ?? -1.0;

  // Scenic cross-city emergency route: South Gate -> East Ring -> North-East Clinic/Depot!
  const waypoints = [
    { x: 1.5, z: ring + 1.5 },
    { x: 1.5, z: crossZ + 4.4 },
    { x: ring - 0.6, z: crossZ + 0.6 },
    { x: ring - 0.6, z: -ring + 1.0 },
    { x: destX, z: Math.max(-ring + 1.2, destZ) },
  ];

  return {
    active: true,
    x: waypoints[0].x,
    z: waypoints[0].z,
    angle: Math.PI,
    waypoints,
    wpIndex: 1,
    speed: 0,
    stuck: false,
    patience: 48,
    maxPatience: 48,
    rewardCoins: 125 + config.index * 30,
    rewardTime: 24,
    sirenTimer: 0,
  };
}

export function stepAmbulanceEscort(
  amb: AmbulanceEscortState,
  cells: SnowCellData[],
  gridSize: number,
  cellSize: number,
  playerX: number,
  playerZ: number,
  dt: number
): { status: 'active' | 'rescued' | 'delayed'; progressPercent: number; playSiren: boolean } {
  if (!amb.active) {
    return { status: 'active', progressPercent: 0, playSiren: false };
  }

  const target = amb.waypoints[amb.wpIndex];
  if (!target) {
    amb.active = false;
    return { status: 'rescued', progressPercent: 100, playSiren: false };
  }

  const dx = target.x - amb.x;
  const dz = target.z - amb.z;
  const dist = Math.hypot(dx, dz);

  if (dist < 1.35) {
    amb.wpIndex += 1;
    if (amb.wpIndex >= amb.waypoints.length) {
      amb.active = false;
      return { status: 'rescued', progressPercent: 100, playSiren: false };
    }
  }

  const curTarget = amb.waypoints[amb.wpIndex];
  const ndx = curTarget.x - amb.x;
  const ndz = curTarget.z - amb.z;
  const nLen = Math.hypot(ndx, ndz) || 1;
  const dirX = ndx / nLen;
  const dirZ = ndz / nLen;
  const desiredAngle = Math.atan2(dirX, dirZ);

  let diff = desiredAngle - amb.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  amb.angle += diff * Math.min(1, dt * 6.5);

  // Sample snow directly ahead of the ambulance bumper
  const half = (gridSize * cellSize) / 2;
  const probeX = amb.x + dirX * 2.1;
  const probeZ = amb.z + dirZ * 2.1;
  const gx = Math.max(0, Math.min(gridSize - 1, Math.floor((probeX + half) / cellSize)));
  const gz = Math.max(0, Math.min(gridSize - 1, Math.floor((probeZ + half) / cellSize)));
  const aheadCell = cells[gz * gridSize + gx];
  const blockedBySnow =
    aheadCell &&
    (aheadCell.kind === 'drift' || (aheadCell.kind === 'snow' && aheadCell.clearAnim > 0.4));

  const distToPlayer = Math.hypot(playerX - amb.x, playerZ - amb.z);
  const yieldingToPlayer = distToPlayer < 3.0;

  if (blockedBySnow) {
    amb.stuck = true;
    amb.speed = Math.max(0, amb.speed - dt * 7.0);
    // Patience ticks slowly so the player has plenty of exciting time to race over and plow a path!
    amb.patience = Math.max(0, amb.patience - dt * 1.15);
  } else if (yieldingToPlayer) {
    amb.stuck = false;
    amb.speed = Math.max(0.8, amb.speed - dt * 5.0);
    amb.patience = Math.min(amb.maxPatience, amb.patience + dt * 0.4);
  } else {
    amb.stuck = false;
    amb.speed = Math.min(5.6, amb.speed + dt * 5.5);
    amb.patience = Math.min(amb.maxPatience, amb.patience + dt * 0.65);
  }

  amb.x += Math.sin(amb.angle) * amb.speed * dt;
  amb.z += Math.cos(amb.angle) * amb.speed * dt;

  amb.sirenTimer += dt;
  let playSiren = false;
  if (amb.sirenTimer >= (amb.stuck ? 2.6 : 4.2)) {
    amb.sirenTimer = 0;
    playSiren = true;
  }

  const totalSegs = Math.max(1, amb.waypoints.length - 1);
  const segFrac = Math.max(0, Math.min(1, 1 - dist / 16));
  const progressPercent = Math.min(
    99,
    Math.round(((amb.wpIndex - 1 + segFrac) / totalSegs) * 100)
  );

  if (amb.patience <= 0) {
    amb.active = false;
    return { status: 'delayed', progressPercent, playSiren: false };
  }

  return { status: 'active', progressPercent, playSiren };
}

export function spawnAvalancheEvent(
  config: NeighborhoodConfig,
  id: number,
  playerX: number,
  playerZ: number
): AvalancheEvent {
  const ring = config.roads.ringCenter;
  const crossZ = config.roads.crossAveZ[0] ?? -1.0;
  const candidates = [
    { x: -ring, z: 4.0 },
    { x: ring, z: -6.0 },
    { x: -6.0, z: -ring },
    { x: 6.0, z: -ring },
    { x: -ring, z: -10.0 },
    { x: -8.5, z: crossZ },
    { x: 8.5, z: crossZ },
  ];

  // Pick a road spot that is visible but not directly on top of the player's current cab
  let chosen = candidates[id % candidates.length];
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[(id + i) % candidates.length];
    if (Math.hypot(c.x - playerX, c.z - playerZ) >= 6.5) {
      chosen = c;
      break;
    }
  }

  return {
    id,
    x: chosen.x,
    z: chosen.z,
    radius: 3.1,
    state: 'telegraph',
    timer: 2.6,
    maxTimer: 2.6,
  };
}

export function applyAvalancheImpact(
  ev: AvalancheEvent,
  cells: SnowCellData[],
  gridSize: number,
  cellSize: number
): { modifiedIndices: number[]; addedSnowTiles: number } {
  const half = (gridSize * cellSize) / 2;
  const r = ev.radius;
  const rSq = r * r;
  const minGx = Math.max(0, Math.floor((ev.x - r + half) / cellSize));
  const maxGx = Math.min(gridSize - 1, Math.floor((ev.x + r + half) / cellSize));
  const minGz = Math.max(0, Math.floor((ev.z - r + half) / cellSize));
  const maxGz = Math.min(gridSize - 1, Math.floor((ev.z + r + half) / cellSize));

  const modifiedIndices: number[] = [];
  let addedSnowTiles = 0;

  for (let gz = minGz; gz <= maxGz; gz++) {
    for (let gx = minGx; gx <= maxGx; gx++) {
      const idx = gz * gridSize + gx;
      const cell = cells[idx];
      if (!cell || cell.initialKind === 'none') continue;
      const dx = cell.wx - ev.x;
      const dz = cell.wz - ev.z;
      const dSq = dx * dx + dz * dz;
      if (dSq > rSq) continue;

      const falloff = 1 - Math.sqrt(dSq) / r;
      if (cell.kind === 'cleared') {
        addedSnowTiles += 1;
      }
      cell.kind = falloff > 0.35 ? 'drift' : 'snow';
      cell.height = 0.65 + falloff * 0.58;
      cell.clearAnim = 1;
      cell.bermBoost = Math.min(0.28, falloff * 0.25);
      modifiedIndices.push(idx);
    }
  }

  ev.state = 'impacted';
  return { modifiedIndices, addedSnowTiles };
}

export function spawnRoadPickups(config: NeighborhoodConfig, count = 6): RoadPickup[] {
  const rand = mulberry32(config.seed + 9113);
  const ring = config.roads.ringCenter;
  const crossZ = config.roads.crossAveZ[0] ?? -1.0;

  const spots: Array<{ x: number; z: number; kind: PickupKind }> = [
    { x: -ring, z: 0, kind: 'fuel' },
    { x: ring, z: 6.5, kind: 'salt' },
    { x: 0, z: -ring, kind: 'cocoa' },
    { x: -9.0, z: crossZ, kind: 'coins' },
    { x: 9.0, z: crossZ, kind: 'fuel' },
    { x: -ring, z: -12.5, kind: 'cocoa' },
    { x: ring, z: -12.0, kind: 'coins' },
    { x: -10.0, z: ring, kind: 'salt' },
  ];

  const pickups: RoadPickup[] = [];
  for (let i = 0; i < Math.min(count, spots.length); i++) {
    const s = spots[i];
    if (isPointInsideObstacle(s.x, s.z, config.obstacles, 1.1)) continue;
    pickups.push({
      id: i + 1,
      kind: s.kind,
      x: s.x,
      z: s.z,
      collected: false,
      bobPhase: rand() * Math.PI * 2,
    });
  }
  return pickups;
}

export function collectNearbyPickups(
  pickups: RoadPickup[],
  truckX: number,
  truckZ: number,
  collectRadius = 2.05
): RoadPickup[] {
  const collected: RoadPickup[] = [];
  const rSq = collectRadius * collectRadius;
  for (let i = 0; i < pickups.length; i++) {
    const p = pickups[i];
    if (p.collected) continue;
    const dx = p.x - truckX;
    const dz = p.z - truckZ;
    if (dx * dx + dz * dz <= rSq) {
      p.collected = true;
      collected.push(p);
    }
  }
  return collected;
}

export interface TimeOfDayLighting {
  skyTint: [number, number, number];
  keyTint: [number, number, number];
  keyMult: number;
  hemiMult: number;
  rimMult: number;
  envIntensity: number;
  headlightOpacity: number;
  sunPos: [number, number, number];
  label: string;
}

export const TIME_OF_DAY_PROFILES: Record<TimeOfDay, TimeOfDayLighting> = {
  day: {
    skyTint: [1.0, 1.0, 1.0],
    keyTint: [1.0, 0.96, 0.90],
    keyMult: 0.96,
    hemiMult: 0.92,
    rimMult: 0.92,
    envIntensity: 0.56,
    headlightOpacity: 0.34,
    sunPos: [28, 36, 22],
    label: 'Crisp Day',
  },
  sunset: {
    skyTint: [1.24, 0.72, 0.44],
    keyTint: [1.0, 0.66, 0.34],
    keyMult: 1.08,
    hemiMult: 0.64,
    rimMult: 0.88,
    envIntensity: 0.30,
    headlightOpacity: 0.74,
    sunPos: [28, 20, -26],
    label: 'Alpine Sunset',
  },
  night: {
    skyTint: [0.10, 0.16, 0.34],
    keyTint: [0.46, 0.64, 1.0],
    keyMult: 0.30,
    hemiMult: 0.26,
    rimMult: 0.85,
    envIntensity: 0.12,
    headlightOpacity: 0.98,
    sunPos: [-22, 32, -26],
    label: 'Starry Night',
  },
};

export interface BloomProfile {
  strength: number;
  radius: number;
  threshold: number;
}

export const BLOOM_PROFILES: Record<TimeOfDay, BloomProfile> = {
  day: {
    strength: 0.18,
    radius: 0.48,
    threshold: 1.08,
  },
  sunset: {
    strength: 0.34,
    radius: 0.66,
    threshold: 0.94,
  },
  night: {
    strength: 0.56,
    radius: 0.82,
    threshold: 0.78,
  },
};

export function getTargetBloomParams(
  timeOfDay: TimeOfDay,
  weather: WeatherKind
): BloomProfile {
  const base = BLOOM_PROFILES[timeOfDay];
  const radiusBonus = weather === 'blizzard' ? 0.08 : weather === 'light' ? 0.03 : 0;
  const strengthBonus = weather === 'blizzard' ? 0.05 : 0;
  const thresholdDelta = weather === 'blizzard' ? -0.02 : 0;
  return {
    strength: Math.min(0.85, Math.max(0.05, base.strength + strengthBonus)),
    radius: Math.min(0.98, Math.max(0.1, base.radius + radiusBonus)),
    threshold: Math.min(1.4, Math.max(0.74, base.threshold + thresholdDelta)),
  };
}

export function dampBloomParams(
  current: BloomProfile,
  target: BloomProfile,
  dt: number,
  lambda = 4.5
): BloomProfile {
  const alpha = dt >= 1 ? 1 : 1 - Math.exp(-lambda * Math.max(0, dt));
  current.strength += (target.strength - current.strength) * alpha;
  current.radius += (target.radius - current.radius) * alpha;
  current.threshold += (target.threshold - current.threshold) * alpha;
  return current;
}

export function cycleTimeOfDay(current: TimeOfDay): TimeOfDay {
  if (current === 'day') return 'sunset';
  if (current === 'sunset') return 'night';
  return 'day';
}
