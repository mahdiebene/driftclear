import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateShiftStars,
  canUnlockLivery,
  createInitialCareerStats,
  evaluateAchievements,
} from './progression.ts';
import { INITIAL_UPGRADES } from './rules.ts';

test('evaluateAchievements unlocks milestones once and respects already unlocked list', () => {
  const stats = createInitialCareerStats();
  stats.totalTilesCleared = 55;
  stats.icePatchesMelted = 4;
  stats.missionsCompleted = 3;

  const first = evaluateAchievements(stats, INITIAL_UPGRADES, 1200, 4, 42, []);
  const ids = first.map((a) => a.id);
  assert.ok(ids.includes('firstSwath'));
  assert.ok(ids.includes('iceMelter'));
  assert.ok(ids.includes('roadsideHero'));
  assert.ok(ids.includes('comboVirtuoso'));
  assert.ok(!ids.includes('snowKing'));

  // Re-evaluating with those IDs already unlocked should return zero duplicates
  const second = evaluateAchievements(stats, INITIAL_UPGRADES, 1200, 4, 42, ids);
  assert.equal(second.length, 0);
});

test('canUnlockLivery gates custom paints by level and coins', () => {
  assert.equal(canUnlockLivery('crimson', ['crimson'], 0, 1), true);
  assert.equal(canUnlockLivery('cobalt', ['crimson'], 200, 1), false); // needs Lv 2
  assert.equal(canUnlockLivery('cobalt', ['crimson'], 80, 2), false); // needs 120 coins
  assert.equal(canUnlockLivery('cobalt', ['crimson'], 150, 2), true);
});

test('calculateShiftStars awards 0..3 stars based on clearance, time, missions, and combo', () => {
  assert.equal(calculateShiftStars(false, 60, 80, 180, 240, 2, 3), 0);
  assert.equal(calculateShiftStars(true, 80, 80, 310, 240, 0, 1), 1);
  assert.equal(calculateShiftStars(true, 81, 80, 190, 240, 1, 2), 2);
  assert.equal(calculateShiftStars(true, 88, 80, 180, 240, 2, 3), 3);
});
