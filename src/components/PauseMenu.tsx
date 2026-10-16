import React from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Sun, Moon } from 'lucide-react';
import { PlayerStats } from '../types/game';

interface PauseMenuProps {
  stats: PlayerStats;
  onResume: () => void;
  onRestart: () => void;
  onToggleMute: () => void;
  isMuted: boolean;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  stats,
  onResume,
  onRestart,
  onToggleMute,
  isMuted,
}) => {
  const mins = Math.floor(stats.timeSurvived / 60);
  const secs = Math.floor(stats.timeSurvived % 60);
  const timeFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-neutral-950/85 font-mono select-none pointer-events-auto">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 p-6 shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-sm" />
            <h2 className="text-lg font-bold tracking-wider uppercase text-neutral-100">SIMULATION PAUSED</h2>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            {stats.isNight ? <Moon className="w-3.5 h-3.5 text-blue-400" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
            <span>DAY {stats.dayNumber} · {stats.inGameTime}</span>
          </div>
        </div>

        {/* Current Run Metrics */}
        <div className="grid grid-cols-4 gap-2 mb-5 text-center">
          <div className="p-2 bg-neutral-950 border border-neutral-800">
            <div className="text-[9px] text-neutral-500 uppercase">SURVIVED</div>
            <div className="text-sm font-bold text-emerald-400 tabular-nums">{timeFormatted}</div>
          </div>
          <div className="p-2 bg-neutral-950 border border-neutral-800">
            <div className="text-[9px] text-neutral-500 uppercase">INFECTED</div>
            <div className="text-sm font-bold text-red-400 tabular-nums">{stats.zombiesKilled}</div>
          </div>
          <div className="p-2 bg-neutral-950 border border-neutral-800">
            <div className="text-[9px] text-neutral-500 uppercase">AMMO</div>
            <div className="text-sm font-bold text-amber-400 tabular-nums">{stats.ammo}/{stats.reserveAmmo}</div>
          </div>
          <div className="p-2 bg-neutral-950 border border-neutral-800">
            <div className="text-[9px] text-neutral-500 uppercase">SUPPLIES</div>
            <div className="text-sm font-bold text-cyan-400 tabular-nums">{stats.itemsFound}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 mb-5">
          <button
            onClick={onResume}
            className="flex items-center justify-center gap-2 w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>RESUME SIMULATION [ESC]</span>
          </button>

          <button
            onClick={onRestart}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer border border-neutral-700"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESTART EXPEDITION</span>
          </button>

          <button
            onClick={onToggleMute}
            className="flex items-center justify-center gap-2 w-full py-2 bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 text-xs transition-colors cursor-pointer border border-neutral-800"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
            <span>{isMuted ? 'ENABLE AUDIO' : 'MUTE AUDIO'}</span>
          </button>
        </div>

        {/* Controls Cheatsheet */}
        <div className="p-3 bg-neutral-950/60 border border-neutral-800/80 text-[11px] text-neutral-400 space-y-1">
          <div className="text-neutral-300 font-bold mb-1.5 uppercase tracking-wider">COMMAND MATRIX:</div>
          <div className="flex justify-between"><span>WASD</span><span className="text-neutral-200">Navigate / Strafe</span></div>
          <div className="flex justify-between"><span>SHIFT</span><span className="text-neutral-200">Sprint (Consumes Stamina)</span></div>
          <div className="flex justify-between"><span>LMB</span><span className="text-neutral-200">Fire Weapon / Strike</span></div>
          <div className="flex justify-between"><span>RMB</span><span className="text-neutral-200">Quick Melee Bash</span></div>
          <div className="flex justify-between"><span>R</span><span className="text-neutral-200">Reload Magazine</span></div>
          <div className="flex justify-between"><span>1 / 2</span><span className="text-neutral-200">Switch Weapon (Pipe / Rifle)</span></div>
          <div className="flex justify-between"><span>F</span><span className="text-neutral-200">Toggle Tactical Flashlight</span></div>
          <div className="flex justify-between"><span>E</span><span className="text-neutral-200">Scavenge Supplies & Ammo</span></div>
        </div>
      </div>
    </div>
  );
};
