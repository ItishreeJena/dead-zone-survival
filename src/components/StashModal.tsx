import React from 'react';
import { PlayerStats, SafehouseStash } from '../types/game';
import { X, Archive, Utensils, Droplets, Heart, Disc, ArrowLeftRight } from 'lucide-react';
import { sound } from '../audio/SoundSystem';

interface StashModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: PlayerStats;
  stash: SafehouseStash;
  onUpdateStash: (newStash: SafehouseStash, updatedStats: Partial<PlayerStats>) => void;
}

export const StashModal: React.FC<StashModalProps> = ({
  isOpen,
  onClose,
  stats,
  stash,
  onUpdateStash,
}) => {
  if (!isOpen) return null;

  const handleDeposit = (type: 'food' | 'water' | 'medkit' | 'ammo', amount: number) => {
    sound.playSafehouseStash();
    if (type === 'ammo') {
      const avail = stats.reserveAmmo;
      if (avail <= 0) return;
      const transfer = Math.min(amount, avail);
      onUpdateStash(
        { ...stash, ammo: stash.ammo + transfer },
        { reserveAmmo: stats.reserveAmmo - transfer }
      );
    } else {
      const currentCount = (stats as any)[`${type}Count`] ?? (type === 'food' ? 2 : type === 'water' ? 2 : 1);
      if (currentCount <= 0) return;
      const transfer = Math.min(amount, currentCount);
      onUpdateStash(
        { ...stash, [type]: stash[type] + transfer },
        { [`${type}Count`]: currentCount - transfer }
      );
    }
  };

  const handleWithdraw = (type: 'food' | 'water' | 'medkit' | 'ammo', amount: number) => {
    sound.playSafehouseStash();
    if (type === 'ammo') {
      if (stash.ammo <= 0) return;
      const transfer = Math.min(amount, stash.ammo);
      onUpdateStash(
        { ...stash, ammo: stash.ammo - transfer },
        { reserveAmmo: stats.reserveAmmo + transfer }
      );
    } else {
      if (stash[type] <= 0) return;
      const transfer = Math.min(amount, stash[type]);
      const currentCount = (stats as any)[`${type}Count`] ?? (type === 'food' ? 2 : type === 'water' ? 2 : 1);
      onUpdateStash(
        { ...stash, [type]: stash[type] - transfer },
        { [`${type}Count`]: currentCount + transfer }
      );
    }
  };

  const foodInInv = stats.foodCount ?? 2;
  const waterInInv = stats.waterCount ?? 2;
  const medkitsInInv = stats.medkitCount ?? 1;
  const ammoInInv = stats.reserveAmmo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none font-mono">
      <div className="relative w-full max-w-2xl bg-neutral-950 border border-neutral-700 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-neutral-900 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-sm bg-blue-950 border border-blue-500 text-blue-300">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wider text-neutral-100">
                SAFEHOUSE SECURE LOCKER
              </h2>
              <p className="text-[10px] text-neutral-400">
                WHISPERING PINES CABIN · STORE EMERGENCY SUPPLIES ACROSS SESSIONS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer"
            title="Close Stash (E or ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dual Inventory Column View */}
        <div className="p-6 grid grid-cols-2 gap-6 bg-neutral-950 text-xs">
          {/* Left: Player Backpack */}
          <div className="bg-neutral-900/60 p-4 border border-neutral-800 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-amber-400 mb-3 pb-1 border-b border-neutral-800 flex items-center justify-between">
                <span>SURVIVOR BACKPACK</span>
                <span className="text-[10px] text-neutral-500 font-normal">ON PERSON</span>
              </h3>

              <div className="space-y-3">
                {/* Food */}
                <div className="flex items-center justify-between p-2 bg-neutral-950 border border-neutral-800">
                  <div className="flex items-center gap-2 text-amber-300">
                    <Utensils className="w-4 h-4" />
                    <span>Canned Food</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold tabular-nums text-neutral-200">{foodInInv}x</span>
                    <button
                      onClick={() => handleDeposit('food', 1)}
                      disabled={foodInInv <= 0}
                      className="px-2 py-0.5 bg-blue-950 hover:bg-blue-900 border border-blue-700 text-blue-300 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    >
                      STORE →
                    </button>
                  </div>
                </div>

                {/* Water */}
                <div className="flex items-center justify-between p-2 bg-neutral-950 border border-neutral-800">
                  <div className="flex items-center gap-2 text-cyan-300">
                    <Droplets className="w-4 h-4" />
                    <span>Purified Water</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold tabular-nums text-neutral-200">{waterInInv}x</span>
                    <button
                      onClick={() => handleDeposit('water', 1)}
                      disabled={waterInInv <= 0}
                      className="px-2 py-0.5 bg-blue-950 hover:bg-blue-900 border border-blue-700 text-blue-300 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    >
                      STORE →
                    </button>
                  </div>
                </div>

                {/* Medkit */}
                <div className="flex items-center justify-between p-2 bg-neutral-950 border border-neutral-800">
                  <div className="flex items-center gap-2 text-red-400">
                    <Heart className="w-4 h-4" />
                    <span>First Aid Kit</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold tabular-nums text-neutral-200">{medkitsInInv}x</span>
                    <button
                      onClick={() => handleDeposit('medkit', 1)}
                      disabled={medkitsInInv <= 0}
                      className="px-2 py-0.5 bg-blue-950 hover:bg-blue-900 border border-blue-700 text-blue-300 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    >
                      STORE →
                    </button>
                  </div>
                </div>

                {/* Ammo */}
                <div className="flex items-center justify-between p-2 bg-neutral-950 border border-neutral-800">
                  <div className="flex items-center gap-2 text-neutral-300">
                    <Disc className="w-4 h-4 text-amber-400" />
                    <span>5.56mm Ammo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold tabular-nums text-neutral-200">{ammoInInv}</span>
                    <button
                      onClick={() => handleDeposit('ammo', 12)}
                      disabled={ammoInInv <= 0}
                      className="px-2 py-0.5 bg-blue-950 hover:bg-blue-900 border border-blue-700 text-blue-300 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    >
                      STORE 12 →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Safehouse Stash Footlocker */}
          <div className="bg-neutral-900/60 p-4 border border-neutral-800 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-blue-400 mb-3 pb-1 border-b border-neutral-800 flex items-center justify-between">
                <span>STASH LOCKER</span>
                <span className="text-[10px] text-neutral-500 font-normal">SECURE</span>
              </h3>

              <div className="space-y-3">
                {/* Food */}
                <div className="flex items-center justify-between p-2 bg-neutral-950 border border-neutral-800">
                  <div className="flex items-center gap-2 text-amber-300">
                    <Utensils className="w-4 h-4" />
                    <span>Canned Food</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleWithdraw('food', 1)}
                      disabled={stash.food <= 0}
                      className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-neutral-200 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    >
                      ← TAKE
                    </button>
                    <span className="font-bold tabular-nums text-blue-300 w-8 text-right">
                      {stash.food}x
                    </span>
                  </div>
                </div>

                {/* Water */}
                <div className="flex items-center justify-between p-2 bg-neutral-950 border border-neutral-800">
                  <div className="flex items-center gap-2 text-cyan-300">
                    <Droplets className="w-4 h-4" />
                    <span>Purified Water</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleWithdraw('water', 1)}
                      disabled={stash.water <= 0}
                      className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-neutral-200 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    >
                      ← TAKE
                    </button>
                    <span className="font-bold tabular-nums text-blue-300 w-8 text-right">
                      {stash.water}x
                    </span>
                  </div>
                </div>

                {/* Medkit */}
                <div className="flex items-center justify-between p-2 bg-neutral-950 border border-neutral-800">
                  <div className="flex items-center gap-2 text-red-400">
                    <Heart className="w-4 h-4" />
                    <span>First Aid Kit</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleWithdraw('medkit', 1)}
                      disabled={stash.medkit <= 0}
                      className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-neutral-200 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    >
                      ← TAKE
                    </button>
                    <span className="font-bold tabular-nums text-blue-300 w-8 text-right">
                      {stash.medkit}x
                    </span>
                  </div>
                </div>

                {/* Ammo */}
                <div className="flex items-center justify-between p-2 bg-neutral-950 border border-neutral-800">
                  <div className="flex items-center gap-2 text-neutral-300">
                    <Disc className="w-4 h-4 text-amber-400" />
                    <span>5.56mm Ammo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleWithdraw('ammo', 12)}
                      disabled={stash.ammo <= 0}
                      className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-neutral-200 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    >
                      ← TAKE 12
                    </button>
                    <span className="font-bold tabular-nums text-blue-300 w-8 text-right">
                      {stash.ammo}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 bg-neutral-900 border-t border-neutral-800 text-xs">
          <span className="text-[10px] text-neutral-500">
            PRESS [E] OR [ESC] TO CLOSE LOCKER
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-900 hover:bg-blue-800 border border-blue-600 text-blue-100 font-bold transition-colors cursor-pointer"
          >
            CLOSE STASH
          </button>
        </div>
      </div>
    </div>
  );
};
