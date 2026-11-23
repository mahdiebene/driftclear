import React, { useState } from 'react';
import { Award, Check, Lock, Palette, ShieldCheck, Star, Truck, Wrench } from 'lucide-react';
import { VEHICLES, canUnlockVehicle } from '../game/events';
import {
  ACHIEVEMENTS,
  TRUCK_LIVERIES,
  canUnlockLivery,
  getAchievementProgress,
} from '../game/progression';
import {
  NEIGHBORHOODS,
  UPGRADE_DEFINITIONS,
  getNextUpgradeCost,
} from '../game/rules';
import type {
  AchievementId,
  CareerStats,
  LiveryId,
  UpgradeId,
  UpgradeLevels,
  VehicleId,
} from '../game/types';
import {
  BladeIcon,
  ChimeIcon,
  CoinIcon,
  EngineIcon,
  FlameCoilIcon,
  NitroTankIcon,
  SnowBlowerIcon,
} from './Icons';

interface UpgradeModalProps {
  coins: number;
  skillPoints: number;
  driverLevel: number;
  driverRank: string;
  xp: number;
  xpToNext: number;
  bestScore: number;
  clearedPercent: number;
  upgrades: UpgradeLevels;
  vehicleId: VehicleId;
  unlockedVehicles: VehicleId[];
  livery: LiveryId;
  unlockedLiveries: LiveryId[];
  achievements: AchievementId[];
  careerStats: CareerStats;
  neighborhoodIndex: number;
  unlockedDistricts: number;
  isTitle?: boolean;
  onBuy: (id: UpgradeId) => void;
  onSelectVehicle: (id: VehicleId) => void;
  onSelectLivery: (id: LiveryId) => void;
  onSelectDistrict: (index: number) => void;
  onClose: () => void;
}

const UPGRADE_ICONS: Record<UpgradeId, React.ReactNode> = {
  bladeWidth: <BladeIcon className="w-6 h-6" />,
  enginePower: <EngineIcon className="w-6 h-6" />,
  heatedBlade: <FlameCoilIcon className="w-6 h-6" />,
  snowBlower: <SnowBlowerIcon className="w-6 h-6" />,
  comboCharm: <ChimeIcon className="w-6 h-6" />,
  turboTank: <NitroTankIcon className="w-6 h-6" />,
};

type GarageTab = 'fleet' | 'upgrades' | 'paint' | 'trophies';

export function UpgradeModal({
  coins,
  skillPoints,
  driverLevel,
  driverRank,
  xp,
  xpToNext,
  bestScore,
  clearedPercent,
  upgrades,
  vehicleId,
  unlockedVehicles,
  livery,
  unlockedLiveries,
  achievements,
  careerStats,
  neighborhoodIndex,
  unlockedDistricts,
  isTitle = false,
  onBuy,
  onSelectVehicle,
  onSelectLivery,
  onSelectDistrict,
  onClose,
}: UpgradeModalProps) {
  const [tab, setTab] = useState<GarageTab>('upgrades');

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#0d1624]/68"
      role="dialog"
      aria-modal="true"
      aria-labelledby="garage-title"
    >
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-[#1a2738] border-2 border-[#f5c156]/55 shadow-[0_24px_54px_rgba(6,12,20,0.68)] overflow-hidden">
        {/* Header: Garage Title, Driver Level, Skill Points & Coins */}
        <div className="px-6 py-4 bg-[#14202e] border-b border-[#ffffff]/10 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="garage-title" className="font-display font-bold text-2xl text-[#faf6ef]">
              Alpine Plow Garage
            </h2>
            <p className="text-xs text-[#b8c7d9] mt-0.5">
              Lv {driverLevel} {driverRank} ({xp}/{xpToNext} XP) · Keys 1–6 quick upgrade
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            {skillPoints > 0 && (
              <div
                data-testid="shop-sp"
                className="px-3 py-1.5 rounded-lg bg-[#3b2912] border border-[#fde68a]/65 font-mono-num font-bold text-sm text-[#fde68a]"
              >
                {skillPoints} Upgrade {skillPoints === 1 ? 'Pt' : 'Pts'}
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#213247] border border-[#f5c156]/35">
              <CoinIcon className="w-5 h-5" />
              <span data-testid="shop-coins" className="font-mono-num font-bold text-lg text-[#ffd978]">
                {coins}
              </span>
            </div>
          </div>
        </div>

        {/* 4-Tab Garage Navigation Bar */}
        <div className="px-6 py-2.5 bg-[#162333] border-b border-[#ffffff]/10 flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="garage-tab-fleet"
            onClick={(e) => {
              e.currentTarget.blur();
              setTab('fleet');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
              tab === 'fleet'
                ? 'bg-[#2a435f] text-[#fde68a] border border-[#f5c156]/55'
                : 'text-[#c2d1e3] hover:text-[#ffffff] bg-[#1c2b3d] border border-transparent'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Fleet ({unlockedVehicles.length}/{VEHICLES.length})</span>
          </button>

          <button
            type="button"
            data-testid="garage-tab-upgrades"
            onClick={(e) => {
              e.currentTarget.blur();
              setTab('upgrades');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
              tab === 'upgrades'
                ? 'bg-[#2a435f] text-[#fde68a] border border-[#f5c156]/55'
                : 'text-[#c2d1e3] hover:text-[#ffffff] bg-[#1c2b3d] border border-transparent'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Upgrades</span>
          </button>

          <button
            type="button"
            data-testid="garage-tab-paint"
            onClick={(e) => {
              e.currentTarget.blur();
              setTab('paint');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
              tab === 'paint'
                ? 'bg-[#2a435f] text-[#fde68a] border border-[#f5c156]/55'
                : 'text-[#c2d1e3] hover:text-[#ffffff] bg-[#1c2b3d] border border-transparent'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Paint Shop ({unlockedLiveries.length}/{TRUCK_LIVERIES.length})</span>
          </button>

          <button
            type="button"
            data-testid="garage-tab-trophies"
            onClick={(e) => {
              e.currentTarget.blur();
              setTab('trophies');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
              tab === 'trophies'
                ? 'bg-[#2a435f] text-[#fde68a] border border-[#f5c156]/55'
                : 'text-[#c2d1e3] hover:text-[#ffffff] bg-[#1c2b3d] border border-transparent'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Trophies ({achievements.length}/{ACHIEVEMENTS.length})</span>
          </button>
        </div>

        {/* Tab 0: 3-Vehicle Snowplow Fleet Hangar */}
        {tab === 'fleet' && (
          <div className="p-5 grid grid-cols-1 gap-3 overflow-y-auto">
            {VEHICLES.map((v) => {
              const owned = unlockedVehicles.includes(v.id);
              const deployed = vehicleId === v.id;
              const unlockable = canUnlockVehicle(v.id, unlockedVehicles, coins, driverLevel);
              const swathPct = Math.round((v.bladeMult / 1.45) * 100);
              const armorPct = Math.round((1 - v.driftDragMult * 0.65) * 100);
              const tankPct = Math.round((v.fuelCapMult / 1.65) * 100);

              return (
                <div
                  key={v.id}
                  data-testid={`fleet-card-${v.id}`}
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    deployed
                      ? 'bg-[#253a54] border-[#f5c156]/75'
                      : 'bg-[#223247] border-[#ffffff]/10'
                  }`}
                >
                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display font-bold text-base sm:text-lg text-[#faf6ef]">
                        {v.name}
                      </h3>
                      <span className="px-2 py-0.5 rounded bg-[#162231] border border-[#9ec5e8]/25 text-[11px] font-semibold text-[#93c5fd]">
                        {v.role}
                      </span>
                      {v.iceImmune && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#0c2d48] border border-[#38bdf8]/50 text-[11px] font-bold text-[#7dd3fc]">
                          <ShieldCheck className="w-3 h-3" />
                          Black-Ice Immune
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#c2d1e3] leading-snug">{v.description}</p>
                    <p className="text-xs font-semibold text-[#fde68a]">{v.perkLabel}</p>

                    <div className="grid grid-cols-3 gap-3 pt-1 max-w-md">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-[#9fb2c7]">
                          Swath
                        </div>
                        <div className="h-1.5 mt-1 rounded-full bg-[#131d2b] overflow-hidden">
                          <div
                            className="h-full bg-[#38bdf8]"
                            style={{ width: `${Math.min(100, swathPct)}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-[#9fb2c7]">
                          Armor
                        </div>
                        <div className="h-1.5 mt-1 rounded-full bg-[#131d2b] overflow-hidden">
                          <div
                            className="h-full bg-[#fb923c]"
                            style={{ width: `${Math.min(100, armorPct)}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-[#9fb2c7]">
                          Fuel/Salt
                        </div>
                        <div className="h-1.5 mt-1 rounded-full bg-[#131d2b] overflow-hidden">
                          <div
                            className="h-full bg-[#4ade80]"
                            style={{ width: `${Math.min(100, tankPct)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                    <span className="text-[11px] font-mono-num text-[#9fb2c7]">
                      {owned ? 'In Fleet' : `Requires Lv ${v.minLevel}`}
                    </span>
                    <button
                      type="button"
                      disabled={deployed || (!owned && !unlockable)}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onSelectVehicle(v.id);
                      }}
                      className={`min-w-[126px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 whitespace-nowrap ${
                        deployed
                          ? 'bg-[#162231] text-[#86efac] border border-[#4ade80]/40 cursor-default'
                          : owned
                            ? 'bg-[#2b4463] hover:bg-[#355377] text-[#faf6ef] border border-[#9ec5e8]/45 cursor-pointer'
                            : unlockable
                              ? 'bg-[#d64531] hover:bg-[#e3533f] text-[#faf6ef] border border-[#f8d78b] shadow-[0_3px_0_#7f2418] cursor-pointer'
                              : 'bg-[#1a2636] text-[#7b8fa6] border border-[#ffffff]/10 cursor-not-allowed'
                      }`}
                    >
                      {deployed ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Deployed</span>
                        </>
                      ) : owned ? (
                        <span>Deploy Truck</span>
                      ) : (
                        <>
                          {driverLevel < v.minLevel ? (
                            <Lock className="w-3.5 h-3.5" />
                          ) : (
                            <CoinIcon className="w-4 h-4" />
                          )}
                          <span className="font-mono-num">{v.cost}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 1: 6-Upgrade 2-Column Workshop Grid */}
        {tab === 'upgrades' && (
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto">
            {UPGRADE_DEFINITIONS.map((def, idx) => {
              const level = upgrades[def.id];
              const cost = getNextUpgradeCost(def.id, level);
              const isMax = cost === null;
              const useSp = !isMax && skillPoints > 0;
              const affordable = !isMax && (useSp || coins >= cost);

              return (
                <div
                  key={def.id}
                  className="flex flex-col justify-between gap-3 p-3.5 rounded-xl bg-[#223247] border border-[#ffffff]/10"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[#162231] border border-[#f5c156]/25 flex items-center justify-center shrink-0">
                      {UPGRADE_ICONS[def.id]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="font-display font-bold text-sm sm:text-base text-[#faf6ef] truncate">
                          {def.name}
                        </h3>
                        <span className="font-mono-num text-xs font-semibold text-[#93c5fd] shrink-0">
                          {def.statLabel(level)}
                        </span>
                      </div>
                      <p className="text-xs text-[#c2d1e3] mt-0.5 leading-snug">
                        {def.shortDesc}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-1" aria-label={`Level ${level} of ${def.maxLevel}`}>
                      {Array.from({ length: def.maxLevel }).map((_, i) => (
                        <span
                          key={i}
                          className={`h-2 w-3 rounded-[2px] border ${
                            i < level
                              ? 'bg-[#f5c156] border-[#fde68a]'
                              : 'bg-[#131d2b] border-[#ffffff]/15'
                          }`}
                        />
                      ))}
                      <span className="text-[11px] font-mono-num text-[#9fb2c7] ml-1.5">
                        Lv {level}/{def.maxLevel}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={!affordable}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onBuy(def.id);
                      }}
                      className={`shrink-0 min-w-[108px] px-3 py-2 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                        isMax
                          ? 'bg-[#162231] text-[#8ca0b5] border border-[#ffffff]/10 cursor-default'
                          : useSp
                            ? 'bg-[#d97706] hover:bg-[#ea8510] text-[#fffbeb] border border-[#fef08a] shadow-[0_3px_0_#7c4105] active:translate-y-0.5 cursor-pointer'
                            : affordable
                              ? 'bg-[#d64531] hover:bg-[#e3533f] text-[#faf6ef] border border-[#f8d78b] shadow-[0_3px_0_#7f2418] active:translate-y-0.5 cursor-pointer'
                              : 'bg-[#1a2636] text-[#7b8fa6] border border-[#ffffff]/10 cursor-not-allowed'
                      }`}
                    >
                      {isMax ? (
                        <span>Maxed</span>
                      ) : useSp ? (
                        <>
                          <span className="font-mono-num font-bold">1 SP</span>
                          <span className="text-[11px] opacity-85">[{idx + 1}]</span>
                        </>
                      ) : (
                        <>
                          <CoinIcon className="w-4 h-4 shrink-0" />
                          <span className="font-mono-num font-bold">{cost}</span>
                          <span className="text-[11px] opacity-75">[{idx + 1}]</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Live 3D Snowplow Paint Shop */}
        {tab === 'paint' && (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto">
            {TRUCK_LIVERIES.map((def) => {
              const owned = unlockedLiveries.includes(def.id);
              const equipped = livery === def.id;
              const unlockable = canUnlockLivery(def.id, unlockedLiveries, coins, driverLevel);

              return (
                <div
                  key={def.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                    equipped
                      ? 'bg-[#253a54] border-[#f5c156]/70'
                      : 'bg-[#223247] border-[#ffffff]/10'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-12 h-12 rounded-xl border-2 border-[#ffffff]/25 shrink-0 flex flex-col overflow-hidden"
                      aria-hidden="true"
                    >
                      <div className="flex-1" style={{ backgroundColor: def.swatchPrimary }} />
                      <div className="h-3" style={{ backgroundColor: def.swatchTrim }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display font-bold text-base text-[#faf6ef]">{def.name}</h3>
                      <p className="text-xs text-[#c2d1e3] mt-0.5 leading-snug">{def.tagline}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[11px] font-mono-num text-[#9fb2c7]">
                      {owned ? 'Owned' : `Requires Lv ${def.minLevel}`}
                    </span>

                    <button
                      type="button"
                      disabled={equipped || (!owned && !unlockable)}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onSelectLivery(def.id);
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap ${
                        equipped
                          ? 'bg-[#162231] text-[#86efac] border border-[#4ade80]/40 cursor-default'
                          : owned
                            ? 'bg-[#2b4463] hover:bg-[#355377] text-[#faf6ef] border border-[#9ec5e8]/40 cursor-pointer'
                            : unlockable
                              ? 'bg-[#d64531] hover:bg-[#e3533f] text-[#faf6ef] border border-[#f8d78b] cursor-pointer'
                              : 'bg-[#1a2636] text-[#7b8fa6] border border-[#ffffff]/10 cursor-not-allowed'
                      }`}
                    >
                      {equipped ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Equipped</span>
                        </>
                      ) : owned ? (
                        <span>Equip Paint</span>
                      ) : (
                        <>
                          {driverLevel < def.minLevel ? (
                            <Lock className="w-3.5 h-3.5" />
                          ) : (
                            <CoinIcon className="w-3.5 h-3.5" />
                          )}
                          <span className="font-mono-num">{def.cost}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 3: Career Trophies & Lifetime Stats */}
        {tab === 'trophies' && (
          <div className="p-5 flex flex-col gap-4 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 rounded-xl bg-[#162231] border border-[#ffffff]/10 text-center">
                <div className="text-[10px] uppercase tracking-wider text-[#9fb2c7]">Snow Cleared</div>
                <div className="font-mono-num font-bold text-base text-[#bae6fd] mt-0.5">
                  {careerStats.totalTilesCleared.toLocaleString()}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#162231] border border-[#ffffff]/10 text-center">
                <div className="text-[10px] uppercase tracking-wider text-[#9fb2c7]">Dispatches</div>
                <div className="font-mono-num font-bold text-base text-[#fde68a] mt-0.5">
                  {careerStats.missionsCompleted}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#162231] border border-[#ffffff]/10 text-center">
                <div className="text-[10px] uppercase tracking-wider text-[#9fb2c7]">Ice Melted</div>
                <div className="font-mono-num font-bold text-base text-[#7dd3fc] mt-0.5">
                  {careerStats.icePatchesMelted}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#162231] border border-[#ffffff]/10 text-center">
                <div className="text-[10px] uppercase tracking-wider text-[#9fb2c7]">Cars Rescued</div>
                <div className="font-mono-num font-bold text-base text-[#86efac] mt-0.5">
                  {careerStats.carsRescued}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {ACHIEVEMENTS.map((ach) => {
                const unlocked = achievements.includes(ach.id);
                const cur = Math.min(
                  ach.target,
                  getAchievementProgress(
                    ach.id,
                    careerStats,
                    upgrades,
                    bestScore,
                    0,
                    clearedPercent
                  )
                );
                const ratio = unlocked ? 1 : Math.min(1, cur / Math.max(1, ach.target));
                return (
                  <div
                    key={ach.id}
                    className={`p-3 rounded-xl border flex flex-col gap-1.5 ${
                      unlocked
                        ? 'bg-[#263428] border-[#4ade80]/45'
                        : 'bg-[#223247] border-[#ffffff]/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display font-bold text-sm text-[#faf6ef] flex items-center gap-1.5">
                        <Award
                          className={`w-4 h-4 shrink-0 ${
                            unlocked ? 'text-[#fbbf24]' : 'text-[#64748b]'
                          }`}
                        />
                        {ach.title}
                      </span>
                      <span className="font-mono-num text-xs font-bold text-[#fde047]">
                        {unlocked ? 'Done' : `+${ach.rewardCoins}c`}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#c2d1e3]">{ach.description}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-[#131d2b] overflow-hidden">
                        <div
                          className={`h-full origin-left ${
                            unlocked ? 'bg-[#4ade80]' : 'bg-[#38bdf8]'
                          }`}
                          style={{ transform: `scaleX(${ratio})` }}
                        />
                      </div>
                      <span className="font-mono-num text-[10px] text-[#9fb2c7]">
                        {unlocked ? ach.target : cur}/{ach.target}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer: District Travel Selector with Earned Stars + Return to Plowing */}
        <div className="px-6 py-3.5 bg-[#14202e] border-t border-[#ffffff]/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] uppercase tracking-wider text-[#9fb2c7] font-semibold mr-1">
              Districts:
            </span>
            {NEIGHBORHOODS.map((n) => {
              const unlocked = n.index < unlockedDistricts;
              const active = n.index === neighborhoodIndex;
              const stars = careerStats.districtStars[n.index] ?? 0;
              return (
                <button
                  key={n.index}
                  type="button"
                  disabled={!unlocked || active}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onSelectDistrict(n.index);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    active
                      ? 'bg-[#2a435f] text-[#fde68a] border-[#f5c156]/60 cursor-default'
                      : unlocked
                        ? 'bg-[#1d2d40] hover:bg-[#273d57] text-[#e5eef8] border-[#9ec5e8]/30 cursor-pointer'
                        : 'bg-[#131d2a] text-[#64748b] border-[#ffffff]/8 cursor-not-allowed'
                  }`}
                >
                  <span>
                    {n.name} {!unlocked ? '(Locked)' : ''}
                  </span>
                  {stars > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[#fbbf24]">
                      {Array.from({ length: stars }).map((_, sIdx) => (
                        <Star key={sIdx} className="w-3 h-3 fill-[#fbbf24]" />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-[#2a3f59] hover:bg-[#354f70] text-[#faf6ef] font-semibold text-sm border border-[#9ec5e8]/30 cursor-pointer whitespace-nowrap"
          >
            {isTitle ? 'Back to Menu [U]' : 'Back to Plowing [U]'}
          </button>
        </div>
      </div>
    </div>
  );
}
