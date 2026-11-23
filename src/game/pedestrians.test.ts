import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createCityPedestrians,
  generateSidewalkLoops,
  resolvePedestrianObstacles,
  stepPedestrians,
} from './pedestrians';
import { NEIGHBORHOODS } from './rules';

test('sidewalk loops are generated for every urban block plus the central roundabout plaza', () => {
  for (const cfg of NEIGHBORHOODS) {
    const loops = generateSidewalkLoops(cfg);
    assert.equal(loops.length, cfg.roads.blocks.length + 1);
    for (const loop of loops) {
      assert.ok(loop.length >= 8, `${cfg.name} sidewalk loop should have >= 8 waypoints`);
    }
  }
});

test('city pedestrians spawn cleanly outside all buildings and obstacles across all districts', () => {
  for (const cfg of NEIGHBORHOODS) {
    const arenaHalf = (cfg.gridSize * cfg.cellSize) / 2;
    const peds = createCityPedestrians(cfg, 16);
    assert.equal(peds.length, 16);

    for (const p of peds) {
      assert.ok(Math.abs(p.x) <= arenaHalf - 0.8, `${cfg.name} ped ${p.id} out of X bounds`);
      assert.ok(Math.abs(p.z) <= arenaHalf - 0.8, `${cfg.name} ped ${p.id} out of Z bounds`);
      for (const o of cfg.obstacles) {
        const insideX = Math.abs(p.x - o.x) < o.halfW;
        const insideZ = Math.abs(p.z - o.z) < o.halfD;
        assert.equal(
          insideX && insideZ,
          false,
          `${cfg.name} ped ${p.id} spawned inside obstacle ${o.id}`
        );
      }
    }
  }
});

test('pedestrians advance along sidewalks, animate walkPhase, and never clip buildings', () => {
  const cfg = NEIGHBORHOODS[0];
  const arenaHalf = (cfg.gridSize * cfg.cellSize) / 2;
  const peds = createCityPedestrians(cfg, 14);
  const initialPositions = peds.map((p) => ({ x: p.x, z: p.z, phase: p.walkPhase }));

  // Simulate 3 seconds of strolling with the snowplow parked far away
  for (let step = 0; step < 60; step++) {
    stepPedestrians(peds, 0.05, 0, 18, cfg.obstacles, arenaHalf);
  }

  let movedCount = 0;
  for (let i = 0; i < peds.length; i++) {
    const p = peds[i];
    const d = Math.hypot(p.x - initialPositions[i].x, p.z - initialPositions[i].z);
    if (d > 0.5 && p.walkPhase > initialPositions[i].phase + 1.0) {
      movedCount++;
    }
    for (const o of cfg.obstacles) {
      const insideX = Math.abs(p.x - o.x) < o.halfW;
      const insideZ = Math.abs(p.z - o.z) < o.halfD;
      assert.equal(
        insideX && insideZ,
        false,
        `ped ${p.id} clipped obstacle ${o.id} after walking`
      );
    }
  }
  assert.ok(movedCount >= 12, 'Almost all pedestrians should visibly walk along sidewalks');
});

test('pedestrians politely step aside and wave when the snowplow approaches', () => {
  const cfg = NEIGHBORHOODS[0];
  const arenaHalf = (cfg.gridSize * cfg.cellSize) / 2;
  const peds = createCityPedestrians(cfg, 4);
  const p = peds[0];

  // Park snowplow directly beside pedestrian
  const truckX = p.x + 1.4;
  const truckZ = p.z;
  for (let step = 0; step < 25; step++) {
    stepPedestrians(peds, 0.05, truckX, truckZ, cfg.obstacles, arenaHalf);
  }

  assert.ok(p.waveAmount > 0.75, 'Nearby pedestrian should raise arm to wave at snowplow');
  assert.ok(
    Math.hypot(p.x - truckX, p.z - truckZ) >= 2.2,
    'Pedestrian should step safely clear of snowplow'
  );
});

test('resolvePedestrianObstacles pushes points cleanly outside obstacles', () => {
  const cfg = NEIGHBORHOODS[0];
  const tower = cfg.obstacles.find((o) => o.kind === 'tower')!;
  const pushed = resolvePedestrianObstacles(tower.x + 0.2, tower.z + 0.1, cfg.obstacles, 22);
  const insideX = Math.abs(pushed.x - tower.x) < tower.halfW;
  const insideZ = Math.abs(pushed.z - tower.z) < tower.halfD;
  assert.equal(insideX && insideZ, false);
});
