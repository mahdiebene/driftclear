import type { WeatherKind } from './types';

export type WeatherRgb = [number, number, number];

export interface WeatherParams {
  skyColor: WeatherRgb;
  fogNear: number;
  fogFar: number;
  keyLightIntensity: number;
  keyLightColor: WeatherRgb;
  hemiIntensity: number;
  rimIntensity: number;
  headlightGlow: number;
  snowDensity: number; // 0..1 fraction of ambient snowflake pool active
  fallSpeed: number; // multiplier on snowflake downward velocity
  windX: number; // world-space horizontal wind velocity X (m/s)
  windZ: number; // world-space horizontal wind velocity Z (m/s)
  flakeStreak: number; // Z stretch factor for slanted wind-driven snow streaks
  flakeOpacity: number; // 0..1 material opacity
  accelMult: number; // plow acceleration & lateral grip response multiplier
  decelMult: number; // plow braking/coasting deceleration multiplier (lower = icier glide)
  turnMult: number; // plow steering turn rate multiplier
  maxSpeedMult: number; // headwind / packed snow top-speed multiplier
  crosswindForce: number; // subtle wind drift acceleration while moving on icy roads
  tractionPercent: number; // 0..100 HUD grip readout
  breezeIntensity: number; // 0..1 soothing audio wind ambience level
}

export interface WeatherProfile extends WeatherParams {
  kind: WeatherKind;
  label: string;
  callout: string;
  durationSeconds: number;
}

export const WEATHER_CYCLE_ORDER: readonly WeatherKind[] = ['light', 'blizzard', 'clear'];

export const WEATHER_PROFILES: Record<WeatherKind, WeatherProfile> = {
  clear: {
    kind: 'clear',
    label: 'Clear Skies',
    callout: 'Clear Skies — crisp visibility & full winter grip',
    durationSeconds: 36,
    skyColor: [0.47, 0.66, 0.86], // Crisp sunlit alpine sky (#78a8db)
    fogNear: 96,
    fogFar: 215,
    keyLightIntensity: 1.78,
    keyLightColor: [1.0, 0.92, 0.74],
    hemiIntensity: 0.86,
    rimIntensity: 0.42,
    headlightGlow: 1.1,
    snowDensity: 0.03,
    fallSpeed: 0.82,
    windX: 0.45,
    windZ: -0.25,
    flakeStreak: 1.0,
    flakeOpacity: 0.45,
    accelMult: 1.12,
    decelMult: 1.18,
    turnMult: 1.05,
    maxSpeedMult: 1.04,
    crosswindForce: 0.0,
    tractionPercent: 100,
    breezeIntensity: 0.14,
  },
  light: {
    kind: 'light',
    label: 'Light Snowfall',
    callout: 'Light Snowfall — cozy drifting flurries',
    durationSeconds: 34,
    skyColor: [0.32, 0.43, 0.57], // Cozy alpine blue-hour (#526e91)
    fogNear: 58,
    fogFar: 138,
    keyLightIntensity: 1.46,
    keyLightColor: [1.0, 0.85, 0.63],
    hemiIntensity: 0.72,
    rimIntensity: 0.45,
    headlightGlow: 2.0,
    snowDensity: 0.40,
    fallSpeed: 1.35,
    windX: 1.35,
    windZ: -0.65,
    flakeStreak: 1.08,
    flakeOpacity: 0.84,
    accelMult: 1.0,
    decelMult: 1.0,
    turnMult: 1.0,
    maxSpeedMult: 1.0,
    crosswindForce: 0.0,
    tractionPercent: 88,
    breezeIntensity: 0.35,
  },
  blizzard: {
    kind: 'blizzard',
    label: 'Heavy Blizzard',
    callout: 'Heavy Blizzard — low visibility & icy traction!',
    durationSeconds: 32,
    skyColor: [0.68, 0.77, 0.86], // Luminous cold storm whiteout mist (#adc4db)
    fogNear: 30,
    fogFar: 66,
    keyLightIntensity: 0.78,
    keyLightColor: [0.76, 0.86, 0.98],
    hemiIntensity: 0.90,
    rimIntensity: 0.58,
    headlightGlow: 3.8,
    snowDensity: 1.0,
    fallSpeed: 3.1,
    windX: 12.0,
    windZ: -6.8,
    flakeStreak: 3.4,
    flakeOpacity: 0.96,
    accelMult: 0.56,
    decelMult: 0.36,
    turnMult: 0.78,
    maxSpeedMult: 0.90,
    crosswindForce: 0.42,
    tractionPercent: 54,
    breezeIntensity: 1.0,
  },
};

export interface WeatherState {
  target: WeatherKind;
  timeUntilNext: number;
  blendRate: number;
  current: WeatherParams;
}

export interface WeatherStepResult {
  changed: boolean;
  newTarget: WeatherKind;
  callout: string;
}

function cloneParams(p: WeatherParams): WeatherParams {
  return {
    skyColor: [p.skyColor[0], p.skyColor[1], p.skyColor[2]],
    fogNear: p.fogNear,
    fogFar: p.fogFar,
    keyLightIntensity: p.keyLightIntensity,
    keyLightColor: [p.keyLightColor[0], p.keyLightColor[1], p.keyLightColor[2]],
    hemiIntensity: p.hemiIntensity,
    rimIntensity: p.rimIntensity,
    headlightGlow: p.headlightGlow,
    snowDensity: p.snowDensity,
    fallSpeed: p.fallSpeed,
    windX: p.windX,
    windZ: p.windZ,
    flakeStreak: p.flakeStreak,
    flakeOpacity: p.flakeOpacity,
    accelMult: p.accelMult,
    decelMult: p.decelMult,
    turnMult: p.turnMult,
    maxSpeedMult: p.maxSpeedMult,
    crosswindForce: p.crosswindForce,
    tractionPercent: p.tractionPercent,
    breezeIntensity: p.breezeIntensity,
  };
}

function lerpNum(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRgb(cur: WeatherRgb, dst: WeatherRgb, t: number): void {
  cur[0] += (dst[0] - cur[0]) * t;
  cur[1] += (dst[1] - cur[1]) * t;
  cur[2] += (dst[2] - cur[2]) * t;
}

export function createWeatherState(initial: WeatherKind = 'light'): WeatherState {
  const profile = WEATHER_PROFILES[initial];
  return {
    target: initial,
    timeUntilNext: profile.durationSeconds,
    blendRate: 0.48,
    current: cloneParams(profile),
  };
}

export function setTargetWeather(
  state: WeatherState,
  kind: WeatherKind,
  blendRate = 1.65
): WeatherStepResult {
  const profile = WEATHER_PROFILES[kind];
  const changed = state.target !== kind;
  state.target = kind;
  state.timeUntilNext = profile.durationSeconds;
  state.blendRate = blendRate;
  return {
    changed,
    newTarget: kind,
    callout: profile.callout,
  };
}

export function cycleNextWeather(state: WeatherState, blendRate = 1.65): WeatherStepResult {
  const idx = WEATHER_CYCLE_ORDER.indexOf(state.target);
  const nextKind = WEATHER_CYCLE_ORDER[(idx + 1) % WEATHER_CYCLE_ORDER.length];
  return setTargetWeather(state, nextKind, blendRate);
}

/**
 * Advances weather timer (when autoCycle is active) and smoothly interpolates
 * every atmosphere, visibility, snowfall, and traction parameter toward the target weather profile.
 */
export function stepWeatherState(
  state: WeatherState,
  dt: number,
  autoCycle: boolean
): WeatherStepResult {
  let result: WeatherStepResult = {
    changed: false,
    newTarget: state.target,
    callout: '',
  };

  if (autoCycle && dt > 0) {
    state.timeUntilNext -= dt;
    if (state.timeUntilNext <= 0) {
      result = cycleNextWeather(state, 0.45);
    }
  }

  const dst = WEATHER_PROFILES[state.target];
  const alpha = dt > 0 ? 1 - Math.exp(-state.blendRate * dt) : 0;
  const c = state.current;

  lerpRgb(c.skyColor, dst.skyColor, alpha);
  lerpRgb(c.keyLightColor, dst.keyLightColor, alpha);

  c.fogNear = lerpNum(c.fogNear, dst.fogNear, alpha);
  c.fogFar = lerpNum(c.fogFar, dst.fogFar, alpha);
  c.keyLightIntensity = lerpNum(c.keyLightIntensity, dst.keyLightIntensity, alpha);
  c.hemiIntensity = lerpNum(c.hemiIntensity, dst.hemiIntensity, alpha);
  c.rimIntensity = lerpNum(c.rimIntensity, dst.rimIntensity, alpha);
  c.headlightGlow = lerpNum(c.headlightGlow, dst.headlightGlow, alpha);
  c.snowDensity = lerpNum(c.snowDensity, dst.snowDensity, alpha);
  c.fallSpeed = lerpNum(c.fallSpeed, dst.fallSpeed, alpha);
  c.windX = lerpNum(c.windX, dst.windX, alpha);
  c.windZ = lerpNum(c.windZ, dst.windZ, alpha);
  c.flakeStreak = lerpNum(c.flakeStreak, dst.flakeStreak, alpha);
  c.flakeOpacity = lerpNum(c.flakeOpacity, dst.flakeOpacity, alpha);
  c.accelMult = lerpNum(c.accelMult, dst.accelMult, alpha);
  c.decelMult = lerpNum(c.decelMult, dst.decelMult, alpha);
  c.turnMult = lerpNum(c.turnMult, dst.turnMult, alpha);
  c.maxSpeedMult = lerpNum(c.maxSpeedMult, dst.maxSpeedMult, alpha);
  c.crosswindForce = lerpNum(c.crosswindForce, dst.crosswindForce, alpha);
  c.tractionPercent = lerpNum(c.tractionPercent, dst.tractionPercent, alpha);
  c.breezeIntensity = lerpNum(c.breezeIntensity, dst.breezeIntensity, alpha);

  return result;
}

export interface TractionInput {
  vx: number;
  vz: number;
  angle: number;
  hasInput: boolean;
  inputX: number;
  inputZ: number;
  isBoosting: boolean;
  baseSpeedCap: number;
  baseTurnSpeed: number;
  weather: WeatherParams;
  dt: number;
}

export interface TractionOutput {
  vx: number;
  vz: number;
  angle: number;
  turnDelta: number;
  lateralSlip: number;
}

/**
 * Pure snowplow traction kinematics applying current weather grip, turning bite,
 * icy braking glide, headwind top-speed cap, and subtle blizzard crosswind drift.
 */
export function computeTractionStep(inp: TractionInput): TractionOutput {
  const { weather, dt } = inp;
  let angle = inp.angle;
  let turnDelta = 0;

  if (inp.hasInput) {
    const targetAngle = Math.atan2(inp.inputX, inp.inputZ);
    let diff = targetAngle - angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    turnDelta = diff;

    const effectiveTurnSpeed = inp.baseTurnSpeed * weather.turnMult;
    const step = Math.min(Math.abs(diff), effectiveTurnSpeed * dt);
    angle += Math.sign(diff) * step;
  }

  const fwdX = Math.sin(angle);
  const fwdZ = Math.cos(angle);
  const rightX = Math.cos(angle);
  const rightZ = -Math.sin(angle);

  let vx = inp.vx;
  let vz = inp.vz;

  const effectiveSpeedCap = inp.baseSpeedCap * weather.maxSpeedMult;

  if (inp.hasInput) {
    const alignFactor = Math.max(0.35, Math.cos(turnDelta));
    const targetVx = fwdX * effectiveSpeedCap * alignFactor;
    const targetVz = fwdZ * effectiveSpeedCap * alignFactor;
    const baseAccel = inp.isBoosting ? 10.2 : 7.5;
    const accelLambda = baseAccel * weather.accelMult;
    const alpha = 1 - Math.exp(-accelLambda * dt);
    vx += (targetVx - vx) * alpha;
    vz += (targetVz - vz) * alpha;
  } else {
    const decelLambda = 6.5 * weather.decelMult;
    const decelAlpha = 1 - Math.exp(-decelLambda * dt);
    vx *= 1 - decelAlpha;
    vz *= 1 - decelAlpha;
  }

  // Subtle blizzard crosswind push when the truck is rolling on low-grip ice
  const currentSpeed = Math.hypot(vx, vz);
  if (weather.crosswindForce > 0.01 && currentSpeed > 0.4) {
    const windLen = Math.hypot(weather.windX, weather.windZ) || 1;
    const pushScale = Math.min(1, currentSpeed / 4.5) * weather.crosswindForce * dt;
    vx += (weather.windX / windLen) * pushScale;
    vz += (weather.windZ / windLen) * pushScale;
  }

  // Measure lateral velocity slip perpendicular to the truck heading (used for icy snow spray cues)
  const lateralSlip = Math.abs(vx * rightX + vz * rightZ);

  return {
    vx,
    vz,
    angle,
    turnDelta,
    lateralSlip,
  };
}
