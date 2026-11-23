import React from 'react';
import { Star } from 'lucide-react';
import type { RunStats } from '../game/types';

interface PauseModalProps {
  neighborhoodName: string;
  driverLevel: number;
  driverRank: string;
  onResume: () => void;
  onRestart: () => void;
  onResetCareer: () => void;
  onTitle: () => void;
}

export function PauseModal({
  neighborhoodName,
  driverLevel,
  driverRank,
  onResume,
  onRestart,
  onResetCareer,
  onTitle,
}: PauseModalProps) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#0d1624]/65"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
    >
      <div className="w-full max-w-sm rounded-2xl bg-[#1a2738] border-2 border-[#9ec5e8]/45 shadow-[0_24px_54px_rgba(6,12,20,0.65)] p-6 flex flex-col gap-5 text-center">
        <div>
          <h2 id="pause-title" className="font-display font-bold text-3xl text-[#faf6ef]">
            Shift Paused
          </h2>
          <p className="text-sm text-[#b8c7d9] mt-1">
            {neighborhoodName} · Lv {driverLevel} {driverRank}
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onResume();
            }}
            className="w-full py-3 rounded-xl bg-[#d64531] hover:bg-[#e3533f] text-[#faf6ef] font-display font-bold text-lg border border-[#f8d78b] shadow-[0_4px_0_#7f2418] cursor-pointer"
          >
            Resume Plowing
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onRestart();
            }}
            className="w-full py-2.5 rounded-xl bg-[#25374d] hover:bg-[#2f4560] text-[#faf6ef] font-semibold text-sm border border-[#ffffff]/15 cursor-pointer"
          >
            Fresh Snowfall (Keep Upgrades)
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onTitle();
            }}
            className="w-full py-2.5 rounded-xl bg-[#15202e] hover:bg-[#1e2d40] text-[#c7d5e5] font-semibold text-sm border border-[#ffffff]/10 cursor-pointer"
          >
            Title Screen
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onResetCareer();
            }}
            className="w-full py-2 rounded-xl bg-transparent hover:bg-[#2a1d22] text-[#fca5a5] font-medium text-xs border border-[#f87171]/25 cursor-pointer"
          >
            New Career (Reset Level & Upgrades)
          </button>
        </div>
      </div>
    </div>
  );
}

interface OutcomeModalProps {
  stats: RunStats;
  onNextNeighborhood: () => void;
  onContinuePlowing: () => void;
  onRetry: () => void;
  onTitle: () => void;
}

export function OutcomeModal({
  stats,
  onNextNeighborhood,
  onContinuePlowing,
  onRetry,
  onTitle,
}: OutcomeModalProps) {
  const isTimeUp = !stats.won && stats.reason === 'timeup';

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#0d1624]/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby="outcome-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#1a2738] border-2 border-[#f5c156]/60 shadow-[0_24px_54px_rgba(6,12,20,0.7)] p-6 flex flex-col gap-5">
        <div className="text-center">
          {/* 3-Star Shift Rating */}
          <div className="flex items-center justify-center gap-2 mb-2" aria-label={`${stats.starsEarned} of 3 stars`}>
            {[1, 2, 3].map((s) => (
              <Star
                key={s}
                className={`w-7 h-7 ${
                  s <= stats.starsEarned
                    ? 'text-[#fbbf24] fill-[#fbbf24]'
                    : 'text-[#334155] fill-[#1e293b]'
                }`}
              />
            ))}
          </div>

          <h2 id="outcome-title" className="font-display font-extrabold text-3xl text-[#faf6ef]">
            {isTimeUp ? 'Storm Rush Time Up!' : 'District Cleared!'}
          </h2>
          <p className="text-sm text-[#c2d1e3] mt-1">
            {isTimeUp
              ? `Cleared ${stats.clearedPercent}% of ${stats.neighborhoodName} (Goal: ${stats.targetPercent}%). Upgrade in the Garage & try again!`
              : `${stats.neighborhoodName} is open & ready! +${150 + stats.starsEarned * 30} Coins & +${120 + stats.starsEarned * 25} XP awarded.`}
          </p>
        </div>

        {/* 4 Clean Tabular-Nums Stat Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-2.5 rounded-xl bg-[#223348] border border-[#ffffff]/10 text-center">
            <div className="text-[10px] uppercase tracking-wider text-[#a9bbd0] font-semibold">
              Driver Lv
            </div>
            <div className="font-mono-num font-bold text-lg text-[#fde68a] mt-0.5">
              Lv {stats.driverLevel}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#223348] border border-[#ffffff]/10 text-center">
            <div className="text-[10px] uppercase tracking-wider text-[#a9bbd0] font-semibold">
              Cleared
            </div>
            <div className="font-mono-num font-bold text-lg text-[#bae6fd] mt-0.5">
              {stats.clearedPercent}%
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#223348] border border-[#ffffff]/10 text-center">
            <div className="text-[10px] uppercase tracking-wider text-[#a9bbd0] font-semibold">
              Score
            </div>
            <div className="font-mono-num font-bold text-lg text-[#ffd978] mt-0.5">
              {stats.score.toLocaleString()}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#223348] border border-[#ffffff]/10 text-center">
            <div className="text-[10px] uppercase tracking-wider text-[#a9bbd0] font-semibold">
              Dispatches
            </div>
            <div className="font-mono-num font-bold text-lg text-[#86efac] mt-0.5">
              {stats.missionsCompleted}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-[#b8c7d9] px-1">
          <span>
            Top Combo:{' '}
            <strong className="font-mono-num text-[#fbbf24]">{stats.maxMultiplier}x</strong>
            {' · '}
            Ice Melted:{' '}
            <strong className="font-mono-num text-[#7dd3fc]">{stats.iceMelted}</strong>
          </span>
          <span>
            Time:{' '}
            <strong className="font-mono-num text-[#faf6ef]">{stats.elapsedSeconds}s</strong>
            {' · '}
            Drifts:{' '}
            <strong className="font-mono-num text-[#faf6ef]">{stats.driftsBusted}</strong>
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          {stats.won ? (
            <>
              <button
                type="button"
                data-start="true"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onNextNeighborhood();
                }}
                className="w-full py-3.5 rounded-xl bg-[#d64531] hover:bg-[#e3533f] text-[#faf6ef] font-display font-bold text-lg border border-[#f8d78b] shadow-[0_4px_0_#7f2418] cursor-pointer"
              >
                Next District
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onContinuePlowing();
                }}
                className="w-full py-2.5 rounded-xl bg-[#25374d] hover:bg-[#2f4560] text-[#faf6ef] font-semibold text-sm border border-[#9ec5e8]/30 cursor-pointer"
              >
                Keep Plowing to 100%
              </button>
            </>
          ) : (
            <button
              type="button"
              data-start="true"
              onClick={(e) => {
                e.currentTarget.blur();
                onRetry();
              }}
              className="w-full py-3.5 rounded-xl bg-[#d64531] hover:bg-[#e3533f] text-[#faf6ef] font-display font-bold text-lg border border-[#f8d78b] shadow-[0_4px_0_#7f2418] cursor-pointer"
            >
              Retry Storm Rush
            </button>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onRetry();
              }}
              className="py-2 rounded-xl bg-[#1c2b3d] hover:bg-[#25374d] text-[#dbe7f5] font-semibold text-xs border border-[#ffffff]/10 cursor-pointer"
            >
              Fresh Snowfall
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onTitle();
              }}
              className="py-2 rounded-xl bg-[#15202e] hover:bg-[#1e2d40] text-[#c7d5e5] font-semibold text-xs border border-[#ffffff]/10 cursor-pointer"
            >
              Title Screen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
