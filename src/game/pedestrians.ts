import { mulberry32 } from './rules';
import type { NeighborhoodConfig, ObstacleBox } from './types';

export interface Vec2 {
  x: number;
  z: number;
}

export interface PedestrianState {
  id: number;
  x: number;
  z: number;
  angle: number;
  speed: number;
  baseSpeed: number;
  walkPhase: number;
  waveAmount: number;
  pauseTimer: number;
  style: number;
  hatVariant: number;
  hasBag: boolean;
  heightScale: number;
  waypoints: Vec2[];
  waypointIndex: number;
  direction: 1 | -1;
}

/**
 * Resolves a pedestrian's position cleanly outside buildings, lamps, benches, parked cars,
 * plaza trees, and outer walls with realistic human-scale padding so NPCs hug sidewalks cleanly.
 */
export function resolvePedestrianObstacles(
  x: number,
  z: number,
  obstacles: ObstacleBox[],
  arenaHalf: number,
  pedRadius = 0.18
): Vec2 {
  let px = x;
  let pz = z;

  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      // Obstacle halfW/halfD already include wall/eave buffer; add tight visual clearance so sidewalks stay navigable
      const pad =
        o.kind === 'lamp' || o.kind === 'bench' || o.kind === 'snowman'
          ? 0.02
          : o.kind === 'parkedCar' || o.kind === 'plazaTree'
            ? 0.04
            : 0.05;
      const hw = o.halfW + pad + pedRadius;
      const hd = o.halfD + pad + pedRadius;

      const dx = px - o.x;
      const dz = pz - o.z;
      const ox = hw - Math.abs(dx);
      const oz = hd - Math.abs(dz);
      if (ox > 0 && oz > 0) {
        if (ox < oz) {
          px += dx >= 0 ? ox : -ox;
        } else {
          pz += dz >= 0 ? oz : -oz;
        }
      }
    }
  }

  const limit = arenaHalf - 0.85;
  px = Math.max(-limit, Math.min(limit, px));
  pz = Math.max(-limit, Math.min(limit, pz));
  return { x: px, z: pz };
}

/**
 * Generates clean, obstacle-safe closed sidewalk loops around every urban city block
 * plus the central Clock Tower roundabout plaza promenade.
 */
export function generateSidewalkLoops(config: NeighborhoodConfig): Vec2[][] {
  const loops: Vec2[][] = [];
  const { roads, obstacles } = config;
  const arenaHalf = (config.gridSize * config.cellSize) / 2;

  // 1. One pedestrian sidewalk perimeter loop around each of the 4 urban city blocks
  for (const blk of roads.blocks) {
    const halfW = blk.w / 2;
    const halfD = blk.d / 2;

    // Hug the granite sidewalk perimeter cleanly outside building walls (0.38m outside block curb)
    const minX = Math.max(-arenaHalf + 1.4, blk.x - halfW - 0.38);
    const maxX = Math.min(arenaHalf - 1.4, blk.x + halfW + 0.38);
    const minZ = Math.max(-arenaHalf + 1.4, blk.z - halfD - 0.38);
    const maxZ = Math.min(arenaHalf - 1.4, blk.z + halfD + 0.38);

    // Keep inner avenue walks cleanly on the granite sidewalk strip right beside Main & Cross Avenues
    const innerMainEdge = roads.mainAveHalfW + 0.28;
    const clampedMaxX = blk.x < 0 ? Math.min(maxX, -innerMainEdge) : maxX;
    const clampedMinX = blk.x > 0 ? Math.max(minX, innerMainEdge) : minX;

    const crossZ = roads.crossAveZ[0] ?? -1.0;
    const crossEdgeN = crossZ - (roads.crossAveHalfW + 0.25);
    const crossEdgeS = crossZ + (roads.crossAveHalfW + 0.25);
    const clampedMaxZ = blk.z < crossZ ? Math.min(maxZ, crossEdgeN) : maxZ;
    const clampedMinZ = blk.z > crossZ ? Math.max(minZ, crossEdgeS) : minZ;

    // Build a smooth 8-point chamfered sidewalk rectangle and project every waypoint outside obstacles
    const c = 0.55;
    const rawPts: Vec2[] = [
      { x: clampedMinX + c, z: clampedMinZ },
      { x: clampedMaxX - c, z: clampedMinZ },
      { x: clampedMaxX, z: clampedMinZ + c },
      { x: clampedMaxX, z: clampedMaxZ - c },
      { x: clampedMaxX - c, z: clampedMaxZ },
      { x: clampedMinX + c, z: clampedMaxZ },
      { x: clampedMinX, z: clampedMaxZ - c },
      { x: clampedMinX, z: clampedMinZ + c },
    ];
    loops.push(rawPts.map((pt) => resolvePedestrianObstacles(pt.x, pt.z, obstacles, arenaHalf)));
  }

  // 2. Central Clock Tower Roundabout Plaza promenade ring
  const plazaRing: Vec2[] = [];
  const ringR = Math.max(3.05, roads.plazaRadius - 0.2);
  const segs = 12;
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const pt = resolvePedestrianObstacles(
      roads.plazaX + Math.cos(a) * ringR,
      roads.plazaZ + Math.sin(a) * ringR,
      obstacles,
      arenaHalf
    );
    plazaRing.push(pt);
  }
  loops.push(plazaRing);

  return loops;
}

/**
 * Spawns deterministic, well-spaced winter pedestrians across the city's sidewalk loops.
 */
export function createCityPedestrians(
  config: NeighborhoodConfig,
  count = 16
): PedestrianState[] {
  const loops = generateSidewalkLoops(config);
  const rand = mulberry32(config.seed + 7717);
  const arenaHalf = (config.gridSize * config.cellSize) / 2;
  const peds: PedestrianState[] = [];

  for (let i = 0; i < count; i++) {
    // Distribute mostly along the 4 urban block sidewalks + 2 around the Clock Tower plaza
    const loopIdx = i < 2 ? loops.length - 1 : (i - 2) % Math.max(1, loops.length - 1);
    const waypoints = loops[loopIdx];
    const wpCount = waypoints.length;

    // Evenly stagger starting waypoint along each loop so pedestrians don't clump
    const slotInLoop = Math.floor(i / Math.max(1, loops.length - 1));
    const wpStart = (slotInLoop * 2 + Math.floor(rand() * 2)) % wpCount;
    const direction: 1 | -1 = i % 2 === 0 ? 1 : -1;
    const nextWp = (wpStart + direction + wpCount) % wpCount;

    const a = waypoints[wpStart];
    const b = waypoints[nextWp];
    const t = 0.25 + rand() * 0.5;
    const rawX = a.x + (b.x - a.x) * t;
    const rawZ = a.z + (b.z - a.z) * t;
    const safePos = resolvePedestrianObstacles(rawX, rawZ, config.obstacles, arenaHalf);

    const baseSpeed = 1.3 + rand() * 0.5;
    const heading = Math.atan2(b.x - a.x, b.z - a.z);

    peds.push({
      id: i,
      x: safePos.x,
      z: safePos.z,
      angle: heading,
      speed: baseSpeed,
      baseSpeed,
      walkPhase: rand() * Math.PI * 2,
      waveAmount: 0,
      pauseTimer: rand() < 0.12 ? 0.6 + rand() * 0.9 : 0,
      style: i % 6,
      hatVariant: i % 3,
      hasBag: i % 3 === 1,
      heightScale: 0.92 + rand() * 0.16,
      waypoints,
      waypointIndex: nextWp,
      direction,
    });
  }

  return peds;
}

function shortestAngleDelta(from: number, to: number): number {
  let diff = ((to - from + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

/**
 * Advances all pedestrians smoothly along their sidewalk loops, applying gentle
 * snowplow courtesy yielding + waving, obstacle clearance, and natural walk cycle phase.
 */
export function stepPedestrians(
  peds: PedestrianState[],
  dt: number,
  truckX: number,
  truckZ: number,
  obstacles: ObstacleBox[],
  arenaHalf: number,
  isSnowAt?: (x: number, z: number) => boolean
): void {
  const safeDt = Math.min(0.05, Math.max(0, dt));
  if (safeDt <= 0) return;

  for (let i = 0; i < peds.length; i++) {
    const p = peds[i];
    const wp = p.waypoints[p.waypointIndex];

    const dxTruck = p.x - truckX;
    const dzTruck = p.z - truckZ;
    const distTruck = Math.hypot(dxTruck, dzTruck);

    // Friendly snowplow interaction: step politely clear & wave when snowplow passes nearby!
    const nearTruck = distTruck < 4.4;
    const targetWave = nearTruck ? 1 : 0;
    p.waveAmount += (targetWave - p.waveAmount) * Math.min(1, safeDt * 7.5);

    if (distTruck < 2.95) {
      // Gently step radially away from the snowplow; if blocked by a wall behind, slide tangentially!
      const inv = distTruck > 0.001 ? 1 / distTruck : 1;
      const nx = distTruck > 0.001 ? dxTruck * inv : 1;
      const nz = distTruck > 0.001 ? dzTruck * inv : 0;
      const pushSpeed = 2.6;

      let stepped = resolvePedestrianObstacles(
        p.x + nx * pushSpeed * safeDt,
        p.z + nz * pushSpeed * safeDt,
        obstacles,
        arenaHalf
      );
      const radialGain = Math.hypot(stepped.x - truckX, stepped.z - truckZ) - distTruck;
      if (radialGain < pushSpeed * safeDt * 0.25) {
        const candA = resolvePedestrianObstacles(
          p.x + (-nz * 0.85 + nx * 0.35) * pushSpeed * safeDt,
          p.z + (nx * 0.85 + nz * 0.35) * pushSpeed * safeDt,
          obstacles,
          arenaHalf
        );
        const candB = resolvePedestrianObstacles(
          p.x + (nz * 0.85 + nx * 0.35) * pushSpeed * safeDt,
          p.z + (-nx * 0.85 + nz * 0.35) * pushSpeed * safeDt,
          obstacles,
          arenaHalf
        );
        const dA = Math.hypot(candA.x - truckX, candA.z - truckZ);
        const dB = Math.hypot(candB.x - truckX, candB.z - truckZ);
        stepped = dA >= dB ? candA : candB;
      }

      p.x = stepped.x;
      p.z = stepped.z;
      const faceTruck = Math.atan2(truckX - p.x, truckZ - p.z);
      p.angle += shortestAngleDelta(p.angle, faceTruck) * Math.min(1, safeDt * 8.0);
      p.speed = 0.35;
      p.walkPhase += safeDt * 4.6;
      continue;
    }

    // Brief cozy pause to wave as the snowplow rolls past
    if (nearTruck && distTruck < 3.85) {
      const faceTruck = Math.atan2(truckX - p.x, truckZ - p.z);
      p.angle += shortestAngleDelta(p.angle, faceTruck) * Math.min(1, safeDt * 6.5);
      p.speed += (0 - p.speed) * Math.min(1, safeDt * 8.0);
      continue;
    }

    if (p.pauseTimer > 0) {
      p.pauseTimer = Math.max(0, p.pauseTimer - safeDt);
      p.speed += (0 - p.speed) * Math.min(1, safeDt * 8.0);
      continue;
    }

    const toWpX = wp.x - p.x;
    const toWpZ = wp.z - p.z;
    const distWp = Math.hypot(toWpX, toWpZ);

    if (distWp < 0.72) {
      const wpCount = p.waypoints.length;
      p.waypointIndex = (p.waypointIndex + p.direction + wpCount) % wpCount;
      if (((p.id * 17 + p.waypointIndex * 31) % 13) === 0) {
        p.pauseTimer = 0.9;
      }
      continue;
    }

    // Subtle personal-space separation between passing pedestrians on the same sidewalk
    let sepX = 0;
    let sepZ = 0;
    for (let j = 0; j < peds.length; j++) {
      if (i === j) continue;
      const o = peds[j];
      const sdx = p.x - o.x;
      const sdz = p.z - o.z;
      const sd = Math.hypot(sdx, sdz);
      if (sd > 0.001 && sd < 0.95) {
        const push = (0.95 - sd) / 0.95;
        sepX += (sdx / sd) * push * 0.55;
        sepZ += (sdz / sd) * push * 0.55;
      }
    }

    const inSnow = isSnowAt ? isSnowAt(p.x, p.z) : false;
    const targetSpeed = inSnow ? p.baseSpeed * 0.80 : p.baseSpeed;
    p.speed += (targetSpeed - p.speed) * Math.min(1, safeDt * 6.0);

    const dirX = toWpX / distWp + sepX;
    const dirZ = toWpZ / distWp + sepZ;
    const dirLen = Math.hypot(dirX, dirZ) || 1;
    const ux = dirX / dirLen;
    const uz = dirZ / dirLen;
    let vx = ux * p.speed;
    let vz = uz * p.speed;

    let nextPos = resolvePedestrianObstacles(
      p.x + vx * safeDt,
      p.z + vz * safeDt,
      obstacles,
      arenaHalf
    );
    let moved = Math.hypot(nextPos.x - p.x, nextPos.z - p.z);

    // If a curbside bench/snowman/car sits directly ahead, smoothly skirt tangentially around it!
    if (moved < p.speed * safeDt * 0.45) {
      const sidestepA = resolvePedestrianObstacles(
        p.x + (ux * 0.35 - uz * 0.94) * p.speed * safeDt,
        p.z + (uz * 0.35 + ux * 0.94) * p.speed * safeDt,
        obstacles,
        arenaHalf
      );
      const sidestepB = resolvePedestrianObstacles(
        p.x + (ux * 0.35 + uz * 0.94) * p.speed * safeDt,
        p.z + (uz * 0.35 - ux * 0.94) * p.speed * safeDt,
        obstacles,
        arenaHalf
      );
      const mA = Math.hypot(sidestepA.x - p.x, sidestepA.z - p.z);
      const mB = Math.hypot(sidestepB.x - p.x, sidestepB.z - p.z);
      const best = mA >= mB ? sidestepA : sidestepB;
      if (Math.max(mA, mB) > moved) {
        vx = (best.x - p.x) / safeDt;
        vz = (best.z - p.z) / safeDt;
        nextPos = best;
        moved = Math.max(mA, mB);
      }
    }

    p.x = nextPos.x;
    p.z = nextPos.z;

    const targetAngle = Math.atan2(vx, vz);
    p.angle += shortestAngleDelta(p.angle, targetAngle) * Math.min(1, safeDt * 8.5);
    p.walkPhase += Math.max(0.25, moved / Math.max(0.01, safeDt)) * safeDt * 6.2;
  }
}
