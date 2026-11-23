import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { CozySynthAudio } from './audio';
import {
  createAlpineCottage,
  createAlpineMountains,
  createAlpineTownhouse,
  createAmbulanceRig,
  createAvalancheTelegraphRig,
  createBlackIcePatchMesh,
  createCityBench,
  createCityGate,
  createCityPlazaTree,
  createClockTowerLandmark,
  createCornerShopCafe,
  createDispatchBeaconRig,
  createGarageBay,
  createPickupRig,
  createPineForestRing,
  createSnowDustedCar,
  createSnowman,
  createStreetLamp,
  createThermalShockwaveRig,
  createTrafficVehicleRig,
  createVehicleRig,
  createWaypointArrowRig,
  createWinterPedestrian,
  type AmbulanceRig,
  type AvalancheTelegraphRig,
  type BlackIceRig,
  type DispatchBeaconRig,
  type PedestrianRig,
  type PickupRig,
  type ThermalShockwaveRig,
  type TrafficVehicleRig,
  type TruckRig,
  type WaypointArrowRig,
} from './models';
import {
  TIME_OF_DAY_PROFILES,
  applyAvalancheImpact,
  applyVehicleToStats,
  canUnlockVehicle,
  collectNearbyPickups,
  cycleTimeOfDay,
  dampBloomParams,
  findCellsInBlastRadius,
  getTargetBloomParams,
  getVehicleDefinition,
  spawnAmbulanceEscort,
  spawnAvalancheEvent,
  spawnRoadPickups,
  stepAmbulanceEscort,
  stepBlastCharge,
  stepFuelSystem,
  type BloomProfile,
} from './events';
import {
  applySaltToPatches,
  checkBlackIceContact,
  createBlackIcePatches,
  evaluateMissionProgress,
  spawnNextMission,
} from './missions';
import {
  createCityPedestrians,
  stepPedestrians,
  type PedestrianState,
} from './pedestrians';
import {
  calculateShiftStars,
  canUnlockLivery,
  createInitialCareerStats,
  evaluateAchievements,
  getLiveryDefinition,
} from './progression';
import {
  INITIAL_UPGRADES,
  NEIGHBORHOODS,
  accumulatePlowBerm,
  addExperience,
  advanceComboOnClear,
  calculateCellReward,
  calculateClearedPercent,
  canAffordAnyUpgrade,
  findCellsInPlowBlade,
  generateSnowGrid,
  getDriverRank,
  getTruckStats,
  getUpgradeDefinition,
  getXpRequiredForLevel,
  purchaseUpgrade,
  resolveTruckCollisions,
  stepSnowClearingAnim,
  tickComboTimer,
} from './rules';
import {
  createCityRoadTexture,
  createProceduralTextures,
  stampRoadTireTrack,
  type ProceduralTextures,
} from './textures';
import {
  createCityTraffic,
  stepCityTraffic,
  type TrafficCarState,
} from './traffic';
import type {
  AchievementId,
  AchievementToast,
  ActiveMission,
  AmbulanceEscortState,
  AvalancheEvent,
  BlackIcePatch,
  CameraMode,
  CareerStats,
  ComboState,
  FloatingPopup,
  GameMode,
  GamePhase,
  HudSnapshot,
  LiveryId,
  NeighborhoodConfig,
  RoadPickup,
  RunStats,
  SnowCellData,
  TimeOfDay,
  UpgradeId,
  UpgradeLevels,
  VehicleId,
  WeatherKind,
} from './types';
import {
  WEATHER_PROFILES,
  computeTractionStep,
  createWeatherState,
  cycleNextWeather,
  setTargetWeather,
  stepWeatherState,
  type WeatherParams,
  type WeatherState,
} from './weather';

interface Particle {
  active: boolean;
  kind: 'snow' | 'gold' | 'smoke' | 'boost' | 'salt';
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  rotY: number;
}

interface MistParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  baseSize: number;
  rotZ: number;
  rotSpeed: number;
  isGolden: boolean;
}

interface AmbientFlake {
  x: number;
  y: number;
  z: number;
  vy: number;
  driftPhase: number;
  size: number;
}

const MAX_PARTICLES = 260;
const MAX_MIST = 110;
const AMBIENT_FLAKES_GPU = 420;
const AMBIENT_FLAKES_SOFT = 220;
const STORAGE_KEY_BEST = 'driftclear_best_score_v1';
const STORAGE_KEY_CAREER = 'driftclear_career_v2';

// Module-scoped scratch helpers (Zero GC in render loop)
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();
const _camTarget = new THREE.Vector3();
const _camDesired = new THREE.Vector3();
const _quatSpin = new THREE.Quaternion();
const _zAxis = new THREE.Vector3(0, 0, 1);
const _windLook = new THREE.Vector3();
const _projVec = new THREE.Vector3();
const _effectiveWeather: WeatherParams = {
  ...WEATHER_PROFILES.light,
  skyColor: [...WEATHER_PROFILES.light.skyColor],
  keyLightColor: [...WEATHER_PROFILES.light.keyLightColor],
};

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class SnowPlowEngine {
  private container: HTMLElement;
  private onHudUpdate: (snapshot: HudSnapshot) => void;
  private isSoftwareGl: boolean;

  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private renderPass: RenderPass;
  private bloomPass: UnrealBloomPass;
  private outputPass: OutputPass;
  private currentBloom: BloomProfile;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private chaseCamera: THREE.PerspectiveCamera;
  private activeCamera: THREE.Camera;
  private cameraMode: CameraMode = 'isometric';
  private isoZoomOffset = 0;
  private timeOfDay: TimeOfDay = 'sunset';
  private textures: ProceduralTextures;
  private audio: CozySynthAudio;

  // World groups
  private levelGroup: THREE.Group;
  private truck!: TruckRig;
  private waypointArrow!: WaypointArrowRig;
  private shockwaveRig!: ThermalShockwaveRig;
  private cityRoadTex: THREE.CanvasTexture | null = null;
  private snowFieldMesh: THREE.Mesh | null = null;
  private snowFieldSegs = 56;
  private snowCells: SnowCellData[] = [];
  private animatingSnowIndices: number[] = [];
  private totalSnowTiles = 1;
  private clearedSnowTiles = 0;
  private chimneyPositions: THREE.Vector3[] = [];
  private goldenBeacons = new Map<number, THREE.Mesh>();
  private goldenBeaconGeo: THREE.OctahedronGeometry | null = null;
  private goldenBeaconMat: THREE.MeshStandardMaterial | null = null;
  private goldenAnimTime = 0;
  private garagePos = new THREE.Vector3(9.2, 0, -9.2);
  private pedestrians: PedestrianState[] = [];
  private pedestrianRigs: PedestrianRig[] = [];
  private trafficCars: TrafficCarState[] = [];
  private trafficRigs: TrafficVehicleRig[] = [];
  private blackIcePatches: BlackIcePatch[] = [];
  private blackIceRigs = new Map<number, BlackIceRig>();
  private dispatchBeacon: DispatchBeaconRig | null = null;
  private pickups: RoadPickup[] = [];
  private pickupRigs: PickupRig[] = [];
  private ambulance: AmbulanceEscortState | null = null;
  private ambulanceRig: AmbulanceRig | null = null;
  private ambulanceCooldown = 14;
  private ambulanceProgress = 0;
  private avalanche: AvalancheEvent | null = null;
  private avalancheRig: AvalancheTelegraphRig | null = null;
  private avalancheCooldown = 20;
  private avalancheSeq = 0;

  // Pooled particles (Zero GC)
  private particles: Particle[] = [];
  private particleMesh!: THREE.InstancedMesh;
  private particleCursor = 0;

  private mistParticles: MistParticle[] = [];
  private mistMesh!: THREE.InstancedMesh;
  private mistCursor = 0;

  private ambientFlakes: AmbientFlake[] = [];
  private flakeMesh!: THREE.InstancedMesh;
  private flakeMat!: THREE.MeshBasicMaterial;
  private maxAmbientFlakes = AMBIENT_FLAKES_GPU;

  // Dynamic atmosphere, visibility & traction weather system
  private skyColor = new THREE.Color(0x526e91);
  private fog!: THREE.Fog;
  private hemiLight!: THREE.HemisphereLight;
  private keyLight!: THREE.DirectionalLight;
  private rimLight!: THREE.DirectionalLight;
  private weatherState: WeatherState = createWeatherState('light');

  // Core state, Modes, Vehicle Fleet & Career Progression
  private phase: GamePhase = 'title';
  private mode: GameMode = 'career';
  private rushTimeLeft = 180;
  private shopOpen = false;
  private neighborhoodIndex = 0;
  private unlockedDistricts = 1;
  private districtCleared = false;
  private config: NeighborhoodConfig = NEIGHBORHOODS[0];
  private upgrades: UpgradeLevels = { ...INITIAL_UPGRADES };
  private vehicleId: VehicleId = 'ranger';
  private unlockedVehicles: VehicleId[] = ['ranger'];
  private livery: LiveryId = 'crimson';
  private unlockedLiveries: LiveryId[] = ['crimson'];
  private achievements: AchievementId[] = [];
  private careerStats: CareerStats = createInitialCareerStats();
  private recentAchievement: AchievementToast | null = null;
  private achievementToastTimer = 0;
  private achievementToastSeq = 0;
  private coins = 0;
  private score = 0;
  private bestScore = 0;
  private driverLevel = 1;
  private xp = 0;
  private xpToNext = getXpRequiredForLevel(1);
  private skillPoints = 0;
  private saveTimer = 0;
  private elapsedShiftSeconds = 0;
  private driftsBusted = 0;
  private iceMeltedThisShift = 0;
  private missionsCompleted = 0;
  private missionSeq = 0;
  private activeMission: ActiveMission | null = null;
  private maxCombo = 0;
  private maxMultiplier = 1;
  private combo: ComboState = {
    count: 0,
    multiplier: 1,
    tierLabel: '',
    timer: 0,
    maxTimer: 3.0,
  };
  private runStats: RunStats | null = null;

  // Active Salt Spreader, Fuel, Thermal Snow-Blast, Hitstop, Tire Tracks & Black Ice
  private saltLevel = 1.0;
  private isSalting = false;
  private saltPulseTimer = 0;
  private saltedTractionTimer = 0;
  private onBlackIce = false;
  private blizzardRefillTimer = 0;
  private fuelLevel = 1.0;
  private fuelLow = false;
  private blastCharge = 0.55;
  private hitstopTimer = 0;
  private shockwaveTimer = 0;
  private tireTrackTimer = 0;

  // Floating 3D-projected reward popups
  private worldPopups: Array<{
    id: number;
    text: string;
    tone: FloatingPopup['tone'];
    wx: number;
    wy: number;
    wz: number;
    life: number;
    maxLife: number;
  }> = [];
  private popupSeq = 0;

  // Truck kinematics
  private truckX = 0;
  private truckZ = 10.5;
  private truckVx = 0;
  private truckVz = 0;
  private truckAngle = Math.PI;
  private wheelSpin = 0;
  private steerAngle = 0;
  private boostEnergy = 1.0;
  private isBoosting = false;
  private wasBoosting = false;
  private squashY = 1.0;
  private pitchTilt = 0;
  private rollTilt = 0;
  private plowingIntensity = 0;
  private plowingHoldTimer = 0;
  private driftDragSmooth = 0;
  private waveScale = 0;

  // Juice & camera
  private shakeTrauma = 0;
  private frustumSize = 24;
  private targetFrustumSize = 24;
  private titleOrbitAngle = 0.72;
  private camLookCurrent = new THREE.Vector3(-4.5, 1.2, 8.0);
  private calloutText = '';
  private calloutId = 0;
  private calloutTimer = 0;
  private smokeTimer = 0;
  private bumpCooldown = 0;

  // Input hub
  private keysHeld = new Set<string>();
  private pointerActive = false;
  private pointerDirX = 0;
  private pointerDirZ = 0;

  // Loop & lifecycle
  private frameId = 0;
  private disposed = false;
  private lastTimeMs = 0;
  private hudThrottleAccum = 0;
  private resizeObserver: ResizeObserver | null = null;
  private envRT: THREE.WebGLRenderTarget | null = null;

  constructor(
    container: HTMLElement,
    onHudUpdate: (snapshot: HudSnapshot) => void,
    autostart = false,
    initialWeather: WeatherKind = 'light'
  ) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;
    this.isSoftwareGl = detectSoftwareWebGL();
    this.audio = new CozySynthAudio();
    this.weatherState = createWeatherState(initialWeather);

    this.loadCareer();

    // 1. Renderer setup (Three.js skill standards + Software WebGL guard)
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.dataset.testid = 'snowplow-canvas';
    this.container.appendChild(this.renderer.domElement);

    // 2. Scene, Dynamic Visibility Fog & Studio RoomEnvironment IBL
    this.scene = new THREE.Scene();
    this.maxAmbientFlakes = this.isSoftwareGl ? AMBIENT_FLAKES_SOFT : AMBIENT_FLAKES_GPU;
    const initWeather = this.weatherState.current;
    this.skyColor.setRGB(initWeather.skyColor[0], initWeather.skyColor[1], initWeather.skyColor[2]);
    this.scene.background = this.skyColor;
    this.fog = new THREE.Fog(this.skyColor.getHex(), initWeather.fogNear, initWeather.fogFar);
    this.scene.fog = this.fog;

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRT.texture;
    pmremGenerator.dispose();

    // 3. Dual Camera System: Orthographic Isometric + Dynamic 3D Perspective Chase Camera [V]
    const width = Math.max(1, container.clientWidth || window.innerWidth);
    const height = Math.max(1, container.clientHeight || window.innerHeight);
    const aspect = width / height;
    this.camera = new THREE.OrthographicCamera(
      (-this.frustumSize * aspect) / 2,
      (this.frustumSize * aspect) / 2,
      this.frustumSize / 2,
      -this.frustumSize / 2,
      0.5,
      260
    );
    this.chaseCamera = new THREE.PerspectiveCamera(56, aspect, 0.4, 240);
    this.activeCamera = this.camera;
    this.renderer.setSize(width, height, false);

    // 3b. Cozy Atmospheric HDR Post-Processing Pipeline (RenderPass -> Half-Res UnrealBloomPass -> OutputPass)
    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    this.composer.setSize(width, height);
    this.renderPass = new RenderPass(this.scene, this.activeCamera);
    this.composer.addPass(this.renderPass);

    const bloomScale = this.isSoftwareGl ? 0.25 : 0.5;
    const initBloom = getTargetBloomParams(this.timeOfDay, initialWeather);
    this.currentBloom = { ...initBloom };
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(
        Math.max(1, Math.floor(width * bloomScale)),
        Math.max(1, Math.floor(height * bloomScale))
      ),
      initBloom.strength,
      initBloom.radius,
      initBloom.threshold
    );
    this.composer.addPass(this.bloomPass);

    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);

    // 4. Cozy Alpine Dusk / Golden-Hour Rig: Warm Golden Key + Cool Blue-Hour Sky Fill
    this.hemiLight = new THREE.HemisphereLight(0x9ac0e8, 0x34435a, initWeather.hemiIntensity);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xffd9a0, initWeather.keyLightIntensity);
    this.keyLight.color.setRGB(
      initWeather.keyLightColor[0],
      initWeather.keyLightColor[1],
      initWeather.keyLightColor[2]
    );
    this.keyLight.position.set(28, 36, 22);
    this.keyLight.castShadow = !this.isSoftwareGl;
    this.keyLight.shadow.mapSize.width = 1024;
    this.keyLight.shadow.mapSize.height = 1024;
    this.keyLight.shadow.camera.near = 6;
    this.keyLight.shadow.camera.far = 120;
    const d = 34;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.025;
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(0x7ca7d9, initWeather.rimIntensity);
    this.rimLight.position.set(-24, 16, -26);
    this.scene.add(this.rimLight);

    // 5. Procedural Textures, Playable Vehicle Rig, Waypoint Arrow, Thermal Shockwave, Particles & Level
    this.textures = createProceduralTextures(this.renderer.capabilities.getMaxAnisotropy());
    this.levelGroup = new THREE.Group();
    this.scene.add(this.levelGroup);

    this.truck = createVehicleRig(this.vehicleId, this.textures);
    this.scene.add(this.truck.root);

    this.waypointArrow = createWaypointArrowRig();
    this.waypointArrow.root.visible = false;
    this.scene.add(this.waypointArrow.root);

    this.shockwaveRig = createThermalShockwaveRig();
    this.scene.add(this.shockwaveRig.mesh);

    this.initParticlePools();
    this.loadNeighborhood(0, false);

    if (autostart) {
      this.phase = 'playing';
      this.targetFrustumSize = 22.5;
      this.frustumSize = 22.5;
      this.syncCameraPosition(1);
    } else {
      this.phase = 'title';
      this.targetFrustumSize = 33.0;
      this.frustumSize = 33.0;
      this.syncCameraPosition(1);
    }

    this.renderPass.camera = this.activeCamera;
    this.updateWeather(1);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.activeCamera);
    }

    this.bindEvents();
    this.emitHud();

    this.lastTimeMs = performance.now();
    this.tick();
  }

  private initParticlePools(): void {
    // 1. Pooled solid snow clods, golden sparkles, boost sparks, chimney smoke
    const pGeo = new THREE.DodecahedronGeometry(0.26, 0);
    const pMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.85,
      metalness: 0.04,
      envMapIntensity: 0.45,
      normalMap: this.textures.snowNormalMap,
      normalScale: new THREE.Vector2(0.85, 0.85),
    });
    this.particleMesh = new THREE.InstancedMesh(pGeo, pMat, MAX_PARTICLES);
    this.particleMesh.frustumCulled = false;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        active: false,
        kind: 'snow',
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        size: 0,
        rotY: 0,
      });
      _dummy.position.set(0, -50, 0);
      _dummy.scale.setScalar(0.0001);
      _dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, _dummy.matrix);
      this.particleMesh.setColorAt(i, _color.setHex(0xffffff));
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
    this.scene.add(this.particleMesh);

    // 2. Pooled volumetric billowing powder snow mist plumes off the plow blade
    const mGeo = new THREE.PlaneGeometry(1.45, 1.45);
    const mMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      map: this.textures.snowPuffMap,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    });
    this.mistMesh = new THREE.InstancedMesh(mGeo, mMat, MAX_MIST);
    this.mistMesh.frustumCulled = false;

    for (let i = 0; i < MAX_MIST; i++) {
      this.mistParticles.push({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        baseSize: 1,
        rotZ: 0,
        rotSpeed: 0,
        isGolden: false,
      });
      _dummy.position.set(0, -50, 0);
      _dummy.scale.setScalar(0.0001);
      _dummy.updateMatrix();
      this.mistMesh.setMatrixAt(i, _dummy.matrix);
      this.mistMesh.setColorAt(i, _color.setHex(0xf4f9ff));
    }
    this.mistMesh.instanceMatrix.needsUpdate = true;
    if (this.mistMesh.instanceColor) this.mistMesh.instanceColor.needsUpdate = true;
    this.scene.add(this.mistMesh);

    // 3. Ambient dynamic winter snowfall (scales smoothly from Clear Skies diamond dust to Heavy Blizzard squalls)
    const fGeo = new THREE.OctahedronGeometry(0.145, 0);
    this.flakeMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: this.weatherState.current.flakeOpacity,
    });
    this.flakeMesh = new THREE.InstancedMesh(fGeo, this.flakeMat, this.maxAmbientFlakes);
    this.flakeMesh.frustumCulled = false;

    for (let i = 0; i < this.maxAmbientFlakes; i++) {
      const f: AmbientFlake = {
        x: (Math.random() - 0.5) * 46,
        y: Math.random() * 19,
        z: (Math.random() - 0.5) * 46,
        vy: 1.1 + Math.random() * 1.25,
        driftPhase: Math.random() * Math.PI * 2,
        size: 0.65 + Math.random() * 0.85,
      };
      this.ambientFlakes.push(f);
      _dummy.position.set(f.x, f.y, f.z);
      _dummy.scale.setScalar(f.size);
      _dummy.updateMatrix();
      this.flakeMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.flakeMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.flakeMesh);
  }

  private spawnParticle(
    kind: Particle['kind'],
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    maxLife: number,
    size: number
  ): void {
    const idx = this.particleCursor;
    this.particleCursor = (this.particleCursor + 1) % MAX_PARTICLES;
    const p = this.particles[idx];
    p.active = true;
    p.kind = kind;
    p.x = x;
    p.y = y;
    p.z = z;
    p.vx = vx;
    p.vy = vy;
    p.vz = vz;
    p.life = maxLife;
    p.maxLife = maxLife;
    p.size = size;
    p.rotY = Math.random() * Math.PI * 2;
  }

  private spawnMist(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    maxLife: number,
    baseSize: number,
    isGolden = false
  ): void {
    const idx = this.mistCursor;
    this.mistCursor = (this.mistCursor + 1) % MAX_MIST;
    const m = this.mistParticles[idx];
    m.active = true;
    m.x = x;
    m.y = y;
    m.z = z;
    m.vx = vx;
    m.vy = vy;
    m.vz = vz;
    m.life = maxLife;
    m.maxLife = maxLife;
    m.baseSize = baseSize;
    m.rotZ = Math.random() * Math.PI * 2;
    m.rotSpeed = (Math.random() - 0.5) * 1.8;
    m.isGolden = isGolden;
  }

  private clearLevelGroup(): void {
    while (this.levelGroup.children.length > 0) {
      const child = this.levelGroup.children[0];
      this.levelGroup.remove(child);
    }
    if (this.cityRoadTex) {
      this.cityRoadTex.dispose();
      this.cityRoadTex = null;
    }
    if (this.snowFieldMesh) {
      this.snowFieldMesh.geometry.dispose();
      (this.snowFieldMesh.material as THREE.Material).dispose();
      this.snowFieldMesh = null;
    }
    this.animatingSnowIndices = [];
    this.goldenBeacons.clear();
    this.chimneyPositions = [];
    this.pedestrians = [];
    this.pedestrianRigs = [];
    this.trafficCars = [];
    this.trafficRigs = [];
    this.blackIcePatches = [];
    this.blackIceRigs.clear();
    this.dispatchBeacon = null;
    this.activeMission = null;
    this.pickups = [];
    this.pickupRigs = [];
    this.ambulance = null;
    this.ambulanceRig = null;
    this.avalanche = null;
    this.avalancheRig = null;
    this.worldPopups = [];
  }

  private loadCareer(): void {
    try {
      const savedBest = localStorage.getItem(STORAGE_KEY_BEST);
      if (savedBest) this.bestScore = Math.max(0, parseInt(savedBest, 10) || 0);

      const raw = localStorage.getItem(STORAGE_KEY_CAREER);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<{
        coins: number;
        bestScore: number;
        driverLevel: number;
        xp: number;
        skillPoints: number;
        unlockedDistricts: number;
        upgrades: Partial<UpgradeLevels>;
        vehicleId: VehicleId;
        unlockedVehicles: VehicleId[];
        livery: LiveryId;
        unlockedLiveries: LiveryId[];
        achievements: AchievementId[];
        careerStats: Partial<CareerStats>;
      }>;
      if (typeof parsed.coins === 'number' && Number.isFinite(parsed.coins)) {
        this.coins = Math.max(0, Math.floor(parsed.coins));
      }
      if (typeof parsed.bestScore === 'number' && Number.isFinite(parsed.bestScore)) {
        this.bestScore = Math.max(this.bestScore, Math.floor(parsed.bestScore));
      }
      if (typeof parsed.driverLevel === 'number' && Number.isFinite(parsed.driverLevel)) {
        this.driverLevel = Math.max(1, Math.floor(parsed.driverLevel));
      }
      this.xpToNext = getXpRequiredForLevel(this.driverLevel);
      if (typeof parsed.xp === 'number' && Number.isFinite(parsed.xp)) {
        this.xp = Math.max(0, Math.min(this.xpToNext - 1, Math.floor(parsed.xp)));
      }
      if (typeof parsed.skillPoints === 'number' && Number.isFinite(parsed.skillPoints)) {
        this.skillPoints = Math.max(0, Math.floor(parsed.skillPoints));
      }
      if (typeof parsed.unlockedDistricts === 'number' && Number.isFinite(parsed.unlockedDistricts)) {
        this.unlockedDistricts = Math.max(1, Math.min(NEIGHBORHOODS.length, Math.floor(parsed.unlockedDistricts)));
      }
      if (parsed.upgrades && typeof parsed.upgrades === 'object') {
        const next: UpgradeLevels = { ...INITIAL_UPGRADES };
        (Object.keys(INITIAL_UPGRADES) as UpgradeId[]).forEach((k) => {
          const val = parsed.upgrades?.[k];
          if (typeof val === 'number' && Number.isFinite(val)) {
            const maxLv = getUpgradeDefinition(k).maxLevel;
            next[k] = Math.max(1, Math.min(maxLv, Math.floor(val)));
          }
        });
        this.upgrades = next;
      }
      if (Array.isArray(parsed.unlockedVehicles)) {
        const validV: VehicleId[] = parsed.unlockedVehicles.filter(
          (v): v is VehicleId => v === 'ranger' || v === 'unimog' || v === 'snocat'
        );
        this.unlockedVehicles = validV.includes('ranger') ? validV : ['ranger', ...validV];
      }
      if (
        parsed.vehicleId &&
        (parsed.vehicleId === 'ranger' || parsed.vehicleId === 'unimog' || parsed.vehicleId === 'snocat') &&
        this.unlockedVehicles.includes(parsed.vehicleId)
      ) {
        this.vehicleId = parsed.vehicleId;
      }
      if (Array.isArray(parsed.unlockedLiveries)) {
        const valid: LiveryId[] = parsed.unlockedLiveries.filter(
          (l): l is LiveryId => l === 'crimson' || l === 'cobalt' || l === 'pine' || l === 'gold'
        );
        this.unlockedLiveries = valid.includes('crimson') ? valid : ['crimson', ...valid];
      }
      if (
        parsed.livery &&
        (parsed.livery === 'crimson' ||
          parsed.livery === 'cobalt' ||
          parsed.livery === 'pine' ||
          parsed.livery === 'gold') &&
        this.unlockedLiveries.includes(parsed.livery)
      ) {
        this.livery = parsed.livery;
      }
      if (Array.isArray(parsed.achievements)) {
        this.achievements = parsed.achievements;
      }
      if (parsed.careerStats && typeof parsed.careerStats === 'object') {
        this.careerStats = {
          ...createInitialCareerStats(),
          ...parsed.careerStats,
          districtStars: { ...(parsed.careerStats.districtStars ?? {}) },
        };
      }
    } catch {
      // Ignore corrupt or unavailable localStorage
    }
  }

  private saveCareer(): void {
    try {
      localStorage.setItem(STORAGE_KEY_BEST, String(Math.round(this.bestScore)));
      localStorage.setItem(
        STORAGE_KEY_CAREER,
        JSON.stringify({
          coins: Math.round(this.coins),
          bestScore: Math.round(this.bestScore),
          driverLevel: this.driverLevel,
          xp: Math.round(this.xp),
          skillPoints: this.skillPoints,
          unlockedDistricts: this.unlockedDistricts,
          upgrades: this.upgrades,
          vehicleId: this.vehicleId,
          unlockedVehicles: this.unlockedVehicles,
          livery: this.livery,
          unlockedLiveries: this.unlockedLiveries,
          achievements: this.achievements,
          careerStats: this.careerStats,
        })
      );
    } catch {
      // Ignore storage errors
    }
  }

  public loadNeighborhood(index: number, resetCareer: boolean): void {
    this.clearLevelGroup();
    this.neighborhoodIndex = Math.max(0, index % NEIGHBORHOODS.length);
    this.config = NEIGHBORHOODS[this.neighborhoodIndex];
    this.districtCleared = false;

    if (resetCareer) {
      this.upgrades = { ...INITIAL_UPGRADES };
      this.vehicleId = 'ranger';
      this.unlockedVehicles = ['ranger'];
      this.rebuildVehicleMesh();
      this.livery = 'crimson';
      this.unlockedLiveries = ['crimson'];
      this.achievements = [];
      this.careerStats = createInitialCareerStats();
      this.coins = 0;
      this.score = 0;
      this.driverLevel = 1;
      this.xp = 0;
      this.xpToNext = getXpRequiredForLevel(1);
      this.skillPoints = 0;
      this.unlockedDistricts = 1;
      this.saveCareer();
    }

    const arenaSize = this.config.gridSize * this.config.cellSize;
    const arenaHalf = arenaSize / 2;

    // 1. Extended outer snowy alpine terrain (flattened along the South Approach Highway corridor!)
    const outerGeo = new THREE.PlaneGeometry(240, 240, 48, 48);
    outerGeo.rotateX(-Math.PI / 2);
    const oPos = outerGeo.attributes.position;
    const oUv = outerGeo.attributes.uv;
    const approachHalfW = this.config.roads.mainAveHalfW + 1.8;
    for (let i = 0; i < oPos.count; i++) {
      const ox = oPos.getX(i);
      const oz = oPos.getZ(i);
      oUv.setXY(i, oUv.getX(i) * 48, oUv.getY(i) * 48);
      const distOutside = Math.max(Math.abs(ox), Math.abs(oz)) - (arenaHalf + 2.4);
      const onApproachCorridor = oz > arenaHalf - 1.0 && Math.abs(ox) < approachHalfW;
      if (distOutside > 0 && !onApproachCorridor) {
        let blend = Math.min(1, distOutside / 8.5);
        if (oz > arenaHalf - 1.0) {
          blend *= Math.min(1, Math.max(0, (Math.abs(ox) - approachHalfW) / 5.5));
        }
        const hill =
          (Math.sin(ox * 0.10 + oz * 0.08) * 0.45 +
            Math.cos(ox * 0.07 - oz * 0.12) * 0.38 +
            0.35) *
          blend;
        oPos.setY(i, -0.05 + Math.max(0, hill));
      } else {
        oPos.setY(i, -0.06);
      }
    }
    outerGeo.computeVertexNormals();
    const outerGround = new THREE.Mesh(
      outerGeo,
      new THREE.MeshStandardMaterial({
        color: 0xd0e2f4,
        map: this.textures.snowAlbedoMap,
        normalMap: this.textures.snowNormalMap,
        normalScale: new THREE.Vector2(1.35, 1.35),
        roughnessMap: this.textures.snowRoughnessMap,
        roughness: 0.94,
        metalness: 0.04,
        envMapIntensity: 0.42,
      })
    );
    outerGround.receiveShadow = true;
    this.levelGroup.add(outerGround);

    // 2. Real City Asphalt Road Network, Yellow Centerlines, Zebra Crosswalks, Granite Sidewalks & Plaza
    this.cityRoadTex = createCityRoadTexture(
      this.config,
      this.renderer.capabilities.getMaxAnisotropy()
    );
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.cityRoadTex,
      roughness: 0.84,
      metalness: 0.05,
    });
    const roadMesh = new THREE.Mesh(new THREE.PlaneGeometry(arenaSize, arenaSize), roadMat);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.y = 0.0;
    roadMesh.receiveShadow = true;
    this.levelGroup.add(roadMesh);

    // Raised granite sidewalk plinths beneath each urban city block (subtle 0.05m lip)
    const sidewalkCurbMat = new THREE.MeshStandardMaterial({ color: 0x8e96a3, roughness: 0.84 });
    for (const blk of this.config.roads.blocks) {
      const curbMesh = new THREE.Mesh(
        new THREE.BoxGeometry(blk.w, 0.055, blk.d),
        sidewalkCurbMat
      );
      curbMesh.position.set(blk.x, 0.024, blk.z);
      curbMesh.receiveShadow = true;
      this.levelGroup.add(curbMesh);
    }

    // South Approach Asphalt Highway leading straight through the Arched City Gate out into the alpine valley
    const approachLen = 32;
    const approachW = this.config.roads.mainAveHalfW * 2;
    const approachAsphaltMat = new THREE.MeshStandardMaterial({ color: 0x2b323d, roughness: 0.88, metalness: 0.05 });
    const approachRoad = new THREE.Mesh(new THREE.PlaneGeometry(approachW, approachLen), approachAsphaltMat);
    approachRoad.rotation.x = -Math.PI / 2;
    approachRoad.position.set(0, 0.008, arenaHalf + approachLen / 2 - 0.1);
    approachRoad.receiveShadow = true;
    this.levelGroup.add(approachRoad);

    // White edge lines & golden-yellow dashed highway centerline on the South Approach Road
    const whiteLineMat = new THREE.MeshBasicMaterial({ color: 0xdce4ee });
    const yellowDashMat = new THREE.MeshBasicMaterial({ color: 0xe6b43c });
    for (const side of [-1, 1]) {
      const edgeLine = new THREE.Mesh(new THREE.PlaneGeometry(0.18, approachLen - 0.5), whiteLineMat);
      edgeLine.rotation.x = -Math.PI / 2;
      edgeLine.position.set(side * (this.config.roads.mainAveHalfW - 0.34), 0.014, arenaHalf + approachLen / 2);
      this.levelGroup.add(edgeLine);

      // Granite road shoulder curbs flanking the approach highway
      const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.14, approachLen), sidewalkCurbMat);
      shoulder.position.set(side * (this.config.roads.mainAveHalfW + 0.22), 0.05, arenaHalf + approachLen / 2);
      shoulder.receiveShadow = true;
      this.levelGroup.add(shoulder);
    }
    for (let dz = 2.0; dz < approachLen - 1.5; dz += 3.2) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.20, 1.55), yellowDashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.015, arenaHalf + dz);
      this.levelGroup.add(dash);
    }

    // 3. Natural Pine Forest, Dressed-Stone City Wall & Towering Snow-Capped Alpine Mountain Range!
    const forest = createPineForestRing(arenaHalf);
    this.levelGroup.add(forest);
    const mountains = createAlpineMountains(arenaHalf, this.textures);
    this.levelGroup.add(mountains);

    // Monumental Arched Stone City Gate ("DRIFTCLEAR") spanning the South Entrance Boulevard
    const cityGate = createCityGate(this.textures);
    cityGate.position.set(0, 0, arenaHalf + 0.55);
    this.levelGroup.add(cityGate);

    // 4. Urban Buildings, Multi-Story Townhouses, Corner Cafés, Clock Tower, Garage Depot, Cars, Lamps, Plaza Trees
    for (const obs of this.config.obstacles) {
      if (obs.kind === 'tower') {
        const tower = createClockTowerLandmark(this.textures);
        tower.position.set(obs.x, 0, obs.z);
        this.levelGroup.add(tower);
      } else if (obs.kind === 'townhouse') {
        const { group, chimneyWorldOffset } = createAlpineTownhouse(obs.style ?? 0, this.textures);
        group.position.set(obs.x, 0, obs.z);
        group.rotation.y = obs.rotationY ?? 0;
        this.levelGroup.add(group);
        const worldChimney = chimneyWorldOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), obs.rotationY ?? 0);
        worldChimney.add(new THREE.Vector3(obs.x, 0, obs.z));
        this.chimneyPositions.push(worldChimney);
      } else if (obs.kind === 'cafe') {
        const { group, chimneyWorldOffset } = createCornerShopCafe(this.textures);
        group.position.set(obs.x, 0, obs.z);
        group.rotation.y = obs.rotationY ?? 0;
        this.levelGroup.add(group);
        const worldChimney = chimneyWorldOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), obs.rotationY ?? 0);
        worldChimney.add(new THREE.Vector3(obs.x, 0, obs.z));
        this.chimneyPositions.push(worldChimney);
      } else if (obs.kind === 'cottage') {
        const { group, chimneyWorldOffset } = createAlpineCottage(obs.style ?? 0, this.textures);
        group.position.set(obs.x, 0, obs.z);
        group.rotation.y = obs.rotationY ?? 0;
        this.levelGroup.add(group);
        const worldChimney = chimneyWorldOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), obs.rotationY ?? 0);
        worldChimney.add(new THREE.Vector3(obs.x, 0, obs.z));
        this.chimneyPositions.push(worldChimney);
      } else if (obs.kind === 'garage') {
        const garage = createGarageBay(this.textures);
        garage.position.set(obs.x, 0, obs.z);
        garage.rotation.y = obs.rotationY ?? 0;
        this.levelGroup.add(garage);
        // Track the glowing apron pad directly in front of the garage bay (+Z)
        this.garagePos.set(obs.x, 0, obs.z + 3.4);
      } else if (obs.kind === 'parkedCar') {
        const car = createSnowDustedCar(obs.style ?? 0, this.textures);
        car.position.set(obs.x, 0, obs.z);
        car.rotation.y = obs.rotationY ?? 0;
        this.levelGroup.add(car);
      } else if (obs.kind === 'plazaTree') {
        const tree = createCityPlazaTree(this.textures);
        tree.position.set(obs.x, 0, obs.z);
        this.levelGroup.add(tree);
      } else if (obs.kind === 'bench') {
        const bench = createCityBench();
        bench.position.set(obs.x, 0, obs.z);
        bench.rotation.y = obs.rotationY ?? 0;
        this.levelGroup.add(bench);
      } else if (obs.kind === 'lamp') {
        const lamp = createStreetLamp(this.textures);
        lamp.position.set(obs.x, 0, obs.z);
        lamp.rotation.y = obs.rotationY ?? 0;
        this.levelGroup.add(lamp);
      } else if (obs.kind === 'snowman') {
        const sm = createSnowman();
        sm.position.set(obs.x, 0, obs.z);
        sm.rotation.y = 0.5;
        this.levelGroup.add(sm);
      }
    }

    // 5. Continuous Deformable 3D Real-Snow Blanket (Smooth sculpted drifts, wind ripples & sparkling frost)
    const generated = generateSnowGrid(this.config);
    this.snowCells = generated.cells;
    this.animatingSnowIndices = [];
    this.totalSnowTiles = generated.totalSnowTiles;
    this.clearedSnowTiles = 0;

    this.snowFieldSegs = this.isSoftwareGl
      ? Math.round(this.config.gridSize * 1.5)
      : this.config.gridSize * 2;
    const snowGeo = new THREE.PlaneGeometry(arenaSize, arenaSize, this.snowFieldSegs, this.snowFieldSegs);
    snowGeo.rotateX(-Math.PI / 2);

    const uvAttr = snowGeo.attributes.uv;
    const uvScale = arenaSize / 4.2;
    for (let i = 0; i < uvAttr.count; i++) {
      uvAttr.setXY(i, uvAttr.getX(i) * uvScale, uvAttr.getY(i) * uvScale);
    }

    const colorArray = new Float32Array(snowGeo.attributes.position.count * 3);
    snowGeo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

    const snowMat = new THREE.MeshStandardMaterial({
      color: 0xf4f8fc,
      map: this.textures.snowAlbedoMap,
      normalMap: this.textures.snowNormalMap,
      normalScale: new THREE.Vector2(1.55, 1.55),
      roughnessMap: this.textures.snowRoughnessMap,
      roughness: 0.94,
      metalness: 0.05,
      envMapIntensity: 0.42,
      vertexColors: true,
    });

    this.snowFieldMesh = new THREE.Mesh(snowGeo, snowMat);
    this.snowFieldMesh.receiveShadow = true;
    this.snowFieldMesh.castShadow = false;
    this.levelGroup.add(this.snowFieldMesh);

    if (!this.goldenBeaconGeo) {
      this.goldenBeaconGeo = new THREE.OctahedronGeometry(0.32, 0);
    }
    if (!this.goldenBeaconMat) {
      this.goldenBeaconMat = new THREE.MeshStandardMaterial({
        color: 0xffe074,
        emissive: 0xf59e0b,
        emissiveIntensity: 1.8,
        roughness: 0.18,
        metalness: 0.65,
      });
    }

    for (let i = 0; i < this.snowCells.length; i++) {
      const cell = this.snowCells[i];
      if (cell.kind === 'golden') {
        const star = new THREE.Mesh(this.goldenBeaconGeo, this.goldenBeaconMat);
        star.position.set(cell.wx, 1.38, cell.wz);
        this.levelGroup.add(star);
        this.goldenBeacons.set(i, star);
      }
    }

    this.updateSnowFieldRegion(0, this.snowFieldSegs, 0, this.snowFieldSegs);

    // 5b. Low-Poly Animated Winter Pedestrians Strolling Along City Sidewalks & Roundabout Plaza
    const pedCount = 14 + this.neighborhoodIndex * 2;
    this.pedestrians = createCityPedestrians(this.config, pedCount);
    this.pedestrianRigs = [];
    for (let i = 0; i < this.pedestrians.length; i++) {
      const p = this.pedestrians[i];
      const rig = createWinterPedestrian(p.style, p.hatVariant, p.hasBag, this.textures);
      rig.root.scale.setScalar(p.heightScale);
      rig.root.position.set(p.x, 0.05, p.z);
      rig.root.rotation.y = p.angle;
      this.levelGroup.add(rig.root);
      this.pedestrianRigs.push(rig);
    }

    // 5c. Shimmering Black-Ice Hazards across City Intersections
    this.blackIcePatches = createBlackIcePatches(this.config);
    for (let i = 0; i < this.blackIcePatches.length; i++) {
      const patch = this.blackIcePatches[i];
      const rig = createBlackIcePatchMesh(patch.radius);
      rig.group.position.set(patch.x, 0, patch.z);
      this.levelGroup.add(rig.group);
      this.blackIceRigs.set(patch.id, rig);
    }

    // 5d. Cruising City Vehicles (Alpine Bakery Van & Mountain Taxi) looping the Outer Ring Boulevard
    this.trafficCars = createCityTraffic(this.config);
    this.trafficRigs = [];
    for (let i = 0; i < this.trafficCars.length; i++) {
      const car = this.trafficCars[i];
      const rig = createTrafficVehicleRig(car.style, this.textures);
      rig.root.position.set(car.x, 0, car.z);
      rig.root.rotation.y = car.angle;
      this.levelGroup.add(rig.root);
      this.trafficRigs.push(rig);
    }

    // 5e. Collectible Road Supply Crates (Fuel Canisters, Salt Crates, Hot Cocoa Turbo & Coin Crates)
    this.pickups = spawnRoadPickups(this.config, 6);
    this.pickupRigs = [];
    for (let i = 0; i < this.pickups.length; i++) {
      const pk = this.pickups[i];
      const rig = createPickupRig(pk.kind);
      rig.root.position.set(pk.x, 0, pk.z);
      this.levelGroup.add(rig.root);
      this.pickupRigs.push(rig);
    }

    // 6. Reset Shift, Missions, Fuel, Salt Tank, Thermal Blast & Dynamic City Events
    this.truckX = this.config.spawnX;
    this.truckZ = this.config.spawnZ;
    this.truckVx = 0;
    this.truckVz = 0;
    this.truckAngle = this.config.spawnAngle;
    this.steerAngle = 0;
    this.boostEnergy = 1.0;
    this.isBoosting = false;
    this.wasBoosting = false;
    this.saltLevel = 1.0;
    this.isSalting = false;
    this.saltPulseTimer = 0;
    this.saltedTractionTimer = 0;
    this.onBlackIce = false;
    this.blizzardRefillTimer = 0;
    this.fuelLevel = 1.0;
    this.fuelLow = false;
    this.blastCharge = 0.60;
    this.hitstopTimer = 0;
    this.shockwaveTimer = 0;
    this.shockwaveRig.mesh.visible = false;
    this.ambulanceCooldown = 14;
    this.ambulanceProgress = 0;
    this.avalancheCooldown = 20;
    this.plowingIntensity = 0;
    this.plowingHoldTimer = 0;
    this.driftDragSmooth = 0;
    this.waveScale = 0;
    this.elapsedShiftSeconds = 0;
    this.rushTimeLeft = 180;
    this.driftsBusted = 0;
    this.iceMeltedThisShift = 0;
    this.missionsCompleted = 0;
    this.missionSeq = 0;
    this.maxCombo = 0;
    this.maxMultiplier = 1;
    this.combo = {
      count: 0,
      multiplier: 1,
      tierLabel: '',
      timer: 0,
      maxTimer: getTruckStats(this.upgrades).comboDuration,
    };
    this.runStats = null;
    this.shopOpen = false;
    this.spawnDispatchMission();
    this.syncTruckVisuals(0);
    this.applyUpgradesToTruckMesh();
    this.applyLiveryToTruckMesh();
    this.emitHud();
  }

  /**
   * Recomputes smooth sculpted heights, icy plowed-edge vertex colors, and finite-difference normals
   * over a dirty vertex region of the continuous 3D snow blanket (zero allocations).
   */
  private updateSnowFieldRegion(minVx: number, maxVx: number, minVz: number, maxVz: number): void {
    if (!this.snowFieldMesh) return;
    const geo = this.snowFieldMesh.geometry;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const norm = geo.attributes.normal as THREE.BufferAttribute;
    const col = geo.attributes.color as THREE.BufferAttribute;

    const segs = this.snowFieldSegs;
    const cols = segs + 1;
    const gridSize = this.config.gridSize;
    const cellSize = this.config.cellSize;
    const arenaSize = gridSize * cellSize;
    const arenaHalf = arenaSize / 2;
    const step = arenaSize / segs;

    const x0 = Math.max(0, minVx);
    const x1 = Math.min(segs, maxVx);
    const z0 = Math.max(0, minVz);
    const z1 = Math.min(segs, maxVz);

    for (let iz = z0; iz <= z1; iz++) {
      for (let ix = x0; ix <= x1; ix++) {
        const vIdx = iz * cols + ix;
        const wx = pos.getX(vIdx);
        const wz = pos.getZ(vIdx);

        // Bilinear sample across surrounding 4 grid cells
        const fx = (wx + arenaHalf) / cellSize - 0.5;
        const fz = (wz + arenaHalf) / cellSize - 0.5;
        const gx0 = Math.max(0, Math.min(gridSize - 1, Math.floor(fx)));
        const gz0 = Math.max(0, Math.min(gridSize - 1, Math.floor(fz)));
        const gx1 = Math.max(0, Math.min(gridSize - 1, gx0 + 1));
        const gz1 = Math.max(0, Math.min(gridSize - 1, gz0 + 1));
        const tx = Math.max(0, Math.min(1, fx - gx0));
        const tz = Math.max(0, Math.min(1, fz - gz0));

        const c00 = this.snowCells[gz0 * gridSize + gx0];
        const c10 = this.snowCells[gz0 * gridSize + gx1];
        const c01 = this.snowCells[gz1 * gridSize + gx0];
        const c11 = this.snowCells[gz1 * gridSize + gx1];

        const w00 = (1 - tx) * (1 - tz);
        const w10 = tx * (1 - tz);
        const w01 = (1 - tx) * tz;
        const w11 = tx * tz;

        // Smooth cubic-eased height per cell so clearing sweeps smoothly downward
        const eff = (c: SnowCellData): number => {
          if (c.clearAnim <= 0.001) return 0;
          const a = c.clearAnim;
          const eased = a * (2 - a); // smooth shear-collapse curve
          return (c.height + c.bermBoost) * eased;
        };

        const h00 = eff(c00);
        const h10 = eff(c10);
        const h01 = eff(c01);
        const h11 = eff(c11);
        const h = h00 * w00 + h10 * w10 + h01 * w01 + h11 * w11;

        const gWeight =
          (c00.kind === 'golden' ? w00 : 0) +
          (c10.kind === 'golden' ? w10 : 0) +
          (c01.kind === 'golden' ? w01 : 0) +
          (c11.kind === 'golden' ? w11 : 0);

        const bermWeight =
          c00.bermBoost * w00 + c10.bermBoost * w10 + c01.bermBoost * w01 + c11.bermBoost * w11;

        const clearedEdge =
          (c00.kind === 'cleared' || c00.kind === 'none' ? w00 : 0) +
          (c10.kind === 'cleared' || c10.kind === 'none' ? w10 : 0) +
          (c01.kind === 'cleared' || c01.kind === 'none' ? w01 : 0) +
          (c11.kind === 'cleared' || c11.kind === 'none' ? w11 : 0);

        // Smooth C1 continuous height curve (zero abrupt cliff snapping when snow collapses!)
        const edgeFade = Math.min(1, Math.max(0, h / 0.14));
        const smoothEdge = edgeFade * edgeFade * (3 - 2 * edgeFade);
        const undul =
          (Math.sin(wx * 1.15 + wz * 0.72) * 0.042 + Math.cos(wx * 0.64 - wz * 1.28) * 0.034) *
          Math.min(1, h / 0.25);
        const y = -0.052 + smoothEdge * (0.072 + h + undul);
        pos.setY(vIdx, y);

        // Rich natural snow vertex shading: ivory sunlit crests, glacier-blue sheared banks, warm golden drifts
        let r = 0.955;
        let g = 0.975;
        let b = 0.998;

        if (gWeight > 0.10) {
          const gt = Math.min(1, gWeight * 1.45);
          r = r + (1.0 - r) * gt;
          g = g + (0.76 - g) * gt;
          b = b + (0.20 - b) * gt;
        } else {
          // Sculpted glacier-blue subsurface shadow along freshly cut snowbank walls & deep drift hollows
          const cutShadow = clearedEdge > 0.08 && h > 0.03 ? Math.min(1, clearedEdge * 1.45) * 0.85 : 0;
          const driftDepth = h > 0.50 ? Math.min(1, (h - 0.50) / 0.50) * 0.55 : 0;
          const bermCrest = Math.min(1, bermWeight / 0.20) * 0.20;
          const coolMix = Math.max(0, cutShadow + driftDepth - bermCrest);
          r -= coolMix * 0.24;
          g -= coolMix * 0.12;
          b += coolMix * 0.01;
        }

        col.setXYZ(vIdx, Math.min(1, Math.max(0.55, r)), Math.min(1, Math.max(0.68, g)), Math.min(1, b));
      }
    }

    // Recompute smooth finite-difference vertex normals across affected region + 1-ring border
    const nx0 = Math.max(0, x0 - 1);
    const nx1 = Math.min(segs, x1 + 1);
    const nz0 = Math.max(0, z0 - 1);
    const nz1 = Math.min(segs, z1 + 1);
    const twoStep = step * 2;

    for (let iz = nz0; iz <= nz1; iz++) {
      const izU = Math.max(0, iz - 1);
      const izD = Math.min(segs, iz + 1);
      for (let ix = nx0; ix <= nx1; ix++) {
        const ixL = Math.max(0, ix - 1);
        const ixR = Math.min(segs, ix + 1);
        const yL = pos.getY(iz * cols + ixL);
        const yR = pos.getY(iz * cols + ixR);
        const yU = pos.getY(izU * cols + ix);
        const yD = pos.getY(izD * cols + ix);

        const dx = yL - yR;
        const dy = twoStep;
        const dz = yU - yD;
        const inv = 1 / Math.hypot(dx, dy, dz);
        norm.setXYZ(iz * cols + ix, dx * inv, dy * inv, dz * inv);
      }
    }

    pos.needsUpdate = true;
    norm.needsUpdate = true;
    col.needsUpdate = true;
  }

  private applyUpgradesToTruckMesh(): void {
    const stats = applyVehicleToStats(getTruckStats(this.upgrades), this.vehicleId);
    const baseBlade = this.vehicleId === 'snocat' ? 3.2 : this.vehicleId === 'unimog' ? 3.0 : 2.4;
    const widthScale = stats.bladeWidth / baseBlade;
    this.truck.bladeScaleGroup.scale.set(widthScale, 1 + (this.upgrades.bladeWidth - 1) * 0.04, 1);
    this.truck.heatedCoilMat.emissiveIntensity =
      stats.heatedGlow * 1.95 + (this.combo.multiplier >= 4 ? 0.9 : 0);
    this.truck.blowerChutes.visible = this.vehicleId === 'snocat' || this.upgrades.snowBlower >= 2;
  }

  private applyLiveryToTruckMesh(): void {
    const def = getLiveryDefinition(this.livery);
    this.truck.paintPrimaryMat.color.setHex(def.primaryHex);
    this.truck.paintTrimMat.color.setHex(def.trimHex);
    this.truck.bladeAccentMat.color.setHex(def.bladeHex);
  }

  private rebuildVehicleMesh(): void {
    if (this.truck) {
      this.scene.remove(this.truck.root);
    }
    this.truck = createVehicleRig(this.vehicleId, this.textures);
    this.scene.add(this.truck.root);
    this.syncTruckVisuals(0);
    this.applyUpgradesToTruckMesh();
    this.applyLiveryToTruckMesh();
  }

  private spawnDispatchMission(): void {
    if (this.dispatchBeacon) {
      this.levelGroup.remove(this.dispatchBeacon.root);
      this.dispatchBeacon = null;
    }
    this.activeMission = spawnNextMission(
      this.config,
      this.missionSeq,
      this.snowCells,
      this.blackIcePatches,
      this.driftsBusted,
      this.iceMeltedThisShift
    );
    this.missionSeq += 1;

    if (this.activeMission.radius > 0) {
      const rig = createDispatchBeaconRig(
        this.activeMission.radius,
        this.activeMission.kind === 'rescueCar',
        this.textures
      );
      rig.root.position.set(this.activeMission.x, 0, this.activeMission.z);
      this.levelGroup.add(rig.root);
      this.dispatchBeacon = rig;
    }
  }

  private addWorldPopup(
    text: string,
    tone: FloatingPopup['tone'],
    wx: number,
    wy: number,
    wz: number
  ): void {
    this.popupSeq += 1;
    this.worldPopups.push({
      id: this.popupSeq,
      text,
      tone,
      wx,
      wy,
      wz,
      life: 1.45,
      maxLife: 1.45,
    });
    if (this.worldPopups.length > 6) {
      this.worldPopups.shift();
    }
  }

  private checkCareerAchievements(): void {
    const clearedPct = calculateClearedPercent(this.clearedSnowTiles, this.totalSnowTiles);
    const newly = evaluateAchievements(
      this.careerStats,
      this.upgrades,
      this.bestScore,
      this.maxMultiplier,
      clearedPct,
      this.achievements
    );
    if (newly.length === 0) return;

    for (const ach of newly) {
      this.achievements.push(ach.id);
      this.coins += ach.rewardCoins;
      this.achievementToastSeq += 1;
      this.recentAchievement = {
        id: this.achievementToastSeq,
        title: ach.title,
        rewardCoins: ach.rewardCoins,
      };
      this.achievementToastTimer = 3.8;
    }
    this.audio.playAchievementUnlock();
    this.saveCareer();
    this.emitHud();
  }

  // --- Public Controls Wired to React Game Shell ---

  public setGameMode(mode: GameMode): void {
    this.mode = mode;
    this.rushTimeLeft = 180;
    this.emitHud();
  }

  public toggleCameraMode(): CameraMode {
    this.audio.unlock();
    this.cameraMode = this.cameraMode === 'isometric' ? 'chase' : 'isometric';
    this.activeCamera = this.cameraMode === 'chase' ? this.chaseCamera : this.camera;
    this.audio.playCameraSwitch();
    this.triggerCallout(
      this.cameraMode === 'chase'
        ? '3D Chase Cam! W/S Drive · A/D Steer'
        : 'Isometric Tactical View · Scroll to Zoom'
    );
    this.syncCameraPosition(1);
    this.emitHud();
    return this.cameraMode;
  }

  public setCameraMode(mode: CameraMode): void {
    this.cameraMode = mode;
    this.activeCamera = mode === 'chase' && this.phase !== 'title' ? this.chaseCamera : this.camera;
    this.syncCameraPosition(1);
    this.emitHud();
  }

  public cycleDayNight(): TimeOfDay {
    this.audio.unlock();
    this.timeOfDay = cycleTimeOfDay(this.timeOfDay);
    this.updateWeather(0.016);
    this.triggerCallout(`Sky: ${TIME_OF_DAY_PROFILES[this.timeOfDay].label}`);
    this.emitHud();
    return this.timeOfDay;
  }

  public setTimeOfDay(tod: TimeOfDay): void {
    this.timeOfDay = tod;
    this.updateWeather(0.016);
    this.emitHud();
  }

  public triggerThermalBlast(): boolean {
    this.audio.unlock();
    if (this.phase !== 'playing' || this.shopOpen) return false;
    if (this.blastCharge < 0.99) {
      this.triggerCallout(`Snow-Blast Charging (${Math.round(this.blastCharge * 100)}%) — Keep Plowing!`);
      this.emitHud();
      return false;
    }

    this.blastCharge = 0;
    this.hitstopTimer = 0.048; // Crisp tactile 48ms impact hitstop!
    this.shakeTrauma = Math.min(0.85, this.shakeTrauma + 0.58);
    this.squashY = 1.24;
    this.shockwaveTimer = 0.62;
    this.shockwaveRig.mesh.position.set(this.truckX, 0.24, this.truckZ);
    this.shockwaveRig.mesh.scale.setScalar(0.5);
    this.shockwaveRig.mesh.visible = true;
    this.audio.playThermalBlast();

    const stats = applyVehicleToStats(getTruckStats(this.upgrades), this.vehicleId);
    const radius = 6.8 + (this.vehicleId === 'snocat' ? 1.4 : 0);
    const blastHits = findCellsInBlastRadius(
      this.snowCells,
      this.config.gridSize,
      this.config.cellSize,
      this.truckX,
      this.truckZ,
      radius
    );

    let minGx = 999;
    let maxGx = -1;
    let minGz = 999;
    let maxGz = -1;
    let totalCleared = 0;
    let bonusStreak = 0;
    let xpGain = 0;

    for (let i = 0; i < blastHits.length; i++) {
      const idx = blastHits[i];
      const cell = this.snowCells[idx];
      const prev = cell.kind;
      if (prev !== 'snow' && prev !== 'drift' && prev !== 'golden') continue;
      cell.kind = 'cleared';
      cell.clearAnim = 0.65;
      this.animatingSnowIndices.push(idx);
      this.clearedSnowTiles += 1;
      this.careerStats.totalTilesCleared += 1;
      totalCleared += 1;
      if (prev === 'drift') {
        this.driftsBusted += 1;
        this.careerStats.totalDriftsBusted += 1;
      } else if (prev === 'golden') {
        const beacon = this.goldenBeacons.get(idx);
        if (beacon) {
          this.levelGroup.remove(beacon);
          this.goldenBeacons.delete(idx);
        }
        if (this.mode === 'rush') this.rushTimeLeft += 8;
      }
      const r = calculateCellReward(prev, this.combo.multiplier, stats.coinMultiplier, stats.xpMultiplier);
      this.coins += r.coins;
      this.score += r.score;
      xpGain += r.xp;
      bonusStreak += r.bonusStreak;
      if (cell.gx < minGx) minGx = cell.gx;
      if (cell.gx > maxGx) maxGx = cell.gx;
      if (cell.gz < minGz) minGz = cell.gz;
      if (cell.gz > maxGz) maxGz = cell.gz;
    }

    if (maxGx >= minGx && maxGz >= minGz && this.snowFieldMesh) {
      const vScale = this.snowFieldSegs / this.config.gridSize;
      this.updateSnowFieldRegion(
        Math.floor(minGx * vScale) - 2,
        Math.ceil((maxGx + 1) * vScale) + 2,
        Math.floor(minGz * vScale) - 2,
        Math.ceil((maxGz + 1) * vScale) + 2
      );
    }

    // Also shatter/melt any Black-Ice patches within the thermal wave!
    for (let i = 0; i < this.blackIcePatches.length; i++) {
      const p = this.blackIcePatches[i];
      if (p.melted) continue;
      if (Math.hypot(p.x - this.truckX, p.z - this.truckZ) <= radius + p.radius) {
        p.melted = true;
        p.meltProgress = 1;
        const rig = this.blackIceRigs.get(p.id);
        if (rig) rig.group.visible = false;
        this.iceMeltedThisShift += 1;
        this.careerStats.icePatchesMelted += 1;
        this.coins += 30;
        this.score += 120;
      }
    }

    if (totalCleared > 0) {
      this.combo = advanceComboOnClear(
        this.combo,
        totalCleared,
        bonusStreak + 4,
        stats.comboDuration
      ).next;
      if (this.combo.count > this.maxCombo) this.maxCombo = this.combo.count;
      if (this.combo.multiplier > this.maxMultiplier) this.maxMultiplier = this.combo.multiplier;
      if (xpGain > 0) this.grantExperience(xpGain);
    }

    // Explosive radial snow & amber shockwave burst
    for (let k = 0; k < 28; k++) {
      const ang = (k / 28) * Math.PI * 2;
      const spd = 4.5 + Math.random() * 4.5;
      this.spawnParticle(
        k % 3 === 0 ? 'gold' : 'snow',
        this.truckX + Math.cos(ang) * 1.4,
        0.7,
        this.truckZ + Math.sin(ang) * 1.4,
        Math.cos(ang) * spd,
        3.6 + Math.random() * 2.8,
        Math.sin(ang) * spd,
        0.9,
        1.15
      );
    }
    for (let m = 0; m < 12; m++) {
      const ang = (m / 12) * Math.PI * 2;
      this.spawnMist(
        this.truckX + Math.cos(ang) * 2.2,
        0.8,
        this.truckZ + Math.sin(ang) * 2.2,
        Math.cos(ang) * 3.8,
        2.2,
        Math.sin(ang) * 3.8,
        0.95,
        2.4,
        m % 2 === 0
      );
    }

    this.addWorldPopup(`THERMAL BLAST! (${totalCleared})`, 'gold', this.truckX, 2.5, this.truckZ);
    this.triggerCallout(`Thermal Snow-Blast cleared ${totalCleared} snow tiles!`);
    this.checkCareerAchievements();
    this.emitHud();
    return true;
  }

  public selectOrBuyVehicle(id: VehicleId): boolean {
    this.audio.unlock();
    if (this.unlockedVehicles.includes(id)) {
      this.vehicleId = id;
      this.rebuildVehicleMesh();
      this.audio.playUpgradePurchase();
      const def = getVehicleDefinition(id);
      this.triggerCallout(`Deployed ${def.name}!`);
      this.saveCareer();
      this.emitHud();
      return true;
    }
    if (!canUnlockVehicle(id, this.unlockedVehicles, this.coins, this.driverLevel)) {
      return false;
    }
    const def = getVehicleDefinition(id);
    this.coins -= def.cost;
    this.unlockedVehicles = [...this.unlockedVehicles, id];
    this.vehicleId = id;
    this.rebuildVehicleMesh();
    this.audio.playLevelUp();
    this.squashY = 1.2;
    this.triggerCallout(`Unlocked & Deployed ${def.name}!`);
    this.saveCareer();
    this.emitHud();
    return true;
  }

  public triggerSaltPulse(): void {
    this.audio.unlock();
    if (this.phase !== 'playing' || this.shopOpen) return;
    if (this.saltLevel <= 0.04) {
      this.triggerCallout('Salt Tank Empty — Drive to Green Fuel+Salt Bay!');
      this.emitHud();
      return;
    }
    this.saltPulseTimer = 1.6;
  }

  public selectOrBuyLivery(id: LiveryId): boolean {
    this.audio.unlock();
    if (this.unlockedLiveries.includes(id)) {
      this.livery = id;
      this.applyLiveryToTruckMesh();
      this.audio.playUpgradePurchase();
      this.saveCareer();
      this.emitHud();
      return true;
    }
    if (!canUnlockLivery(id, this.unlockedLiveries, this.coins, this.driverLevel)) {
      return false;
    }
    const def = getLiveryDefinition(id);
    this.coins -= def.cost;
    this.unlockedLiveries = [...this.unlockedLiveries, id];
    this.livery = id;
    this.applyLiveryToTruckMesh();
    this.audio.playUpgradePurchase();
    this.triggerCallout(`Equipped ${def.name} Livery!`);
    this.saveCareer();
    this.emitHud();
    return true;
  }

  public startGame(mode?: GameMode): void {
    if (mode) this.mode = mode;
    this.audio.unlock();
    this.keysHeld.clear();
    this.pointerActive = false;
    this.shopOpen = false;
    if (this.phase === 'gameover') {
      this.loadNeighborhood(this.neighborhoodIndex, false);
    } else if (this.mode === 'rush') {
      this.rushTimeLeft = 180;
    }
    this.phase = 'playing';
    this.targetFrustumSize = 22.5;
    this.activeCamera = this.cameraMode === 'chase' ? this.chaseCamera : this.camera;
    this.syncCameraPosition(1);
    this.triggerCallout(
      this.mode === 'rush'
        ? `Storm Rush: Clear ${this.config.name} before time runs out!`
        : `${this.config.name} — Let's Plow!`
    );
    this.emitHud();
  }

  public continuePlowing(): void {
    this.audio.unlock();
    this.keysHeld.clear();
    this.pointerActive = false;
    this.shopOpen = false;
    this.runStats = null;
    this.phase = 'playing';
    this.targetFrustumSize = 22.5;
    this.triggerCallout(`Keep Plowing ${this.config.name} to 100%!`);
    this.emitHud();
  }

  public selectNeighborhood(index: number): void {
    if (index < 0 || index >= this.unlockedDistricts) return;
    this.audio.unlock();
    this.keysHeld.clear();
    this.pointerActive = false;
    this.loadNeighborhood(index, false);
    this.phase = 'playing';
    this.targetFrustumSize = 22.5;
    this.activeCamera = this.cameraMode === 'chase' ? this.chaseCamera : this.camera;
    this.syncCameraPosition(1);
    this.triggerCallout(`Arrived at ${this.config.name}!`);
    this.emitHud();
  }

  public selectTitleNeighborhood(index: number): void {
    if (index < 0 || index >= this.unlockedDistricts) return;
    this.audio.unlock();
    this.loadNeighborhood(index, false);
    this.syncCameraPosition(1);
    this.emitHud();
  }

  public nextNeighborhood(): void {
    this.audio.unlock();
    this.keysHeld.clear();
    this.pointerActive = false;
    const nextIdx = (this.neighborhoodIndex + 1) % NEIGHBORHOODS.length;
    this.unlockedDistricts = Math.max(this.unlockedDistricts, nextIdx + 1);
    this.saveCareer();
    this.loadNeighborhood(nextIdx, false);
    this.phase = 'playing';
    this.targetFrustumSize = 22.5;
    this.triggerCallout(`Welcome to ${this.config.name}!`);
    this.emitHud();
  }

  public restartShift(resetAll = false): void {
    this.audio.unlock();
    this.keysHeld.clear();
    this.pointerActive = false;
    this.loadNeighborhood(resetAll ? 0 : this.neighborhoodIndex, resetAll);
    this.phase = 'playing';
    this.targetFrustumSize = 22.5;
    this.triggerCallout(resetAll ? 'New Career Started!' : `Fresh Snowfall in ${this.config.name}!`);
    this.emitHud();
  }

  public resetCareer(): void {
    this.restartShift(true);
  }

  public returnToTitle(): void {
    this.keysHeld.clear();
    this.pointerActive = false;
    this.shopOpen = false;
    this.phase = 'title';
    this.targetFrustumSize = 33.0;
    this.audio.updateContinuous(false, 0, 0, false);
    this.saveCareer();
    this.emitHud();
  }

  public togglePause(): void {
    if (this.phase === 'playing') {
      this.shopOpen = false;
      this.phase = 'paused';
      this.keysHeld.clear();
      this.pointerActive = false;
      this.audio.updateContinuous(false, 0, 0, false);
      this.saveCareer();
      this.emitHud();
    } else if (this.phase === 'paused') {
      this.phase = 'playing';
      this.keysHeld.clear();
      this.emitHud();
    }
  }

  public setShopOpen(open: boolean): void {
    if (this.phase !== 'playing' && this.phase !== 'title') return;
    this.audio.unlock();
    this.shopOpen = open;
    if (open) {
      this.keysHeld.clear();
      this.pointerActive = false;
      this.audio.updateContinuous(false, 0, 0, false);
    }
    this.emitHud();
  }

  public toggleShop(): void {
    this.setShopOpen(!this.shopOpen);
  }

  public buyUpgrade(id: UpgradeId): boolean {
    this.audio.unlock();
    const result = purchaseUpgrade(id, this.upgrades, this.coins, this.skillPoints);
    if (!result.purchased) return false;
    this.upgrades = result.upgrades;
    this.coins = result.coins;
    this.skillPoints = result.skillPoints;
    this.applyUpgradesToTruckMesh();
    this.audio.playUpgradePurchase();
    this.squashY = 1.18;
    const def = getUpgradeDefinition(id);
    this.triggerCallout(
      `${def.name} Lv ${this.upgrades[id]}${result.usedSkillPoint ? ' (1 SP)' : ''}!`
    );
    this.checkCareerAchievements();
    this.saveCareer();
    this.emitHud();
    return true;
  }

  public toggleMute(): boolean {
    this.audio.unlock();
    const muted = this.audio.toggleMute();
    this.emitHud();
    return muted;
  }

  public cycleWeather(): WeatherKind {
    this.audio.unlock();
    const res = cycleNextWeather(this.weatherState, 1.8);
    if (res.callout) {
      this.triggerCallout(res.callout);
    }
    this.emitHud();
    return res.newTarget;
  }

  public setWeather(kind: WeatherKind): void {
    const res = setTargetWeather(this.weatherState, kind, 1.8);
    if (res.changed && res.callout) {
      this.triggerCallout(res.callout);
    }
    this.emitHud();
  }

  private triggerCallout(text: string): void {
    this.calloutText = text;
    this.calloutId += 1;
    this.calloutTimer = 2.6;
  }

  // --- Event Listeners (Window WASD/Arrows, Blur Release, Pointer Drag, ResizeObserver) ---

  private onKeyDown = (e: KeyboardEvent): void => {
    const code = e.code;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) {
      if (this.phase === 'playing' || this.phase === 'title') {
        e.preventDefault();
      }
    }
    this.audio.unlock();
    this.keysHeld.add(code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keysHeld.delete(e.code);
  };

  private onWindowBlur = (): void => {
    this.keysHeld.clear();
    this.pointerActive = false;
  };

  private onVisibilityChange = (): void => {
    if (document.hidden) {
      this.keysHeld.clear();
      this.pointerActive = false;
    }
  };

  private onGlobalPointerUnlock = (): void => {
    this.audio.unlock();
  };

  private onPointerDown = (e: PointerEvent): void => {
    this.audio.unlock();
    if (this.phase !== 'playing' || this.shopOpen) return;
    if (e.button !== 0) return;
    this.pointerActive = true;
    this.updatePointerDirection(e.clientX, e.clientY);
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.pointerActive || this.phase !== 'playing' || this.shopOpen) return;
    this.updatePointerDirection(e.clientX, e.clientY);
  };

  private onPointerUp = (): void => {
    this.pointerActive = false;
  };

  private updatePointerDirection(clientX: number, clientY: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1);
    if (Math.hypot(ndcX, ndcY) < 0.06) {
      this.pointerDirX = 0;
      this.pointerDirZ = 0;
      return;
    }
    // Map screen direction to isometric XZ world plane
    // Isometric camera sits at (+1, +1.15, +1) -> screen-up = (-1, -1), screen-right = (1, -1)
    const wx = ndcX - ndcY;
    const wz = -ndcX - ndcY;
    const len = Math.hypot(wx, wz) || 1;
    this.pointerDirX = wx / len;
    this.pointerDirZ = wz / len;
  }

  private handleResize = (): void => {
    if (this.disposed) return;
    const width = Math.max(1, this.container.clientWidth || window.innerWidth);
    const height = Math.max(1, this.container.clientHeight || window.innerHeight);
    const aspect = width / height;
    this.camera.left = (-this.frustumSize * aspect) / 2;
    this.camera.right = (this.frustumSize * aspect) / 2;
    this.camera.top = this.frustumSize / 2;
    this.camera.bottom = -this.frustumSize / 2;
    this.camera.updateProjectionMatrix();
    this.chaseCamera.aspect = aspect;
    this.chaseCamera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.composer.setSize(width, height);
    const bloomScale = this.isSoftwareGl ? 0.25 : 0.5;
    this.bloomPass.resolution.set(
      Math.max(1, Math.floor(width * bloomScale)),
      Math.max(1, Math.floor(height * bloomScale))
    );
  };

  private onWheel = (e: WheelEvent): void => {
    if (this.phase !== 'playing' || this.shopOpen || this.cameraMode !== 'isometric') return;
    e.preventDefault();
    this.isoZoomOffset = THREE.MathUtils.clamp(
      this.isoZoomOffset + Math.sign(e.deltaY) * 1.8,
      -6.5,
      9.0
    );
  };

  private onContextLost = (e: Event): void => {
    e.preventDefault();
  };

  private bindEvents(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('pointerdown', this.onGlobalPointerUnlock, { passive: true });
    window.addEventListener('blur', this.onWindowBlur);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('resize', this.handleResize);

    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.onPointerDown);
    dom.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    dom.addEventListener('webglcontextlost', this.onContextLost);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      this.resizeObserver.observe(this.container);
    }
  }

  // --- Simulation & Render Loop ---

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (gl && typeof gl.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    } else {
      this.frameId = window.setTimeout(cb, 80);
    }
  }

  private tick = (): void => {
    if (this.disposed) return;

    const now = performance.now();
    const rawDt = Math.max(0.001, (now - this.lastTimeMs) / 1000);
    this.lastTimeMs = now;
    const dt = Math.min(rawDt, 0.05);

    this.update(dt);
    this.renderPass.camera = this.activeCamera;
    this.composer.render();

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private update(dt: number): void {
    // Advance dynamic weather + Time-of-Day atmosphere
    this.updateWeather(dt);

    // Always animate snowfall, chimney smoke, particles, mist, pedestrians, city traffic, beacons & supply pickups
    this.updateAmbientSnow(dt);
    this.updateChimneySmoke(dt);
    this.updateParticles(dt);
    this.updateMistParticles(dt);
    this.updatePedestrians(dt);
    this.updateTraffic(dt);
    this.truck.beaconGroup.rotation.y += dt * 5.2;

    this.goldenAnimTime += dt;
    this.goldenBeacons.forEach((mesh, idx) => {
      mesh.rotation.y = this.goldenAnimTime * 2.4 + idx;
      mesh.position.y = 1.32 + Math.sin(this.goldenAnimTime * 3.2 + idx) * 0.18;
    });

    // Bob & spin collectible road supply crates
    for (let i = 0; i < this.pickups.length; i++) {
      const pk = this.pickups[i];
      const rig = this.pickupRigs[i];
      if (!rig) continue;
      rig.root.visible = !pk.collected;
      if (!pk.collected) {
        rig.body.rotation.y = this.goldenAnimTime * 2.0 + pk.bobPhase;
        rig.body.position.y = 0.72 + Math.sin(this.goldenAnimTime * 3.2 + pk.bobPhase) * 0.16;
      }
    }

    // Animate Thermal Snow-Blast shockwave ring even during impact hitstop!
    if (this.shockwaveTimer > 0) {
      this.shockwaveTimer = Math.max(0, this.shockwaveTimer - dt);
      const prog = 1 - this.shockwaveTimer / 0.62;
      this.shockwaveRig.mesh.scale.setScalar(0.6 + prog * 7.6);
      this.shockwaveRig.mat.opacity = (1 - prog) * 0.85;
      if (this.shockwaveTimer <= 0) {
        this.shockwaveRig.mesh.visible = false;
      }
    }

    if (this.dispatchBeacon) {
      this.dispatchBeacon.diamondMesh.rotation.y = this.goldenAnimTime * 2.1;
      const baseH = this.activeMission?.kind === 'rescueCar' ? 3.2 : 2.9;
      this.dispatchBeacon.diamondMesh.position.y = baseH + Math.sin(this.goldenAnimTime * 3.0) * 0.24;
      if (this.dispatchBeacon.hazardMat) {
        const blink = Math.sin(this.goldenAnimTime * 9.0) > 0 ? 2.8 : 0.25;
        this.dispatchBeacon.hazardMat.emissiveIntensity = blink;
      }
    }

    if (this.achievementToastTimer > 0) {
      this.achievementToastTimer = Math.max(0, this.achievementToastTimer - dt);
      if (this.achievementToastTimer === 0) {
        this.recentAchievement = null;
      }
    }

    for (let i = this.worldPopups.length - 1; i >= 0; i--) {
      const wp = this.worldPopups[i];
      wp.life -= dt;
      wp.wy += dt * 1.45;
      if (wp.life <= 0) {
        this.worldPopups.splice(i, 1);
      }
    }

    if (this.calloutTimer > 0) {
      this.calloutTimer = Math.max(0, this.calloutTimer - dt);
      if (this.calloutTimer === 0) {
        this.calloutText = '';
      }
    }

    if (this.shakeTrauma > 0) {
      this.shakeTrauma = Math.max(0, this.shakeTrauma - dt * 2.4);
    }

    if (this.bumpCooldown > 0) {
      this.bumpCooldown = Math.max(0, this.bumpCooldown - dt);
    }

    // Brief 45ms impact hitstop on heavy Thermal Snow-Blast & Avalanche crashes (camera shake & shockwave keep ticking!)
    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
    } else if (this.phase === 'playing' && !this.shopOpen) {
      this.stepGameplay(dt);
    } else {
      this.audio.updateContinuous(false, 0, 0, false);
    }

    this.updateWaypointArrow();
    this.syncCameraPosition(dt);

    // Throttle React HUD updates to ~10Hz
    this.hudThrottleAccum += dt;
    if (this.hudThrottleAccum >= 0.095) {
      this.hudThrottleAccum = 0;
      this.emitHud();
    }
  }

  private stepGameplay(dt: number): void {
    const vehicleDef = getVehicleDefinition(this.vehicleId);
    const stats = applyVehicleToStats(getTruckStats(this.upgrades), this.vehicleId);

    // 1. Cozy Shift Clock (or Storm Rush Countdown), Periodic Auto-Save & Combo Timer
    this.elapsedShiftSeconds += dt;
    if (this.mode === 'rush' && !this.districtCleared) {
      this.rushTimeLeft = Math.max(0, this.rushTimeLeft - dt);
      if (this.rushTimeLeft <= 0) {
        const clearedPctNow = calculateClearedPercent(this.clearedSnowTiles, this.totalSnowTiles);
        this.finishShift(false, clearedPctNow, 'timeup');
        return;
      }
    }
    this.saveTimer += dt;
    if (this.saveTimer >= 6) {
      this.saveTimer = 0;
      this.saveCareer();
    }
    this.combo = tickComboTimer(this.combo, dt);

    // 2. Dual-Mode Controls: Screen-Relative Isometric WASD vs 3D Behind-Truck Chase Car Controls
    let screenX = 0;
    let screenY = 0;
    if (this.keysHeld.has('KeyW') || this.keysHeld.has('ArrowUp')) screenY += 1;
    if (this.keysHeld.has('KeyS') || this.keysHeld.has('ArrowDown')) screenY -= 1;
    if (this.keysHeld.has('KeyD') || this.keysHeld.has('ArrowRight')) screenX += 1;
    if (this.keysHeld.has('KeyA') || this.keysHeld.has('ArrowLeft')) screenX -= 1;

    const isChaseMode = this.cameraMode === 'chase';
    let inputX = 0;
    let inputZ = 0;
    let chaseThrottle = 0;
    let chaseSteer = 0;

    if (isChaseMode) {
      chaseThrottle = screenY;
      chaseSteer = -screenX; // A (+1) turns left, D (-1) turns right
      if (chaseThrottle === 0 && this.pointerActive) {
        chaseThrottle = 1;
      }
    } else if (screenX !== 0 || screenY !== 0) {
      // Camera looks along (-1, -1.15, -1): screen-up = (-1, -1), screen-right = (1, -1)
      inputX = screenX - screenY;
      inputZ = -screenX - screenY;
      const len = Math.hypot(inputX, inputZ) || 1;
      inputX /= len;
      inputZ /= len;
    } else if (this.pointerActive && (this.pointerDirX !== 0 || this.pointerDirZ !== 0)) {
      inputX = this.pointerDirX;
      inputZ = this.pointerDirZ;
    }

    const hasInput = isChaseMode ? chaseThrottle !== 0 || chaseSteer !== 0 : inputX !== 0 || inputZ !== 0;

    // 3. Diesel Fuel System + Drive-in Green FUEL+SALT Service Bay Auto-Refill
    const nearGarage = Math.hypot(this.truckX - this.garagePos.x, this.truckZ - this.garagePos.z) < 5.0;
    const prevSpeedRatio = Math.hypot(this.truckVx, this.truckVz) / Math.max(1, stats.maxSpeed);

    // Turbo Boost (Space or Shift)
    const wantsBoost =
      (this.keysHeld.has('Space') || this.keysHeld.has('ShiftLeft') || this.keysHeld.has('ShiftRight')) &&
      hasInput &&
      this.fuelLevel > 0.02;
    if (wantsBoost && this.boostEnergy > 0.06) {
      this.isBoosting = true;
      this.boostEnergy = Math.max(0, this.boostEnergy - stats.boostDrainRate * dt);
      if (!this.wasBoosting) {
        this.audio.playBoostBurst();
        this.squashY = 0.88;
      }
      // Spawn cozy warm exhaust boost sparks
      const fwdX = Math.sin(this.truckAngle);
      const fwdZ = Math.cos(this.truckAngle);
      if (Math.random() < 0.75) {
        this.spawnParticle(
          'boost',
          this.truckX - fwdX * 1.1 + (Math.random() - 0.5) * 0.6,
          1.75,
          this.truckZ - fwdZ * 1.1 + (Math.random() - 0.5) * 0.6,
          -fwdX * 2.5 + (Math.random() - 0.5) * 1.2,
          1.8 + Math.random() * 1.4,
          -fwdZ * 2.5 + (Math.random() - 0.5) * 1.2,
          0.35,
          0.65
        );
      }
    } else {
      this.isBoosting = false;
      this.boostEnergy = Math.min(1, this.boostEnergy + stats.boostRegenRate * dt);
    }
    this.wasBoosting = this.isBoosting;

    const fuelStep = stepFuelSystem(
      this.fuelLevel,
      prevSpeedRatio,
      this.isBoosting,
      nearGarage,
      vehicleDef.fuelCapMult,
      dt
    );
    const wasFuelLow = this.fuelLow;
    this.fuelLevel = fuelStep.fuel;
    this.fuelLow = fuelStep.lowFuel;
    if (fuelStep.refueledNow) {
      this.audio.playPickupCollect();
      this.addWorldPopup('FUEL + SALT FULL!', 'rescue', this.truckX, 2.3, this.truckZ);
    } else if (!wasFuelLow && this.fuelLow) {
      this.triggerCallout('Low Diesel Fuel! Drive to Green Service Bay or grab a Red Fuel Can!');
    }

    // 3b. Active Rock-Salt Spreader (Hold E/Q or click Salt HUD button) + Service Bay Auto-Refill
    if (nearGarage && this.saltLevel < 1) {
      const prevSalt = this.saltLevel;
      this.saltLevel = Math.min(1, this.saltLevel + dt * 0.55);
      if (prevSalt < 0.95 && this.saltLevel >= 0.95 && !fuelStep.refueledNow) {
        this.addWorldPopup('SALT REFILLED!', 'gold', this.truckX, 2.2, this.truckZ);
      }
    } else {
      // Gentle passive trickle so player is never permanently stranded without salt
      this.saltLevel = Math.min(1, this.saltLevel + dt * 0.022);
    }

    if (this.saltPulseTimer > 0) {
      this.saltPulseTimer = Math.max(0, this.saltPulseTimer - dt);
    }
    const wantsSalt =
      this.keysHeld.has('KeyE') || this.keysHeld.has('KeyQ') || this.saltPulseTimer > 0;
    if (wantsSalt && this.saltLevel > 0.02) {
      this.isSalting = true;
      this.saltLevel = Math.max(0, this.saltLevel - (dt * 0.22) / Math.max(0.5, vehicleDef.saltCapMult));
      this.saltedTractionTimer = 1.6;
      this.audio.playSaltSprinkle();

      // Launch glittering rock-salt crystals behind rear bumper
      const backX = -Math.sin(this.truckAngle);
      const backZ = -Math.cos(this.truckAngle);
      const sideX = Math.cos(this.truckAngle);
      const sideZ = -Math.sin(this.truckAngle);
      for (let s = 0; s < 2; s++) {
        const fan = (Math.random() - 0.5) * 3.4;
        this.spawnParticle(
          'salt',
          this.truckX + backX * 1.35 + sideX * fan * 0.22,
          0.52,
          this.truckZ + backZ * 1.35 + sideZ * fan * 0.22,
          backX * (2.0 + Math.random() * 1.4) + sideX * fan,
          1.2 + Math.random() * 0.9,
          backZ * (2.0 + Math.random() * 1.4) + sideZ * fan,
          0.52,
          0.52
        );
      }

      // Melt nearby Black-Ice Patches & update their visual fade
      const newlyMelted = applySaltToPatches(
        this.truckX,
        this.truckZ,
        this.truckAngle,
        this.blackIcePatches,
        dt
      );
      for (let i = 0; i < this.blackIcePatches.length; i++) {
        const p = this.blackIcePatches[i];
        const rig = this.blackIceRigs.get(p.id);
        if (!rig) continue;
        if (p.melted) {
          rig.group.visible = false;
        } else if (p.meltProgress > 0) {
          const rem = 1 - p.meltProgress;
          rig.group.scale.setScalar(0.35 + rem * 0.65);
          rig.iceMat.opacity = 0.72 * rem;
          rig.rimMat.opacity = 0.78 * rem;
        }
      }
      for (const meltedId of newlyMelted) {
        const patch = this.blackIcePatches.find((p) => p.id === meltedId);
        this.iceMeltedThisShift += 1;
        this.careerStats.icePatchesMelted += 1;
        this.coins += 30;
        this.score += 120;
        this.grantExperience(28);
        this.audio.playIceMelt();
        this.addWorldPopup(
          'ICE MELTED! +30',
          'ice',
          patch?.x ?? this.truckX,
          1.5,
          patch?.z ?? this.truckZ
        );
        this.checkCareerAchievements();
      }
    } else {
      this.isSalting = false;
    }

    if (this.saltedTractionTimer > 0) {
      this.saltedTractionTimer = Math.max(0, this.saltedTractionTimer - dt);
    }

    // Check Black-Ice Contact Hazard (Glacier Rotary Sno-Cat caterpillar treads are Black-Ice Immune!)
    const iceHit = checkBlackIceContact(this.truckX, this.truckZ, this.blackIcePatches);
    this.onBlackIce = vehicleDef.iceImmune ? false : Boolean(iceHit);

    // 4. Smooth Heading & Velocity with Weather + Black-Ice + Rock-Salt + Fuel Limp Traction Physics
    this.driftDragSmooth = THREE.MathUtils.damp(this.driftDragSmooth, 0, 7.5, dt);
    const driftSpeedMult = this.isBoosting
      ? 1
      : 1 - this.driftDragSmooth * stats.driftSlowdown * 0.72;
    const fuelSpeedMult = fuelStep.empty ? 0.42 : 1.0;
    const currentSpeedCap =
      (this.isBoosting ? stats.boostSpeed : stats.maxSpeed) * driftSpeedMult * fuelSpeedMult;

    const baseWeather = this.weatherState.current;
    Object.assign(_effectiveWeather, baseWeather);
    if (this.onBlackIce) {
      // Glossy black ice dramatically reduces grip & braking unless you salt it!
      _effectiveWeather.accelMult *= 0.36;
      _effectiveWeather.decelMult *= 0.24;
      _effectiveWeather.turnMult *= 0.62;
      _effectiveWeather.tractionPercent = 24;
      if (Math.hypot(this.truckVx, this.truckVz) > 2.2) {
        this.audio.playIceSkid();
      }
    } else if (this.saltedTractionTimer > 0 || vehicleDef.iceImmune) {
      // Rock-salt spreader or Sno-Cat rubber tracks keep alpine grip locked in!
      _effectiveWeather.accelMult = Math.min(1.14, _effectiveWeather.accelMult * 1.32);
      _effectiveWeather.decelMult = Math.min(1.18, _effectiveWeather.decelMult * 1.42);
      _effectiveWeather.turnMult = Math.min(1.08, _effectiveWeather.turnMult * 1.18);
      _effectiveWeather.tractionPercent = Math.min(100, _effectiveWeather.tractionPercent + 28);
    }

    let turnDelta = 0;
    let lateralSlip = 0;
    if (isChaseMode) {
      // Authentic 3D Driving Physics: A/D directly steers cab, W/S drives forward/reverse with weather drift
      const turnDir = chaseThrottle < 0 ? -0.78 : 1.0;
      const steerRate = stats.turnSpeed * 0.36 * _effectiveWeather.turnMult;
      const angleStep = chaseSteer * steerRate * turnDir * dt;
      this.truckAngle += angleStep;
      turnDelta = chaseSteer * 0.42;

      const fx = Math.sin(this.truckAngle);
      const fz = Math.cos(this.truckAngle);
      const desiredSpd =
        chaseThrottle > 0
          ? currentSpeedCap
          : chaseThrottle < 0
            ? -currentSpeedCap * 0.52
            : 0;
      const targetVx = fx * desiredSpd;
      const targetVz = fz * desiredSpd;
      const accelLambda =
        chaseThrottle !== 0
          ? (this.isBoosting ? 9.5 : 6.8) * _effectiveWeather.accelMult
          : 5.8 * _effectiveWeather.decelMult;
      const alpha = 1 - Math.exp(-accelLambda * dt);
      this.truckVx += (targetVx - this.truckVx) * alpha;
      this.truckVz += (targetVz - this.truckVz) * alpha;

      // Measure sideways slip relative to truck heading for icy snow puffs
      const rightX = Math.cos(this.truckAngle);
      const rightZ = -Math.sin(this.truckAngle);
      lateralSlip = Math.abs(this.truckVx * rightX + this.truckVz * rightZ);
    } else {
      const traction = computeTractionStep({
        vx: this.truckVx,
        vz: this.truckVz,
        angle: this.truckAngle,
        hasInput,
        inputX,
        inputZ,
        isBoosting: this.isBoosting,
        baseSpeedCap: currentSpeedCap,
        baseTurnSpeed: stats.turnSpeed,
        weather: _effectiveWeather,
        dt,
      });
      this.truckVx = traction.vx;
      this.truckVz = traction.vz;
      this.truckAngle = traction.angle;
      turnDelta = traction.turnDelta;
      lateralSlip = traction.lateralSlip;
    }

    const fwdX = Math.sin(this.truckAngle);
    const fwdZ = Math.cos(this.truckAngle);

    // Subtle icy tire-slip snow puffs when drifting in a blizzard or skating across black ice
    if (
      (lateralSlip > 1.75 || this.onBlackIce) &&
      _effectiveWeather.tractionPercent < 72 &&
      Math.hypot(this.truckVx, this.truckVz) > 1.8 &&
      Math.random() < 0.48
    ) {
      this.spawnMist(
        this.truckX - fwdX * 0.9 + (Math.random() - 0.5) * 0.85,
        0.26,
        this.truckZ - fwdZ * 0.9 + (Math.random() - 0.5) * 0.85,
        -this.truckVx * 0.2 + baseWeather.windX * 0.14,
        0.75 + Math.random() * 0.55,
        -this.truckVz * 0.2 + baseWeather.windZ * 0.14,
        0.48,
        0.95,
        false
      );
    }

    // 5. Move & Resolve Collisions Smoothly
    const nextX = this.truckX + this.truckVx * dt;
    const nextZ = this.truckZ + this.truckVz * dt;
    const arenaHalf = (this.config.gridSize * this.config.cellSize) / 2;
    const col = resolveTruckCollisions(nextX, nextZ, 1.05, this.config.obstacles, arenaHalf);
    this.truckX = col.x;
    this.truckZ = col.z;

    const speed = Math.hypot(this.truckVx, this.truckVz);
    if (col.collided && speed > 4.2 && this.bumpCooldown <= 0) {
      this.audio.playBump();
      this.shakeTrauma = Math.min(0.4, this.shakeTrauma + 0.22);
      this.squashY = 0.88;
      this.bumpCooldown = 0.35;
      this.truckVx *= 0.6;
      this.truckVz *= 0.6;
    }

    // 5b. Stamp Persistent Wet Tire Tracks & Salt Sheen onto Road Canvas
    this.tireTrackTimer += dt;
    if (this.tireTrackTimer >= 0.075 && speed > 1.2 && this.cityRoadTex) {
      this.tireTrackTimer = 0;
      stampRoadTireTrack(
        this.cityRoadTex,
        this.config,
        this.truckX,
        this.truckZ,
        this.truckAngle,
        this.vehicleId === 'snocat' ? 0.96 : 0.72,
        this.isSalting
      );
    }

    // 5c. Collect Road Supply Crates (Fuel Jerrycan, Salt Crate, Hot Cocoa Turbo, Coins)
    const picked = collectNearbyPickups(this.pickups, this.truckX, this.truckZ);
    for (let pIdx = 0; pIdx < picked.length; pIdx++) {
      const pk = picked[pIdx];
      this.audio.playPickupCollect();
      this.squashY = 1.12;
      if (pk.kind === 'fuel') {
        this.fuelLevel = Math.min(1, this.fuelLevel + 0.48);
        this.fuelLow = this.fuelLevel <= 0.25;
        this.addWorldPopup('+50% DIESEL FUEL!', 'rescue', pk.x, 1.8, pk.z);
      } else if (pk.kind === 'salt') {
        this.saltLevel = Math.min(1, this.saltLevel + 0.65);
        this.addWorldPopup('+65% ROCK SALT!', 'ice', pk.x, 1.8, pk.z);
      } else if (pk.kind === 'cocoa') {
        this.boostEnergy = 1;
        this.blastCharge = Math.min(1, this.blastCharge + 0.35);
        this.addWorldPopup('HOT COCOA TURBO!', 'time', pk.x, 1.8, pk.z);
      } else {
        this.coins += 65;
        this.score += 180;
        this.addWorldPopup('+65 COINS!', 'gold', pk.x, 1.8, pk.z);
      }
      this.emitHud();
    }

    // 6. Sweep Plow Blade (+ Side Snow Blower Reach) & Clear Snow Tiles!
    const hits = findCellsInPlowBlade(
      this.snowCells,
      this.config.gridSize,
      this.config.cellSize,
      this.truckX,
      this.truckZ,
      this.truckAngle,
      stats.bladeWidth,
      stats.bladeDepth,
      stats.blowerReach
    );

    let clearedThisStep = 0;
    let hitHeavyDrift = false;
    let hitGolden = false;
    let bonusStreakTotal = 0;
    let xpGained = 0;

    let dirtyMinGx = 999;
    let dirtyMaxGx = -1;
    let dirtyMinGz = 999;
    let dirtyMaxGz = -1;
    const markDirtyCell = (gx: number, gz: number) => {
      if (gx < dirtyMinGx) dirtyMinGx = gx;
      if (gx > dirtyMaxGx) dirtyMaxGx = gx;
      if (gz < dirtyMinGz) dirtyMinGz = gz;
      if (gz > dirtyMaxGz) dirtyMaxGz = gz;
    };

    if (hits.length > 0 && this.snowFieldMesh) {
      const rightX = Math.cos(this.truckAngle);
      const rightZ = -Math.sin(this.truckAngle);

      for (let h = 0; h < hits.length; h++) {
        const idx = hits[h];
        const cell = this.snowCells[idx];
        const prevKind = cell.kind;
        if (prevKind !== 'snow' && prevKind !== 'drift' && prevKind !== 'golden') continue;

        const sideSign = ((cell.wx - this.truckX) * rightX + (cell.wz - this.truckZ) * rightZ) >= 0 ? 1 : -1;
        const pushX = rightX * sideSign;
        const pushZ = rightZ * sideSign;

        // Mark cleared for instant responsive gameplay/scoring, while clearAnim smoothly sweeps snow away!
        cell.kind = 'cleared';
        cell.pushX = pushX;
        cell.pushZ = pushZ;
        this.animatingSnowIndices.push(idx);
        markDirtyCell(cell.gx, cell.gz);

        // Push displaced snow up onto adjacent untouched snowbanks (realistic plowed side berms)
        const bermAmount = prevKind === 'drift' ? 0.19 : 0.11;
        const bermModified = accumulatePlowBerm(
          this.snowCells,
          this.config.gridSize,
          cell.gx,
          cell.gz,
          pushX,
          pushZ,
          bermAmount
        );
        for (let b = 0; b < bermModified.length; b++) {
          const bc = this.snowCells[bermModified[b]];
          markDirtyCell(bc.gx, bc.gz);
        }

        this.clearedSnowTiles += 1;
        this.careerStats.totalTilesCleared += 1;
        if (this.weatherState.target === 'blizzard') {
          this.careerStats.blizzardTilesCleared += 1;
        }
        clearedThisStep += 1;

        if (prevKind === 'drift') {
          hitHeavyDrift = true;
          this.driftsBusted += 1;
          this.careerStats.totalDriftsBusted += 1;
        } else if (prevKind === 'golden') {
          hitGolden = true;
          const beacon = this.goldenBeacons.get(idx);
          if (beacon) {
            this.levelGroup.remove(beacon);
            this.goldenBeacons.delete(idx);
          }
        }

        const reward = calculateCellReward(
          prevKind,
          this.combo.multiplier,
          stats.coinMultiplier,
          stats.xpMultiplier
        );
        this.coins += reward.coins;
        this.score += reward.score;
        xpGained += reward.xp;
        bonusStreakTotal += reward.bonusStreak;

        // Layer 1: Sculpted tumbling snow clods arcing sideways off the plow curl
        const speedBoost = 0.92 + Math.min(1.0, (speed / Math.max(1, stats.maxSpeed)) * 0.75);
        const clodCount = prevKind === 'golden' ? 11 : prevKind === 'drift' ? 9 : 4;
        for (let k = 0; k < clodCount; k++) {
          const spread = (Math.random() - 0.5) * 2.2;
          const lateral = (2.8 + Math.random() * 3.4) * speedBoost;
          this.spawnParticle(
            prevKind === 'golden' ? 'gold' : 'snow',
            cell.wx + (Math.random() - 0.5) * 0.45,
            0.28 + Math.random() * 0.42,
            cell.wz + (Math.random() - 0.5) * 0.45,
            pushX * lateral + fwdX * (1.2 + Math.random() * 1.2) + spread,
            2.8 + Math.random() * 3.0,
            pushZ * lateral + fwdZ * (1.2 + Math.random() * 1.2) + spread,
            0.70 + Math.random() * 0.40,
            prevKind === 'drift' ? 1.15 + Math.random() * 0.50 : 0.80 + Math.random() * 0.42
          );
        }

        // Layer 2: Soft volumetric billowing powder snow mist plumes curling wide off the blade discharge
        const mistCount = prevKind === 'drift' || prevKind === 'golden' ? 4 : 2;
        for (let m = 0; m < mistCount; m++) {
          this.spawnMist(
            cell.wx + pushX * 0.48 + (Math.random() - 0.5) * 0.5,
            0.42 + Math.random() * 0.45,
            cell.wz + pushZ * 0.48 + (Math.random() - 0.5) * 0.5,
            pushX * (2.3 + Math.random() * 2.1) * speedBoost + fwdX * 0.85,
            1.45 + Math.random() * 1.35,
            pushZ * (2.3 + Math.random() * 2.1) * speedBoost + fwdZ * 0.85,
            0.72 + Math.random() * 0.45,
            prevKind === 'drift' ? 1.95 + Math.random() * 0.65 : 1.35 + Math.random() * 0.55,
            prevKind === 'golden'
          );
        }
      }

      // Advance Combo & Play Synth Feedback
      const comboStep = advanceComboOnClear(
        this.combo,
        clearedThisStep,
        bonusStreakTotal,
        stats.comboDuration
      );
      this.combo = comboStep.next;
      if (this.combo.count > this.maxCombo) this.maxCombo = this.combo.count;
      if (this.combo.multiplier > this.maxMultiplier) this.maxMultiplier = this.combo.multiplier;

      if (this.score > this.bestScore) {
        this.bestScore = this.score;
        try {
          localStorage.setItem(STORAGE_KEY_BEST, String(this.bestScore));
        } catch {
          // Ignore storage errors
        }
      }

      if (hitGolden) {
        this.audio.playGoldenDrift();
        this.squashY = 1.15;
        if (this.mode === 'rush') {
          this.rushTimeLeft += 8;
          this.addWorldPopup('+8s GOLDEN!', 'time', this.truckX, 2.1, this.truckZ);
          this.triggerCallout('Golden Cocoa Drift! +10 Streak & +8s');
        } else {
          this.addWorldPopup('GOLDEN DRIFT!', 'gold', this.truckX, 2.1, this.truckZ);
          this.triggerCallout('Golden Cocoa Drift! +10 Streak');
        }
      } else if (hitHeavyDrift) {
        this.audio.playSnowChime(this.combo.count, true);
        // Smooth damped drift resistance (zero sudden velocity stutters or camera shake!)
        this.driftDragSmooth = Math.min(1, this.driftDragSmooth + 0.65);
        this.squashY = Math.min(this.squashY, 0.94);
      }

      if (comboStep.tieredUp && this.combo.tierLabel) {
        this.audio.playComboTierUp(this.combo.multiplier);
        this.triggerCallout(`${this.combo.multiplier}x ${this.combo.tierLabel}!`);
      }

      if (xpGained > 0) {
        this.grantExperience(xpGained);
      }
      this.checkCareerAchievements();

      // Hold smooth plowing continuity across adjacent grid cells so blade wave & real snow sound never stutter
      this.plowingHoldTimer = 0.22;
      this.plowingIntensity = THREE.MathUtils.damp(this.plowingIntensity, 1.0, 14, dt);
    } else if (this.plowingHoldTimer > 0) {
      this.plowingHoldTimer = Math.max(0, this.plowingHoldTimer - dt);
      this.plowingIntensity = THREE.MathUtils.damp(this.plowingIntensity, 0.72, 6, dt);
    } else {
      this.plowingIntensity = THREE.MathUtils.damp(this.plowingIntensity, 0, 5.5, dt);
    }

    // Charge active [F] Thermal Snow-Blast Shockwave from plowing & drift smashing
    const prevBlastReady = this.blastCharge >= 0.99;
    this.blastCharge = stepBlastCharge(
      this.blastCharge,
      clearedThisStep,
      hitHeavyDrift || hitGolden,
      dt,
      vehicleDef.blastChargeMult
    );
    if (!prevBlastReady && this.blastCharge >= 0.99) {
      this.audio.playPickupCollect();
      this.triggerCallout('THERMAL SNOW-BLAST READY! Press [F] to clear a huge wave!');
    }

    // Smoothly step progressive snow clearing animations & update affected vertices of the 3D snow blanket
    if (this.animatingSnowIndices.length > 0) {
      const animRes = stepSnowClearingAnim(this.snowCells, this.animatingSnowIndices, dt, 7.2);
      this.animatingSnowIndices = animRes.stillAnimating;
      for (let d = 0; d < animRes.dirtyIndices.length; d++) {
        const dc = this.snowCells[animRes.dirtyIndices[d]];
        markDirtyCell(dc.gx, dc.gz);
      }
    }

    if (dirtyMaxGx >= dirtyMinGx && dirtyMaxGz >= dirtyMinGz) {
      const vScale = this.snowFieldSegs / this.config.gridSize;
      this.updateSnowFieldRegion(
        Math.floor(dirtyMinGx * vScale) - 2,
        Math.ceil((dirtyMaxGx + 1) * vScale) + 2,
        Math.floor(dirtyMinGz * vScale) - 2,
        Math.ceil((dirtyMaxGz + 1) * vScale) + 2
      );
    }

    // 7. Update Truck Animation (distance-synced wheel spin, steering, tilt & squash-stretch)
    this.wheelSpin += speed * dt * 2.6;
    const targetSteer = THREE.MathUtils.clamp(turnDelta * 0.9, -0.52, 0.52);
    this.steerAngle = THREE.MathUtils.damp(this.steerAngle, targetSteer, 12, dt);

    const targetRoll = THREE.MathUtils.clamp(-turnDelta * (speed / Math.max(1, stats.maxSpeed)) * 0.14, -0.14, 0.14);
    const targetPitch = this.isBoosting ? -0.07 : hasInput ? -0.03 : 0.01;
    this.rollTilt = THREE.MathUtils.damp(this.rollTilt, targetRoll, 10, dt);
    this.pitchTilt = THREE.MathUtils.damp(this.pitchTilt, targetPitch, 10, dt);
    this.squashY = THREE.MathUtils.damp(this.squashY, 1.0, 11, dt);
    this.syncTruckVisuals(dt);

    // 8. Continuous Engine & Snow-Scrape Synth Audio
    this.audio.updateContinuous(true, speed / stats.maxSpeed, this.plowingIntensity, this.isBoosting);

    // 8b. Evaluate Live Municipal Dispatch Mission & Trigger Celebratory Rewards!
    if (this.activeMission) {
      const mRes = evaluateMissionProgress(
        this.activeMission,
        this.snowCells,
        this.driftsBusted,
        this.iceMeltedThisShift,
        this.truckX,
        this.truckZ
      );
      if (mRes.completed) {
        const completed = this.activeMission;
        this.missionsCompleted += 1;
        this.careerStats.missionsCompleted += 1;
        if (completed.kind === 'rescueCar') {
          this.careerStats.carsRescued += 1;
          this.audio.playCarHorn();
        }
        this.coins += completed.rewardCoins;
        this.score += completed.rewardCoins * 4;
        this.grantExperience(completed.rewardXp);
        this.combo = advanceComboOnClear(this.combo, 0, 8, stats.comboDuration).next;
        this.audio.playMissionComplete();
        this.squashY = 1.16;

        const popX = completed.radius > 0 ? completed.x : this.truckX;
        const popZ = completed.radius > 0 ? completed.z : this.truckZ;
        if (this.mode === 'rush') {
          this.rushTimeLeft += completed.bonusTimeSec;
          this.addWorldPopup(
            `+${completed.rewardCoins}c & +${completed.bonusTimeSec}s!`,
            'rescue',
            popX,
            2.3,
            popZ
          );
          this.triggerCallout(
            `${completed.title} Complete! +${completed.rewardCoins} Coins & +${completed.bonusTimeSec}s`
          );
        } else {
          this.addWorldPopup(`+${completed.rewardCoins} COINS!`, 'rescue', popX, 2.3, popZ);
          this.triggerCallout(`${completed.title} Complete! +${completed.rewardCoins} Coins`);
        }

        // Golden celebration spark burst at the mission site
        for (let k = 0; k < 14; k++) {
          const ang = (k / 14) * Math.PI * 2;
          this.spawnParticle(
            'gold',
            popX + Math.cos(ang) * 0.8,
            1.2,
            popZ + Math.sin(ang) * 0.8,
            Math.cos(ang) * 3.0,
            3.6 + Math.random() * 1.8,
            Math.sin(ang) * 3.0,
            0.9,
            0.9
          );
        }

        this.checkCareerAchievements();
        this.spawnDispatchMission();
        this.emitHud();
      }
    }

    // 8c. Gentle Blizzard Snow Dusting on Far Cleared Streets (keeps storms feeling alive, never unfair!)
    if (this.weatherState.current.snowDensity > 0.85 && !this.districtCleared) {
      this.blizzardRefillTimer += dt;
      if (this.blizzardRefillTimer >= 6.5) {
        this.blizzardRefillTimer = 0;
        const clearedPctNow = calculateClearedPercent(this.clearedSnowTiles, this.totalSnowTiles);
        if (clearedPctNow > 12 && clearedPctNow < this.config.targetPercent - 4) {
          let dusted = 0;
          const total = this.snowCells.length;
          const startIdx = Math.floor(Math.random() * total);
          let rMinGx = 999;
          let rMaxGx = -1;
          let rMinGz = 999;
          let rMaxGz = -1;
          for (let step = 0; step < 80 && dusted < 2; step++) {
            const c = this.snowCells[(startIdx + step * 17) % total];
            if (
              c.kind === 'cleared' &&
              c.initialKind !== 'none' &&
              Math.hypot(c.wx - this.truckX, c.wz - this.truckZ) > 14
            ) {
              c.kind = 'snow';
              c.height = 0.28;
              c.clearAnim = 1;
              c.bermBoost = 0;
              this.clearedSnowTiles = Math.max(0, this.clearedSnowTiles - 1);
              dusted += 1;
              if (c.gx < rMinGx) rMinGx = c.gx;
              if (c.gx > rMaxGx) rMaxGx = c.gx;
              if (c.gz < rMinGz) rMinGz = c.gz;
              if (c.gz > rMaxGz) rMaxGz = c.gz;
            }
          }
          if (dusted > 0 && this.snowFieldMesh) {
            const vScale = this.snowFieldSegs / this.config.gridSize;
            this.updateSnowFieldRegion(
              Math.floor(rMinGx * vScale) - 2,
              Math.ceil((rMaxGx + 1) * vScale) + 2,
              Math.floor(rMinGz * vScale) - 2,
              Math.ceil((rMaxGz + 1) * vScale) + 2
            );
          }
        }
      }
    }

    // 8d. Live Dynamic City Emergencies: Alpine Ambulance Escort & Roof-Slide Avalanches!
    if (!this.districtCleared) {
      // Emergency Alpine Ambulance Escort
      if (!this.ambulance) {
        this.ambulanceCooldown -= dt;
        if (this.ambulanceCooldown <= 0) {
          this.ambulance = spawnAmbulanceEscort(this.config);
          this.ambulanceProgress = 0;
          this.ambulanceRig = createAmbulanceRig(this.textures);
          this.ambulanceRig.root.position.set(this.ambulance.x, 0, this.ambulance.z);
          this.ambulanceRig.root.rotation.y = this.ambulance.angle;
          this.levelGroup.add(this.ambulanceRig.root);
          this.audio.playAmbulanceSiren();
          this.triggerCallout('EMERGENCY AMBULANCE! Clear snow ahead of it for +125c!');
          this.emitHud();
        }
      } else {
        const ambRes = stepAmbulanceEscort(
          this.ambulance,
          this.snowCells,
          this.config.gridSize,
          this.config.cellSize,
          this.truckX,
          this.truckZ,
          dt
        );
        this.ambulanceProgress = ambRes.progressPercent;
        if (ambRes.playSiren) {
          this.audio.playAmbulanceSiren();
        }
        if (this.ambulanceRig) {
          this.ambulanceRig.root.position.set(this.ambulance.x, 0, this.ambulance.z);
          this.ambulanceRig.root.rotation.y = this.ambulance.angle;
          for (let w = 0; w < this.ambulanceRig.wheels.length; w++) {
            this.ambulanceRig.wheels[w].rotation.x += this.ambulance.speed * dt * 2.8;
          }
          const flash = Math.sin(this.goldenAnimTime * 15) > 0;
          this.ambulanceRig.redLightMat.emissiveIntensity = flash ? 3.2 : 0.25;
          this.ambulanceRig.blueLightMat.emissiveIntensity = flash ? 0.25 : 3.2;
        }

        if (ambRes.status === 'rescued') {
          const rewardC = this.ambulance.rewardCoins;
          const rewardT = this.ambulance.rewardTime;
          this.coins += rewardC;
          this.score += rewardC * 5;
          this.grantExperience(75);
          if (this.mode === 'rush') {
            this.rushTimeLeft += rewardT;
            this.addWorldPopup(`AMBULANCE ESCORTED! +${rewardC}c +${rewardT}s`, 'rescue', this.ambulance.x, 2.5, this.ambulance.z);
          } else {
            this.addWorldPopup(`AMBULANCE ESCORTED! +${rewardC}c`, 'rescue', this.ambulance.x, 2.5, this.ambulance.z);
          }
          this.audio.playMissionComplete();
          this.triggerCallout(`Emergency Ambulance reached clinic! +${rewardC} Coins`);
          if (this.ambulanceRig) {
            this.levelGroup.remove(this.ambulanceRig.root);
            this.ambulanceRig = null;
          }
          this.ambulance = null;
          this.ambulanceCooldown = 38;
          this.emitHud();
        } else if (ambRes.status === 'delayed') {
          this.triggerCallout('Ambulance had to reroute — watch for the next emergency!');
          if (this.ambulanceRig) {
            this.levelGroup.remove(this.ambulanceRig.root);
            this.ambulanceRig = null;
          }
          this.ambulance = null;
          this.ambulanceCooldown = 30;
          this.emitHud();
        }
      }

      // Roof-Slide Avalanche Hazard Events (pulsing red telegraph -> fresh 3D mega-drift slam!)
      if (!this.avalanche) {
        this.avalancheCooldown -= dt;
        if (this.avalancheCooldown <= 0) {
          this.avalancheSeq += 1;
          this.avalanche = spawnAvalancheEvent(
            this.config,
            this.avalancheSeq,
            this.truckX,
            this.truckZ
          );
          this.avalancheRig = createAvalancheTelegraphRig(this.avalanche.radius);
          this.avalancheRig.root.position.set(this.avalanche.x, 0, this.avalanche.z);
          this.levelGroup.add(this.avalancheRig.root);
          this.audio.playAvalancheRumble();
          this.triggerCallout('AVALANCHE WARNING! Roof snow sliding onto boulevard!');
          this.emitHud();
        }
      } else if (this.avalanche.state === 'telegraph') {
        this.avalanche.timer -= dt;
        const frac = 1 - Math.max(0, this.avalanche.timer) / this.avalanche.maxTimer;
        if (this.avalancheRig) {
          this.avalancheRig.innerDisc.scale.setScalar(0.12 + frac * 0.88);
          this.avalancheRig.ringMat.opacity = 0.55 + Math.sin(this.goldenAnimTime * 16) * 0.3;
        }
        if (this.avalanche.timer <= 0) {
          const avRes = applyAvalancheImpact(
            this.avalanche,
            this.snowCells,
            this.config.gridSize,
            this.config.cellSize
          );
          this.clearedSnowTiles = Math.max(0, this.clearedSnowTiles - avRes.addedSnowTiles);
          if (avRes.modifiedIndices.length > 0 && this.snowFieldMesh) {
            let aMinGx = 999;
            let aMaxGx = -1;
            let aMinGz = 999;
            let aMaxGz = -1;
            for (let m = 0; m < avRes.modifiedIndices.length; m++) {
              const c = this.snowCells[avRes.modifiedIndices[m]];
              if (c.gx < aMinGx) aMinGx = c.gx;
              if (c.gx > aMaxGx) aMaxGx = c.gx;
              if (c.gz < aMinGz) aMinGz = c.gz;
              if (c.gz > aMaxGz) aMaxGz = c.gz;
            }
            const vScale = this.snowFieldSegs / this.config.gridSize;
            this.updateSnowFieldRegion(
              Math.floor(aMinGx * vScale) - 2,
              Math.ceil((aMaxGx + 1) * vScale) + 2,
              Math.floor(aMinGz * vScale) - 2,
              Math.ceil((aMaxGz + 1) * vScale) + 2
            );
          }

          // Big heavy snow crash particles + impact rumble + trauma shake!
          for (let k = 0; k < 20; k++) {
            const ang = (k / 20) * Math.PI * 2;
            const spd = 2.6 + Math.random() * 3.4;
            this.spawnParticle(
              'snow',
              this.avalanche.x + Math.cos(ang) * 0.9,
              1.6 + Math.random() * 1.4,
              this.avalanche.z + Math.sin(ang) * 0.9,
              Math.cos(ang) * spd,
              2.4 + Math.random() * 2.2,
              Math.sin(ang) * spd,
              0.85,
              1.25
            );
          }
          for (let m = 0; m < 8; m++) {
            const ang = (m / 8) * Math.PI * 2;
            this.spawnMist(
              this.avalanche.x + Math.cos(ang) * 1.2,
              0.9,
              this.avalanche.z + Math.sin(ang) * 1.2,
              Math.cos(ang) * 2.5,
              1.8,
              Math.sin(ang) * 2.5,
              0.95,
              2.2,
              false
            );
          }
          this.shakeTrauma = Math.min(0.65, this.shakeTrauma + 0.34);
          this.audio.playAvalancheImpact();
          this.addWorldPopup('ROOF AVALANCHE!', 'time', this.avalanche.x, 2.2, this.avalanche.z);

          if (this.avalancheRig) {
            this.levelGroup.remove(this.avalancheRig.root);
            this.avalancheRig = null;
          }
          this.avalanche = null;
          this.avalancheCooldown = 34;
          this.emitHud();
        }
      }
    }

    // 9. Check District Goal Reached (unlocks next district + 3-Star Rating + cozy bonus!)
    const clearedPct = calculateClearedPercent(this.clearedSnowTiles, this.totalSnowTiles);
    if (clearedPct >= this.config.targetPercent && !this.districtCleared) {
      this.districtCleared = true;
      this.unlockedDistricts = Math.max(
        this.unlockedDistricts,
        Math.min(NEIGHBORHOODS.length, this.neighborhoodIndex + 2)
      );
      this.finishShift(true, clearedPct, 'cleared');
    }
  }

  private grantExperience(amount: number): void {
    const res = addExperience(this.driverLevel, this.xp, amount);
    this.driverLevel = res.level;
    this.xp = res.xp;
    this.xpToNext = res.xpToNext;

    if (res.levelsGained > 0) {
      this.skillPoints += res.skillPointsEarned;
      this.coins += res.bonusCoins;
      this.audio.playLevelUp();
      this.squashY = 1.24;
      this.shakeTrauma = Math.min(0.45, this.shakeTrauma + 0.2);

      // Burst celebratory golden sparkles around the snowplow
      for (let i = 0; i < 18; i++) {
        const ang = (i / 18) * Math.PI * 2;
        this.spawnParticle(
          'gold',
          this.truckX + Math.cos(ang) * 0.9,
          1.2,
          this.truckZ + Math.sin(ang) * 0.9,
          Math.cos(ang) * (2.6 + Math.random() * 1.6),
          3.4 + Math.random() * 2.2,
          Math.sin(ang) * (2.6 + Math.random() * 1.6),
          0.95,
          0.95
        );
      }

      this.triggerCallout(
        `Level ${this.driverLevel} ${res.rank}! +${res.skillPointsEarned} SP & +${res.bonusCoins} Coins`
      );
      this.saveCareer();
      this.emitHud();
    }
  }

  private finishShift(
    won: boolean,
    clearedPercent: number,
    reason: 'cleared' | 'timeup' = 'cleared'
  ): void {
    this.phase = 'gameover';
    this.shopOpen = false;
    this.keysHeld.clear();
    this.pointerActive = false;
    this.audio.updateContinuous(false, 0, 0, false);

    const starsEarned = calculateShiftStars(
      won,
      clearedPercent,
      this.config.targetPercent,
      Math.round(this.elapsedShiftSeconds),
      this.config.shiftSeconds,
      this.missionsCompleted,
      this.maxMultiplier
    );

    if (won) {
      const clearBonusCoins = 150 + starsEarned * 30;
      this.coins += clearBonusCoins;
      this.score += 600 + starsEarned * 250;
      this.careerStats.districtsCleared += 1;
      const prevStars = this.careerStats.districtStars[this.neighborhoodIndex] ?? 0;
      this.careerStats.districtStars[this.neighborhoodIndex] = Math.max(prevStars, starsEarned);
      this.grantExperience(120 + starsEarned * 25);
      if (this.score > this.bestScore) {
        this.bestScore = this.score;
      }
      this.checkCareerAchievements();
      this.saveCareer();
      this.audio.playVictoryFanfare();
    } else {
      this.saveCareer();
      this.audio.playShiftOverSting();
    }

    this.runStats = {
      won,
      mode: this.mode,
      reason,
      starsEarned,
      neighborhoodIndex: this.neighborhoodIndex,
      neighborhoodName: this.config.name,
      clearedPercent,
      targetPercent: this.config.targetPercent,
      score: this.score,
      bestScore: this.bestScore,
      coinsEarned: this.coins,
      driverLevel: this.driverLevel,
      driverRank: getDriverRank(this.driverLevel),
      maxCombo: this.maxCombo,
      maxMultiplier: this.maxMultiplier,
      elapsedSeconds: Math.round(this.elapsedShiftSeconds),
      tilesCleared: this.clearedSnowTiles,
      driftsBusted: this.driftsBusted,
      missionsCompleted: this.missionsCompleted,
      iceMelted: this.iceMeltedThisShift,
    };

    this.emitHud();
  }

  private syncTruckVisuals(dt: number): void {
    this.truck.root.position.set(this.truckX, 0, this.truckZ);
    this.truck.root.rotation.y = this.truckAngle;

    const invXZ = 1 / Math.sqrt(Math.max(0.5, this.squashY));
    this.truck.bodyGroup.scale.set(invXZ, this.squashY, invXZ);
    this.truck.bodyGroup.rotation.x = this.pitchTilt;
    this.truck.bodyGroup.rotation.z = this.rollTilt;

    // Gentle plow blade bounce & dynamic rolling snow wave curling inside the scoop
    this.truck.bladePivot.position.y = 0.14 + Math.sin(this.wheelSpin * 0.7) * 0.015 * this.plowingIntensity;

    const waveLambda = this.plowingIntensity > this.waveScale ? 12 : 5.2;
    this.waveScale = dt > 0 ? THREE.MathUtils.damp(this.waveScale, this.plowingIntensity, waveLambda, dt) : 0;
    const waveVisible = this.waveScale > 0.025;
    this.truck.snowWaveGroup.visible = waveVisible;
    if (waveVisible) {
      this.truck.snowWaveGroup.scale.set(
        0.84 + this.waveScale * 0.20,
        0.30 + this.waveScale * 0.95,
        0.32 + this.waveScale * 1.05
      );
      this.truck.snowWaveGroup.position.y = 0.18 + this.waveScale * 0.10;
      const speed = Math.hypot(this.truckVx, this.truckVz);
      this.truck.snowWaveMesh.rotation.x += (3.8 + speed * 0.85) * dt;
    }

    for (const fw of this.truck.frontWheels) {
      fw.rotation.y = this.steerAngle;
      const spinGrp = fw.userData.spinGroup as THREE.Group;
      if (spinGrp) spinGrp.rotation.x = this.wheelSpin;
    }
    for (const rw of this.truck.rearWheels) {
      const spinGrp = rw.userData.spinGroup as THREE.Group;
      if (spinGrp) spinGrp.rotation.x = this.wheelSpin;
    }

    // Spin front rotary snow-auger drum on Glacier Rotary Sno-Cat!
    if (this.truck.augerMesh) {
      this.truck.augerMesh.rotation.x += dt * (7.5 + this.plowingIntensity * 14);
    }
  }

  private updateWaypointArrow(): void {
    if (this.phase !== 'playing' || this.shopOpen) {
      this.waypointArrow.root.visible = false;
      return;
    }

    let targetX = 0;
    let targetZ = 0;
    let hex = 0xfbbf24;
    let hasTarget = false;

    // Priority 1: Emergency Ambulance Escort (flashing Red/Blue!)
    if (this.ambulance && this.ambulance.active) {
      targetX = this.ambulance.x;
      targetZ = this.ambulance.z;
      hex = Math.sin(this.goldenAnimTime * 12) > 0 ? 0xef4444 : 0x3b82f6;
      hasTarget = true;
    } else if (this.fuelLow) {
      // Priority 2: Low Diesel Fuel -> Green Service Bay!
      targetX = this.garagePos.x;
      targetZ = this.garagePos.z;
      hex = 0x10b981;
      hasTarget = true;
    } else if (this.activeMission && this.activeMission.radius > 0) {
      // Priority 3: Active Municipal Dispatch Mission
      targetX = this.activeMission.x;
      targetZ = this.activeMission.z;
      hex = this.activeMission.kind === 'rescueCar' ? 0xf59e0b : 0x38bdf8;
      hasTarget = true;
    }

    if (!hasTarget) {
      this.waypointArrow.root.visible = false;
      return;
    }

    const dx = targetX - this.truckX;
    const dz = targetZ - this.truckZ;
    const dist = Math.hypot(dx, dz);
    if (dist < 3.6) {
      this.waypointArrow.root.visible = false;
      return;
    }

    const nx = dx / dist;
    const nz = dz / dist;
    this.waypointArrow.root.visible = true;
    this.waypointArrow.root.position.set(
      this.truckX + nx * 2.55,
      1.68 + Math.sin(this.goldenAnimTime * 4.5) * 0.14,
      this.truckZ + nz * 2.55
    );
    this.waypointArrow.root.rotation.y = Math.atan2(nx, nz);
    this.waypointArrow.mat.color.setHex(hex);
    this.waypointArrow.mat.emissive.setHex(hex);
  }

  private syncCameraPosition(dt: number): void {
    // Dynamic subtle zoom-out during Turbo Boost + Mouse-Wheel Zoom Offset in Isometric mode
    const desiredFrustum =
      this.phase === 'title'
        ? 33.0
        : THREE.MathUtils.clamp(
            (this.isBoosting ? 24.8 : 22.5) + this.isoZoomOffset,
            15.5,
            31.5
          );
    this.targetFrustumSize = desiredFrustum;
    const prevFrustum = this.frustumSize;
    this.frustumSize = THREE.MathUtils.damp(this.frustumSize, this.targetFrustumSize, 5.5, dt);
    if (Math.abs(this.frustumSize - prevFrustum) > 0.01) {
      const width = Math.max(1, this.container.clientWidth || window.innerWidth);
      const height = Math.max(1, this.container.clientHeight || window.innerHeight);
      const aspect = width / height;
      this.camera.left = (-this.frustumSize * aspect) / 2;
      this.camera.right = (this.frustumSize * aspect) / 2;
      this.camera.top = this.frustumSize / 2;
      this.camera.bottom = -this.frustumSize / 2;
      this.camera.updateProjectionMatrix();
    }

    if (this.phase === 'title') {
      // Dramatic low-angle 3D Hero Showcase of the player's actual Snowplow Truck on the right half
      // with glowing headlights, DRIFTCLEAR Arched City Gate, cozy townhouses & falling snow!
      this.activeCamera = this.chaseCamera;
      this.titleOrbitAngle += dt * 0.22;
      const swayX = Math.sin(this.titleOrbitAngle) * 0.34;
      const bobY = Math.cos(this.titleOrbitAngle * 0.72) * 0.1;

      // Subtle engine idle breathing on truck cab
      this.truck.bodyGroup.position.y = Math.sin(this.goldenAnimTime * 18) * 0.008;

      if (Math.abs(this.chaseCamera.fov - 48) > 0.08) {
        this.chaseCamera.fov = dt >= 1 ? 48 : THREE.MathUtils.damp(this.chaseCamera.fov, 48, 6, dt);
        this.chaseCamera.updateProjectionMatrix();
      }

      // Strictly inside open Main Avenue road lane (|x| <= 2.0) — zero roof or lamppost clipping!
      _camDesired.set(this.truckX + 1.65 + swayX, 2.65 + bobY, this.truckZ - 6.35);
      _camTarget.set(this.truckX + 1.48, 1.42, this.truckZ + 0.85);

      const alpha = dt >= 1 ? 1 : 1 - Math.exp(-5.0 * dt);
      this.chaseCamera.position.lerp(_camDesired, alpha);
      this.camLookCurrent.lerp(_camTarget, alpha);
      this.chaseCamera.lookAt(this.camLookCurrent);
    } else if (this.cameraMode === 'chase') {
      this.activeCamera = this.chaseCamera;
      const fwdX = Math.sin(this.truckAngle);
      const fwdZ = Math.cos(this.truckAngle);

      const shake = this.shakeTrauma * this.shakeTrauma * 0.48;
      const shakeX = shake > 0.001 ? (Math.random() - 0.5) * shake : 0;
      const shakeY = shake > 0.001 ? (Math.random() - 0.5) * shake : 0;

      // Hero behind-truck chase rig with zero-GC Spring-Arm Building & City Gate Occlusion Avoidance!
      const idealDist = this.isBoosting ? 8.4 : 7.4;
      const idealHeight = this.isBoosting ? 4.1 : 4.4;
      const arenaHalf = (this.config.gridSize * this.config.cellSize) / 2;

      let safeFrac = 1.0;
      const samples = 8;
      for (let s = 1; s <= samples; s++) {
        const frac = s / samples;
        const sx = this.truckX - fwdX * (idealDist * frac);
        const sz = this.truckZ - fwdZ * (idealDist * frac);
        let blocked = false;

        // Avoid clipping through the South Stone City Gate arch & towers
        if (sz > arenaHalf - 3.6 && sz < arenaHalf + 3.4 && Math.abs(sx) < 9.5) {
          blocked = true;
        }
        // Avoid clipping through multi-story buildings, cafes, clock tower, and garage roofs
        if (!blocked) {
          for (let o = 0; o < this.config.obstacles.length; o++) {
            const obs = this.config.obstacles[o];
            if (obs.kind === 'lamp' || obs.kind === 'bench' || obs.kind === 'snowman' || obs.kind === 'parkedCar') {
              continue;
            }
            if (
              Math.abs(sx - obs.x) < obs.halfW + 0.9 &&
              Math.abs(sz - obs.z) < obs.halfD + 0.9
            ) {
              blocked = true;
              break;
            }
          }
        }
        if (blocked) {
          safeFrac = Math.max(0.46, (s - 1) / samples);
          break;
        }
      }

      const followDist = idealDist * safeFrac;
      const camHeight = THREE.MathUtils.lerp(2.9, idealHeight, safeFrac);
      _camDesired.set(
        this.truckX - fwdX * followDist + shakeX,
        camHeight + shakeY,
        this.truckZ - fwdZ * followDist
      );
      const posAlpha = dt >= 1 ? 1 : 1 - Math.exp(-8.5 * dt);
      this.chaseCamera.position.lerp(_camDesired, posAlpha);

      _camTarget.set(this.truckX + fwdX * 5.6, 1.35, this.truckZ + fwdZ * 5.6);
      const lookAlpha = dt >= 1 ? 1 : 1 - Math.exp(-9.5 * dt);
      this.camLookCurrent.lerp(_camTarget, lookAlpha);
      this.chaseCamera.lookAt(this.camLookCurrent);

      // Visceral FOV speed-punch during Turbo Boost!
      const targetFov = this.isBoosting ? 66 : 56;
      if (Math.abs(this.chaseCamera.fov - targetFov) > 0.08) {
        this.chaseCamera.fov = THREE.MathUtils.damp(this.chaseCamera.fov, targetFov, 7, dt);
        this.chaseCamera.updateProjectionMatrix();
      }
    } else {
      this.activeCamera = this.camera;
      // Classic cozy isometric follow rig with velocity look-ahead and trauma shake
      const lookAheadX = this.truckVx * 0.22;
      const lookAheadZ = this.truckVz * 0.22;
      _camTarget.set(this.truckX + lookAheadX, 0.5, this.truckZ + lookAheadZ);
      const followAlpha = dt >= 1 ? 1 : 1 - Math.exp(-6.5 * dt);
      this.camLookCurrent.lerp(_camTarget, followAlpha);

      const shake = this.shakeTrauma * this.shakeTrauma * 0.55;
      const shakeX = shake > 0.001 ? (Math.random() - 0.5) * shake : 0;
      const shakeY = shake > 0.001 ? (Math.random() - 0.5) * shake : 0;

      // Exact 45-degree isometric angle matching our screen-relative input mapping
      this.camera.position.set(
        this.camLookCurrent.x + 26 + shakeX,
        29.5 + shakeY,
        this.camLookCurrent.z + 26
      );
      this.camera.lookAt(this.camLookCurrent);
    }
  }

  private updateParticles(dt: number): void {
    let anyChanged = false;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      anyChanged = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        _dummy.position.set(0, -50, 0);
        _dummy.scale.setScalar(0.0001);
        _dummy.updateMatrix();
        this.particleMesh.setMatrixAt(i, _dummy.matrix);
        continue;
      }

      if (p.kind === 'smoke') {
        p.vy += 0.25 * dt;
        p.vx += Math.sin(p.life * 3) * 0.3 * dt;
      } else if (p.kind === 'boost') {
        p.vy += 0.5 * dt;
      } else {
        p.vy -= 12.5 * dt;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.rotY += dt * 4;

      if (p.y < 0.08 && (p.kind === 'snow' || p.kind === 'gold')) {
        p.y = 0.08;
        p.vy = -p.vy * 0.25;
        p.vx *= 0.6;
        p.vz *= 0.6;
      }

      const lifeFrac = p.life / p.maxLife;
      const scale = p.kind === 'smoke' ? p.size * (1.4 - lifeFrac * 0.7) : p.size * Math.min(1, lifeFrac * 1.4);

      _dummy.position.set(p.x, p.y, p.z);
      _dummy.rotation.set(p.rotY * 0.65, p.rotY, p.rotY * 0.35);
      const s = Math.max(0.001, scale);
      if (p.kind === 'snow') {
        _dummy.scale.set(s * 1.15, s * 0.78, s * 0.96);
      } else {
        _dummy.scale.setScalar(s);
      }
      _dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, _dummy.matrix);

      if (p.kind === 'gold') {
        _color.setHex(0xffcf40);
      } else if (p.kind === 'boost') {
        _color.setHex(0xfb923c);
      } else if (p.kind === 'salt') {
        _color.setHex(i % 2 === 0 ? 0xfef08a : 0xf8fafc);
      } else if (p.kind === 'smoke') {
        _color.setHex(0xdce4ee);
      } else {
        // Alternate cool glacier-blue shadow clods and bright sunlit snow chunks for vivid airborne read
        _color.setHex(i % 2 === 0 ? 0xc4ddf5 : 0xf4f9ff);
      }
      this.particleMesh.setColorAt(i, _color);
    }

    if (anyChanged) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
      if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
    }
  }

  private updateMistParticles(dt: number): void {
    let anyChanged = false;
    for (let i = 0; i < MAX_MIST; i++) {
      const m = this.mistParticles[i];
      if (!m.active) continue;
      anyChanged = true;
      m.life -= dt;
      if (m.life <= 0) {
        m.active = false;
        _dummy.position.set(0, -50, 0);
        _dummy.scale.setScalar(0.0001);
        _dummy.updateMatrix();
        this.mistMesh.setMatrixAt(i, _dummy.matrix);
        continue;
      }

      // Soft aerodynamic drag + gentle buoyant swirl like real powdery snow mist
      const drag = Math.exp(-2.8 * dt);
      m.vx *= drag;
      m.vz *= drag;
      m.vy = m.vy * drag - 1.35 * dt;

      m.x += m.vx * dt;
      m.y = Math.max(0.18, m.y + m.vy * dt);
      m.z += m.vz * dt;
      m.rotZ += m.rotSpeed * dt;

      const t = 1 - m.life / m.maxLife; // 0 -> 1 over lifetime
      // Billows quickly outward, lingers briefly, then softly dissipates
      const grow = Math.sin(Math.min(1, t * 1.15) * Math.PI);
      const scale = m.baseSize * (0.45 + t * 0.95) * Math.max(0.001, grow);

      _dummy.position.set(m.x, m.y, m.z);
      _dummy.quaternion.copy(this.activeCamera.quaternion);
      _quatSpin.setFromAxisAngle(_zAxis, m.rotZ);
      _dummy.quaternion.multiply(_quatSpin);
      _dummy.scale.setScalar(Math.max(0.001, scale));
      _dummy.updateMatrix();
      this.mistMesh.setMatrixAt(i, _dummy.matrix);

      if (m.isGolden) {
        _color.setHex(0xffe699);
      } else {
        _color.setHex(0xf2f8ff);
      }
      this.mistMesh.setColorAt(i, _color);
    }

    if (anyChanged) {
      this.mistMesh.instanceMatrix.needsUpdate = true;
      if (this.mistMesh.instanceColor) this.mistMesh.instanceColor.needsUpdate = true;
    }
  }

  private updateChimneySmoke(dt: number): void {
    this.smokeTimer += dt;
    if (this.smokeTimer < 0.42 || this.chimneyPositions.length === 0) return;
    this.smokeTimer = 0;
    const ch = this.chimneyPositions[Math.floor(Math.random() * this.chimneyPositions.length)];
    const w = this.weatherState.current;
    this.spawnParticle(
      'smoke',
      ch.x + (Math.random() - 0.5) * 0.15,
      ch.y,
      ch.z + (Math.random() - 0.5) * 0.15,
      0.28 + w.windX * 0.2 + Math.random() * 0.25,
      0.95 + Math.random() * 0.35,
      -0.18 + w.windZ * 0.2 + (Math.random() - 0.5) * 0.2,
      2.4,
      0.95
    );
  }

  private isSnowCellAt(wx: number, wz: number): boolean {
    const gridSize = this.config.gridSize;
    const cellSize = this.config.cellSize;
    const arenaHalf = (gridSize * cellSize) / 2;
    const gx = Math.floor((wx + arenaHalf) / cellSize);
    const gz = Math.floor((wz + arenaHalf) / cellSize);
    if (gx < 0 || gx >= gridSize || gz < 0 || gz >= gridSize) return false;
    const cell = this.snowCells[gz * gridSize + gx];
    return Boolean(cell && cell.clearAnim > 0.25 && cell.kind !== 'cleared' && cell.kind !== 'none');
  }

  private updatePedestrians(dt: number): void {
    if (this.pedestrians.length === 0) return;
    const arenaHalf = (this.config.gridSize * this.config.cellSize) / 2;

    // On pause or open upgrade shop, keep pedestrians gently idle rather than racing ahead
    const simDt = this.phase === 'paused' || this.shopOpen ? 0 : dt;
    if (simDt > 0) {
      stepPedestrians(
        this.pedestrians,
        simDt,
        this.truckX,
        this.truckZ,
        this.config.obstacles,
        arenaHalf,
        (x, z) => this.isSnowCellAt(x, z)
      );
    }

    for (let i = 0; i < this.pedestrians.length; i++) {
      const p = this.pedestrians[i];
      const rig = this.pedestrianRigs[i];
      if (!rig) continue;

      const inSnow = this.isSnowCellAt(p.x, p.z);
      const targetGroundY = inSnow ? 0.14 : 0.05;
      rig.root.position.x = p.x;
      rig.root.position.z = p.z;
      rig.root.position.y += (targetGroundY - rig.root.position.y) * Math.min(1, dt * 10);
      rig.root.rotation.y = p.angle;

      // Natural walk stride swing, cheerful body bounce, subtle head sway, and snowplow wave!
      const moveFactor = Math.min(1, p.speed / Math.max(0.1, p.baseSpeed));
      const swing = Math.sin(p.walkPhase) * 0.62 * moveFactor;
      const bounce = Math.abs(Math.sin(p.walkPhase)) * 0.065 * moveFactor;

      rig.leftLeg.rotation.x = swing;
      rig.rightLeg.rotation.x = -swing;
      rig.leftArm.rotation.x = -swing * 0.72;
      rig.bodyGroup.position.y = bounce;
      rig.bodyGroup.rotation.z = Math.sin(p.walkPhase) * 0.045 * moveFactor;

      if (p.waveAmount > 0.03) {
        // Cheerfully lift right arm and wave side-to-side when snowplow rolls past!
        const waveOsc = Math.sin(this.goldenAnimTime * 9.5 + p.id) * 0.36;
        rig.rightArm.rotation.x = THREE.MathUtils.lerp(swing * 0.72, -0.35, p.waveAmount);
        rig.rightArm.rotation.z = THREE.MathUtils.lerp(0, -2.55 + waveOsc, p.waveAmount);
        rig.headGroup.rotation.z = waveOsc * 0.25 * p.waveAmount;
      } else {
        rig.rightArm.rotation.x = swing * 0.72;
        rig.rightArm.rotation.z = 0;
        rig.headGroup.rotation.z = Math.sin(p.walkPhase * 0.5) * 0.04 * moveFactor;
      }
    }
  }

  private updateTraffic(dt: number): void {
    if (this.trafficCars.length === 0) return;
    const simDt = this.phase === 'paused' || this.shopOpen ? 0 : dt;
    if (simDt > 0) {
      const res = stepCityTraffic(
        this.trafficCars,
        simDt,
        this.truckX,
        this.truckZ,
        (x, z) => this.isSnowCellAt(x, z)
      );
      if (this.phase === 'playing' && res.lanesFreed.length > 0) {
        for (const freed of res.lanesFreed) {
          this.coins += 20;
          this.score += 80;
          this.grantExperience(18);
          this.audio.playCarHorn();
          this.addWorldPopup('LANE CLEARED! +20', 'gold', freed.x, 2.0, freed.z);
        }
      }
    }

    for (let i = 0; i < this.trafficCars.length; i++) {
      const c = this.trafficCars[i];
      const rig = this.trafficRigs[i];
      if (!rig) continue;
      rig.root.position.set(c.x, 0, c.z);
      rig.root.rotation.y = c.angle;
      for (let w = 0; w < rig.wheels.length; w++) {
        rig.wheels[w].rotation.x = c.wheelSpin;
      }
    }
  }

  private updateWeather(dt: number): void {
    const autoCycle = this.phase === 'playing' && !this.shopOpen;
    const step = stepWeatherState(this.weatherState, dt, autoCycle);
    if (step.changed && step.callout) {
      this.triggerCallout(step.callout);
      this.emitHud();
    }

    const w = this.weatherState.current;
    const tod = TIME_OF_DAY_PROFILES[this.timeOfDay];

    this.skyColor.setRGB(
      Math.min(1, w.skyColor[0] * tod.skyTint[0]),
      Math.min(1, w.skyColor[1] * tod.skyTint[1]),
      Math.min(1, w.skyColor[2] * tod.skyTint[2])
    );
    this.fog.color.copy(this.skyColor);
    // Give Title Hero Showcase & 3D Chase Cam extended fog reach so alpine peaks & gate stay crisp!
    const fogBonus = this.phase === 'title' || this.cameraMode === 'chase' ? 36 : 0;
    this.fog.near = w.fogNear + fogBonus * 0.35;
    this.fog.far = w.fogFar + fogBonus;

    this.keyLight.intensity = w.keyLightIntensity * tod.keyMult;
    this.keyLight.color.setRGB(
      w.keyLightColor[0] * tod.keyTint[0],
      w.keyLightColor[1] * tod.keyTint[1],
      w.keyLightColor[2] * tod.keyTint[2]
    );
    this.keyLight.position.lerp(
      _camDesired.set(tod.sunPos[0], tod.sunPos[1], tod.sunPos[2]),
      Math.min(1, dt * 3.5)
    );
    this.hemiLight.intensity = w.hemiIntensity * tod.hemiMult;
    this.rimLight.intensity = w.rimIntensity * tod.rimMult;
    // Modulate RoomEnvironment IBL intensity by time-of-day so night snow stays richly dark & cozy!
    this.scene.environmentIntensity =
      dt >= 1
        ? tod.envIntensity
        : THREE.MathUtils.damp(this.scene.environmentIntensity, tod.envIntensity, 4.5, dt);
    this.truck.headlightGlowMat.emissiveIntensity =
      w.headlightGlow * (this.timeOfDay === 'night' ? 2.4 : this.timeOfDay === 'sunset' ? 1.65 : 1.15);
    this.truck.headBeamMat.opacity = Math.min(
      0.95,
      tod.headlightOpacity + (this.weatherState.target === 'blizzard' ? 0.14 : 0)
    );
    if (this.goldenBeaconMat) {
      this.goldenBeaconMat.emissiveIntensity =
        this.timeOfDay === 'night' ? 2.8 : this.timeOfDay === 'sunset' ? 2.2 : 1.8;
    }

    // Smoothly blend HDR cozy bloom strength/radius/threshold for Day, Sunset, Night & Blizzard!
    const targetBloom = getTargetBloomParams(this.timeOfDay, this.weatherState.target);
    dampBloomParams(this.currentBloom, targetBloom, dt);
    this.bloomPass.strength = this.currentBloom.strength;
    this.bloomPass.radius = this.currentBloom.radius;
    this.bloomPass.threshold = this.currentBloom.threshold;

    this.flakeMat.opacity = w.flakeOpacity;

    this.audio.setWeatherBreeze(w.breezeIntensity);
  }

  private updateAmbientSnow(dt: number): void {
    const cx = this.camLookCurrent.x;
    const cz = this.camLookCurrent.z;
    const w = this.weatherState.current;
    const activeCount = Math.round(this.maxAmbientFlakes * w.snowDensity);
    const halfSpan = 24;
    const fullSpan = halfSpan * 2;
    const isBlizzardStreak = w.flakeStreak > 1.25;

    for (let i = 0; i < this.maxAmbientFlakes; i++) {
      if (i >= activeCount) {
        _dummy.position.set(0, -50, 0);
        _dummy.scale.setScalar(0.0001);
        _dummy.updateMatrix();
        this.flakeMesh.setMatrixAt(i, _dummy.matrix);
        continue;
      }

      const f = this.ambientFlakes[i];
      const vy = f.vy * w.fallSpeed;
      f.y -= vy * dt;
      f.driftPhase += dt * (1.4 + w.fallSpeed * 0.45);
      f.x += (w.windX + Math.sin(f.driftPhase) * 0.7) * dt;
      f.z += (w.windZ + Math.cos(f.driftPhase * 0.85) * 0.55) * dt;

      if (f.y < 0.12) {
        f.y = 14 + Math.random() * 6.5;
        f.x = cx + (Math.random() - 0.5) * fullSpan;
        f.z = cz + (Math.random() - 0.5) * fullSpan;
      }

      // Wrap horizontally around camera focus so high-speed blizzard squalls stay uniformly dense
      if (f.x - cx > halfSpan) f.x -= fullSpan;
      else if (f.x - cx < -halfSpan) f.x += fullSpan;
      if (f.z - cz > halfSpan) f.z -= fullSpan;
      else if (f.z - cz < -halfSpan) f.z += fullSpan;

      _dummy.position.set(f.x, f.y, f.z);
      if (isBlizzardStreak) {
        _windLook.set(f.x + w.windX, f.y - vy, f.z + w.windZ);
        _dummy.lookAt(_windLook);
        _dummy.scale.set(f.size * 0.85, f.size * 0.85, f.size * w.flakeStreak);
      } else {
        _dummy.rotation.set(f.driftPhase, f.driftPhase * 0.7, 0);
        _dummy.scale.setScalar(f.size);
      }
      _dummy.updateMatrix();
      this.flakeMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.flakeMesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Renders a fast, crisp live 2D tactical Snow Minimap onto a HUD canvas
   * showing cleared roads, untouched snow, deep drifts, golden drifts, buildings, garage bay, and truck heading.
   */
  public drawMinimap(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const gridSize = this.config.gridSize;
    const arenaSize = gridSize * this.config.cellSize;
    const arenaHalf = arenaSize / 2;
    const cellW = w / gridSize;
    const cellH = h / gridSize;
    const toPx = (wx: number) => ((wx + arenaHalf) / arenaSize) * w;
    const toPz = (wz: number) => ((wz + arenaHalf) / arenaSize) * h;

    // 1. Pale urban granite sidewalk base
    ctx.fillStyle = '#5d6878';
    ctx.fillRect(0, 0, w, h);

    // 2. Real dark asphalt city avenues & roundabout ring underneath cleared areas
    const r = this.config.roads;
    ctx.fillStyle = '#252d3a';
    // Main N-S Boulevard
    ctx.fillRect(toPx(-r.mainAveHalfW), 0, ((r.mainAveHalfW * 2) / arenaSize) * w, h);
    // Cross E-W Avenues
    for (const cz of r.crossAveZ) {
      ctx.fillRect(0, toPz(cz - r.crossAveHalfW), w, ((r.crossAveHalfW * 2) / arenaSize) * h);
    }
    // Outer Ring Boulevard
    const ringW = ((r.ringHalfW * 2) / arenaSize) * w;
    ctx.fillRect(toPx(-r.ringCenter - r.ringHalfW), toPz(-r.ringCenter - r.ringHalfW), ((r.ringCenter * 2 + r.ringHalfW * 2) / arenaSize) * w, ringW);
    ctx.fillRect(toPx(-r.ringCenter - r.ringHalfW), toPz(r.ringCenter - r.ringHalfW), ((r.ringCenter * 2 + r.ringHalfW * 2) / arenaSize) * w, ringW);
    ctx.fillRect(toPx(-r.ringCenter - r.ringHalfW), toPz(-r.ringCenter - r.ringHalfW), ringW, ((r.ringCenter * 2 + r.ringHalfW * 2) / arenaSize) * h);
    ctx.fillRect(toPx(r.ringCenter - r.ringHalfW), toPz(-r.ringCenter - r.ringHalfW), ringW, ((r.ringCenter * 2 + r.ringHalfW * 2) / arenaSize) * h);
    // Central Clock Tower Roundabout Plaza
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(toPx(r.plazaX), toPz(r.plazaZ), (r.plazaRadius / arenaSize) * w, 0, Math.PI * 2);
    ctx.fill();

    // 3. Snow grid cells (translucent white/blue so road structure remains subtly legible!)
    for (let i = 0; i < this.snowCells.length; i++) {
      const c = this.snowCells[i];
      if (c.kind === 'cleared' || c.kind === 'none') continue;
      if (c.kind === 'snow') {
        ctx.fillStyle = 'rgba(218, 236, 252, 0.86)';
      } else if (c.kind === 'drift') {
        ctx.fillStyle = 'rgba(136, 184, 228, 0.92)';
      } else {
        ctx.fillStyle = '#fbbf24';
      }
      ctx.fillRect(c.gx * cellW, c.gz * cellH, Math.ceil(cellW), Math.ceil(cellH));
    }

    // 4. Urban Buildings, Townhouses, Cafés, Garage Depot, Clock Tower & Plaza Trees
    for (let i = 0; i < this.config.obstacles.length; i++) {
      const o = this.config.obstacles[i];
      if (o.kind === 'lamp' || o.kind === 'snowman' || o.kind === 'bench') continue;
      const mx = toPx(o.x - o.halfW);
      const mz = toPz(o.z - o.halfD);
      const mw = ((o.halfW * 2) / arenaSize) * w;
      const md = ((o.halfD * 2) / arenaSize) * h;
      if (o.kind === 'garage') {
        ctx.fillStyle = '#f59e0b';
      } else if (o.kind === 'tower') {
        ctx.fillStyle = '#cbd5e1';
      } else if (o.kind === 'townhouse') {
        ctx.fillStyle = '#8b5e4b';
      } else if (o.kind === 'cafe') {
        ctx.fillStyle = '#b45348';
      } else if (o.kind === 'plazaTree') {
        ctx.fillStyle = '#2d6a4f';
      } else if (o.kind === 'parkedCar') {
        ctx.fillStyle = '#475569';
      } else {
        ctx.fillStyle = '#6c4d3b';
      }
      ctx.fillRect(mx, mz, Math.max(2, mw), Math.max(2, md));
    }

    // 5. South City Gate Arch Marker on bottom edge
    const gateHalfPx = ((5.0) / arenaSize) * w;
    ctx.fillStyle = '#e5b84b';
    ctx.fillRect(w / 2 - gateHalfPx - 2.5, h - 5, 3.5, 5);
    ctx.fillRect(w / 2 + gateHalfPx - 1, h - 5, 3.5, 5);
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(w / 2 - gateHalfPx + 1, h - 2.5, gateHalfPx * 2 - 2, 2.5);

    // 6. Bright golden drift markers so players can spot them across big cities
    ctx.fillStyle = '#fde047';
    for (let i = 0; i < this.snowCells.length; i++) {
      const c = this.snowCells[i];
      if (c.kind !== 'golden') continue;
      const gx = (c.gx + 0.5) * cellW;
      const gz = (c.gz + 0.5) * cellH;
      ctx.beginPath();
      ctx.arc(gx, gz, 2.7, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6b. Unmelted Black-Ice Hazard Patches (bright cyan diamonds)
    ctx.fillStyle = '#38bdf8';
    for (let i = 0; i < this.blackIcePatches.length; i++) {
      const p = this.blackIcePatches[i];
      if (p.melted) continue;
      const ix = toPx(p.x);
      const iz = toPz(p.z);
      ctx.beginPath();
      ctx.moveTo(ix, iz - 3.2);
      ctx.lineTo(ix + 3.2, iz);
      ctx.lineTo(ix, iz + 3.2);
      ctx.lineTo(ix - 3.2, iz);
      ctx.closePath();
      ctx.fill();
    }

    // 6c. Cruising City Vehicles (mint dots)
    ctx.fillStyle = '#6ee7b7';
    for (let i = 0; i < this.trafficCars.length; i++) {
      const car = this.trafficCars[i];
      ctx.beginPath();
      ctx.arc(toPx(car.x), toPz(car.z), 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6d. Active Municipal Dispatch Target Ring on Minimap
    if (this.activeMission && this.activeMission.radius > 0) {
      const mx = toPx(this.activeMission.x);
      const mz = toPz(this.activeMission.z);
      ctx.strokeStyle = this.activeMission.kind === 'rescueCar' ? '#fb923c' : '#38bdf8';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(mx, mz, 5.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 6e. Uncollected Road Supply Crates (Fuel=red, Salt=cyan, Cocoa=orange, Coins=gold)
    for (let i = 0; i < this.pickups.length; i++) {
      const pk = this.pickups[i];
      if (pk.collected) continue;
      ctx.fillStyle =
        pk.kind === 'fuel'
          ? '#f87171'
          : pk.kind === 'salt'
            ? '#38bdf8'
            : pk.kind === 'cocoa'
              ? '#fb923c'
              : '#fde047';
      ctx.fillRect(toPx(pk.x) - 2, toPz(pk.z) - 2, 4, 4);
    }

    // 6f. Emergency Ambulance (flashing red/blue dot!) & Avalanche Telegraph Ring
    if (this.ambulance && this.ambulance.active) {
      ctx.fillStyle = Math.sin(this.goldenAnimTime * 12) > 0 ? '#ef4444' : '#3b82f6';
      ctx.beginPath();
      ctx.arc(toPx(this.ambulance.x), toPz(this.ambulance.z), 4.0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (this.avalanche && this.avalanche.state === 'telegraph') {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        toPx(this.avalanche.x),
        toPz(this.avalanche.z),
        Math.max(4, (this.avalanche.radius / arenaSize) * w),
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }

    // 7. Player snowplow directional arrow
    const px = toPx(this.truckX);
    const pz = toPz(this.truckZ);
    ctx.save();
    ctx.translate(px, pz);
    const dirX = Math.sin(this.truckAngle);
    const dirZ = Math.cos(this.truckAngle);
    ctx.rotate(Math.atan2(dirZ, dirX));
    ctx.fillStyle = '#ef4444';
    ctx.strokeStyle = '#fffbeb';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(6.5, 0);
    ctx.lineTo(-4.5, -4.2);
    ctx.lineTo(-2.5, 0);
    ctx.lineTo(-4.5, 4.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private emitHud(): void {
    const clearedPercent = calculateClearedPercent(this.clearedSnowTiles, this.totalSnowTiles);
    const nearGarage = Math.hypot(this.truckX - this.garagePos.x, this.truckZ - this.garagePos.z) < 5.0;

    // Project active floating 3D popups into viewport percentages (0..100) using activeCamera
    const floatingPopups: FloatingPopup[] = [];
    for (let i = 0; i < this.worldPopups.length; i++) {
      const wp = this.worldPopups[i];
      _projVec.set(wp.wx, wp.wy, wp.wz).project(this.activeCamera);
      // Guard against projecting points behind PerspectiveCamera (z outside [-1, 1])!
      if (_projVec.z < -1 || _projVec.z > 1) continue;
      const sx = (_projVec.x * 0.5 + 0.5) * 100;
      const sy = (-_projVec.y * 0.5 + 0.5) * 100;
      if (sx >= 6 && sx <= 94 && sy >= 10 && sy <= 90) {
        floatingPopups.push({
          id: wp.id,
          text: wp.text,
          tone: wp.tone,
          screenX: sx,
          screenY: sy,
          opacity: Math.min(1, wp.life / Math.max(0.35, wp.maxLife * 0.5)),
        });
      }
    }

    const vehicleDef = getVehicleDefinition(this.vehicleId);
    const effectiveGrip = this.onBlackIce
      ? 24
      : this.saltedTractionTimer > 0 || vehicleDef.iceImmune
        ? Math.min(100, Math.round(this.weatherState.current.tractionPercent + 28))
        : Math.round(this.weatherState.current.tractionPercent);

    this.onHudUpdate({
      phase: this.phase,
      mode: this.mode,
      rushTimeLeft: Math.ceil(this.rushTimeLeft),
      neighborhoodIndex: this.neighborhoodIndex,
      neighborhoodName: this.config.name,
      unlockedDistricts: this.unlockedDistricts,
      districtCleared: this.districtCleared,
      score: Math.round(this.score),
      bestScore: Math.round(this.bestScore),
      coins: Math.round(this.coins),
      driverLevel: this.driverLevel,
      driverRank: getDriverRank(this.driverLevel),
      xp: Math.round(this.xp),
      xpToNext: this.xpToNext,
      skillPoints: this.skillPoints,
      clearedPercent,
      targetPercent: this.config.targetPercent,
      elapsedSeconds: Math.floor(this.elapsedShiftSeconds),
      comboCount: this.combo.count,
      comboMultiplier: this.combo.multiplier,
      comboTierLabel: this.combo.tierLabel,
      comboProgress: this.combo.maxTimer > 0 ? Math.max(0, Math.min(1, this.combo.timer / this.combo.maxTimer)) : 0,
      boostEnergy: this.boostEnergy,
      isBoosting: this.isBoosting,
      saltLevel: this.saltLevel,
      isSalting: this.isSalting,
      onBlackIce: this.onBlackIce,
      saltedTractionActive: this.saltedTractionTimer > 0 || vehicleDef.iceImmune,
      fuelLevel: this.fuelLevel,
      fuelLow: this.fuelLow,
      blastCharge: this.blastCharge,
      blastReady: this.blastCharge >= 0.99,
      feverActive: this.combo.multiplier >= 4,
      cameraMode: this.cameraMode,
      timeOfDay: this.timeOfDay,
      vehicleId: this.vehicleId,
      unlockedVehicles: [...this.unlockedVehicles],
      ambulance: this.ambulance?.active
        ? {
            active: true,
            patienceRatio: Math.max(0, Math.min(1, this.ambulance.patience / this.ambulance.maxPatience)),
            stuck: this.ambulance.stuck,
            progressPercent: this.ambulanceProgress,
          }
        : null,
      avalancheAlert:
        this.avalanche && this.avalanche.state === 'telegraph'
          ? { active: true, timeLeft: Math.max(0, Number(this.avalanche.timer.toFixed(1))) }
          : null,
      activeMission: this.activeMission ? { ...this.activeMission } : null,
      missionsCompleted: this.missionsCompleted,
      upgrades: { ...this.upgrades },
      canAffordAnyUpgrade: canAffordAnyUpgrade(this.upgrades, this.coins, this.skillPoints),
      livery: this.livery,
      unlockedLiveries: [...this.unlockedLiveries],
      achievements: [...this.achievements],
      careerStats: {
        ...this.careerStats,
        districtStars: { ...this.careerStats.districtStars },
      },
      recentAchievement: this.recentAchievement,
      floatingPopups,
      muted: this.audio.isMuted(),
      shopOpen: this.shopOpen,
      nearGarage,
      weather: this.weatherState.target,
      weatherLabel: WEATHER_PROFILES[this.weatherState.target].label,
      tractionPercent: effectiveGrip,
      calloutText: this.calloutText,
      calloutId: this.calloutId,
      runStats: this.runStats,
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('pointerdown', this.onGlobalPointerUnlock);
    window.removeEventListener('blur', this.onWindowBlur);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);

    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.onPointerDown);
    dom.removeEventListener('wheel', this.onWheel);
    dom.removeEventListener('webglcontextlost', this.onContextLost);
    this.resizeObserver?.disconnect();

    this.audio.dispose();
    this.textures.dispose();
    this.envRT?.dispose();
    this.clearLevelGroup();
    this.goldenBeaconGeo?.dispose();
    this.goldenBeaconMat?.dispose();
    this.particleMesh.geometry.dispose();
    (this.particleMesh.material as THREE.Material).dispose();
    this.mistMesh.geometry.dispose();
    (this.mistMesh.material as THREE.Material).dispose();
    this.flakeMesh.geometry.dispose();
    (this.flakeMesh.material as THREE.Material).dispose();
    this.bloomPass.dispose();
    this.outputPass.dispose();
    this.composer.dispose();
    this.renderer.dispose();

    if (dom.parentNode === this.container) {
      this.container.removeChild(dom);
    }
  }
}
