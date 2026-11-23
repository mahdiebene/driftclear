import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applySaltToPatches,
  checkBlackIceContact,
  createBlackIcePatches,
  evaluateMissionProgress,
  spawnNextMission,
} from './missions.ts';
import { NEIGHBORHOODS, generateSnowGrid } from './rules.ts';

test('createBlackIcePatches generates non-overlapping road patches away from spawn and obstacles', () => {
  for (const cfg of NEIGHBORHOODS) {
    const patches = createBlackIcePatches(cfg);
    assert.ok(patches.length >= 4, `${cfg.name} should have at least 4 black-ice patches`);
    for (const p of patches) {
      assert.ok(
        Math.hypot(p.x - cfg.spawnX, p.z - cfg.spawnZ) >= 5.5,
        'Black-ice patches should not spawn directly on top of player spawn'
      );
      for (const o of cfg.obstacles) {
        const overlaps =
          Math.abs(p.x - o.x) < o.halfW + p.radius * 0.5 &&
          Math.abs(p.z - o.z) < o.halfD + p.radius * 0.5;
        assert.equal(overlaps, false, `Patch ${p.id} overlapped obstacle ${o.id}`);
      }
    }
  }
});

test('checkBlackIceContact and applySaltToPatches melt ice smoothly and stop hazard contact', () => {
  const patches = createBlackIcePatches(NEIGHBORHOODS[0]);
  const target = patches[0];

  const hit = checkBlackIceContact(target.x, target.z, patches);
  assert.ok(hit && hit.id === target.id, 'Truck over unmelted patch should trigger ice contact');

  let meltedIds: number[] = [];
  for (let i = 0; i < 12; i++) {
    meltedIds = meltedIds.concat(applySaltToPatches(target.x, target.z, 0, patches, 0.08));
  }
  assert.ok(meltedIds.includes(target.id), 'Holding salt over ice patch should melt it');
  assert.equal(target.melted, true);
  assert.equal(checkBlackIceContact(target.x, target.z, patches), null, 'Melted ice should no longer trigger slip');
});

test('dispatch missions spawn, track progress, and complete cleanly across types', () => {
  const cfg = NEIGHBORHOODS[0];
  const { cells } = generateSnowGrid(cfg);
  const patches = createBlackIcePatches(cfg);

  // Mission 0: rescueCar
  const rescue = spawnNextMission(cfg, 0, cells, patches, 0, 0);
  assert.equal(rescue.kind, 'rescueCar');
  assert.ok(rescue.target >= 3);

  // Clear snow around the rescue car
  for (const c of cells) {
    if (Math.hypot(c.wx - rescue.x, c.wz - rescue.z) <= rescue.radius) {
      c.kind = 'cleared';
    }
  }
  const rescueRes = evaluateMissionProgress(rescue, cells, 0, 0, rescue.x, rescue.z);
  assert.equal(rescueRes.completed, true);

  // Mission 2: deIce
  const deIce = spawnNextMission(cfg, 2, cells, patches, 0, 0);
  assert.equal(deIce.kind, 'deIce');
  const mid = evaluateMissionProgress(deIce, cells, 0, 1, 0, 0);
  assert.equal(mid.progress, 1);
  const done = evaluateMissionProgress(deIce, cells, 0, deIce.target, 0, 0);
  assert.equal(done.completed, true);

  // Mission 3: driftRush
  const drift = spawnNextMission(cfg, 3, cells, patches, 2, 2);
  assert.equal(drift.kind, 'driftRush');
  const driftDone = evaluateMissionProgress(drift, cells, 2 + drift.target, 2, 0, 0);
  assert.equal(driftDone.completed, true);
});
