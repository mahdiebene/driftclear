import assert from 'node:assert/strict';
import test from 'node:test';
import { NEIGHBORHOODS } from './rules.ts';
import { createCityTraffic, stepCityTraffic } from './traffic.ts';

test('city traffic vehicles cruise along outer ring, yield to player plow, and reward cleared lanes', () => {
  const cars = createCityTraffic(NEIGHBORHOODS[0]);
  assert.equal(cars.length, 2);

  const startX = cars[0].x;
  const startZ = cars[0].z;

  // Cruise freely with no snow and player far away
  for (let i = 0; i < 20; i++) {
    stepCityTraffic(cars, 0.1, 100, 100, () => false);
  }
  assert.ok(
    Math.hypot(cars[0].x - startX, cars[0].z - startZ) > 2.5,
    'Traffic vehicle should advance along boulevard when road is clear'
  );

  // Place player right in front of car 0: car should yield and slow near zero
  const fwdX = Math.sin(cars[0].angle);
  const fwdZ = Math.cos(cars[0].angle);
  for (let i = 0; i < 25; i++) {
    stepCityTraffic(cars, 0.1, cars[0].x + fwdX * 2.4, cars[0].z + fwdZ * 2.4, () => false);
  }
  assert.equal(cars[0].waitingForTruck, true);
  assert.ok(cars[0].speed < 0.3, 'Vehicle should brake politely when snowplow is directly ahead');

  // Snow blocks lane, then player clears it nearby -> triggers gratitude bonus!
  stepCityTraffic(cars, 0.1, cars[0].x + 5, cars[0].z, () => true);
  assert.equal(cars[0].blockedBySnow, true);
  const freed = stepCityTraffic(cars, 0.1, cars[0].x + 5, cars[0].z, () => false);
  assert.ok(
    freed.lanesFreed.some((f) => f.id === cars[0].id),
    'Clearing snow directly ahead of a waiting city vehicle should trigger lane-freed gratitude reward'
  );
});
