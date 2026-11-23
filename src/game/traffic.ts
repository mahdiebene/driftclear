import type { NeighborhoodConfig } from './types';

export interface TrafficCarState {
  id: number;
  style: number; // 0 = Bakery Delivery Van, 1 = Alpine Taxi
  x: number;
  z: number;
  angle: number;
  speed: number;
  maxSpeed: number;
  waypoints: Array<{ x: number; z: number }>;
  wpIndex: number;
  blockedBySnow: boolean;
  waitingForTruck: boolean;
  gratitudeCooldown: number;
  wheelSpin: number;
}

export interface TrafficStepResult {
  lanesFreed: Array<{ id: number; x: number; z: number }>;
}

/**
 * Spawns 2 friendly city vehicles cruising clockwise along the Outer Ring Boulevard.
 */
export function createCityTraffic(config: NeighborhoodConfig): TrafficCarState[] {
  const ring = config.roads.ringCenter;
  const laneOffset = 0.85; // Drive neatly on the right lane of the Outer Ring Boulevard
  const outer = ring + laneOffset;

  const clockwiseLoop: Array<{ x: number; z: number }> = [
    { x: -outer, z: outer },
    { x: -outer, z: -outer },
    { x: outer, z: -outer },
    { x: outer, z: outer },
  ];

  return [
    {
      id: 1,
      style: 0, // Alpine Bakery Delivery Van
      x: -outer,
      z: 0,
      angle: Math.PI, // Heading north (-Z)
      speed: 2.2,
      maxSpeed: 3.4,
      waypoints: clockwiseLoop,
      wpIndex: 1,
      blockedBySnow: false,
      waitingForTruck: false,
      gratitudeCooldown: 0,
      wheelSpin: 0,
    },
    {
      id: 2,
      style: 1, // Cozy Mountain Taxi
      x: outer,
      z: -2,
      angle: 0, // Heading south (+Z)
      speed: 2.4,
      maxSpeed: 3.7,
      waypoints: clockwiseLoop,
      wpIndex: 3,
      blockedBySnow: false,
      waitingForTruck: false,
      gratitudeCooldown: 0,
      wheelSpin: 0,
    },
  ];
}

/**
 * Advances city traffic along the boulevard loop.
 * Vehicles politely yield to the player's snowplow and slow down in deep snow;
 * when the player clears snow directly ahead of a waiting vehicle, it triggers a gratitude bonus!
 */
export function stepCityTraffic(
  cars: TrafficCarState[],
  dt: number,
  truckX: number,
  truckZ: number,
  isDeepSnowAt: (x: number, z: number) => boolean
): TrafficStepResult {
  const lanesFreed: Array<{ id: number; x: number; z: number }> = [];

  for (let i = 0; i < cars.length; i++) {
    const c = cars[i];
    if (c.gratitudeCooldown > 0) {
      c.gratitudeCooldown = Math.max(0, c.gratitudeCooldown - dt);
    }

    const wp = c.waypoints[c.wpIndex];
    const dx = wp.x - c.x;
    const dz = wp.z - c.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 1.2) {
      c.wpIndex = (c.wpIndex + 1) % c.waypoints.length;
    }

    const nextWp = c.waypoints[c.wpIndex];
    const targetAngle = Math.atan2(nextWp.x - c.x, nextWp.z - c.z);
    let diff = targetAngle - c.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    c.angle += Math.sign(diff) * Math.min(Math.abs(diff), 3.2 * dt);

    const fwdX = Math.sin(c.angle);
    const fwdZ = Math.cos(c.angle);

    // Check proximity to player's snowplow ahead or nearby
    const toTruckX = truckX - c.x;
    const toTruckZ = truckZ - c.z;
    const truckDist = Math.hypot(toTruckX, toTruckZ);
    const truckAhead = truckDist < 4.8 && toTruckX * fwdX + toTruckZ * fwdZ > -0.4;
    c.waitingForTruck = truckAhead || truckDist < 2.9;

    // Check if snow blocks the lane right ahead of the vehicle
    const probeX = c.x + fwdX * 2.1;
    const probeZ = c.z + fwdZ * 2.1;
    const snowAhead = isDeepSnowAt(probeX, probeZ);

    // If vehicle was waiting on snow and player is nearby & just cleared its path, celebrate!
    if (c.blockedBySnow && !snowAhead && truckDist < 9.5 && c.gratitudeCooldown <= 0) {
      lanesFreed.push({ id: c.id, x: c.x, z: c.z });
      c.gratitudeCooldown = 14;
    }
    c.blockedBySnow = snowAhead;

    let targetSpeed = c.maxSpeed;
    if (c.waitingForTruck) {
      targetSpeed = 0;
    } else if (snowAhead) {
      targetSpeed = 0.55; // Creeps cautiously through unplowed snow
    }

    const accel = targetSpeed < c.speed ? 6.5 : 3.2;
    c.speed += (targetSpeed - c.speed) * (1 - Math.exp(-accel * dt));

    c.x += fwdX * c.speed * dt;
    c.z += fwdZ * c.speed * dt;
    c.wheelSpin += c.speed * dt * 2.4;
  }

  return { lanesFreed };
}
