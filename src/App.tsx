import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameHud } from './components/GameHud';
import { OutcomeModal, PauseModal } from './components/StatusModals';
import { TitleScreen } from './components/TitleScreen';
import { UpgradeModal } from './components/UpgradeModal';
import { SnowPlowEngine } from './game/engine';
import { ACHIEVEMENTS, createInitialCareerStats } from './game/progression';
import {
  INITIAL_UPGRADES,
  NEIGHBORHOODS,
  UPGRADE_DEFINITIONS,
  getDriverRank,
  getXpRequiredForLevel,
} from './game/rules';
import type {
  GameMode,
  HudSnapshot,
  LiveryId,
  UpgradeId,
  VehicleId,
  WeatherKind,
} from './game/types';

const INITIAL_HUD: HudSnapshot = {
  phase: 'title',
  mode: 'career',
  rushTimeLeft: 180,
  neighborhoodIndex: 0,
  neighborhoodName: NEIGHBORHOODS[0].name,
  unlockedDistricts: 1,
  districtCleared: false,
  score: 0,
  bestScore: 0,
  coins: 0,
  driverLevel: 1,
  driverRank: getDriverRank(1),
  xp: 0,
  xpToNext: getXpRequiredForLevel(1),
  skillPoints: 0,
  clearedPercent: 0,
  targetPercent: NEIGHBORHOODS[0].targetPercent,
  elapsedSeconds: 0,
  comboCount: 0,
  comboMultiplier: 1,
  comboTierLabel: '',
  comboProgress: 0,
  boostEnergy: 1,
  isBoosting: false,
  saltLevel: 1,
  isSalting: false,
  onBlackIce: false,
  saltedTractionActive: false,
  fuelLevel: 1,
  fuelLow: false,
  blastCharge: 0.55,
  blastReady: false,
  feverActive: false,
  cameraMode: 'isometric',
  timeOfDay: 'sunset',
  vehicleId: 'ranger',
  unlockedVehicles: ['ranger'],
  ambulance: null,
  avalancheAlert: null,
  activeMission: null,
  missionsCompleted: 0,
  upgrades: { ...INITIAL_UPGRADES },
  canAffordAnyUpgrade: false,
  livery: 'crimson',
  unlockedLiveries: ['crimson'],
  achievements: [],
  careerStats: createInitialCareerStats(),
  recentAchievement: null,
  floatingPopups: [],
  muted: false,
  shopOpen: false,
  nearGarage: false,
  weather: 'light',
  weatherLabel: 'Light Snowfall',
  tractionPercent: 88,
  calloutText: '',
  calloutId: 0,
  runStats: null,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<SnowPlowEngine | null>(null);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const hudRef = useRef<HudSnapshot>(INITIAL_HUD);

  useEffect(() => {
    hudRef.current = hud;
    document.body.dataset.state = hud.phase;
  }, [hud]);

  // Mount Three.js engine once inside isolated canvas ref container
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const params = new URLSearchParams(window.location.search);
    const autostart = params.get('autostart') === '1';
    const weatherParam = params.get('weather');
    const initialWeather: WeatherKind =
      weatherParam === 'clear' || weatherParam === 'blizzard' || weatherParam === 'light'
        ? weatherParam
        : 'light';

    const engine = new SnowPlowEngine(
      mount,
      (snapshot) => {
        setHud(snapshot);
      },
      autostart,
      initialWeather
    );
    engineRef.current = engine;

    if (params.get('mode') === 'rush') {
      engine.setGameMode('rush');
    }
    if (params.get('cam') === 'chase') {
      engine.setCameraMode('chase');
    }
    const skyParam = params.get('sky');
    if (skyParam === 'sunset' || skyParam === 'night' || skyParam === 'day') {
      engine.setTimeOfDay(skyParam);
    }

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Global keyboard shortcuts synced with game state machine
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;
      const state = hudRef.current;

      if (state.phase === 'title') {
        if (state.shopOpen) {
          if (e.code === 'Escape' || e.code === 'KeyU') {
            e.preventDefault();
            engine.setShopOpen(false);
          }
          return;
        }
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          engine.startGame('career');
        } else if (e.code === 'KeyU') {
          e.preventDefault();
          engine.setShopOpen(true);
        } else if (e.code === 'KeyT') {
          e.preventDefault();
          engine.cycleDayNight();
        } else if (e.code === 'KeyV') {
          e.preventDefault();
          engine.toggleCameraMode();
        } else if (e.code === 'KeyM') {
          engine.toggleMute();
        }
        return;
      }

      if (e.code === 'KeyM') {
        engine.toggleMute();
        return;
      }

      if (state.phase === 'playing') {
        if (e.code === 'KeyU') {
          e.preventDefault();
          engine.toggleShop();
          return;
        }
        if (state.shopOpen) {
          if (e.code === 'Escape') {
            e.preventDefault();
            engine.setShopOpen(false);
            return;
          }
          const digitMatch = /^Digit([1-6])$/.exec(e.code);
          if (digitMatch) {
            const idx = parseInt(digitMatch[1], 10) - 1;
            const def = UPGRADE_DEFINITIONS[idx];
            if (def) engine.buyUpgrade(def.id);
          }
          return;
        }
        if (e.code === 'Escape' || e.code === 'KeyP') {
          e.preventDefault();
          engine.togglePause();
        } else if (e.code === 'KeyR') {
          e.preventDefault();
          engine.restartShift(false);
        } else if (e.code === 'KeyC') {
          e.preventDefault();
          engine.cycleWeather();
        } else if (e.code === 'KeyF') {
          e.preventDefault();
          engine.triggerThermalBlast();
        } else if (e.code === 'KeyV') {
          e.preventDefault();
          engine.toggleCameraMode();
        } else if (e.code === 'KeyT') {
          e.preventDefault();
          engine.cycleDayNight();
        }
        return;
      }

      if (state.phase === 'paused') {
        if (e.code === 'Escape' || e.code === 'KeyP') {
          e.preventDefault();
          engine.togglePause();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleStartCareer = useCallback(() => {
    engineRef.current?.startGame('career');
  }, []);

  const handleStartRush = useCallback(() => {
    engineRef.current?.startGame('rush');
  }, []);

  const handleSelectTitleDistrict = useCallback((index: number) => {
    engineRef.current?.selectTitleNeighborhood(index);
  }, []);

  const handleToggleShop = useCallback(() => {
    engineRef.current?.toggleShop();
  }, []);

  const handleBuyUpgrade = useCallback((id: UpgradeId) => {
    engineRef.current?.buyUpgrade(id);
  }, []);

  const handleSelectLivery = useCallback((id: LiveryId) => {
    engineRef.current?.selectOrBuyLivery(id);
  }, []);

  const handleToggleMute = useCallback(() => {
    engineRef.current?.toggleMute();
  }, []);

  const handleTogglePause = useCallback(() => {
    engineRef.current?.togglePause();
  }, []);

  const handleRestart = useCallback(() => {
    engineRef.current?.restartShift(false);
  }, []);

  const handleResetCareer = useCallback(() => {
    engineRef.current?.resetCareer();
  }, []);

  const handleContinuePlowing = useCallback(() => {
    engineRef.current?.continuePlowing();
  }, []);

  const handleSelectDistrict = useCallback((index: number) => {
    engineRef.current?.selectNeighborhood(index);
  }, []);

  const handleNextNeighborhood = useCallback(() => {
    engineRef.current?.nextNeighborhood();
  }, []);

  const handleReturnToTitle = useCallback(() => {
    engineRef.current?.returnToTitle();
  }, []);

  const handleDrawMinimap = useCallback((canvas: HTMLCanvasElement) => {
    engineRef.current?.drawMinimap(canvas);
  }, []);

  const handleCycleWeather = useCallback(() => {
    engineRef.current?.cycleWeather();
  }, []);

  const handleTriggerSalt = useCallback(() => {
    engineRef.current?.triggerSaltPulse();
  }, []);

  const handleTriggerBlast = useCallback(() => {
    engineRef.current?.triggerThermalBlast();
  }, []);

  const handleToggleCamera = useCallback(() => {
    engineRef.current?.toggleCameraMode();
  }, []);

  const handleCycleSky = useCallback(() => {
    engineRef.current?.cycleDayNight();
  }, []);

  const handleSelectVehicle = useCallback((id: VehicleId) => {
    engineRef.current?.selectOrBuyVehicle(id);
  }, []);

  const totalStars = Object.values(hud.careerStats.districtStars).reduce((a, b) => a + b, 0);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#cbdff2]">
      {/* Isolated WebGL Canvas Container (never re-mounted on HUD updates) */}
      <div ref={canvasMountRef} className="fixed inset-0 w-full h-full" />

      {/* Title Screen (hidden cleanly when Alpine Garage overlay is open over the live 3D showcase) */}
      {hud.phase === 'title' && !hud.shopOpen && (
        <TitleScreen
          bestScore={hud.bestScore}
          coins={hud.coins}
          driverLevel={hud.driverLevel}
          driverRank={hud.driverRank}
          totalStars={totalStars}
          maxStars={NEIGHBORHOODS.length * 3}
          districtStars={hud.careerStats.districtStars}
          achievementCount={hud.achievements.length}
          totalAchievements={ACHIEVEMENTS.length}
          neighborhoodIndex={hud.neighborhoodIndex}
          unlockedDistricts={hud.unlockedDistricts}
          vehicleId={hud.vehicleId}
          unlockedVehiclesCount={hud.unlockedVehicles.length}
          cameraMode={hud.cameraMode}
          timeOfDay={hud.timeOfDay}
          muted={hud.muted}
          onStartCareer={handleStartCareer}
          onStartRush={handleStartRush}
          onOpenGarage={handleToggleShop}
          onSelectDistrict={handleSelectTitleDistrict}
          onToggleCamera={handleToggleCamera}
          onCycleSky={handleCycleSky}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Active Playing HUD */}
      {hud.phase === 'playing' && (
        <GameHud
          hud={hud}
          onDrawMinimap={handleDrawMinimap}
          onToggleShop={handleToggleShop}
          onToggleMute={handleToggleMute}
          onTogglePause={handleTogglePause}
          onRestart={handleRestart}
          onNextNeighborhood={handleNextNeighborhood}
          onCycleWeather={handleCycleWeather}
          onTriggerSalt={handleTriggerSalt}
          onTriggerBlast={handleTriggerBlast}
          onToggleCamera={handleToggleCamera}
          onCycleSky={handleCycleSky}
        />
      )}

      {/* Alpine Plow Garage: Accessible both on the Home Menu Showcase & Mid-Shift! */}
      {(hud.phase === 'playing' || hud.phase === 'title') && hud.shopOpen && (
        <UpgradeModal
          coins={hud.coins}
          skillPoints={hud.skillPoints}
          driverLevel={hud.driverLevel}
          driverRank={hud.driverRank}
          xp={hud.xp}
          xpToNext={hud.xpToNext}
          bestScore={hud.bestScore}
          clearedPercent={hud.clearedPercent}
          upgrades={hud.upgrades}
          vehicleId={hud.vehicleId}
          unlockedVehicles={hud.unlockedVehicles}
          livery={hud.livery}
          unlockedLiveries={hud.unlockedLiveries}
          achievements={hud.achievements}
          careerStats={hud.careerStats}
          neighborhoodIndex={hud.neighborhoodIndex}
          unlockedDistricts={hud.unlockedDistricts}
          isTitle={hud.phase === 'title'}
          onBuy={handleBuyUpgrade}
          onSelectVehicle={handleSelectVehicle}
          onSelectLivery={handleSelectLivery}
          onSelectDistrict={handleSelectDistrict}
          onClose={handleToggleShop}
        />
      )}

      {/* Pause Modal */}
      {hud.phase === 'paused' && (
        <PauseModal
          neighborhoodName={hud.neighborhoodName}
          driverLevel={hud.driverLevel}
          driverRank={hud.driverRank}
          onResume={handleTogglePause}
          onRestart={handleRestart}
          onResetCareer={handleResetCareer}
          onTitle={handleReturnToTitle}
        />
      )}

      {/* District Cleared / Storm Rush Outcome Modal */}
      {hud.phase === 'gameover' && hud.runStats && (
        <OutcomeModal
          stats={hud.runStats}
          onNextNeighborhood={handleNextNeighborhood}
          onContinuePlowing={handleContinuePlowing}
          onRetry={handleRestart}
          onTitle={handleReturnToTitle}
        />
      )}
    </main>
  );
}
