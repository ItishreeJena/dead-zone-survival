import React from 'react';
import { RotateCcw, Skull, Clock, Package, Trophy, AlertTriangle } from 'lucide-react';
import { PlayerStats } from '../types/game';

interface GameOverModalProps {
  stats: PlayerStats;
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  onRestart,
}) => {
  const mins = Math.floor(stats.timeSurvived / 60);
  const secs = Math.floor(stats.timeSurvived % 60);
  const timeFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  let causeOfDeath = 'Lethal Trauma Inflicted by Infected';
  if (stats.hunger <= 0) {
    causeOfDeath = 'Acute Severe Starvation in the Zone';
  } else if (stats.thirst <= 0) {
    causeOfDeath = 'Fatal Dehydration in the Zone';
  }

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-6 bg-red-950/70 backdrop-brightness-50 font-mono select-none pointer-events-auto animate-fadeIn">
      <div className="w-full max-w-lg bg-neutral-950 border-2 border-red-800 p-8 shadow-[0_0_50px_rgba(220,38,38,0.5)] text-white">
        {/* Banner */}
        <div className="flex items-center gap-3 border-b border-red-900 pb-4 mb-6">
          <div className="p-2.5 bg-red-900/40 border border-red-700">
            <Skull className="w-7 h-7 text-red-500 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider text-red-500 uppercase">
              VITALS FLATLINED
            </h1>
            <p className="text-xs text-red-400 font-semibold uppercase tracking-widest">
              SUBJECT ELIMINATED // ZONE CONTAINMENT UNCOMPROMISED
            </p>
          </div>
        </div>

        {/* Cause of Death */}
        <div className="p-3 bg-red-950/40 border border-red-900/60 flex items-center gap-2 text-xs text-red-300 mb-6">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{causeOfDeath}</span>
        </div>

        {/* Expedition Statistics Summary */}
        <div className="space-y-3 mb-8">
          <div className="flex items-center justify-between p-3 bg-neutral-900 border border-neutral-800">
            <div className="flex items-center gap-2 text-neutral-400 text-xs">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>TIME SURVIVED</span>
            </div>
            <span className="text-emerald-400 font-bold text-base tabular-nums">{timeFormatted}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-neutral-900 border border-neutral-800">
            <div className="flex items-center gap-2 text-neutral-400 text-xs">
              <Skull className="w-4 h-4 text-red-400" />
              <span>INFECTED NEUTRALIZED</span>
            </div>
            <span className="text-red-400 font-bold text-base tabular-nums">{stats.zombiesKilled}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-neutral-900 border border-neutral-800">
            <div className="flex items-center gap-2 text-neutral-400 text-xs">
              <Package className="w-4 h-4 text-amber-400" />
              <span>SUPPLIES SCAVENGED</span>
            </div>
            <span className="text-amber-400 font-bold text-base tabular-nums">{stats.itemsFound}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-neutral-900 border border-neutral-800">
            <div className="flex items-center gap-2 text-neutral-400 text-xs">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span>EXPEDITION SCORE</span>
            </div>
            <span className="text-yellow-400 font-bold text-lg tabular-nums">
              {stats.score + Math.round(stats.timeSurvived * 5)} PTS
            </span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onRestart}
          className="group flex items-center justify-center gap-3 w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-bold text-sm uppercase tracking-widest border border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all cursor-pointer active:scale-98"
        >
          <RotateCcw className="w-5 h-5 group-hover:-rotate-45 transition-transform" />
          <span>RE-ENTER THE DEAD ZONE</span>
        </button>
      </div>
    </div>
  );
};
