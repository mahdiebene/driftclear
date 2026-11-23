import React from 'react';
import {
  Camera,
  ChevronRight,
  Clock,
  Lock,
  Moon,
  Play,
  Star,
  Sun,
  Sunset,
  Truck,
} from 'lucide-react';
import { getVehicleDefinition } from '../game/events';
import { NEIGHBORHOODS } from '../game/rules';
import type { CameraMode, TimeOfDay, VehicleId } from '../game/types';
import { CoinIcon, DriftclearTitleLockup, SoundIcon } from './Icons';

interface TitleScreenProps {
  bestScore: number;
  coins: number;
  driverLevel: number;
  driverRank: string;
  totalStars: number;
  maxStars: number;
  districtStars: Record<number, number>;
  achievementCount: number;
  totalAchievements: number;
  neighborhoodIndex: number;
  unlockedDistricts: number;
  vehicleId: VehicleId;
  unlockedVehiclesCount: number;
  cameraMode: CameraMode;
  timeOfDay: TimeOfDay;
  muted: boolean;
  onStartCareer: () => void;
  onStartRush: () => void;
  onOpenGarage: () => void;
  onSelectDistrict: (index: number) => void;
  onToggleCamera: () => void;
  onCycleSky: () => void;
  onToggleMute: () => void;
}

export function TitleScreen({
  bestScore,
  coins,
  driverLevel,
  driverRank,
  totalStars,
  maxStars,
  districtStars,
  achievementCount,
  totalAchievements,
  neighborhoodIndex,
  unlockedDistricts,
  vehicleId,
  unlockedVehiclesCount,
  cameraMode,
  timeOfDay,
  muted,
  onStartCareer,
  onStartRush,
  onOpenGarage,
  onSelectDistrict,
  onToggleCamera,
  onCycleSky,
  onToggleMute,
}: TitleScreenProps) {
  const activeDistrict = NEIGHBORHOODS[neighborhoodIndex] ?? NEIGHBORHOODS[0];
  const activeVehicle = getVehicleDefinition(vehicleId);

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-6 sm:p-10">
      {/* Cinematic Directional Vignette Scrim: Deep contrast left menu rail, wide open right 60% for Hero 3D Truck! */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(96deg, rgba(8, 14, 24, 0.88) 0%, rgba(10, 18, 30, 0.68) 32%, rgba(10, 18, 30, 0.14) 56%, rgba(10, 18, 30, 0) 74%), linear-gradient(0deg, rgba(8, 14, 24, 0.62) 0%, rgba(8, 14, 24, 0) 18%)',
        }}
      />

      {/* Top-Right Compact Driver Career Line & Audio Button */}
      <div className="relative z-10 flex items-center justify-end gap-3">
        <div className="hidden sm:flex items-center gap-3 px-3.5 py-2 rounded-lg bg-[#0d1726]/85 border border-[#ffffff]/15 shadow-lg text-xs font-semibold text-[#eef5fc]">
          <span className="text-[#fde68a] font-mono-num font-bold">Lv {driverLevel}</span>
          <span>{driverRank}</span>
          <span aria-hidden="true" className="opacity-45">·</span>
          <span className="inline-flex items-center gap-1 font-mono-num text-[#ffd978]">
            <CoinIcon className="w-4 h-4" />
            {coins}
          </span>
          <span aria-hidden="true" className="opacity-45">·</span>
          <span className="inline-flex items-center gap-1 font-mono-num text-[#fde68a]">
            <Star className="w-3.5 h-3.5 text-[#fbbf24] fill-[#fbbf24]" />
            {totalStars}/{maxStars}
          </span>
          {bestScore > 0 && (
            <>
              <span aria-hidden="true" className="opacity-45">·</span>
              <span className="font-mono-num text-[#bae6fd]">
                Best {bestScore.toLocaleString()}
              </span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleMute();
          }}
          aria-label={muted ? 'Unmute sound effects' : 'Mute sound effects'}
          className="pointer-events-auto w-11 h-11 rounded-lg bg-[#142030]/90 border border-[#f5c156]/45 hover:border-[#fde047] flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
        >
          <SoundIcon muted={muted} />
        </button>
      </div>

      {/* Left-Rail Console Game Main Menu (over directional contrast scrim, right 60% showcases Hero 3D Rig!) */}
      <div className="relative z-10 w-full max-w-[490px] flex flex-col items-start gap-6 my-auto">
        <DriftclearTitleLockup />

        {/* 3 Authoritative Tactile Console-Style Game Menu Buttons */}
        <nav aria-label="Main Menu" className="w-full max-w-[388px] flex flex-col gap-2.5 pl-1">
          <button
            type="button"
            data-start="true"
            data-testid="menu-play-career"
            onClick={(e) => {
              e.currentTarget.blur();
              onStartCareer();
            }}
            className="pointer-events-auto group w-full px-5 py-3.5 rounded-xl bg-[#d64531] hover:bg-[#e5523d] text-[#fffbeb] border-2 border-[#f8d78b] shadow-[0_5px_0_#7c2116,0_14px_28px_rgba(6,10,18,0.58)] hover:translate-x-1.5 active:translate-y-0.5 transition-all cursor-pointer flex items-center justify-between gap-3 text-left"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-[#99291a] border border-[#fde68a]/45 flex items-center justify-center shrink-0">
                <Play className="w-5 h-5 fill-[#fffbeb] text-[#fffbeb] ml-0.5" />
              </div>
              <div className="min-w-0">
                <div className="font-display font-extrabold text-xl tracking-wide leading-none">
                  PLAY CAREER
                </div>
                <div className="text-xs text-[#ffedd5] mt-1 font-medium">
                  {activeDistrict.name} · Clear {activeDistrict.targetPercent}% &amp; Earn Stars
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#fde68a] shrink-0 transition-transform group-hover:translate-x-1" />
          </button>

          <button
            type="button"
            data-testid="menu-storm-rush"
            onClick={(e) => {
              e.currentTarget.blur();
              onStartRush();
            }}
            className="pointer-events-auto group w-full px-5 py-3 rounded-xl bg-[#182538]/92 hover:bg-[#23354f] text-[#faf6ef] border border-[#fb923c]/60 shadow-[0_4px_0_#0d1522,0_10px_22px_rgba(6,10,18,0.48)] hover:translate-x-1.5 active:translate-y-0.5 transition-all cursor-pointer flex items-center justify-between gap-3 text-left"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-[#7c2d12]/80 border border-[#fb923c]/50 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-[#fdba74]" />
              </div>
              <div className="min-w-0">
                <div className="font-display font-extrabold text-lg tracking-wide leading-none text-[#fef08a]">
                  STORM RUSH · 3:00
                </div>
                <div className="text-xs text-[#cbd5e1] mt-1">
                  3-Min Blizzard Run · Rescues Add Time
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#fb923c] shrink-0 transition-transform group-hover:translate-x-1" />
          </button>

          <button
            type="button"
            data-testid="menu-garage-fleet"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenGarage();
            }}
            className="pointer-events-auto group w-full px-5 py-3 rounded-xl bg-[#152030]/92 hover:bg-[#203047] text-[#faf6ef] border border-[#9ec5e8]/35 hover:border-[#f5c156]/70 shadow-[0_4px_0_#0b121d,0_10px_22px_rgba(6,10,18,0.45)] hover:translate-x-1.5 active:translate-y-0.5 transition-all cursor-pointer flex items-center justify-between gap-3 text-left"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-[#22344a] border border-[#9ec5e8]/35 flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5 text-[#7dd3fc]" />
              </div>
              <div className="min-w-0">
                <div className="font-display font-extrabold text-lg tracking-wide leading-none">
                  GARAGE &amp; FLEET
                </div>
                <div className="text-xs text-[#b8c7d9] mt-1 truncate">
                  {activeVehicle.name} · {unlockedVehiclesCount}/3 Rigs · {achievementCount}/{totalAchievements} Trophies
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#9ec5e8] shrink-0 transition-transform group-hover:translate-x-1" />
          </button>
        </nav>

        {/* Clean Pre-Launch Loadout Strip: Live District & Live 3D Atmosphere / Camera Selectors */}
        <div className="w-full max-w-[388px] pl-1 pt-3 border-t border-[#ffffff]/15 flex flex-col gap-2.5">
          {/* District Route Selector */}
          <div className="flex items-center gap-1.5">
            {NEIGHBORHOODS.map((n) => {
              const unlocked = n.index < unlockedDistricts;
              const selected = n.index === neighborhoodIndex;
              const stars = districtStars[n.index] ?? 0;
              const shortLabel =
                n.index === 0 ? 'Pinebrook' : n.index === 1 ? 'Lantern Qtr' : 'Frostmill';
              return (
                <button
                  key={n.index}
                  type="button"
                  disabled={!unlocked}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onSelectDistrict(n.index);
                  }}
                  className={`pointer-events-auto flex-1 px-2.5 py-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1 whitespace-nowrap ${
                    selected
                      ? 'bg-[#28405c] text-[#fde68a] border-[#f5c156]/75'
                      : unlocked
                        ? 'bg-[#152130]/90 hover:bg-[#1f3045] text-[#dce7f4] border-[#9ec5e8]/25 cursor-pointer'
                        : 'bg-[#101824]/80 text-[#64748b] border-[#ffffff]/8 cursor-not-allowed'
                  }`}
                >
                  {!unlocked && <Lock className="w-3 h-3 shrink-0" />}
                  <span>{shortLabel}</span>
                  {stars > 0 && (
                    <span className="font-mono-num text-[10px] text-[#fbbf24]">
                      {stars}★
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Starting Camera View & Live 3D Sky Preview */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="title-cam-toggle"
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleCamera();
              }}
              className="pointer-events-auto flex-1 px-3 py-2 rounded-lg bg-[#152130]/90 hover:bg-[#203248] border border-[#9ec5e8]/30 text-xs font-semibold text-[#e2eef9] flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors"
            >
              <Camera className="w-3.5 h-3.5 text-[#7dd3fc] shrink-0" />
              <span>Start Cam: {cameraMode === 'chase' ? '3D Chase' : 'Isometric'}</span>
            </button>

            <button
              type="button"
              data-testid="title-sky-toggle"
              onClick={(e) => {
                e.currentTarget.blur();
                onCycleSky();
              }}
              className="pointer-events-auto flex-1 px-3 py-2 rounded-lg bg-[#152130]/90 hover:bg-[#203248] border border-[#9ec5e8]/30 text-xs font-semibold text-[#e2eef9] flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors"
            >
              {timeOfDay === 'night' ? (
                <Moon className="w-3.5 h-3.5 text-[#93c5fd] shrink-0" />
              ) : timeOfDay === 'sunset' ? (
                <Sunset className="w-3.5 h-3.5 text-[#fb923c] shrink-0" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-[#fde047] shrink-0" />
              )}
              <span>
                Sky: {timeOfDay === 'night' ? 'Starry Night' : timeOfDay === 'sunset' ? 'Alpine Sunset' : 'Crisp Day'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Single Flat Borderless Control-Hint Line in Bottom Safe Margin */}
      <div className="relative z-10 flex items-center justify-center sm:justify-start pl-1">
        <p className="text-xs sm:text-sm font-medium text-[#e8f1fb] hud-stroke tracking-wide">
          Enter / Space Play · WASD Drive · Space Turbo · E Salt · F Snow-Blast · V 3D Chase Cam · T Sky · U Garage
        </p>
      </div>
    </div>
  );
}
