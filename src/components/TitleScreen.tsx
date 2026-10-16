import React, { useEffect } from 'react';
import { Play, Volume2, VolumeX, ShieldAlert, Crosshair, Skull, HeartPulse, SunMoon } from 'lucide-react';

interface TitleScreenProps {
  onStart: () => void;
  onToggleMute: () => void;
  isMuted: boolean;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStart,
  onToggleMute,
  isMuted,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        onStart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStart]);

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between p-8 sm:p-12 font-mono select-none pointer-events-auto bg-gradient-to-t from-neutral-950/90 via-transparent to-neutral-950/70">
      {/* Top Bar: Sector Status & Sound */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-red-500 font-bold tracking-widest uppercase">
          <ShieldAlert className="w-4 h-4 animate-pulse" />
          <span>QUARANTINE SECTOR 07 // BIO-HAZARD DETECTED</span>
        </div>

        <button
          onClick={onToggleMute}
          className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900/80 border border-neutral-700 hover:border-neutral-500 text-xs text-neutral-300 hover:text-white transition-colors cursor-pointer"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          <span>{isMuted ? 'UNMUTE AUDIO' : 'AUDIO ON'}</span>
        </button>
      </div>

      {/* Center: Bespoke SVG Title Lockup & Mission Brief */}
      <div className="max-w-2xl my-auto">
        <div className="mb-4">
          <svg viewBox="0 0 680 90" className="w-full max-w-xl h-auto drop-shadow-[0_4px_16px_rgba(239,68,68,0.35)]">
            <defs>
              <linearGradient id="titleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="40%" stopColor="#f87171" />
                <stop offset="100%" stopColor="#e5e5e5" />
              </linearGradient>
            </defs>
            <text
              x="0"
              y="58"
              fontFamily="Impact, 'Arial Black', sans-serif"
              fontSize="64"
              letterSpacing="3"
              fill="url(#titleGrad)"
            >
              DEAD ZONE
            </text>
            <text
              x="368"
              y="58"
              fontFamily="monospace"
              fontSize="24"
              fontWeight="bold"
              letterSpacing="8"
              fill="#fbbf24"
            >
              :: SURVIVAL
            </text>
            <line x1="0" y1="78" x2="620" y2="78" stroke="#ef4444" strokeWidth="3" strokeDasharray="8 4" />
          </svg>
        </div>

        <p className="text-neutral-300 text-sm sm:text-base leading-relaxed mb-6 font-sans">
          The quarantine perimeter failed. Oakhaven is completely overrun. Arm yourself with a tactical rifle, scavenge
          canned rations, clean water, medical supplies, and ammunition from ruined storefronts and vehicle trunks.
          Survive the continuous day/night cycle, beware gunshot noise attracting the horde, and stay alive.
        </p>

        {/* Tactical Key Features */}
        <div className="grid grid-cols-4 gap-2.5 mb-8 text-xs text-neutral-400">
          <div className="p-2.5 bg-neutral-900/70 border border-neutral-800">
            <div className="text-amber-400 font-bold mb-0.5 flex items-center gap-1">
              <Crosshair className="w-3.5 h-3.5" /> FIREARMS
            </div>
            <p className="text-[11px] text-neutral-500">LMB shoot, R reload, recoil & muzzle flash.</p>
          </div>
          <div className="p-2.5 bg-neutral-900/70 border border-neutral-800">
            <div className="text-blue-400 font-bold mb-0.5 flex items-center gap-1">
              <SunMoon className="w-3.5 h-3.5" /> DAY & NIGHT
            </div>
            <p className="text-[11px] text-neutral-500">Continuous 24-hr cycle; dark dangerous nights.</p>
          </div>
          <div className="p-2.5 bg-neutral-900/70 border border-neutral-800">
            <div className="text-red-400 font-bold mb-0.5 flex items-center gap-1">
              <Skull className="w-3.5 h-3.5" /> AGGRO HORDE
            </div>
            <p className="text-[11px] text-neutral-500">Gunshots echo & attract nearby infected.</p>
          </div>
          <div className="p-2.5 bg-neutral-900/70 border border-neutral-800">
            <div className="text-emerald-400 font-bold mb-0.5 flex items-center gap-1">
              <HeartPulse className="w-3.5 h-3.5" /> VITALS ENGINE
            </div>
            <p className="text-[11px] text-neutral-500">Manage hunger, thirst, stamina, health.</p>
          </div>
        </div>

        {/* Start Game CTA Button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <button
            onClick={onStart}
            className="group flex items-center gap-3 px-8 py-3.5 bg-red-600 hover:bg-red-500 text-white font-bold text-sm tracking-wider uppercase border border-red-400 shadow-[0_0_25px_rgba(239,68,68,0.4)] transition-all cursor-pointer active:scale-95"
          >
            <Play className="w-4 h-4 fill-white group-hover:translate-x-0.5 transition-transform" />
            <span>ENTER THE ZONE</span>
          </button>
          <div className="text-xs text-neutral-400 flex items-center gap-2">
            <span>PRESS</span>
            <kbd className="px-2 py-0.5 bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs">ENTER</kbd>
            <span>OR</span>
            <kbd className="px-2 py-0.5 bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs">SPACE</kbd>
            <span>TO BEGIN</span>
          </div>
        </div>
      </div>

      {/* Bottom Flat Control Hint Line */}
      <div className="pt-4 border-t border-neutral-900 flex flex-wrap items-center justify-between text-xs text-neutral-400">
        <div className="flex items-center gap-2">
          <span className="text-neutral-200 font-bold">CONTROLS:</span>
          <span>WASD Move · Shift Sprint · LMB Fire · RMB Melee · R Reload · 1/2 Weapons · F Light · E Take · Esc Pause</span>
        </div>
        <div className="text-neutral-600 text-[11px]">VERSION 2.0.0 // OPEN-WORLD SURVIVAL</div>
      </div>
    </div>
  );
};
