import React, { useRef } from 'react';
import { MapWaypoint, PlayerStats, ShelterBed, VehicleState } from '../types/game';
import {
  X,
  Compass,
  Navigation,
  Truck,
  Bed,
  Archive,
  MapPin,
  Crosshair,
  Flame,
  Radio,
  Building,
  TreePine,
  Hospital,
  Warehouse,
} from 'lucide-react';
import { sound } from '../audio/SoundSystem';

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: PlayerStats;
  playerPos: [number, number, number];
  playerYaw: number;
  vehicleState: VehicleState;
  shelters: ShelterBed[];
  stashLocation: [number, number, number];
  fuelLocation: [number, number, number];
  waypoint: MapWaypoint | null;
  onSetWaypoint: (wp: MapWaypoint | null) => void;
}

export const MapModal: React.FC<MapModalProps> = ({
  isOpen,
  onClose,
  stats,
  playerPos,
  playerYaw,
  vehicleState,
  shelters,
  stashLocation,
  fuelLocation,
  waypoint,
  onSetWaypoint,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // World coordinate bounds: -160 to +160 (320m x 320m)
  const mapRange = 320;
  const worldToMap = (wx: number, wz: number) => {
    // Normalise to 0% to 100%
    const normX = ((wx + 160) / mapRange) * 100;
    const normZ = ((wz + 160) / mapRange) * 100;
    return {
      left: `${Math.max(2, Math.min(98, normX))}%`,
      top: `${Math.max(2, Math.min(98, normZ))}%`,
    };
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const clickY = (e.clientY - rect.top) / rect.height;

    const wx = Math.round(clickX * mapRange - 160);
    const wz = Math.round(clickY * mapRange - 160);

    // If clicked near existing waypoint, clear it
    if (waypoint) {
      const dx = waypoint.x - wx;
      const dz = waypoint.z - wz;
      if (Math.sqrt(dx * dx + dz * dz) < 8) {
        onSetWaypoint(null);
        sound.playMapToggle(false);
        return;
      }
    }

    onSetWaypoint({ x: wx, z: wz, name: `COORDINATES [${wx}, ${wz}]` });
    sound.playMapToggle(true);
  };

  const landmarks = [
    { name: 'DOWNTOWN CROSSROADS', x: 0, z: 0, icon: Building, color: 'text-amber-400', desc: 'Central armory, pharmacy & start' },
    { name: 'RIDGEWOOD SUBURBS', x: 0, z: 75, icon: Building, color: 'text-emerald-400', desc: 'Two-story houses & safe beds' },
    { name: 'HIGHWAY 40 & GAS PUMPS', x: 85, z: 10, icon: Flame, color: 'text-orange-400', desc: 'Fuel station & convenience store' },
    { name: 'QUARANTINE FIELD HOSPITAL', x: -15, z: -88, icon: Hospital, color: 'text-red-400', desc: 'Triage tents & medical gurney' },
    { name: 'INDUSTRIAL WAREHOUSE', x: 128, z: 72, icon: Warehouse, color: 'text-blue-400', desc: 'Storage depot & ammo crates' },
    { name: 'WHISPERING PINES CABIN', x: -105, z: 25, icon: TreePine, color: 'text-emerald-300', desc: 'Ranger cabin, safe bed & stash' },
    { name: 'RADIO TRANSMISSION TOWER', x: 0, z: -25, icon: Radio, color: 'text-red-500', desc: 'Beacon broadcast mast' },
  ];

  const playerCoord = worldToMap(playerPos[0], playerPos[2]);
  const vehicleCoord = worldToMap(vehicleState.position[0], vehicleState.position[2]);
  const stashCoord = worldToMap(stashLocation[0], stashLocation[2]);
  const fuelCoord = worldToMap(fuelLocation[0], fuelLocation[2]);
  const waypointCoord = waypoint ? worldToMap(waypoint.x, waypoint.z) : null;

  // Waypoint distance
  let waypointDist: number | null = null;
  if (waypoint) {
    const dx = waypoint.x - playerPos[0];
    const dz = waypoint.z - playerPos[2];
    waypointDist = Math.round(Math.sqrt(dx * dx + dz * dz));
  }

  // Player rotation in degrees for map arrow
  const playerDeg = (playerYaw * (180 / Math.PI)) + 180;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none font-mono">
      <div className="relative w-full max-w-5xl h-[90vh] bg-neutral-950 border border-neutral-700 flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-3 bg-neutral-900 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <Compass className="w-5 h-5 text-amber-400 animate-spin-slow" />
            <div>
              <h2 className="text-sm font-black tracking-widest text-amber-300">
                DEAD ZONE · TACTICAL TOPOGRAPHIC GRID
              </h2>
              <p className="text-[10px] text-neutral-400">
                SECTOR 7 RECONNAISSANCE MAP · CLICK ANYWHERE TO SET/CLEAR WAYPOINT
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2 px-3 py-1 bg-neutral-950 border border-neutral-800 text-neutral-300">
              <span className="text-neutral-500 font-bold">GRID POS:</span>
              <span className="text-amber-400 font-bold tabular-nums">
                X: {Math.round(playerPos[0])} · Z: {Math.round(playerPos[2])}
              </span>
            </div>

            {waypoint && waypointDist !== null && (
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-950/40 border border-amber-600/60 text-amber-300">
                <Crosshair className="w-3.5 h-3.5 animate-pulse" />
                <span className="font-bold">WAYPOINT: {waypointDist}m</span>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer"
              title="Close Map (M or ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Body: Map Canvas & Legend Sidebar */}
        <div className="flex-1 flex overflow-hidden">
          {/* Topographic Map Display Area */}
          <div
            ref={mapRef}
            onClick={handleMapClick}
            className="relative flex-1 bg-[#141814] cursor-crosshair overflow-hidden border-r border-neutral-800"
            style={{
              backgroundImage: `
                radial-gradient(circle at 50% 50%, rgba(34, 48, 36, 0.4) 0%, rgba(12, 16, 12, 0.95) 100%),
                linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)
              `,
              backgroundSize: '100% 100%, 40px 40px, 40px 40px',
            }}
          >
            {/* Topographic Elevation Contour Rings */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
              <div className="absolute left-[8%] top-[35%] w-64 h-64 rounded-full border border-emerald-400/50" />
              <div className="absolute left-[12%] top-[38%] w-48 h-48 rounded-full border border-emerald-400/40" />
              <div className="absolute left-[16%] top-[42%] w-32 h-32 rounded-full border border-emerald-400/30" />
              <div className="absolute right-[10%] top-[45%] w-72 h-72 rounded-full border border-amber-400/40" />
              <div className="absolute left-[40%] top-[10%] w-60 h-60 rounded-full border border-cyan-400/30" />
            </div>

            {/* Paved Roads Network Graphic */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-60">
              {/* North-South Main Highway */}
              <line x1="50%" y1="0%" x2="50%" y2="100%" stroke="#4a5568" strokeWidth="6" strokeDasharray="6,4" />
              {/* East-West Highway 40 */}
              <line x1="0%" y1="50%" x2="100%" y2="50%" stroke="#4a5568" strokeWidth="6" strokeDasharray="6,4" />
              {/* Forest Ridge Logging Road */}
              <line x1="17%" y1="58%" x2="50%" y2="50%" stroke="#524335" strokeWidth="4" strokeDasharray="4,4" />
              {/* Industrial Warehouse Branch Road */}
              <line x1="50%" y1="50%" x2="90%" y2="72%" stroke="#3d4957" strokeWidth="4" />
              {/* Quarantine Hospital Access Spur */}
              <line x1="50%" y1="50%" x2="45%" y2="22%" stroke="#4a5568" strokeWidth="4" />
            </svg>

            {/* Sector District Labels */}
            <div className="absolute left-[6%] top-[56%] pointer-events-none text-emerald-500/50 text-[11px] font-bold tracking-widest">
              SECTOR 6: WHISPERING PINES FOREST
            </div>
            <div className="absolute left-[38%] top-[14%] pointer-events-none text-red-500/50 text-[11px] font-bold tracking-widest">
              SECTOR 4: QUARANTINE FIELD HOSPITAL
            </div>
            <div className="absolute left-[44%] top-[47%] pointer-events-none text-amber-500/60 text-[11px] font-bold tracking-widest">
              SECTOR 1: DOWNTOWN CROSSROADS
            </div>
            <div className="absolute left-[42%] top-[78%] pointer-events-none text-emerald-500/50 text-[11px] font-bold tracking-widest">
              SECTOR 2: RIDGEWOOD SUBURBIA
            </div>
            <div className="absolute left-[72%] top-[48%] pointer-events-none text-orange-500/50 text-[11px] font-bold tracking-widest">
              SECTOR 3: HIGHWAY 40 GAS PUMPS
            </div>
            <div className="absolute left-[78%] top-[76%] pointer-events-none text-blue-500/50 text-[11px] font-bold tracking-widest">
              SECTOR 5: INDUSTRIAL DEPOT
            </div>

            {/* Landmarks Pins */}
            {landmarks.map((lm, idx) => {
              const pos = worldToMap(lm.x, lm.z);
              const Icon = lm.icon;
              return (
                <div
                  key={idx}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group pointer-events-auto cursor-pointer"
                  style={{ left: pos.left, top: pos.top }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetWaypoint({ x: lm.x, z: lm.z, name: lm.name });
                    sound.playMapToggle(true);
                  }}
                >
                  <div className={`p-1 rounded-sm bg-neutral-900 border border-neutral-700 ${lm.color} shadow-md group-hover:scale-125 transition-transform`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="mt-1 px-1.5 py-0.5 bg-neutral-950/90 border border-neutral-800 text-[9px] text-neutral-300 whitespace-nowrap opacity-75 group-hover:opacity-100 font-bold">
                    {lm.name}
                  </span>
                </div>
              );
            })}

            {/* Shelter Beds (Safe Sleeping Spots) */}
            {shelters.map((bed) => {
              const pos = worldToMap(bed.position[0], bed.position[2]);
              return (
                <div
                  key={bed.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group pointer-events-auto cursor-pointer"
                  style={{ left: pos.left, top: pos.top }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetWaypoint({ x: bed.position[0], z: bed.position[2], name: bed.name });
                    sound.playMapToggle(true);
                  }}
                  title={`Safe Shelter Bed: ${bed.name}`}
                >
                  <div className="p-1 rounded-full bg-emerald-950 border border-emerald-500 text-emerald-300 shadow-md animate-pulse">
                    <Bed className="w-3 h-3" />
                  </div>
                  <span className="hidden group-hover:block mt-1 px-1.5 py-0.5 bg-neutral-950 border border-emerald-700 text-[9px] text-emerald-300 whitespace-nowrap z-20">
                    BED: {bed.name}
                  </span>
                </div>
              );
            })}

            {/* Safehouse Stash Footlocker */}
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group pointer-events-auto cursor-pointer z-10"
              style={{ left: stashCoord.left, top: stashCoord.top }}
              onClick={(e) => {
                e.stopPropagation();
                onSetWaypoint({ x: stashLocation[0], z: stashLocation[2], name: 'SAFEHOUSE STASH' });
                sound.playMapToggle(true);
              }}
              title="Safehouse Storage Stash"
            >
              <div className="p-1 rounded-sm bg-blue-950 border border-blue-400 text-blue-300 shadow-lg">
                <Archive className="w-3.5 h-3.5" />
              </div>
              <span className="hidden group-hover:block mt-1 px-1.5 py-0.5 bg-neutral-950 border border-blue-600 text-[9px] text-blue-300 whitespace-nowrap z-20">
                SAFEHOUSE STASH
              </span>
            </div>

            {/* Gas Pumps (Refuel Station) */}
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group pointer-events-auto cursor-pointer z-10"
              style={{ left: fuelCoord.left, top: fuelCoord.top }}
              onClick={(e) => {
                e.stopPropagation();
                onSetWaypoint({ x: fuelLocation[0], z: fuelLocation[2], name: 'GAS PUMPS REFUEL' });
                sound.playMapToggle(true);
              }}
              title="Gas Station Fuel Pumps"
            >
              <div className="p-1 rounded-sm bg-orange-950 border border-orange-500 text-orange-300 shadow-lg">
                <Flame className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Drivable 4x4 Truck Marker */}
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group pointer-events-auto cursor-pointer z-20"
              style={{ left: vehicleCoord.left, top: vehicleCoord.top }}
              onClick={(e) => {
                e.stopPropagation();
                onSetWaypoint({
                  x: vehicleState.position[0],
                  z: vehicleState.position[2],
                  name: '4x4 OFF-ROAD TRUCK',
                });
                sound.playMapToggle(true);
              }}
              title={`4x4 Pickup Truck (${Math.round(vehicleState.fuel)}% Fuel)`}
            >
              <div className="p-1.5 rounded-sm bg-amber-950 border border-amber-400 text-amber-300 shadow-xl">
                <Truck className="w-4 h-4" />
              </div>
              <span className="mt-0.5 px-1 py-0.2 bg-neutral-950 border border-amber-600 text-[8px] text-amber-300 font-bold whitespace-nowrap">
                TRUCK ({Math.round(vehicleState.fuel)}%)
              </span>
            </div>

            {/* Custom Waypoint Marker */}
            {waypoint && waypointCoord && (
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-30 animate-bounce"
                style={{ left: waypointCoord.left, top: waypointCoord.top }}
              >
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-8 h-8 rounded-full bg-cyan-500/20 animate-ping" />
                  <MapPin className="w-6 h-6 text-cyan-400 fill-cyan-400/30" />
                </div>
                <span className="mt-1 px-2 py-0.5 bg-neutral-950 border border-cyan-400 text-cyan-300 text-[9px] font-bold whitespace-nowrap shadow-md">
                  {waypoint.name || 'WAYPOINT'} ({waypointDist}m)
                </span>
              </div>
            )}

            {/* Real-Time Player Marker & Field-of-View Cone */}
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-40"
              style={{ left: playerCoord.left, top: playerCoord.top }}
            >
              {/* Orientation pointer arrow */}
              <div
                className="relative flex items-center justify-center transition-transform duration-75"
                style={{ transform: `rotate(${playerDeg}deg)` }}
              >
                <div className="w-4 h-4 rounded-full bg-red-600 border-2 border-white shadow-[0_0_12px_rgba(239,68,68,0.9)] flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
                <Navigation className="absolute -top-3 w-3 h-3 text-white fill-white" />
              </div>
              <span className="mt-1 px-1.5 py-0.2 bg-neutral-950 border border-red-500 text-red-400 text-[8px] font-black">
                YOU
              </span>
            </div>

            {/* Compass Rose in Corner */}
            <div className="absolute bottom-4 right-4 p-2 bg-neutral-950/80 border border-neutral-800 text-neutral-400 text-center pointer-events-none">
              <div className="text-[10px] font-bold text-red-400">N</div>
              <div className="flex justify-between gap-3 text-[9px]">
                <span>W</span>
                <span>E</span>
              </div>
              <div className="text-[10px] font-bold text-neutral-500">S</div>
            </div>
          </div>

          {/* Right Sidebar: Tactical Legend & Instructions */}
          <div className="w-72 bg-neutral-900/90 p-4 flex flex-col justify-between overflow-y-auto">
            <div>
              <h3 className="text-xs font-bold text-amber-400 mb-3 border-b border-neutral-800 pb-1.5 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5" />
                MAP LEGEND & INTEL
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-red-600 border border-white" />
                  <span className="text-neutral-300">Survivor Position</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-sm bg-amber-950 border border-amber-400 text-amber-400">
                    <Truck className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="text-neutral-300 font-bold block">4x4 Pickup Truck</span>
                    <span className="text-[10px] text-neutral-500">Drivable vehicle (Key: E)</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-full bg-emerald-950 border border-emerald-500 text-emerald-400">
                    <Bed className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="text-neutral-300 font-bold block">Safe Shelter Bed</span>
                    <span className="text-[10px] text-neutral-500">Rest to skip night (Key: E)</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-sm bg-blue-950 border border-blue-400 text-blue-400">
                    <Archive className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="text-neutral-300 font-bold block">Safehouse Stash</span>
                    <span className="text-[10px] text-neutral-500">Persistent storage locker</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-sm bg-orange-950 border border-orange-500 text-orange-400">
                    <Flame className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="text-neutral-300 font-bold block">Gas Station Pumps</span>
                    <span className="text-[10px] text-neutral-500">Refuel truck to 100%</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-full bg-cyan-950 border border-cyan-400 text-cyan-400">
                    <MapPin className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="text-neutral-300 font-bold block">Custom Waypoint</span>
                    <span className="text-[10px] text-neutral-500">Click map to set navigation</span>
                  </div>
                </div>
              </div>

              {/* Waypoint Control Card */}
              {waypoint && (
                <div className="mt-5 p-2.5 bg-neutral-950 border border-cyan-500/60">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-cyan-400 font-bold">ACTIVE TARGET:</span>
                    <span className="text-cyan-300 tabular-nums font-bold">{waypointDist}m</span>
                  </div>
                  <div className="text-[10px] text-neutral-400 truncate mb-2">
                    {waypoint.name}
                  </div>
                  <button
                    onClick={() => onSetWaypoint(null)}
                    className="w-full py-1 bg-red-950/80 hover:bg-red-900 border border-red-700 text-red-200 text-[10px] font-bold transition-colors cursor-pointer"
                  >
                    CLEAR WAYPOINT
                  </button>
                </div>
              )}
            </div>

            {/* Tactical Advice & Footer */}
            <div className="pt-4 border-t border-neutral-800 text-[10px] text-neutral-500 space-y-1">
              <p>• Avoid driving off steep ridges at high velocity.</p>
              <p>• Ensure areas are clear of undead before resting.</p>
              <p className="text-neutral-400 font-bold pt-1">PRESS [M] OR [ESC] TO CLOSE MAP</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
