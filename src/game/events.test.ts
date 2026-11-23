import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BLOOM_PROFILES,
  VEHICLES,
  applyAvalancheImpact,
  applyVehicleToStats,
  canUnlockVehicle,
  collectNearbyPickups,
  cycleTimeOfDay,
  dampBloomParams,
  findCellsInBlastRadius,
  getTargetBloomParams,
  spawnAmbulanceEscort,
  spawnAvalancheEvent,
  spawnRoadPickups,
  stepAmbulanceEscort,
  stepBlastCharge,
  stepFuelSystem,
} from './events';
import { INITIAL_UPGRADES, NEIGHBORHOODS, generateSnowGrid, getTruckStats } from './rules';

test('vehicle fleet unlocks respect level/coins and apply vehicle stats accurately', () => {
  assert.equal(VEHICLES.length, 3);
  assert.equal(canUnlockVehicle('ranger', ['ranger'], 999, 10), false);
  assert.equal(canUnlockVehicle('unimog', ['ranger'], 100, 1), false);
  assert.equal(canUnlockVehicle('unimog', ['ranger'], 300, 2), true);
  assert.equal(canUnlockVehicle('snocat', ['ranger'], 600, 4), true);

  const base = getTruckStats(INITIAL_UPGRADES);
  const snocatStats = applyVehicleToStats(base, 'snocat');
  assert.ok(snocatStats.bladeWidth > base.bladeWidth * 1.3);
  assert.ok(snocatStats.driftSlowdown < base.driftSlowdown * 0.25);
});

test('fuel system drains smoothly when driving/boosting and refills at service bay', () => {
  const driven = stepFuelSystem(1.0, 1.0, false, false, 1.0, 10);
  const boosted = stepFuelSystem(1.0, 1.0, true, false, 1.0, 10);
  assert.ok(driven.fuel < 1.0);
  assert.ok(boosted.fuel < driven.fuel);
  assert.equal(driven.lowFuel, false);

  const low = stepFuelSystem(0.2, 0.5, false, false, 1.0, 1);
  assert.equal(low.lowFuel, true);

  const refilled = stepFuelSystem(0.85, 0, false, true, 1.0, 0.5);
  assert.ok(refilled.fuel >= 0.94);
  assert.equal(refilled.refueledNow, true);
});

test('thermal snow-blast charges from clearing snow and detects circular blast radius', () => {
  const charge1 = stepBlastCharge(0, 10, true, 0.5, 1.0);
  assert.ok(charge1 > 0.15 && charge1 < 1.0);

  const config = NEIGHBORHOODS[0];
  const { cells } = generateSnowGrid(config);
  const blastHits = findCellsInBlastRadius(cells, config.gridSize, config.cellSize, 0, 5, 4.5);
  assert.ok(blastHits.length > 10);
  for (const idx of blastHits) {
    const c = cells[idx];
    assert.ok(Math.hypot(c.wx - 0, c.wz - 5) <= 4.501);
  }
});

test('emergency ambulance slows when snow blocks road and advances cleanly when cleared', () => {
  const config = NEIGHBORHOODS[0];
  const { cells } = generateSnowGrid(config);
  const amb = spawnAmbulanceEscort(config);
  assert.equal(amb.active, true);

  // Clear all snow along the entire map -> ambulance should cruise swiftly toward destination
  for (const c of cells) {
    if (c.kind === 'snow' || c.kind === 'drift' || c.kind === 'golden') {
      c.kind = 'cleared';
      c.clearAnim = 0;
    }
  }

  let rescued = false;
  for (let i = 0; i < 600; i++) {
    const res = stepAmbulanceEscort(amb, cells, config.gridSize, config.cellSize, -20, 20, 0.05);
    if (res.status === 'rescued') {
      rescued = true;
      break;
    }
  }
  assert.equal(rescued, true);
  assert.equal(amb.active, false);
});

test('avalanche event telegraphs away from player and dumps fresh mega-drift on impact', () => {
  const config = NEIGHBORHOODS[0];
  const { cells } = generateSnowGrid(config);
  const ev = spawnAvalancheEvent(config, 1, 0, 13.8);
  assert.equal(ev.state, 'telegraph');
  assert.ok(Math.hypot(ev.x - 0, ev.z - 13.8) >= 6.5);

  // Clear cells around avalanche target first
  for (const c of cells) {
    if (Math.hypot(c.wx - ev.x, c.wz - ev.z) <= ev.radius && c.initialKind !== 'none') {
      c.kind = 'cleared';
      c.clearAnim = 0;
    }
  }

  const impact = applyAvalancheImpact(ev, cells, config.gridSize, config.cellSize);
  assert.equal(ev.state, 'impacted');
  assert.ok(impact.modifiedIndices.length > 0);
  assert.ok(impact.addedSnowTiles > 0);
});

test('road supply pickups spawn outside obstacles and collect when truck drives near', () => {
  const config = NEIGHBORHOODS[0];
  const pickups = spawnRoadPickups(config, 6);
  assert.ok(pickups.length >= 4);

  const first = pickups[0];
  const none = collectNearbyPickups(pickups, first.x + 10, first.z + 10, 2.0);
  assert.equal(none.length, 0);

  const got = collectNearbyPickups(pickups, first.x + 0.5, first.z - 0.5, 2.0);
  assert.equal(got.length, 1);
  assert.equal(first.collected, true);
});

test('time of day cycles day -> sunset -> night -> day', () => {
  assert.equal(cycleTimeOfDay('day'), 'sunset');
  assert.equal(cycleTimeOfDay('sunset'), 'night');
  assert.equal(cycleTimeOfDay('night'), 'day');
});

test('bloom profiles ramp strength and radius for cozy night scenes while protecting daytime snow', () => {
  assert.ok(BLOOM_PROFILES.night.strength > BLOOM_PROFILES.sunset.strength);
  assert.ok(BLOOM_PROFILES.sunset.strength > BLOOM_PROFILES.day.strength);
  assert.ok(BLOOM_PROFILES.night.radius > BLOOM_PROFILES.day.radius);
  assert.ok(BLOOM_PROFILES.day.threshold >= 0.88);
  assert.ok(BLOOM_PROFILES.night.threshold < BLOOM_PROFILES.sunset.threshold);

  const clearNight = getTargetBloomParams('night', 'clear');
  const blizzardNight = getTargetBloomParams('night', 'blizzard');
  assert.ok(blizzardNight.radius > clearNight.radius);
  assert.ok(blizzardNight.strength >= clearNight.strength);
});

test('dampBloomParams blends smoothly without jumping or overshooting', () => {
  const cur = { ...BLOOM_PROFILES.day };
  const target = getTargetBloomParams('night', 'light');
  dampBloomParams(cur, target, 0.1);
  assert.ok(cur.strength > BLOOM_PROFILES.day.strength && cur.strength < target.strength);
  assert.ok(cur.threshold < BLOOM_PROFILES.day.threshold && cur.threshold > target.threshold);

  for (let i = 0; i < 60; i++) {
    dampBloomParams(cur, target, 0.05);
  }
  assert.ok(Math.abs(cur.strength - target.strength) < 0.005);
  assert.ok(Math.abs(cur.radius - target.radius) < 0.005);
  assert.ok(Math.abs(cur.threshold - target.threshold) < 0.005);
});
