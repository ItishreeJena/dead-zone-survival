import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GameStatus, PlayerStats, SupplyItem, ShelterBed, SafehouseStash, MapWaypoint } from '../types/game';
import { buildPostApocalypticTown, WorldBuildResult } from './world';
import { getWorldSurfaceHeight } from './terrain';
import { PlayerController } from './player';
import { ZombieSystem } from './zombies';
import { SupplySystem } from './supplies';
import { VehicleController } from './vehicle';
import { sound } from '../audio/SoundSystem';

export interface GameEngineCallbacks {
  onStatsUpdate: (stats: PlayerStats) => void;
  onStatusChange: (status: GameStatus) => void;
  onInteractPrompt: (prompt: string | null) => void;
  onDamageEffect: () => void;
  onToggleMap?: () => void;
  onOpenStash?: (stash: SafehouseStash) => void;
}

// Pre-allocated math helper for zero GC audio listener updates
const _listenerFwd = new THREE.Vector3();

export class GameEngine {
  private container: HTMLElement;
  private callbacks: GameEngineCallbacks;

  // Three.js Core
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  private animationFrameId: number | null = null;
  private clock: THREE.Clock = new THREE.Clock();

  // Subsystems
  public worldData: WorldBuildResult;
  public player: PlayerController;
  public zombies: ZombieSystem;
  public supplies: SupplySystem;
  public vehicle: VehicleController;

  // Driving & Exploration State
  public isDriving: boolean = false;
  public stash: SafehouseStash = { food: 4, water: 5, medkit: 3, ammo: 48 };
  public waypoint: MapWaypoint | null = null;
  private nearbyBed: ShelterBed | null = null;
  private isNearStash: boolean = false;
  private isNearFuel: boolean = false;
  private isNearVehicle: boolean = false;
  private isSleepingTransition: boolean = false;
  private warningTimer: number = 0;

  // Atmosphere, Celestial Bodies & Lighting
  private sunLight: THREE.DirectionalLight;
  private moonLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private celestialGroup: THREE.Group = new THREE.Group();
  private sunMesh: THREE.Mesh;
  private moonMesh: THREE.Mesh;

  // Day / Night Cycle (24 in-game hours in 12 real minutes = 720 seconds)
  private timeOfDay: number = 7.5; // 07:30 AM
  private readonly hoursPerSecond: number = 24 / 720; // 0.0333 hours/sec
  private dayNumber: number = 1;
  private isNight: boolean = false;

  // Game State
  public status: GameStatus = 'title';
  private hitstopTimer: number = 0;
  private cameraShakeIntensity: number = 0;
  private nearbyItem: SupplyItem | null = null;
  private titleCamAngle: number = 0;

  constructor(container: HTMLElement, callbacks: GameEngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    // 1. Scene & Atmosphere Setup
    this.scene = new THREE.Scene();
    const initFogColor = new THREE.Color(0x384a58);
    this.scene.background = initFogColor;
    this.scene.fog = new THREE.FogExp2(initFogColor, 0.018);

    // 2. Camera Setup
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(72, aspect, 0.1, 180);
    this.scene.add(this.camera);

    // 3. Renderer Setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // 4. Procedural RoomEnvironment Map (PBR reflection)
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // 5. Dynamic Celestial Lighting Rig (Sun & Moon)
    this.sunLight = new THREE.DirectionalLight(0xfffaea, 1.2);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 5;
    this.sunLight.shadow.camera.far = 120;
    const shadowDist = 50;
    this.sunLight.shadow.camera.left = -shadowDist;
    this.sunLight.shadow.camera.right = shadowDist;
    this.sunLight.shadow.camera.top = shadowDist;
    this.sunLight.shadow.camera.bottom = -shadowDist;
    this.sunLight.shadow.bias = -0.0006;
    this.scene.add(this.sunLight);

    this.moonLight = new THREE.DirectionalLight(0x3a557a, 0.25);
    this.moonLight.castShadow = false;
    this.scene.add(this.moonLight);

    this.hemiLight = new THREE.HemisphereLight(0x7092b0, 0x181c15, 0.65);
    this.scene.add(this.hemiLight);

    // Celestial Visual Meshes (Sun & Moon discs in sky)
    const sunGeo = new THREE.SphereGeometry(3.5, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff0aa });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);

    const moonGeo = new THREE.SphereGeometry(2.8, 16, 16);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xdde8f5 });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);

    this.celestialGroup.add(this.sunMesh);
    this.celestialGroup.add(this.moonMesh);
    this.scene.add(this.celestialGroup);

    // 6. Build World
    this.worldData = buildPostApocalypticTown();
    this.scene.add(this.worldData.sceneGroup);

    // 7. Player Subsystem
    this.player = new PlayerController(this.camera, this.renderer.domElement);
    this.player.position.copy(this.worldData.spawnPoints.player);

    // 8. Zombie Subsystem
    this.zombies = new ZombieSystem(this.scene, this.worldData.spawnPoints.zombies);

    // 9. Supply Subsystem
    this.supplies = new SupplySystem(this.scene, this.worldData.spawnPoints.supplies);

    // 10. Drivable 4x4 Off-Road Truck Subsystem
    this.vehicle = new VehicleController(
      this.worldData.vehicleSpawn.pos,
      this.worldData.vehicleSpawn.rotationY
    );
    this.scene.add(this.vehicle.mesh);

    // Pre-warm shaders
    this.renderer.compile(this.scene, this.camera);

    this.setupCombatAndGameEvents();
    window.addEventListener('resize', this.handleResize);

    // Start render loop
    this.clock.start();
    this.tick();
  }

  private setupCombatAndGameEvents() {
    // 1. Firearm Bullet Raycast Hit
    this.player.onFireBullet = (origin, direction) => {
      const result = this.zombies.hitZombieWithBullet(origin, direction, 65);
      if (result.hit) {
        this.hitstopTimer = 0.035;
        this.cameraShakeIntensity = result.isHeadshot ? 0.05 : 0.03;

        this.player.stats.score += result.isHeadshot ? 150 : 60;
        if (result.isDead) {
          this.player.stats.zombiesKilled += 1;
          this.player.stats.score += 200;
        }
      }
    };

    // 2. Gunfire Noise Event (attracts zombies within 42m)
    this.player.onGunshotNoise = (sourcePos) => {
      this.zombies.alertZombiesInRadius(sourcePos, 42);
    };

    // 3. Melee Swing Hit Check
    this.player.onMeleeSwing = (lookDir) => {
      const hit = this.zombies.hitZombieInFront(this.player.position, lookDir, 2.3, 35);
      if (hit) {
        this.hitstopTimer = 0.04;
        this.cameraShakeIntensity = 0.04;
        this.player.stats.score += 50;

        const killed = this.zombies.zombies.filter((z) => z.state === 'dead').length;
        if (killed > this.player.stats.zombiesKilled) {
          this.player.stats.zombiesKilled = killed;
          this.player.stats.score += 200;
        }
      }
    };

    // 4. Map Toggle Key (M)
    this.player.onToggleMap = () => {
      if (this.callbacks.onToggleMap) {
        this.callbacks.onToggleMap();
      }
    };

    // 5. Interaction Key (E)
    this.player.onInteract = () => {
      if (this.status !== 'playing') return;

      if (this.isDriving) {
        // Exit Vehicle
        this.exitVehicle();
        return;
      }

      if (this.isNearVehicle) {
        // Enter 4x4 Truck
        this.enterVehicle();
        return;
      }

      if (this.nearbyBed) {
        // Rest in Shelter Bed
        this.attemptSleep(this.nearbyBed);
        return;
      }

      if (this.isNearStash) {
        // Open Safehouse Stash Footlocker
        this.openStash();
        return;
      }

      const distToVeh = Math.hypot(
        this.player.position.x - this.vehicle.state.position[0],
        this.player.position.z - this.vehicle.state.position[2]
      );
      if (this.isNearFuel && distToVeh < 12 && this.vehicle.state.fuel < 98) {
        // Refuel Vehicle
        this.refuelVehicle();
        return;
      }

      if (this.nearbyItem) {
        // Collect Field Supply
        const item = this.supplies.collectItem(this.nearbyItem.id);
        if (item) {
          sound.playPickup(item.type);
          if (item.type === 'food') this.player.restoreHunger(item.foodAmount || 35);
          if (item.type === 'water') this.player.restoreThirst(item.waterAmount || 45);
          if (item.type === 'medkit') this.player.restoreHealth(item.healAmount || 50);
          if (item.type === 'ammo') this.player.addAmmo(item.ammoAmount || 18);

          this.player.stats.itemsFound += 1;
          this.player.stats.score += 100;
          this.nearbyItem = null;
          this.callbacks.onInteractPrompt(null);
        }
      }
    };

    // 6. Pause Toggle (ESC)
    this.player.onTogglePause = () => {
      if (this.status === 'playing') {
        this.pauseGame();
      } else if (this.status === 'paused') {
        this.resumeGame();
      }
    };

    // Canvas click to lock pointer when playing
    this.renderer.domElement.addEventListener('mousedown', (e) => {
      if (this.status === 'playing') {
        if (!this.player.isLocked) {
          this.player.lockPointer();
        } else {
          this.player.handleMouseDown(e);
        }
      }
    });

    // Prevent context menu on right click so RMB can be used for melee bash
    this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // Update real-time Day / Night cycle
  private updateDayNightCycle(dt: number) {
    this.timeOfDay += dt * this.hoursPerSecond;
    if (this.timeOfDay >= 24) {
      this.timeOfDay -= 24;
      this.dayNumber += 1;
    }

    // Format in-game clock (e.g. "08:15 AM", "09:40 PM")
    const hours = Math.floor(this.timeOfDay);
    const minutes = Math.floor((this.timeOfDay % 1) * 60);
    const isPM = hours >= 12;
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    const timeFormatted = `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;

    this.player.stats.inGameTime = timeFormatted;
    this.player.stats.dayNumber = this.dayNumber;

    // Celestial orbit angle (0 at midnight, PI/2 at sunrise 6am, PI at noon 12pm, 3PI/2 at sunset 6pm)
    const sunAngle = (this.timeOfDay / 24) * Math.PI * 2 - Math.PI / 2;
    const sunDist = 95;
    const sunX = Math.cos(sunAngle) * sunDist;
    const sunY = Math.sin(sunAngle) * sunDist;
    const sunZ = 25;

    this.sunLight.position.set(sunX, Math.max(-10, sunY), sunZ);
    this.moonLight.position.set(-sunX, Math.max(-10, -sunY), -sunZ);

    this.sunMesh.position.set(sunX * 1.4, sunY * 1.4, sunZ * 1.4);
    this.moonMesh.position.set(-sunX * 1.4, -sunY * 1.4, -sunZ * 1.4);

    const isDay = sunY > 0;
    this.isNight = !isDay;
    this.player.stats.isNight = this.isNight;

    // Update Web Audio ambient wind
    sound.updateAmbience(this.isNight);

    // Color grading & lighting transitions
    const fog = this.scene.fog as THREE.FogExp2;
    const bg = this.scene.background as THREE.Color;

    if (this.timeOfDay >= 5.5 && this.timeOfDay < 7.0) {
      // Dawn (05:30 - 07:00)
      const t = (this.timeOfDay - 5.5) / 1.5;
      this.sunLight.intensity = t * 1.1;
      this.sunLight.color.setHex(0xff9944);
      this.hemiLight.intensity = 0.3 + t * 0.4;
      this.hemiLight.color.setHex(0x9a7b60);
      bg.setHex(0x382822);
      fog.color.setHex(0x382822);
      fog.density = 0.022;
    } else if (this.timeOfDay >= 7.0 && this.timeOfDay < 17.0) {
      // Full Daylight (07:00 - 17:00)
      this.sunLight.intensity = 1.25;
      this.sunLight.color.setHex(0xfffaea);
      this.hemiLight.intensity = 0.7;
      this.hemiLight.color.setHex(0x7092b0);
      bg.setHex(0x384a58);
      fog.color.setHex(0x384a58);
      fog.density = 0.016;
    } else if (this.timeOfDay >= 17.0 && this.timeOfDay < 19.5) {
      // Sunset / Dusk (17:00 - 19:30)
      const t = (this.timeOfDay - 17.0) / 2.5;
      this.sunLight.intensity = (1 - t) * 1.1;
      this.sunLight.color.setHex(0xe04828);
      this.hemiLight.intensity = 0.7 - t * 0.45;
      this.hemiLight.color.setHex(0x5a2d20);
      bg.setHex(0x2d1814);
      fog.color.setHex(0x2d1814);
      fog.density = 0.024;
    } else {
      // Night (19:30 - 05:30)
      this.sunLight.intensity = 0;
      this.hemiLight.intensity = 0.18;
      this.hemiLight.color.setHex(0x121922);
      bg.setHex(0x06080c);
      fog.color.setHex(0x06080c);
      fog.density = 0.030; // Dark spooky night
    }

    // Streetlights automatically illuminate at night (18:30 to 06:00)
    const lightsActive = this.timeOfDay >= 18.5 || this.timeOfDay < 6.0;
    this.worldData.streetlights.forEach((light) => {
      light.visible = lightsActive;
    });
  }

  public startGame() {
    this.status = 'playing';
    this.player.lockPointer();
    this.callbacks.onStatusChange('playing');
  }

  public pauseGame() {
    if (this.status !== 'playing') return;
    this.status = 'paused';
    this.player.unlockPointer();
    this.callbacks.onStatusChange('paused');
  }

  public resumeGame() {
    if (this.status !== 'paused') return;
    this.status = 'playing';
    this.player.lockPointer();
    this.callbacks.onStatusChange('playing');
  }

  public enterVehicle() {
    if (this.isDriving || this.vehicle.state.health <= 0) return;
    this.isDriving = true;
    this.vehicle.enter();
    this.player.setDriving(true);
    this.player.stats.isDriving = true;
    this.player.stats.vehicleState = this.vehicle.state;
  }

  public exitVehicle() {
    if (!this.isDriving) return;
    this.isDriving = false;
    this.vehicle.exit();
    this.player.setDriving(false);
    const exitPos = this.vehicle.getExitPosition(getWorldSurfaceHeight);
    this.player.setPosition(exitPos);
    this.player.stats.isDriving = false;
    this.callbacks.onInteractPrompt(null);
  }

  public refuelVehicle() {
    this.vehicle.refuel(100);
    this.player.stats.warningMessage = 'TRUCK FUEL TANK 100% REFUELED';
    this.warningTimer = 3.0;
  }

  public openStash() {
    if (this.callbacks.onOpenStash) {
      this.player.unlockPointer();
      this.callbacks.onOpenStash(this.stash);
    }
  }

  public updateStash(newStash: SafehouseStash, updatedStats: Partial<PlayerStats>) {
    this.stash = { ...newStash };
    Object.assign(this.player.stats, updatedStats);
  }

  public setWaypoint(wp: MapWaypoint | null) {
    this.waypoint = wp;
    this.player.stats.waypoint = wp;
  }

  public attemptSleep(bed: ShelterBed) {
    if (this.isSleepingTransition) return;

    // Safety check: Are there hostile zombies nearby?
    const ppos = this.player.position;
    let threatFound = false;
    let threatDist = 999;
    for (const z of this.zombies.zombies) {
      if (z.state === 'dead') continue;
      const dx = z.position[0] - ppos.x;
      const dz = z.position[2] - ppos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 22 || (dist < 36 && (z.state === 'chase' || z.state === 'attack'))) {
        threatFound = true;
        threatDist = Math.round(dist);
        break;
      }
    }

    if (threatFound) {
      sound.playThreatAlert();
      this.player.stats.warningMessage = `CANNOT SLEEP! UNDEAD NEARBY (${threatDist}m)`;
      this.warningTimer = 3.5;
      return;
    }

    // Safe Sleep Transition
    this.isSleepingTransition = true;
    this.player.stats.isSleeping = true;
    sound.playSleepSequence();

    setTimeout(() => {
      // Advance clock to morning sunrise (06:30 AM)
      if (this.timeOfDay >= 6.5) {
        this.dayNumber += 1;
      }
      this.timeOfDay = 6.5;

      // Restore vitals and advance hunger/thirst
      this.player.restoreHealth(35);
      this.player.stats.stamina = 100;
      this.player.stats.hunger = Math.max(10, this.player.stats.hunger - 14);
      this.player.stats.thirst = Math.max(10, this.player.stats.thirst - 18);

      sound.playWakeUp();
      this.player.stats.isSleeping = false;
      this.isSleepingTransition = false;
      this.player.stats.warningMessage = `RESTED IN ${bed.name.toUpperCase()} · DAY ${this.dayNumber}`;
      this.warningTimer = 4.0;
    }, 1500);
  }

  public restartGame() {
    this.timeOfDay = 7.5;
    this.dayNumber = 1;
    this.isDriving = false;
    this.vehicle.exit();
    this.vehicle.state.position = [
      this.worldData.vehicleSpawn.pos.x,
      this.worldData.vehicleSpawn.pos.y,
      this.worldData.vehicleSpawn.pos.z,
    ];
    this.vehicle.state.rotationY = this.worldData.vehicleSpawn.rotationY;
    this.vehicle.state.speed = 0;
    this.vehicle.state.health = 100;
    this.vehicle.state.fuel = 75;
    this.vehicle.mesh.position.copy(this.worldData.vehicleSpawn.pos);
    this.vehicle.mesh.rotation.set(0, this.worldData.vehicleSpawn.rotationY, 0);

    this.stash = { food: 4, water: 5, medkit: 3, ammo: 48 };
    this.waypoint = null;

    this.player.reset(this.worldData.spawnPoints.player);
    this.zombies.reset(this.worldData.spawnPoints.zombies);
    this.supplies.reset(this.worldData.spawnPoints.supplies);
    this.status = 'playing';
    this.player.lockPointer();
    this.callbacks.onStatusChange('playing');
    this.callbacks.onStatsUpdate(this.player.stats);
  }

  private handleResize = () => {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private tick = () => {
    this.animationFrameId = requestAnimationFrame(this.tick);

    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05);
    const totalTime = this.clock.getElapsedTime();

    // Hitstop freeze
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.renderer.render(this.scene, this.camera);
      return;
    }

    // Subtle wind sway on foliage & trees, and radio tower beacon pulsing
    const windSpeed = totalTime * 2.2;
    this.worldData.windObjects.forEach((obj, idx) => {
      if ((obj as any).isPointLight) {
        // Red aviation warning beacon pulse on transmission tower
        (obj as THREE.PointLight).intensity = 1.0 + Math.sin(totalTime * 4.5) * 1.5;
      } else {
        const sway = Math.sin(windSpeed + idx * 0.8) * 0.018;
        obj.rotation.z = sway;
      }
    });

    if (this.status === 'title') {
      // Atmospheric cinematic town dolly
      this.titleCamAngle += dt * 0.12;
      const camRadius = 24;
      this.camera.position.set(
        Math.sin(this.titleCamAngle) * camRadius,
        4.8 + Math.sin(this.titleCamAngle * 2) * 1.2,
        Math.cos(this.titleCamAngle) * camRadius
      );
      this.camera.lookAt(0, 1.8, 0);

      this.updateDayNightCycle(dt * 0.4);
      this.supplies.update(dt, totalTime);
    } else if (this.status === 'playing') {
      // 1. Advance Day/Night Cycle
      this.updateDayNightCycle(dt);

      // Warning message timer decay
      if (this.warningTimer > 0) {
        this.warningTimer -= dt;
        if (this.warningTimer <= 0) {
          this.player.stats.warningMessage = null;
        }
      }

      // 2. Physics & Controls: Driving vs On-Foot
      if (this.isDriving) {
        // Update 4x4 Truck Physics, Steering & Terrain Alignment
        this.vehicle.update(
          dt,
          this.player.keys,
          this.worldData.colliders,
          getWorldSurfaceHeight,
          this.zombies.zombies,
          () => {
            this.cameraShakeIntensity = 0.08;
            this.player.stats.zombiesKilled += 1;
            this.player.stats.score += 200;
          },
          () => {
            this.cameraShakeIntensity = 0.14;
          }
        );

        // Player world position tracks the vehicle
        this.player.position.set(
          this.vehicle.state.position[0],
          this.vehicle.state.position[1] + 0.8,
          this.vehicle.state.position[2]
        );

        // Smooth Third-Person Driving Chase Camera
        const rot = this.vehicle.state.rotationY;
        const camDist = 6.2;
        const camH = 2.6;
        const targetCamX = this.vehicle.state.position[0] - Math.sin(rot) * camDist;
        const targetCamZ = this.vehicle.state.position[2] - Math.cos(rot) * camDist;
        const targetCamY = getWorldSurfaceHeight(targetCamX, targetCamZ) + camH;

        this.camera.position.x += (targetCamX - this.camera.position.x) * 0.14;
        this.camera.position.z += (targetCamZ - this.camera.position.z) * 0.14;
        this.camera.position.y += (targetCamY - this.camera.position.y) * 0.14;

        const targetLook = new THREE.Vector3(
          this.vehicle.state.position[0] + Math.sin(rot) * 4.0,
          this.vehicle.state.position[1] + 1.2,
          this.vehicle.state.position[2] + Math.cos(rot) * 4.0
        );
        this.camera.lookAt(targetLook);

        // Fuel pump check while driving
        const distToFuel = Math.hypot(
          this.vehicle.state.position[0] - this.worldData.fuelLocation.x,
          this.vehicle.state.position[2] - this.worldData.fuelLocation.z
        );

        if (distToFuel < 8.0 && this.vehicle.state.fuel < 98) {
          this.callbacks.onInteractPrompt('[F] REFUEL 4x4 TRUCK · [E] EXIT TRUCK');
          if (this.player.keys['KeyF']) {
            this.refuelVehicle();
          }
        } else {
          this.callbacks.onInteractPrompt('[E] EXIT VEHICLE · WASD DRIVE · SPACE BRAKE');
        }

        // Stats update for vehicle
        this.player.stats.isDriving = true;
        this.player.stats.vehicleState = { ...this.vehicle.state };
      } else {
        // Player Walking / Sprinting Physics & Collision
        this.player.update(dt, this.worldData.colliders, getWorldSurfaceHeight);
        this.player.stats.isDriving = false;
        this.player.stats.vehicleState = { ...this.vehicle.state };

        // Interaction Proximity Checks
        const distToVeh = Math.hypot(
          this.player.position.x - this.vehicle.state.position[0],
          this.player.position.z - this.vehicle.state.position[2]
        );
        this.isNearVehicle = distToVeh < 3.2;

        let closestBed: ShelterBed | null = null;
        let minBedDist = 999;
        for (const bed of this.worldData.shelters) {
          const d = Math.hypot(
            this.player.position.x - bed.position[0],
            this.player.position.z - bed.position[2]
          );
          if (d < 2.5 && d < minBedDist) {
            minBedDist = d;
            closestBed = bed;
          }
        }
        this.nearbyBed = closestBed;

        const distToStash = Math.hypot(
          this.player.position.x - this.worldData.stashLocation.x,
          this.player.position.z - this.worldData.stashLocation.z
        );
        this.isNearStash = distToStash < 2.4;

        const distToFuel = Math.hypot(
          this.player.position.x - this.worldData.fuelLocation.x,
          this.player.position.z - this.worldData.fuelLocation.z
        );
        this.isNearFuel = distToFuel < 4.0;

        const nearSupply = this.supplies.getNearbyItem(this.player.position);
        this.nearbyItem = nearSupply;

        // Interactive Prompt Display Priority
        if (this.isNearVehicle) {
          this.callbacks.onInteractPrompt('[E] DRIVE 4x4 PICKUP TRUCK');
        } else if (this.nearbyBed) {
          this.callbacks.onInteractPrompt(`[E] SLEEP IN BED (${this.nearbyBed.name.toUpperCase()})`);
        } else if (this.isNearStash) {
          this.callbacks.onInteractPrompt('[E] OPEN SAFEHOUSE STASH');
        } else if (this.isNearFuel && distToVeh < 12.0 && this.vehicle.state.fuel < 98) {
          this.callbacks.onInteractPrompt('[E] REFUEL 4x4 TRUCK AT PUMP');
        } else if (nearSupply) {
          this.callbacks.onInteractPrompt(`[E] TAKE ${nearSupply.name.toUpperCase()}`);
        } else {
          this.callbacks.onInteractPrompt(null);
        }
      }

      // 3. Update 3D Spatial Audio Listener
      this.camera.getWorldDirection(_listenerFwd);
      sound.updateListener(this.camera.position, _listenerFwd, this.camera.up);

      // 4. Update Zombies with Sensory AI and Terrain Grounding
      this.zombies.update(
        dt,
        this.player.position,
        this.player.stats.isSprinting,
        this.player.stats.flashlightOn,
        this.isNight,
        this.worldData.colliders,
        (damage) => {
          // If inside armored vehicle, player takes 75% reduced damage
          const actualDamage = this.isDriving ? damage * 0.25 : damage;
          this.player.takeDamage(actualDamage);
          this.cameraShakeIntensity = 0.08;
          this.callbacks.onDamageEffect();

          if (this.player.stats.health <= 0) {
            this.status = 'gameover';
            this.player.unlockPointer();
            this.callbacks.onStatusChange('gameover');
          }
        },
        getWorldSurfaceHeight
      );

      if (this.player.stats.health <= 0 && this.status === 'playing') {
        this.status = 'gameover';
        this.player.unlockPointer();
        this.callbacks.onStatusChange('gameover');
      }

      // 5. Update Field Supplies
      this.supplies.update(dt, totalTime);

      // 6. Camera Shake Decay
      if (this.cameraShakeIntensity > 0) {
        this.camera.position.x += (Math.random() - 0.5) * this.cameraShakeIntensity;
        this.camera.position.y += (Math.random() - 0.5) * this.cameraShakeIntensity;
        this.cameraShakeIntensity = Math.max(0, this.cameraShakeIntensity - dt * 0.35);
      }

      // 7. Emit Stats to React HUD
      this.player.stats.stashItems = this.stash;
      this.player.stats.waypoint = this.waypoint;
      this.callbacks.onStatsUpdate({ ...this.player.stats });
    }

    this.renderer.render(this.scene, this.camera);
  };

  public dispose() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.handleResize);
    this.vehicle.dispose();
    this.player.dispose();
    this.zombies.dispose();
    this.supplies.dispose();
    this.renderer.dispose();
    if (this.container && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
