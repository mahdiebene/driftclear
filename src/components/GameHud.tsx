import React, { useEffect, useRef } from 'react';
import {
  AlertTriangle,
  Award,
  Camera,
  CarFront,
  CloudSnow,
  Flame,
  Fuel,
  MapPin,
  Moon,
  Sparkles,
  Sun,
  Sunset,
  Wind,
  Zap,
} from 'lucide-react';
import type { HudSnapshot } from '../game/types';
import {
  CoinIcon,
  PauseIcon,
  RestartIcon,
  SnowflakeIcon,
  SoundIcon,
  WrenchIcon,
} from './Icons';

interface GameHudProps {
  hud: HudSnapshot;
  onDrawMinimap: (canvas: HTMLCanvasElement) => void;
  onToggleShop: () => void;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onRestart: () => void;
  onNextNeighborhood: () => void;
  onCycleWeather: () => void;
  onTriggerSalt: () => void;
  onTriggerBlast: () => void;
  onToggleCamera: () => void;
  onCycleSky: () => void;
}

function formatTimer(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem < 10 ? '0' : ''}${rem}`;
}

export function GameHud({
  hud,
  onDrawMinimap,
  onToggleShop,
  onToggleMute,
  onTogglePause,
  onRestart,
  onNextNeighborhood,
  onCycleWeather,
  onTriggerSalt,
  onTriggerBlast,
  onToggleCamera,
  onCycleSky,
}: GameHudProps) {
  const minimapRef = useRef<HTMLCanvasElement | null>(null);
  const progressRatio = Math.min(100, Math.max(0, hud.clearedPercent));
  const targetMarkerLeft = Math.min(100, hud.targetPercent);
  const xpRatio = hud.xpToNext > 0 ? Math.min(1, Math.max(0, hud.xp / hud.xpToNext)) : 0;
  const mission = hud.activeMission;
  const missionRatio =
    mission && mission.target > 0 ? Math.min(1, Math.max(0, mission.progress / mission.target)) : 0;

  // Redraw tactical snow minimap cleanly in sync with throttled HUD ticks (~10Hz)
  useEffect(() => {
    const canvas = minimapRef.current;
    if (canvas && !hud.shopOpen) {
      onDrawMinimap(canvas);
    }
  }, [hud, onDrawMinimap]);

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 sm:p-5">
      {/* Projected Floating 3D Reward Popups (pointer-events-none) */}
      {!hud.shopOpen &&
        hud.floatingPopups.map((p) => (
          <div
            key={p.id}
            style={{
              left: `${p.screenX}%`,
              top: `${p.screenY}%`,
              opacity: p.opacity,
              transform: 'translate(-50%, -50%)',
            }}
            className={`fixed pointer-events-none font-display font-extrabold text-sm sm:text-base hud-stroke whitespace-nowrap ${
              p.tone === 'ice'
                ? 'text-[#7dd3fc]'
                : p.tone === 'rescue'
                  ? 'text-[#86efac]'
                  : p.tone === 'time'
                    ? 'text-[#fb923c]'
                    : 'text-[#fde047]'
            }`}
          >
            {p.text}
          </div>
        ))}

      {/* Top Perimeter Bar: Left (Coins, Level/XP & Combo), Center (District, Timer & Weather), Right (Garage & Utility Buttons) */}
      <div className="flex items-start justify-between gap-3">
        {/* Top-Left Cluster: Coins, Score, Driver Level + XP Bar, and Live Combo Multiplier */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-2 px-3.5 py-2.5 rounded-xl bg-[#182434]/92 border border-[#f5c156]/35 shadow-[0_6px_18px_rgba(10,16,26,0.38)] min-w-[224px]">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <CoinIcon className="w-6 h-6 shrink-0" />
                <div className="flex flex-col leading-none">
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-[#c7d5e5]">
                    Coins
                  </span>
                  <span
                    data-testid="hud-coins"
                    className="font-mono-num font-bold text-xl text-[#ffd978]"
                  >
                    {hud.coins}
                  </span>
                </div>
              </div>

              <div className="w-px h-7 bg-[#ffffff]/15" aria-hidden="true" />

              <div className="flex flex-col leading-none">
                <span className="text-[10px] font-semibold tracking-wider uppercase text-[#c7d5e5]">
                  Score
                </span>
                <span
                  data-testid="hud-score"
                  className="font-mono-num font-bold text-xl text-[#faf6ef]"
                >
                  {hud.score}
                </span>
              </div>
            </div>

            {/* Driver Level & XP Progress Strip */}
            <div className="pt-1.5 border-t border-[#ffffff]/10 flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <span
                    data-testid="hud-level"
                    className="font-mono-num font-extrabold text-[#fde68a]"
                  >
                    Lv {hud.driverLevel}
                  </span>
                  <span className="text-[#c7d5e5] font-medium truncate max-w-[110px]">
                    {hud.driverRank}
                  </span>
                </div>
                <span className="font-mono-num text-[11px] text-[#9ec5e8]">
                  {hud.xp}/{hud.xpToNext} XP
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#2a3b50] overflow-hidden">
                <div
                  className="h-full bg-[#f5c156] transition-transform duration-150 origin-left"
                  style={{ transform: `scaleX(${xpRatio})` }}
                />
              </div>
            </div>
          </div>

          {/* Live Combo Multiplier Gauge (appears when streaking!) */}
          {hud.comboCount > 0 && (
            <div
              data-testid="hud-combo"
              className="px-3.5 py-2 rounded-xl bg-[#241b17]/92 border border-[#f59e0b]/60 shadow-lg flex flex-col gap-1.5 min-w-[168px]"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-display font-extrabold text-2xl leading-none text-[#fbbf24]">
                  {hud.comboMultiplier}x
                </span>
                <span className="text-xs font-semibold text-[#fef3c7] whitespace-nowrap">
                  {hud.comboTierLabel || `${hud.comboCount} Streak`}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#453126] overflow-hidden">
                <div
                  className="h-full bg-[#fbbf24] transition-transform duration-75 origin-left"
                  style={{ transform: `scaleX(${hud.comboProgress})` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Top-Center Cluster: District Progress, Mode Timer, Live Dynamic Weather & Achievement Toast */}
        <div className="hidden sm:flex flex-col items-center gap-2">
          <div className="flex flex-col items-center gap-1.5 px-4 py-2 rounded-xl bg-[#182434]/90 border border-[#9ec5e8]/30 shadow-[0_6px_18px_rgba(10,16,26,0.35)] min-w-[314px]">
            <div className="w-full flex items-baseline justify-between gap-4">
              <span className="font-display font-bold text-sm text-[#faf6ef] whitespace-nowrap">
                {hud.neighborhoodName}
              </span>
              <div className="flex items-center gap-3 text-xs font-mono-num">
                <span
                  className={`flex items-center gap-1 font-bold ${
                    hud.districtCleared ? 'text-[#86efac]' : 'text-[#bae6fd]'
                  }`}
                  data-testid="hud-cleared"
                >
                  <SnowflakeIcon className="w-3.5 h-3.5" />
                  {hud.clearedPercent}% / {hud.targetPercent}%
                </span>
                <span
                  data-testid="hud-timer"
                  className={`font-bold ${
                    hud.mode === 'rush'
                      ? hud.rushTimeLeft <= 25
                        ? 'text-[#fb7185]'
                        : 'text-[#fbbf24]'
                      : 'text-[#d5e0ec]'
                  }`}
                >
                  {hud.mode === 'rush'
                    ? `Rush ${formatTimer(hud.rushTimeLeft)}`
                    : formatTimer(hud.elapsedSeconds)}
                </span>
              </div>
            </div>

            {/* Snow Clear Progress Bar with Goal Notch */}
            <div className="relative w-full h-2.5 rounded-full bg-[#2b3c52] overflow-hidden">
              <div
                className={`h-full transition-transform duration-150 origin-left ${
                  hud.districtCleared ? 'bg-[#4ade80]' : 'bg-[#38bdf8]'
                }`}
                style={{ transform: `scaleX(${progressRatio / 100})` }}
              />
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-[#ffd978]"
                style={{ left: `${targetMarkerLeft}%` }}
                aria-hidden="true"
              />
            </div>

            {/* Interactive Dynamic Weather & Traction Readout (click or press C to shift weather) */}
            <button
              type="button"
              tabIndex={-1}
              data-testid="hud-weather"
              onClick={(e) => {
                e.currentTarget.blur();
                onCycleWeather();
              }}
              aria-label={`Weather: ${hud.weatherLabel}. Click or press C to shift weather.`}
              className="pointer-events-auto w-full pt-1 border-t border-[#ffffff]/10 flex items-center justify-between gap-3 text-[11px] text-[#d5e0ec] hover:text-[#ffffff] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5 font-semibold whitespace-nowrap">
                {hud.weather === 'clear' ? (
                  <Sun className="w-3.5 h-3.5 text-[#fde047] shrink-0" />
                ) : hud.weather === 'blizzard' ? (
                  <Wind className="w-3.5 h-3.5 text-[#7dd3fc] shrink-0" />
                ) : (
                  <CloudSnow className="w-3.5 h-3.5 text-[#bae6fd] shrink-0" />
                )}
                <span>{hud.weatherLabel}</span>
              </span>
              <span className="flex items-center gap-2 font-mono-num">
                <span
                  data-testid="hud-traction"
                  className={
                    hud.onBlackIce
                      ? 'font-bold text-[#7dd3fc]'
                      : hud.tractionPercent < 72
                        ? 'font-bold text-[#fbbf24]'
                        : hud.tractionPercent >= 96
                          ? 'font-semibold text-[#86efac]'
                          : 'text-[#9ec5e8]'
                  }
                >
                  {hud.onBlackIce
                    ? 'ICE 24%'
                    : hud.saltedTractionActive
                      ? `Salted ${hud.tractionPercent}%`
                      : `Grip ${hud.tractionPercent}%`}
                </span>
                <span className="text-[10px] text-[#94a3b8]">[C]</span>
              </span>
            </button>
            {/* Integrated Diesel Fuel Strip */}
            <div className="w-full pt-1 border-t border-[#ffffff]/10 flex items-center gap-2 text-[11px]">
              <Fuel
                className={`w-3.5 h-3.5 shrink-0 ${
                  hud.fuelLow ? 'text-[#fb7185]' : 'text-[#4ade80]'
                }`}
              />
              <span
                className={`font-semibold whitespace-nowrap ${
                  hud.fuelLow ? 'text-[#fda4af]' : 'text-[#c7d5e5]'
                }`}
              >
                {hud.fuelLow ? 'LOW FUEL — Visit Green Bay!' : 'Diesel Fuel'}
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-[#2a3b50] overflow-hidden">
                <div
                  data-testid="hud-fuel-bar"
                  className={`h-full transition-transform duration-150 origin-left ${
                    hud.fuelLow ? 'bg-[#f43f5e]' : 'bg-[#22c55e]'
                  }`}
                  style={{ transform: `scaleX(${Math.max(0, Math.min(1, hud.fuelLevel))})` }}
                />
              </div>
              <span className="font-mono-num text-[11px] font-bold text-[#e2eef9] w-8 text-right">
                {Math.round(hud.fuelLevel * 100)}%
              </span>
            </div>
          </div>

          {/* Emergency Alpine Ambulance Escort Banner */}
          {hud.ambulance?.active && (
            <div
              data-testid="hud-ambulance"
              className="px-3.5 py-1.5 rounded-xl bg-[#291418]/94 border border-[#ef4444]/75 shadow-lg flex items-center gap-2.5 text-xs text-[#fef2f2] min-w-[314px]"
            >
              <span className="px-1.5 py-0.5 rounded bg-[#dc2626] text-[10px] font-extrabold tracking-wider uppercase">
                EMS
              </span>
              <span className="font-bold whitespace-nowrap">
                {hud.ambulance.stuck ? 'Ambulance Blocked — Clear Lane!' : 'Ambulance Escort'}
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-[#451a1f] overflow-hidden">
                <div
                  className="h-full bg-[#60a5fa] transition-transform duration-150 origin-left"
                  style={{ transform: `scaleX(${hud.ambulance.patienceRatio})` }}
                />
              </div>
              <span className="font-mono-num font-bold text-[#fde047]">
                {hud.ambulance.progressPercent}%
              </span>
            </div>
          )}

          {/* Roof-Slide Avalanche Telegraph Warning */}
          {hud.avalancheAlert?.active && (
            <div
              data-testid="hud-avalanche"
              className="px-3.5 py-1.5 rounded-xl bg-[#341a12]/94 border border-[#fb923c]/80 shadow-lg flex items-center gap-2 text-xs text-[#ffedd5]"
            >
              <AlertTriangle className="w-4 h-4 text-[#fb923c] shrink-0" />
              <span className="font-bold">
                Roof Avalanche Incoming · {hud.avalancheAlert.timeLeft.toFixed(1)}s
              </span>
            </div>
          )}

          {/* Non-blocking Achievement Unlocked Toast */}
          {hud.recentAchievement && (
            <div
              key={hud.recentAchievement.id}
              data-testid="hud-achievement-toast"
              className="px-3.5 py-1.5 rounded-xl bg-[#272012]/94 border border-[#fde047]/65 shadow-lg flex items-center gap-2 text-xs text-[#fef9c3]"
            >
              <Award className="w-4 h-4 text-[#fbbf24] shrink-0" />
              <span className="font-bold">Trophy Unlocked: {hud.recentAchievement.title}</span>
              <span className="font-mono-num font-bold text-[#fde047]">
                +{hud.recentAchievement.rewardCoins}c
              </span>
            </div>
          )}
        </div>

        {/* Top-Right Cluster: Camera [V], Sky [T], Alpine Garage [U] & Utility Square Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            tabIndex={-1}
            data-testid="hud-cam-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleCamera();
            }}
            aria-label={`Switch camera view (current: ${hud.cameraMode === 'chase' ? '3D Chase Cam' : 'Isometric'})`}
            className={`pointer-events-auto h-11 px-3 rounded-xl border font-semibold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg transition-transform active:scale-95 cursor-pointer whitespace-nowrap ${
              hud.cameraMode === 'chase'
                ? 'bg-[#1d4ed8] hover:bg-[#2563eb] text-[#eff6ff] border-[#93c5fd]'
                : 'bg-[#182434]/90 hover:bg-[#223349] text-[#faf6ef] border-[#9ec5e8]/35'
            }`}
          >
            <Camera className="w-4 h-4 shrink-0" />
            <span className="hidden md:inline">
              {hud.cameraMode === 'chase' ? '3D Cam' : 'Iso'}
            </span>
            <span className="font-mono-num text-[11px] opacity-80">[V]</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            data-testid="hud-sky-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              onCycleSky();
            }}
            aria-label={`Cycle time of day (current: ${hud.timeOfDay})`}
            className="pointer-events-auto h-11 px-3 rounded-xl bg-[#182434]/90 hover:bg-[#223349] text-[#faf6ef] border border-[#9ec5e8]/35 font-semibold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
          >
            {hud.timeOfDay === 'night' ? (
              <Moon className="w-4 h-4 text-[#93c5fd] shrink-0" />
            ) : hud.timeOfDay === 'sunset' ? (
              <Sunset className="w-4 h-4 text-[#fb923c] shrink-0" />
            ) : (
              <Sun className="w-4 h-4 text-[#fde047] shrink-0" />
            )}
            <span className="hidden lg:inline capitalize">{hud.timeOfDay}</span>
            <span className="font-mono-num text-[11px] opacity-80">[T]</span>
          </button>
          <button
            type="button"
            tabIndex={-1}
            data-testid="hud-garage-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleShop();
            }}
            aria-label="Open Alpine Garage"
            className={`pointer-events-auto h-11 px-3.5 rounded-xl border font-semibold text-sm flex items-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer whitespace-nowrap ${
              hud.skillPoints > 0
                ? 'bg-[#d97706] hover:bg-[#e58410] text-[#fffbeb] border-[#fef08a]'
                : hud.canAffordAnyUpgrade || hud.nearGarage
                  ? 'bg-[#b45309] hover:bg-[#c85e0e] text-[#fffbeb] border-[#fde68a]'
                  : 'bg-[#182434]/90 hover:bg-[#223349] text-[#faf6ef] border-[#f5c156]/35'
            }`}
          >
            <WrenchIcon className="w-4 h-4 shrink-0" />
            <span>Garage</span>
            {hud.skillPoints > 0 ? (
              <span
                data-testid="hud-sp"
                className="px-1.5 py-0.5 rounded bg-[#182434]/85 text-[#fde68a] font-mono-num text-[11px] font-bold"
              >
                +{hud.skillPoints} SP
              </span>
            ) : (
              <span className="font-mono-num text-[11px] opacity-80 hidden sm:inline">[U]</span>
            )}
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            aria-label={hud.muted ? 'Unmute sound effects' : 'Mute sound effects'}
            className="pointer-events-auto w-11 h-11 rounded-xl bg-[#182434]/90 hover:bg-[#223349] border border-[#9ec5e8]/30 flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
          >
            <SoundIcon muted={hud.muted} />
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onTogglePause();
            }}
            aria-label="Pause game"
            className="pointer-events-auto w-11 h-11 rounded-xl bg-[#182434]/90 hover:bg-[#223349] border border-[#9ec5e8]/30 flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
          >
            <PauseIcon />
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onRestart();
            }}
            aria-label="Fresh snowfall"
            className="pointer-events-auto w-11 h-11 rounded-xl bg-[#182434]/90 hover:bg-[#223349] border border-[#9ec5e8]/30 flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
          >
            <RestartIcon />
          </button>
        </div>
      </div>

      {/* Mobile compact progress strip (only on narrow screens where top-center hides) */}
      <div className="sm:hidden mt-2 flex items-center justify-between gap-3 px-3 py-1.5 rounded-lg bg-[#182434]/90 border border-[#9ec5e8]/30 text-xs font-mono-num">
        <span className="font-display font-bold text-[#faf6ef] truncate">{hud.neighborhoodName}</span>
        <span className="text-[#bae6fd] font-bold shrink-0">
          {hud.clearedPercent}% / {hud.targetPercent}%
        </span>
        <span className="font-semibold text-[#d5e0ec] shrink-0">
          {hud.mode === 'rush' ? formatTimer(hud.rushTimeLeft) : formatTimer(hud.elapsedSeconds)}
        </span>
      </div>

      {/* Bottom Perimeter: Left (Active Dispatch Mission), Center (Callout + Turbo & Salt Dock), Right (Town Minimap) */}
      {!hud.shopOpen && (
        <div className="mt-auto flex items-end justify-between gap-3">
          {/* Bottom-Left: Live Municipal Dispatch Objective Card */}
          <div className="hidden md:flex flex-col gap-1.5 w-[238px] shrink-0">
            {mission && (
              <div
                data-testid="hud-mission"
                className="px-3.5 py-2.5 rounded-xl bg-[#152130]/92 border border-[#38bdf8]/40 shadow-[0_8px_22px_rgba(8,14,24,0.44)] flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7dd3fc] flex items-center gap-1">
                    {mission.kind === 'rescueCar' ? (
                      <CarFront className="w-3.5 h-3.5 text-[#fbbf24]" />
                    ) : mission.kind === 'deIce' ? (
                      <Sparkles className="w-3.5 h-3.5 text-[#38bdf8]" />
                    ) : mission.kind === 'driftRush' ? (
                      <Flame className="w-3.5 h-3.5 text-[#fb923c]" />
                    ) : (
                      <MapPin className="w-3.5 h-3.5 text-[#38bdf8]" />
                    )}
                    <span>Dispatch #{mission.id}</span>
                  </span>
                  <span className="font-mono-num text-[11px] font-bold text-[#fde047]">
                    +{mission.rewardCoins}c
                    {hud.mode === 'rush' ? ` · +${mission.bonusTimeSec}s` : ''}
                  </span>
                </div>

                <div className="font-display font-bold text-xs text-[#faf6ef] leading-tight">
                  {mission.title}
                </div>
                <div className="text-[11px] text-[#b8c7d9] leading-snug">{mission.subtitle}</div>

                <div className="flex items-center gap-2 pt-0.5">
                  <div className="flex-1 h-1.5 rounded-full bg-[#24364c] overflow-hidden">
                    <div
                      className={`h-full transition-transform duration-150 origin-left ${
                        mission.kind === 'rescueCar' ? 'bg-[#fbbf24]' : 'bg-[#38bdf8]'
                      }`}
                      style={{ transform: `scaleX(${missionRatio})` }}
                    />
                  </div>
                  <span className="font-mono-num text-[11px] font-bold text-[#e2eef9]">
                    {mission.progress}/{mission.target}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom-Center: Callout, Black-Ice Alert, Garage Hint & Unified Turbo + Salt Instrument Dock */}
          <div className="flex-1 flex flex-col items-center gap-2">
            {hud.onBlackIce && (
              <div
                data-testid="hud-ice-warning"
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#0c273b]/92 border border-[#38bdf8]/75 text-xs font-bold text-[#bae6fd]"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>Black Ice Slick — Hold [E] to Spread Rock Salt!</span>
              </div>
            )}

            {hud.calloutText && !hud.onBlackIce && (
              <div
                key={hud.calloutId}
                className="font-display font-bold text-base sm:text-lg text-[#fffbeb] hud-stroke tracking-tight text-center"
              >
                {hud.calloutText}
              </div>
            )}

            {hud.nearGarage && (
              <div className="text-xs font-semibold text-[#86efac] hud-stroke">
                Green Service Bay — Auto-Refilling Diesel Fuel &amp; Salt · Press [U] for Garage
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-[#182434]/92 border border-[#9ec5e8]/25 shadow-md">
              {/* Turbo Gauge */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-[#c7d5e5] whitespace-nowrap">
                  Turbo [Space]
                </span>
                <div className="w-20 sm:w-24 h-2 rounded-full bg-[#2a3b50] overflow-hidden">
                  <div
                    className={`h-full transition-transform duration-75 origin-left ${
                      hud.isBoosting ? 'bg-[#fb923c]' : 'bg-[#f5c156]'
                    }`}
                    style={{ transform: `scaleX(${Math.max(0, Math.min(1, hud.boostEnergy))})` }}
                  />
                </div>
              </div>

              <div className="w-px h-4 bg-[#ffffff]/15 hidden sm:block" aria-hidden="true" />

              {/* Interactive Salt Spreader Gauge (click or hold E) */}
              <button
                type="button"
                tabIndex={-1}
                data-testid="hud-salt-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onTriggerSalt();
                }}
                aria-label="Spread rock salt to melt black ice and boost blizzard grip"
                className="pointer-events-auto flex items-center gap-2 cursor-pointer group"
              >
                <span
                  className={`text-[11px] font-semibold tracking-wider uppercase whitespace-nowrap transition-colors ${
                    hud.isSalting
                      ? 'text-[#7dd3fc]'
                      : hud.saltLevel < 0.2
                        ? 'text-[#fbbf24]'
                        : 'text-[#c7d5e5] group-hover:text-[#ffffff]'
                  }`}
                >
                  Salt [E]
                </span>
                <div className="w-16 sm:w-20 h-2 rounded-full bg-[#2a3b50] overflow-hidden">
                  <div
                    className={`h-full transition-transform duration-75 origin-left ${
                      hud.isSalting ? 'bg-[#38bdf8]' : 'bg-[#bae6fd]'
                    }`}
                    style={{ transform: `scaleX(${Math.max(0, Math.min(1, hud.saltLevel))})` }}
                  />
                </div>
              </button>

              <div className="w-px h-4 bg-[#ffffff]/15 hidden sm:block" aria-hidden="true" />

              {/* Active Thermal Snow-Blast Shockwave Slot (click or press F) */}
              <button
                type="button"
                tabIndex={-1}
                data-testid="hud-blast-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onTriggerBlast();
                }}
                aria-label="Trigger Thermal Snow-Blast Shockwave"
                className={`pointer-events-auto flex items-center gap-2 px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                  hud.blastReady
                    ? 'bg-[#b45309] text-[#fef9c3] border border-[#fde047]'
                    : 'hover:bg-[#223349] text-[#c7d5e5] border border-transparent'
                }`}
              >
                <Zap
                  className={`w-3.5 h-3.5 shrink-0 ${
                    hud.blastReady ? 'text-[#fde047]' : 'text-[#fb923c]'
                  }`}
                />
                <span className="text-[11px] font-bold tracking-wider uppercase whitespace-nowrap">
                  {hud.blastReady ? 'Blast Ready [F]' : 'Blast [F]'}
                </span>
                {!hud.blastReady && (
                  <div className="w-16 sm:w-20 h-2 rounded-full bg-[#2a3b50] overflow-hidden">
                    <div
                      className="h-full bg-[#fb923c] transition-transform duration-100 origin-left"
                      style={{ transform: `scaleX(${Math.max(0, Math.min(1, hud.blastCharge))})` }}
                    />
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Bottom-Right: Live Tactical Snow Minimap + Next District shortcut once cleared */}
          <div className="hidden sm:flex flex-col items-end gap-2 w-[152px] shrink-0">
            {hud.districtCleared && (
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onNextNeighborhood();
                }}
                className="pointer-events-auto px-3.5 py-1.5 rounded-lg bg-[#d64531] hover:bg-[#e3533f] text-[#faf6ef] font-display font-bold text-xs border border-[#f8d78b] shadow-lg cursor-pointer whitespace-nowrap"
              >
                Next District →
              </button>
            )}
            <div className="p-1.5 rounded-xl bg-[#15202e]/92 border border-[#9ec5e8]/35 shadow-[0_8px_22px_rgba(8,14,24,0.48)] flex flex-col gap-1">
              <canvas
                ref={minimapRef}
                width={136}
                height={136}
                data-testid="snow-minimap"
                className="w-[136px] h-[136px] rounded-lg block"
              />
              <div className="flex items-center justify-between px-1 text-[10px] text-[#b8c7d9] font-medium">
                <span>Town Map</span>
                <span className="font-mono-num text-[#fde68a]">{hud.clearedPercent}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
