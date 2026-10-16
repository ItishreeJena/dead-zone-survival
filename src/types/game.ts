export type GameStatus = 'title' | 'playing' | 'paused' | 'gameover';

export type WeaponType = 'rifle' | 'pipe';

export interface VehicleState {
  id: string;
  name: string;
  position: [number, number, number];
  rotationY: number;
  speed: number;          // in m/s (negative for reverse)
  maxSpeed: number;       // ~18 m/s (~65 km/h)
  health: number;         // 0 - 100
  maxHealth: number;      // 100
  fuel: number;           // 0 - 100
  maxFuel: number;        // 100
  isOccupied: boolean;
  headlightsOn: boolean;
}

export interface ShelterBed {
  id: string;
  name: string;
  district: string;
  position: [number, number, number];
}

export interface SafehouseStash {
  food: number;
  water: number;
  medkit: number;
  ammo: number;
}

export interface MapWaypoint {
  x: number;
  z: number;
  name?: string;
}

export interface PlayerStats {
  health: number;       // 0 - 100
  maxHealth: number;
  stamina: number;      // 0 - 100
  maxStamina: number;
  hunger: number;       // 0 - 100 (100 = full, 0 = starving)
  thirst: number;       // 0 - 100 (100 = hydrated, 0 = dehydrated)
  isSprinting: boolean;
  flashlightOn: boolean;
  score: number;
  zombiesKilled: number;
  itemsFound: number;
  timeSurvived: number; // in seconds
  // Weapon & Combat
  equippedWeapon: WeaponType;
  ammo: number;         // in current magazine (e.g. 12)
  maxAmmo: number;      // max magazine capacity (12)
  reserveAmmo: number;  // reserve rounds (e.g. 36)
  isReloading: boolean;
  reloadProgress: number; // 0 to 1
  // Day / Night Environment
  inGameTime: string;   // e.g. "08:30 AM"
  dayNumber: number;    // e.g. 1
  isNight: boolean;
  currentLocation?: string;

  // Connected World, Driving, Shelters & Map
  isDriving?: boolean;
  vehicleState?: VehicleState;
  waypoint?: MapWaypoint | null;
  isSleeping?: boolean;
  stashItems?: SafehouseStash;
  foodCount?: number;
  waterCount?: number;
  medkitCount?: number;
  warningMessage?: string | null;
}

export type ItemType = 'food' | 'water' | 'medkit' | 'ammo' | 'scrap';

export interface SupplyItem {
  id: string;
  type: ItemType;
  name: string;
  description: string;
  position: [number, number, number];
  meshGroup?: any;
  collected: boolean;
  healAmount?: number;
  foodAmount?: number;
  waterAmount?: number;
  ammoAmount?: number;
}

export type ZombieState = 'idle' | 'patrol' | 'chase' | 'attack' | 'stagger' | 'dead';

export interface ZombieData {
  id: string;
  health: number;
  maxHealth: number;
  position: [number, number, number];
  rotationY: number;
  state: ZombieState;
  speed: number;
  attackCooldown: number;
  stateTimer: number;
  targetPos: [number, number, number];
  animPhase: number;
  moanTimer: number;
  shuffleTimer: number;
  pitchVariation: number;
  meshGroup?: any;
}

export interface BoxCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY?: number;
  maxY?: number;
}
