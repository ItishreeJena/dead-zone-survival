/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './engine/GameEngine';
import { GameStatus, MapWaypoint, PlayerStats, SafehouseStash } from './types/game';
import { HUD } from './components/HUD';
import { TitleScreen } from './components/TitleScreen';
import { PauseMenu } from './components/PauseMenu';
import { GameOverModal } from './components/GameOverModal';
import { MapModal } from './components/MapModal';
import { StashModal } from './components/StashModal';
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

  // Modals
  const [isMapOpen, setIsMapOpen] = useState<boolean>(false);
  const [isStashOpen, setIsStashOpen] = useState<boolean>(false);
  const [currentStash, setCurrentStash] = useState<SafehouseStash>({
    food: 4,
    water: 5,
    medkit: 3,
    ammo: 48,
  });

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
      onToggleMap: () => {
        setIsMapOpen((prev) => {
          const next = !prev;
          sound.playMapToggle(next);
          if (next && engineRef.current) {
            engineRef.current.player.unlockPointer();
          } else if (!next && engineRef.current && status === 'playing') {
            engineRef.current.player.lockPointer();
          }
          return next;
        });
      },
      onOpenStash: (stash) => {
        setCurrentStash(stash);
        setIsStashOpen(true);
        sound.playSafehouseStash();
      },
    });

    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
      sound.dispose();
    };
  }, [status]);

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
    setIsMapOpen(false);
    setIsStashOpen(false);
    if (engineRef.current) {
      engineRef.current.restartGame();
    }
  };

  const handleToggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const handleOpenMap = () => {
    if (engineRef.current) {
      engineRef.current.player.unlockPointer();
    }
    sound.playMapToggle(true);
    setIsMapOpen(true);
  };

  const handleCloseMap = () => {
    setIsMapOpen(false);
    sound.playMapToggle(false);
    if (engineRef.current && status === 'playing') {
      engineRef.current.player.lockPointer();
    }
  };

  const handleCloseStash = () => {
    setIsStashOpen(false);
    sound.playSafehouseStash();
    if (engineRef.current && status === 'playing') {
      engineRef.current.player.lockPointer();
    }
  };

  const handleUpdateStash = (newStash: SafehouseStash, updatedStats: Partial<PlayerStats>) => {
    setCurrentStash(newStash);
    if (engineRef.current) {
      engineRef.current.updateStash(newStash, updatedStats);
    }
  };

  const handleSetWaypoint = (wp: MapWaypoint | null) => {
    if (engineRef.current) {
      engineRef.current.setWaypoint(wp);
    }
  };

  // Safe coordinates query
  const playerPos: [number, number, number] = engineRef.current
    ? [
        engineRef.current.player.position.x,
        engineRef.current.player.position.y,
        engineRef.current.player.position.z,
      ]
    : [0, 0, 0];

  const playerYaw = engineRef.current ? engineRef.current.player.getYaw() : 0;

  const vehicleState = engineRef.current?.vehicle.state || {
    id: 'pickup_truck_01',
    name: '4x4 Off-Road Pickup Truck',
    position: [68, 0, 4] as [number, number, number],
    rotationY: 0,
    speed: 0,
    maxSpeed: 18,
    health: 100,
    maxHealth: 100,
    fuel: 75,
    maxFuel: 100,
    isOccupied: false,
    headlightsOn: true,
  };

  const shelters = engineRef.current?.worldData.shelters || [];
  const stashLocation: [number, number, number] = engineRef.current
    ? [
        engineRef.current.worldData.stashLocation.x,
        engineRef.current.worldData.stashLocation.y,
        engineRef.current.worldData.stashLocation.z,
      ]
    : [-101.5, 0, 27];

  const fuelLocation: [number, number, number] = engineRef.current
    ? [
        engineRef.current.worldData.fuelLocation.x,
        engineRef.current.worldData.fuelLocation.y,
        engineRef.current.worldData.fuelLocation.z,
      ]
    : [85, 0, 4];

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
          onOpenMap={handleOpenMap}
        />
      )}

      {/* 4. Interactive Topographic Map Modal */}
      <MapModal
        isOpen={isMapOpen}
        onClose={handleCloseMap}
        stats={stats}
        playerPos={playerPos}
        playerYaw={playerYaw}
        vehicleState={vehicleState}
        shelters={shelters}
        stashLocation={stashLocation}
        fuelLocation={fuelLocation}
        waypoint={stats.waypoint || null}
        onSetWaypoint={handleSetWaypoint}
      />

      {/* 5. Safehouse Stash Footlocker Modal */}
      <StashModal
        isOpen={isStashOpen}
        onClose={handleCloseStash}
        stats={stats}
        stash={currentStash}
        onUpdateStash={handleUpdateStash}
      />

      {/* 6. Pause Menu Modal */}
      {status === 'paused' && (
        <PauseMenu
          stats={stats}
          onResume={handleResume}
          onRestart={handleRestart}
          onToggleMute={handleToggleMute}
          isMuted={isMuted}
        />
      )}

      {/* 7. Game Over Screen */}
      {status === 'gameover' && (
        <GameOverModal
          stats={stats}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}
