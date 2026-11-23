import assert from 'node:assert/strict';
import test from 'node:test';
import {
  WEATHER_CYCLE_ORDER,
  WEATHER_PROFILES,
  computeTractionStep,
  createWeatherState,
  cycleNextWeather,
  setTargetWeather,
  stepWeatherState,
} from './weather.ts';

test('createWeatherState initializes cleanly with exact profile values', () => {
  const state = createWeatherState('light');
  assert.equal(state.target, 'light');
  assert.equal(state.current.fogFar, WEATHER_PROFILES.light.fogFar);
  assert.equal(state.current.snowDensity, WEATHER_PROFILES.light.snowDensity);
  assert.equal(state.current.tractionPercent, WEATHER_PROFILES.light.tractionPercent);
});

test('weather profiles preserve clear > light > blizzard visibility and traction ordering', () => {
  const clear = WEATHER_PROFILES.clear;
  const light = WEATHER_PROFILES.light;
  const blizzard = WEATHER_PROFILES.blizzard;

  assert.ok(clear.fogNear > light.fogNear && light.fogNear > blizzard.fogNear);
  assert.ok(clear.fogFar > light.fogFar && light.fogFar > blizzard.fogFar);

  assert.ok(clear.snowDensity < light.snowDensity && light.snowDensity < blizzard.snowDensity);
  assert.ok(blizzard.windX > light.windX && light.windX > clear.windX);

  assert.ok(clear.accelMult > light.accelMult && light.accelMult > blizzard.accelMult);
  assert.ok(clear.decelMult > light.decelMult && light.decelMult > blizzard.decelMult);
  assert.ok(clear.turnMult > light.turnMult && light.turnMult > blizzard.turnMult);
  assert.ok(clear.tractionPercent > light.tractionPercent && light.tractionPercent > blizzard.tractionPercent);
});

test('stepWeatherState auto-cycles smoothly through light -> blizzard -> clear -> light', () => {
  const state = createWeatherState('light');
  const seenTargets: string[] = [state.target];

  // Simulate 115 seconds in 0.5s increments to cover a full 3-state cycle
  for (let t = 0; t < 230; t++) {
    const res = stepWeatherState(state, 0.5, true);
    if (res.changed) {
      seenTargets.push(res.newTarget);
      assert.ok(res.callout.length > 0, 'weather transitions should emit a callout message');
    }
  }

  assert.deepEqual(seenTargets.slice(0, 4), ['light', 'blizzard', 'clear', 'light']);
});

test('weather transitions blend gradually without instant jumps', () => {
  const state = createWeatherState('clear');
  setTargetWeather(state, 'blizzard', 0.6);

  const startFogFar = WEATHER_PROFILES.clear.fogFar;
  const targetFogFar = WEATHER_PROFILES.blizzard.fogFar;

  // Step 0.5 seconds: should be strictly midway, neither untouched nor snapped
  stepWeatherState(state, 0.5, false);
  assert.ok(
    state.current.fogFar < startFogFar - 5 && state.current.fogFar > targetFogFar + 5,
    `Expected gradual fog blend, got ${state.current.fogFar}`
  );
  assert.ok(
    state.current.snowDensity > WEATHER_PROFILES.clear.snowDensity + 0.05 &&
      state.current.snowDensity < WEATHER_PROFILES.blizzard.snowDensity - 0.05,
    `Expected gradual snow density blend, got ${state.current.snowDensity}`
  );

  // Step 12 more seconds: should converge closely to blizzard target
  for (let i = 0; i < 60; i++) {
    stepWeatherState(state, 0.2, false);
  }
  assert.ok(Math.abs(state.current.fogFar - targetFogFar) < 0.5);
  assert.ok(Math.abs(state.current.tractionPercent - WEATHER_PROFILES.blizzard.tractionPercent) < 0.5);
});

test('cycleNextWeather wraps cleanly through WEATHER_CYCLE_ORDER', () => {
  const state = createWeatherState(WEATHER_CYCLE_ORDER[0]);
  const order: string[] = [state.target];
  for (let i = 0; i < WEATHER_CYCLE_ORDER.length; i++) {
    const res = cycleNextWeather(state);
    assert.equal(res.changed, true);
    order.push(res.newTarget);
  }
  assert.deepEqual(order, ['light', 'blizzard', 'clear', 'light']);
});

test('computeTractionStep produces reduced acceleration, wider turns, and icier coasting in heavy blizzard vs clear skies', () => {
  // 1. Acceleration from rest over 0.4s
  let clearVx = 0;
  let clearVz = 0;
  let blizVx = 0;
  let blizVz = 0;
  for (let i = 0; i < 8; i++) {
    const c = computeTractionStep({
      vx: clearVx,
      vz: clearVz,
      angle: 0,
      hasInput: true,
      inputX: 0,
      inputZ: 1,
      isBoosting: false,
      baseSpeedCap: 10,
      baseTurnSpeed: 5,
      weather: WEATHER_PROFILES.clear,
      dt: 0.05,
    });
    clearVx = c.vx;
    clearVz = c.vz;

    const b = computeTractionStep({
      vx: blizVx,
      vz: blizVz,
      angle: 0,
      hasInput: true,
      inputX: 0,
      inputZ: 1,
      isBoosting: false,
      baseSpeedCap: 10,
      baseTurnSpeed: 5,
      weather: WEATHER_PROFILES.blizzard,
      dt: 0.05,
    });
    blizVx = b.vx;
    blizVz = b.vz;
  }
  assert.ok(
    Math.hypot(clearVx, clearVz) > Math.hypot(blizVx, blizVz) + 1.2,
    'Clear skies should accelerate significantly quicker than heavy blizzard'
  );

  // 2. Coasting / braking slide when releasing throttle from 10 m/s over 0.4s
  let coastClearVz = 10;
  let coastBlizVz = 10;
  for (let i = 0; i < 8; i++) {
    coastClearVz = computeTractionStep({
      vx: 0,
      vz: coastClearVz,
      angle: 0,
      hasInput: false,
      inputX: 0,
      inputZ: 0,
      isBoosting: false,
      baseSpeedCap: 10,
      baseTurnSpeed: 5,
      weather: WEATHER_PROFILES.clear,
      dt: 0.05,
    }).vz;

    coastBlizVz = computeTractionStep({
      vx: 0,
      vz: coastBlizVz,
      angle: 0,
      hasInput: false,
      inputX: 0,
      inputZ: 0,
      isBoosting: false,
      baseSpeedCap: 10,
      baseTurnSpeed: 5,
      weather: WEATHER_PROFILES.blizzard,
      dt: 0.05,
    }).vz;
  }
  assert.ok(
    coastBlizVz > coastClearVz + 2.0,
    'Heavy blizzard should glide significantly farther on ice when lifting off throttle'
  );

  // 3. Sharp 90-degree turn from full speed: blizzard yields slower heading turn & higher lateral drift slip
  const turnClear = computeTractionStep({
    vx: 0,
    vz: 10,
    angle: 0,
    hasInput: true,
    inputX: 1,
    inputZ: 0,
    isBoosting: false,
    baseSpeedCap: 10,
    baseTurnSpeed: 5,
    weather: WEATHER_PROFILES.clear,
    dt: 0.1,
  });
  const turnBliz = computeTractionStep({
    vx: 0,
    vz: 10,
    angle: 0,
    hasInput: true,
    inputX: 1,
    inputZ: 0,
    isBoosting: false,
    baseSpeedCap: 10,
    baseTurnSpeed: 5,
    weather: WEATHER_PROFILES.blizzard,
    dt: 0.1,
  });
  assert.ok(turnClear.angle > turnBliz.angle, 'Clear skies should turn tighter than heavy blizzard');
  assert.ok(turnBliz.lateralSlip > 0, 'Turning at speed produces measurable lateral slip');
});
