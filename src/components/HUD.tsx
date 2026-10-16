import React from 'react';
import { PlayerStats } from '../types/game';
import {
  Heart,
  Zap,
  Utensils,
  Droplets,
  Flashlight,
  Volume2,
  VolumeX,
  Skull,
  Package,
  Sun,
  Moon,
  Disc,
} from 'lucide-react';

interface HUDProps {
  stats: PlayerStats;
  interactPrompt: string | null;
  damageFlash: boolean;
  onToggleMute: () => void;
  isMuted: boolean;
  onPause: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  stats,
  interactPrompt,
  damageFlash,
  onToggleMute,
  isMuted,
  onPause,
}) => {
  const mins = Math.floor(stats.timeSurvived / 60);
  const secs = Math.floor(stats.timeSurvived % 60);
  const timeFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  const isLowHealth = stats.health <= 25;
  const isLowAmmo = stats.ammo <= 3;

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden font-mono text-white">
      {/* 1. Damage & Low Health Vignettes */}
      <div
        className={`absolute inset-0 transition-opacity duration-100 pointer-events-none ${
          damageFlash ? 'opacity-80 bg-red-950/60' : 'opacity-0'
        }`}
      />
      {isLowHealth && (
        <div className="absolute inset-0 pointer-events-none bg-radial-[circle_at_center,transparent_45%,rgba(160,10,10,0.55)_100%] transition-opacity duration-300" />
      )}

      {/* 2. Top Perimeter Bar: Day/Night Clock, Survival Timer, Zombie Kills, Mute & Pause */}
      <div className="absolute top-4 inset-x-6 flex items-center justify-between">
        {/* Left: Day & In-Game Clock */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-950/85 border border-neutral-800 text-xs">
            {stats.isNight ? (
              <Moon className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="text-neutral-400">DAY {stats.dayNumber} ·</span>
            <span className={`font-bold tabular-nums text-sm ${stats.isNight ? 'text-blue-300' : 'text-amber-300'}`}>
              {stats.inGameTime}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-neutral-950/85 border border-neutral-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-neutral-400">SURVIVED:</span>
            <span className="text-emerald-400 font-bold tabular-nums text-sm">{timeFormatted}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-950/85 border border-neutral-800 text-xs">
            <Skull className="w-3.5 h-3.5 text-red-400" />
            <span className="text-neutral-400">KILLS:</span>
            <span className="text-red-400 font-bold tabular-nums text-sm">{stats.zombiesKilled}</span>
          </div>

          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-neutral-950/85 border border-neutral-800 text-xs">
            <Package className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-neutral-400">SUPPLIES:</span>
            <span className="text-amber-400 font-bold tabular-nums text-sm">{stats.itemsFound}</span>
          </div>
        </div>

        {/* Right: Sound & Pause Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onToggleMute}
            className="p-2 bg-neutral-950/85 border border-neutral-800 hover:border-neutral-600 text-neutral-300 hover:text-white transition-colors cursor-pointer"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onPause}
            className="px-3 py-1.5 bg-neutral-950/85 border border-neutral-800 hover:border-neutral-600 text-xs text-neutral-300 hover:text-white transition-colors cursor-pointer"
          >
            ESC PAUSE
          </button>
        </div>
      </div>

      {/* 3. Center Tactical Reticle & Dynamic Prompts */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {/* Precision Crosshair */}
        <div className="relative w-7 h-7 flex items-center justify-center">
          <div className="absolute w-2 h-0.5 bg-neutral-300/80 left-0" />
          <div className="absolute w-2 h-0.5 bg-neutral-300/80 right-0" />
          <div className="absolute h-2 w-0.5 bg-neutral-300/80 top-0" />
          <div className="absolute h-2 w-0.5 bg-neutral-300/80 bottom-0" />
          <div className="w-1 h-1 bg-amber-400 rounded-full" />
        </div>

        {/* Interaction Prompt (e.g. "[E] TAKE 5.56mm AMMO BOX") */}
        {interactPrompt && (
          <div className="mt-6 px-4 py-1.5 bg-neutral-950/95 border border-amber-500/80 text-amber-300 text-xs font-bold tracking-wider shadow-lg animate-bounce">
            {interactPrompt}
          </div>
        )}
      </div>

      {/* 4. Bottom-Left: Survival Vitals (Health, Stamina, Hunger, Thirst) */}
      <div className="absolute bottom-5 left-6 flex flex-col gap-2 w-64">
        {/* HEALTH */}
        <div className="p-2 bg-neutral-950/90 border border-neutral-800">
          <div className="flex items-center justify-between text-xs mb-1">
            <div className="flex items-center gap-1.5 text-red-400">
              <Heart className="w-3.5 h-3.5 fill-red-500/20" />
              <span className="font-bold tracking-wider">HEALTH</span>
            </div>
            <span className="tabular-nums font-bold text-red-300">{Math.round(stats.health)}%</span>
          </div>
          <div className="w-full h-2 bg-neutral-900 border border-neutral-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-150 ${
                stats.health > 35 ? 'bg-red-500' : 'bg-red-600 animate-pulse'
              }`}
              style={{ width: `${Math.max(0, stats.health)}%` }}
            />
          </div>
        </div>

        {/* STAMINA */}
        <div className="p-2 bg-neutral-950/90 border border-neutral-800">
          <div className="flex items-center justify-between text-xs mb-1">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <Zap className="w-3.5 h-3.5 fill-emerald-500/20" />
              <span className="font-bold tracking-wider">STAMINA</span>
            </div>
            <span className="tabular-nums font-bold text-emerald-300">{Math.round(stats.stamina)}%</span>
          </div>
          <div className="w-full h-2 bg-neutral-900 border border-neutral-800 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-75"
              style={{ width: `${Math.max(0, stats.stamina)}%` }}
            />
          </div>
        </div>

        {/* HUNGER & THIRST DUAL METERS */}
        <div className="grid grid-cols-2 gap-2">
          {/* Hunger */}
          <div className="p-2 bg-neutral-950/90 border border-neutral-800">
            <div className="flex items-center justify-between text-xs mb-1">
              <div className="flex items-center gap-1 text-amber-400">
                <Utensils className="w-3 h-3" />
                <span className="font-semibold text-[10px]">HUNGER</span>
              </div>
              <span className="tabular-nums text-xs text-amber-300">{Math.round(stats.hunger)}%</span>
            </div>
            <div className="w-full h-1.5 bg-neutral-900 border border-neutral-800 overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${Math.max(0, stats.hunger)}%` }}
              />
            </div>
          </div>

          {/* Thirst */}
          <div className="p-2 bg-neutral-950/90 border border-neutral-800">
            <div className="flex items-center justify-between text-xs mb-1">
              <div className="flex items-center gap-1 text-cyan-400">
                <Droplets className="w-3 h-3" />
                <span className="font-semibold text-[10px]">THIRST</span>
              </div>
              <span className="tabular-nums text-xs text-cyan-300">{Math.round(stats.thirst)}%</span>
            </div>
            <div className="w-full h-1.5 bg-neutral-900 border border-neutral-800 overflow-hidden">
              <div
                className="h-full bg-cyan-500 transition-all duration-300"
                style={{ width: `${Math.max(0, stats.thirst)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 5. Bottom-Right: Firearm Ammunition, Reloading, Weapons & Flashlight */}
      <div className="absolute bottom-5 right-6 flex flex-col items-end gap-2.5">
        {/* Firearm Ammunition Cluster */}
        <div className="p-3 bg-neutral-950/90 border border-neutral-800 w-56 text-right">
          <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
            <div className="flex items-center gap-1 text-amber-400 font-bold">
              <Disc className="w-3.5 h-3.5" />
              <span>5.56mm RIFLE</span>
            </div>
            <span className="text-[10px] text-neutral-500">SEMI-AUTO</span>
          </div>

          <div className="flex items-baseline justify-end gap-1.5">
            <span
              className={`text-3xl font-black tabular-nums tracking-tight ${
                isLowAmmo ? 'text-red-500 animate-pulse' : 'text-neutral-100'
              }`}
            >
              {stats.ammo}
            </span>
            <span className="text-sm font-bold text-neutral-500">/</span>
            <span className="text-sm font-bold text-neutral-400 tabular-nums">
              {stats.reserveAmmo} RDS
            </span>
          </div>

          {/* Reloading Progress Bar */}
          {stats.isReloading ? (
            <div className="mt-1.5">
              <div className="flex justify-between text-[10px] text-amber-400 font-bold mb-0.5">
                <span>RELOADING...</span>
                <span>{Math.round(stats.reloadProgress * 100)}%</span>
              </div>
              <div className="w-full h-1.5 bg-neutral-900 border border-neutral-700 overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-75"
                  style={{ width: `${Math.round(stats.reloadProgress * 100)}%` }}
                />
              </div>
            </div>
          ) : (
            stats.ammo <= 0 && stats.reserveAmmo > 0 && (
              <div className="text-[10px] text-amber-400 font-bold animate-pulse mt-1">
                PRESS [R] TO RELOAD
              </div>
            )
          )}
        </div>

        {/* Weapons Quick-Select Matrix */}
        <div className="flex items-center gap-1.5 text-xs">
          <div
            className={`px-2.5 py-1 border transition-colors ${
              stats.equippedWeapon === 'pipe'
                ? 'bg-neutral-800 border-neutral-500 text-white font-bold'
                : 'bg-neutral-950/80 border-neutral-800 text-neutral-500'
            }`}
          >
            [1] LEAD PIPE
          </div>
          <div
            className={`px-2.5 py-1 border transition-colors ${
              stats.equippedWeapon === 'rifle'
                ? 'bg-red-950/80 border-red-600 text-red-200 font-bold'
                : 'bg-neutral-950/80 border-neutral-800 text-neutral-500'
            }`}
          >
            [2] TACTICAL RIFLE
          </div>
        </div>

        {/* Flashlight Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-950/90 border border-neutral-800 text-xs">
          <Flashlight className={`w-3.5 h-3.5 ${stats.flashlightOn ? 'text-yellow-400' : 'text-neutral-600'}`} />
          <span className="text-neutral-400">FLASHLIGHT [F]:</span>
          <span className={`font-bold ${stats.flashlightOn ? 'text-yellow-400' : 'text-neutral-500'}`}>
            {stats.flashlightOn ? 'ACTIVE' : 'OFF'}
          </span>
        </div>

        {/* Command Reference */}
        <div className="text-[10px] text-neutral-500 tracking-wider text-right">
          WASD MOVE · LMB FIRE · RMB MELEE · R RELOAD · E TAKE
        </div>
      </div>
    </div>
  );
};
