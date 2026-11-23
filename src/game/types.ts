export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';

export type GameMode = 'career' | 'rush';

export type WeatherKind = 'clear' | 'light' | 'blizzard';

export type LiveryId = 'crimson' | 'cobalt' | 'pine' | 'gold';

export type VehicleId = 'ranger' | 'unimog' | 'snocat';

export type CameraMode = 'isometric' | 'chase';

export type TimeOfDay = 'day' | 'sunset' | 'night';

export type PickupKind = 'fuel' | 'salt' | 'cocoa' | 'coins';

export type MissionKind = 'rescueCar' | 'priorityZone' | 'driftRush' | 'deIce';

export type AchievementId =
  | 'firstSwath'
  | 'driftBuster'
  | 'blizzardSurvivor'
  | 'iceMelter'
  | 'roadsideHero'
  | 'comboVirtuoso'
  | 'districtChampion'
  | 'masterMechanic'
  | 'snowKing'
  | 'fullSweep';

export type UpgradeId =
  | 'bladeWidth'
  | 'enginePower'
  | 'heatedBlade'
  | 'snowBlower'
  | 'comboCharm'
  | 'turboTank';

export type UpgradeLevels = Record<UpgradeId, number>;

export type CellKind = 'none' | 'cleared' | 'snow' | 'drift' | 'golden';

export interface VehicleDefinition {
  id: VehicleId;
  name: string;
  role: string;
  description: string;
  perkLabel: string;
  cost: number;
  minLevel: number;
  speedMult: number;
  bladeMult: number;
  saltCapMult: number;
  fuelCapMult: number;
  blastChargeMult: number;
  driftDragMult: number;
  iceImmune: boolean;
}

export interface RoadPickup {
  id: number;
  kind: PickupKind;
  x: number;
  z: number;
  collected: boolean;
  bobPhase: number;
}

export interface AvalancheEvent {
  id: number;
  x: number;
  z: number;
  radius: number;
  state: 'telegraph' | 'impacted';
  timer: number;
  maxTimer: number;
}

export interface AmbulanceEscortState {
  active: boolean;
  x: number;
  z: number;
  angle: number;
  waypoints: Array<{ x: number; z: number }>;
  wpIndex: number;
  speed: number;
  stuck: boolean;
  patience: number;
  maxPatience: number;
  rewardCoins: number;
  rewardTime: number;
  sirenTimer: number;
}

export interface UpgradeDefinition {
  id: UpgradeId;
  name: string;
  shortDesc: string;
  maxLevel: number;
  costs: number[];
  statLabel: (level: number) => string;
}

export interface TruckLiveryDefinition {
  id: LiveryId;
  name: string;
  tagline: string;
  primaryHex: number;
  trimHex: number;
  bladeHex: number;
  swatchPrimary: string;
  swatchTrim: string;
  cost: number;
  minLevel: number;
}

export interface AchievementDefinition {
  id: AchievementId;
  title: string;
  description: string;
  rewardCoins: number;
  target: number;
}

export interface CareerStats {
  totalTilesCleared: number;
  totalDriftsBusted: number;
  blizzardTilesCleared: number;
  icePatchesMelted: number;
  missionsCompleted: number;
  carsRescued: number;
  districtsCleared: number;
  districtStars: Record<number, number>;
}

export interface BlackIcePatch {
  id: number;
  x: number;
  z: number;
  radius: number;
  melted: boolean;
  meltProgress: number; // 0 = solid ice, 1 = fully melted
}

export interface ActiveMission {
  id: number;
  kind: MissionKind;
  title: string;
  subtitle: string;
  x: number;
  z: number;
  radius: number;
  progress: number;
  target: number;
  rewardCoins: number;
  rewardXp: number;
  bonusTimeSec: number;
  baselineCleared: number;
  baselineDrifts: number;
  baselineIce: number;
}

export interface FloatingPopup {
  id: number;
  text: string;
  tone: 'gold' | 'ice' | 'rescue' | 'time';
  screenX: number; // 0..100 viewport %
  screenY: number; // 0..100 viewport %
  opacity: number;
}

export interface TruckStats {
  bladeWidth: number;
  bladeDepth: number;
  blowerReach: number;
  maxSpeed: number;
  boostSpeed: number;
  boostDrainRate: number;
  boostRegenRate: number;
  turnSpeed: number;
  driftSlowdown: number; // 0 = no slowdown, 0.42 = 42% speed reduction in deep drifts
  comboDuration: number; // seconds before combo expires
  coinMultiplier: number; // e.g. 1.0, 1.2, 1.4...
  xpMultiplier: number; // scales XP gained per cleared snow tile
  heatedGlow: number; // 0..1 visual intensity on 3D blade
}

export interface ObstacleBox {
  id: string;
  x: number;
  z: number;
  halfW: number;
  halfD: number;
  kind:
    | 'cottage'
    | 'townhouse'
    | 'cafe'
    | 'tower'
    | 'garage'
    | 'lamp'
    | 'snowman'
    | 'parkedCar'
    | 'plazaTree'
    | 'bench'
    | 'fence';
  rotationY?: number;
  style?: number;
}

export interface CityBlockRect {
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface CityRoadLayout {
  mainAveHalfW: number; // Half-width of grand N-S avenue running straight from South City Gate
  crossAveZ: number[]; // Center Z coordinates of major E-W avenues
  crossAveHalfW: number;
  ringCenter: number; // Distance from center to Outer Ring Boulevard centerline
  ringHalfW: number;
  plazaX: number;
  plazaZ: number;
  plazaRadius: number;
  blocks: CityBlockRect[]; // Raised stone sidewalk blocks supporting urban buildings
}

export interface NeighborhoodConfig {
  index: number;
  name: string;
  subtitle: string;
  gridSize: number; // NxN cells centered at (0, 0)
  cellSize: number;
  targetPercent: number; // e.g. 80 means 80% snow cleared to unlock next district
  shiftSeconds: number; // par target time for cozy bonus & Storm Rush baseline
  spawnX: number;
  spawnZ: number;
  spawnAngle: number; // radians, 0 = +Z, Math.PI = -Z
  roads: CityRoadLayout;
  obstacles: ObstacleBox[];
  seed: number;
  driftDensity: number;
  goldenCount: number;
}

export interface SnowCellData {
  gx: number;
  gz: number;
  wx: number;
  wz: number;
  kind: CellKind;
  initialKind: CellKind;
  height: number;
  clearAnim: number; // 1 = full snow, smoothly animates down to 0 when plowed
  bermBoost: number; // 0..0.34 snowbank mound height pushed onto adjacent untouched snow
  pushX: number; // shear push X direction when cleared
  pushZ: number; // shear push Z direction when cleared
}

export interface ComboState {
  count: number;
  multiplier: number;
  tierLabel: string;
  timer: number;
  maxTimer: number;
}

export interface RunStats {
  won: boolean;
  mode: GameMode;
  reason: 'cleared' | 'timeup';
  starsEarned: number;
  neighborhoodIndex: number;
  neighborhoodName: string;
  clearedPercent: number;
  targetPercent: number;
  score: number;
  bestScore: number;
  coinsEarned: number;
  driverLevel: number;
  driverRank: string;
  maxCombo: number;
  maxMultiplier: number;
  elapsedSeconds: number;
  tilesCleared: number;
  driftsBusted: number;
  missionsCompleted: number;
  iceMelted: number;
}

export interface AchievementToast {
  id: number;
  title: string;
  rewardCoins: number;
}

export interface HudSnapshot {
  phase: GamePhase;
  mode: GameMode;
  rushTimeLeft: number;
  neighborhoodIndex: number;
  neighborhoodName: string;
  unlockedDistricts: number;
  districtCleared: boolean;
  score: number;
  bestScore: number;
  coins: number;
  driverLevel: number;
  driverRank: string;
  xp: number;
  xpToNext: number;
  skillPoints: number;
  clearedPercent: number;
  targetPercent: number;
  elapsedSeconds: number;
  comboCount: number;
  comboMultiplier: number;
  comboTierLabel: string;
  comboProgress: number; // 0..1 remaining time in combo
  boostEnergy: number; // 0..1
  isBoosting: boolean;
  saltLevel: number; // 0..1
  isSalting: boolean;
  onBlackIce: boolean;
  saltedTractionActive: boolean;
  fuelLevel: number; // 0..1
  fuelLow: boolean;
  blastCharge: number; // 0..1
  blastReady: boolean;
  feverActive: boolean;
  cameraMode: CameraMode;
  timeOfDay: TimeOfDay;
  vehicleId: VehicleId;
  unlockedVehicles: VehicleId[];
  ambulance: {
    active: boolean;
    patienceRatio: number;
    stuck: boolean;
    progressPercent: number;
  } | null;
  avalancheAlert: {
    active: boolean;
    timeLeft: number;
  } | null;
  activeMission: ActiveMission | null;
  missionsCompleted: number;
  upgrades: UpgradeLevels;
  canAffordAnyUpgrade: boolean;
  livery: LiveryId;
  unlockedLiveries: LiveryId[];
  achievements: AchievementId[];
  careerStats: CareerStats;
  recentAchievement: AchievementToast | null;
  floatingPopups: FloatingPopup[];
  muted: boolean;
  shopOpen: boolean;
  nearGarage: boolean;
  weather: WeatherKind;
  weatherLabel: string;
  tractionPercent: number;
  calloutText: string;
  calloutId: number;
  runStats: RunStats | null;
}
