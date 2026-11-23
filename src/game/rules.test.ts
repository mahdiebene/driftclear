import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_UPGRADES,
  MAX_BERM_BOOST,
  NEIGHBORHOODS,
  accumulatePlowBerm,
  addExperience,
  advanceComboOnClear,
  calculateCellReward,
  calculateClearedPercent,
  canPurchaseUpgrade,
  checkShiftOutcome,
  findCellsInPlowBlade,
  generateSnowGrid,
  getComboTier,
  getDriverRank,
  getNextUpgradeCost,
  getTruckStats,
  getXpRequiredForLevel,
  purchaseUpgrade,
  resolveTruckCollisions,
  stepSnowClearingAnim,
  tickComboTimer,
} from './rules';

test('upgrade purchase deducts coins or spends free skill point and increases truck stats', () => {
  const baseStats = getTruckStats(INITIAL_UPGRADES);
  const cost = getNextUpgradeCost('bladeWidth', 1);
  assert.ok(cost !== null && cost > 0);
  assert.equal(canPurchaseUpgrade('bladeWidth', INITIAL_UPGRADES, cost - 1, 0), false);
  assert.equal(canPurchaseUpgrade('bladeWidth', INITIAL_UPGRADES, cost, 0), true);
  assert.equal(canPurchaseUpgrade('bladeWidth', INITIAL_UPGRADES, 0, 1), true);

  // Free upgrade point spends SP instead of coins
  const spRes = purchaseUpgrade('bladeWidth', INITIAL_UPGRADES, 10, 1);
  assert.equal(spRes.purchased, true);
  assert.equal(spRes.usedSkillPoint, true);
  assert.equal(spRes.skillPoints, 0);
  assert.equal(spRes.coins, 10);
  assert.equal(spRes.upgrades.bladeWidth, 2);

  // Coin purchase deducts coins
  const nextCost = getNextUpgradeCost('bladeWidth', 2)!;
  const coinRes = purchaseUpgrade('bladeWidth', spRes.upgrades, nextCost + 25, 0);
  assert.equal(coinRes.purchased, true);
  assert.equal(coinRes.usedSkillPoint, false);
  assert.equal(coinRes.coins, 25);
  assert.equal(coinRes.upgrades.bladeWidth, 3);

  const upgradedStats = getTruckStats(coinRes.upgrades);
  assert.ok(upgradedStats.bladeWidth > baseStats.bladeWidth);
});

test('driver XP progression levels up smoothly and awards skill points and bonus coins', () => {
  const needed1 = getXpRequiredForLevel(1);
  const res1 = addExperience(1, 0, needed1 + 20);
  assert.equal(res1.level, 2);
  assert.equal(res1.levelsGained, 1);
  assert.equal(res1.skillPointsEarned, 1);
  assert.ok(res1.bonusCoins > 0);
  assert.equal(res1.xp, 20);

  // Multi-level jump works cleanly
  const big = addExperience(1, 0, 500);
  assert.ok(big.level >= 3);
  assert.equal(big.skillPointsEarned, big.levelsGained);
  assert.equal(big.rank, getDriverRank(big.level));
});

test('heated blade reduces snowdrift slowdown down to zero at high level', () => {
  const lv1 = getTruckStats(INITIAL_UPGRADES);
  const lv8 = getTruckStats({ ...INITIAL_UPGRADES, heatedBlade: 8 });
  assert.ok(lv1.driftSlowdown > 0.3);
  assert.equal(lv8.driftSlowdown, 0);
  assert.equal(lv8.heatedGlow, 1);
});

test('combo multiplier climbs through tiers and decays after timer expires', () => {
  assert.equal(getComboTier(0).multiplier, 1);
  assert.equal(getComboTier(8).multiplier, 2);
  assert.equal(getComboTier(24).multiplier, 3);
  assert.equal(getComboTier(50).multiplier, 4);
  assert.equal(getComboTier(90).multiplier, 5);

  const combo = { count: 0, multiplier: 1, tierLabel: '', timer: 0, maxTimer: 3.0 };
  const step1 = advanceComboOnClear(combo, 8, 0, 3.0);
  assert.equal(step1.tieredUp, true);
  assert.equal(step1.next.multiplier, 2);
  assert.equal(step1.next.timer, 3.0);

  const mid = tickComboTimer(step1.next, 1.5);
  assert.equal(mid.count, 8);
  assert.equal(mid.timer, 1.5);

  const expired = tickComboTimer(mid, 1.6);
  assert.equal(expired.count, 0);
  assert.equal(expired.multiplier, 1);
});

test('cell rewards scale with combo multiplier, coin charm, and grant XP', () => {
  const r1 = calculateCellReward('snow', 1, 1.0, 1.0);
  const r3 = calculateCellReward('snow', 3, 1.4, 1.4);
  const drift = calculateCellReward('drift', 2, 1.0, 1.0);
  const golden = calculateCellReward('golden', 2, 1.0, 1.0);

  assert.ok(r3.coins > r1.coins);
  assert.ok(r3.xp > r1.xp);
  assert.ok(r3.score === r1.score * 3);
  assert.ok(drift.coins > r1.coins && drift.xp > r1.xp);
  assert.ok(golden.coins > drift.coins && golden.xp > drift.xp);
  assert.equal(golden.bonusStreak, 10);
});

test('expanded big town maps have open spawn aprons, rich snow cover, and golden drifts', () => {
  for (const cfg of NEIGHBORHOODS) {
    assert.ok(cfg.gridSize >= 44, `${cfg.name} should be an expanded big town map`);
    const { cells, totalSnowTiles } = generateSnowGrid(cfg);
    assert.ok(totalSnowTiles > 1100, `${cfg.name} should have large explorable snow area`);

    // Verify spawn point is clear of obstacles
    const spawnCol = resolveTruckCollisions(cfg.spawnX, cfg.spawnZ, 1.05, cfg.obstacles, cfg.gridSize / 2);
    assert.equal(spawnCol.collided, false, `${cfg.name} spawn must not overlap obstacles`);

    const goldenCells = cells.filter((c) => c.kind === 'golden');
    assert.equal(goldenCells.length, cfg.goldenCount);
  }
});

test('plow blade sweep detects snow cells directly ahead of truck and expands with snowBlower', () => {
  const cfg = NEIGHBORHOODS[0];
  const { cells } = generateSnowGrid(cfg);
  // Move truck just north of cleared spawn apron facing north (-Z, angle = Math.PI)
  const baseHits = findCellsInPlowBlade(cells, cfg.gridSize, cfg.cellSize, 0, cfg.spawnZ - 2.6, Math.PI, 2.6, 1.2, 0);
  const widerHits = findCellsInPlowBlade(cells, cfg.gridSize, cfg.cellSize, 0, cfg.spawnZ - 2.6, Math.PI, 2.6, 1.2, 1.2);
  assert.ok(baseHits.length >= 2, 'Blade should sweep multiple snow tiles ahead');
  assert.ok(widerHits.length > baseHits.length, 'Snow blower reach should clear extra surrounding tiles');
});

test('real city districts have road networks, urban landmarks, and zero overlapping obstacles', () => {
  for (const cfg of NEIGHBORHOODS) {
    const arenaHalf = (cfg.gridSize * cfg.cellSize) / 2;
    assert.ok(cfg.roads.mainAveHalfW >= 3.5, `${cfg.name} should have a wide Main Avenue`);
    assert.ok(cfg.roads.blocks.length >= 4, `${cfg.name} should have 4+ urban city blocks`);
    assert.ok(cfg.obstacles.some((o) => o.kind === 'townhouse'), `${cfg.name} should have multi-story townhouses`);
    assert.ok(cfg.obstacles.some((o) => o.kind === 'cafe'), `${cfg.name} should have a corner bakery café`);
    assert.ok(cfg.obstacles.some((o) => o.kind === 'parkedCar'), `${cfg.name} should have snow-dusted parked cars`);
    assert.ok(cfg.obstacles.some((o) => o.kind === 'garage'), `${cfg.name} should have a municipal plow depot`);
    assert.ok(cfg.obstacles.some((o) => o.kind === 'tower'), `${cfg.name} should have a central clock tower`);

    for (let i = 0; i < cfg.obstacles.length; i++) {
      const a = cfg.obstacles[i];
      // Must sit cleanly inside the stone city wall perimeter with generous margin
      assert.ok(
        Math.abs(a.x) + a.halfW <= arenaHalf - 1.2,
        `${cfg.name} obstacle ${a.id} clips X city wall`
      );
      assert.ok(
        Math.abs(a.z) + a.halfD <= arenaHalf - 1.2,
        `${cfg.name} obstacle ${a.id} clips Z city wall`
      );
      for (let j = i + 1; j < cfg.obstacles.length; j++) {
        const b = cfg.obstacles[j];
        // Clean non-overlapping clearance between urban buildings/street furniture (>= 0.45m)
        const overlapX = Math.abs(a.x - b.x) < a.halfW + b.halfW + 0.45;
        const overlapZ = Math.abs(a.z - b.z) < a.halfD + b.halfD + 0.45;
        assert.equal(
          overlapX && overlapZ,
          false,
          `${cfg.name} obstacles ${a.id} and ${b.id} overlap or sit too close`
        );
      }
    }
  }
});

test('shift progress and victory outcomes work cleanly', () => {
  assert.equal(calculateClearedPercent(80, 100), 80);
  assert.equal(checkShiftOutcome({ clearedPercent: 79, targetPercent: 80 }), 'ongoing');
  assert.equal(checkShiftOutcome({ clearedPercent: 80, targetPercent: 80 }), 'victory');
});

test('stepSnowClearingAnim smoothly transitions clearAnim from 1 to 0 over time', () => {
  const cfg = NEIGHBORHOODS[0];
  const { cells } = generateSnowGrid(cfg);
  const targetIdx = cells.findIndex((c) => c.kind === 'snow');
  assert.ok(targetIdx >= 0);

  cells[targetIdx].kind = 'cleared';
  const step1 = stepSnowClearingAnim(cells, [targetIdx], 0.1, 4.0);
  assert.equal(step1.stillAnimating.length, 1);
  assert.ok(cells[targetIdx].clearAnim > 0.5 && cells[targetIdx].clearAnim < 0.7);

  const step2 = stepSnowClearingAnim(cells, step1.stillAnimating, 0.25, 4.0);
  assert.equal(step2.stillAnimating.length, 0);
  assert.equal(cells[targetIdx].clearAnim, 0);
});

test('accumulatePlowBerm mounds adjacent untouched snowbanks without exceeding clamp', () => {
  const cfg = NEIGHBORHOODS[0];
  const { cells } = generateSnowGrid(cfg);
  const cell = cells.find((c) => {
    if (c.kind !== 'snow' || c.gx >= cfg.gridSize - 2) return false;
    const right = cells[c.gz * cfg.gridSize + (c.gx + 1)];
    return right && right.kind === 'snow';
  });
  assert.ok(cell);

  const rightIdx = cell.gz * cfg.gridSize + (cell.gx + 1);
  const modified = accumulatePlowBerm(cells, cfg.gridSize, cell.gx, cell.gz, 1, 0, 0.15);
  assert.ok(modified.includes(rightIdx));
  assert.ok(cells[rightIdx].bermBoost > 0);

  for (let i = 0; i < 6; i++) {
    accumulatePlowBerm(cells, cfg.gridSize, cell.gx, cell.gz, 1, 0, 0.15);
  }
  assert.equal(cells[rightIdx].bermBoost, MAX_BERM_BOOST);
});
