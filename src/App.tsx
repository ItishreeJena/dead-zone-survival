/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './engine/GameEngine';
import { GameStatus, PlayerStats } from './types/game';
import { HUD } from './components/HUD';
import { TitleScreen } from './components/TitleScreen';
import { PauseMenu } from './components/PauseMenu';
import { GameOverModal } from './components/GameOverModal';
import { sound } from './audio/SoundSystem';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [status, setStatus] = useState<GameStatus>('title');
  const [stats, setStats] = useState<PlayerStats>({
    health: 100,
    maxHealth: 100,
    stamina: 100,
    maxStamina: 100,
    hunger: 95,
    thirst: 90,
    isSprinting: false,
    flashlightOn: true,
    score: 0,
    zombiesKilled: 0,
    itemsFound: 0,
    timeSurvived: 0,
    equippedWeapon: 'rifle',
    ammo: 12,
    maxAmmo: 12,
    reserveAmmo: 36,
    isReloading: false,
    reloadProgress: 0,
    inGameTime: '07:30 AM',
    dayNumber: 1,
    isNight: false,
  });

  const [interactPrompt, setInteractPrompt] = useState<string | null>(null);
  const [damageFlash, setDamageFlash] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize GameEngine once
    const engine = new GameEngine(containerRef.current, {
      onStatsUpdate: (newStats) => {
        setStats(newStats);
      },
      onStatusChange: (newStatus) => {
        setStatus(newStatus);
      },
      onInteractPrompt: (prompt) => {
        setInteractPrompt(prompt);
      },
      onDamageEffect: () => {
        setDamageFlash(true);
        setTimeout(() => setDamageFlash(false), 220);
      },
    });

    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
      sound.dispose();
    };
  }, []);

  const handleStart = () => {
    if (engineRef.current) {
      engineRef.current.startGame();
    }
  };

  const handlePause = () => {
    if (engineRef.current) {
      engineRef.current.pauseGame();
    }
  };

  const handleResume = () => {
    if (engineRef.current) {
      engineRef.current.resumeGame();
    }
  };

  const handleRestart = () => {
    if (engineRef.current) {
      engineRef.current.restartGame();
    }
  };

  const handleToggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      {/* 1. Isolated WebGL 3D Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full cursor-crosshair" />

      {/* 2. Title Screen Layer */}
      {status === 'title' && (
        <TitleScreen
          onStart={handleStart}
          onToggleMute={handleToggleMute}
          isMuted={isMuted}
        />
      )}

      {/* 3. In-Game Low-Occlusion Tactical HUD */}
      {(status === 'playing' || status === 'paused') && (
        <HUD
          stats={stats}
          interactPrompt={interactPrompt}
          damageFlash={damageFlash}
          onToggleMute={handleToggleMute}
          isMuted={isMuted}
          onPause={handlePause}
        />
      )}

      {/* 4. Pause Menu Modal */}
      {status === 'paused' && (
        <PauseMenu
          stats={stats}
          onResume={handleResume}
          onRestart={handleRestart}
          onToggleMute={handleToggleMute}
          isMuted={isMuted}
        />
      )}

      {/* 5. Game Over Screen */}
      {status === 'gameover' && (
        <GameOverModal
          stats={stats}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}
