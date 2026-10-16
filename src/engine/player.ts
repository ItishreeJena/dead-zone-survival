import * as THREE from 'three';
import { PlayerStats, BoxCollider, WeaponType } from '../types/game';
import { sound } from '../audio/SoundSystem';
import { createGunMetalTexture } from './textures';

export class PlayerController {
  public camera: THREE.PerspectiveCamera;
  public stats: PlayerStats;
  private domElement: HTMLElement;

  // Viewmodel Container
  private viewmodelsGroup: THREE.Group = new THREE.Group();

  // 1. Firearm (Tactical Rifle) Viewmodel
  private rifleGroup: THREE.Group = new THREE.Group();
  private muzzleFlashGroup: THREE.Group = new THREE.Group();
  private muzzleLight: THREE.PointLight;
  private flashTimer: number = 0;

  // 2. Melee Pipe Viewmodel
  private pipeGroup: THREE.Group = new THREE.Group();
  private pipeMesh!: THREE.Mesh;
  private swingProgress: number = 0;
  private isSwinging: boolean = false;

  // Firearm timing & recoil states
  private lastFireTime: number = 0;
  private readonly fireInterval: number = 0.24; // ~250 RPM semi-auto
  private readonly reloadDuration: number = 1.6;
  private reloadTimer: number = 0;

  // Procedural Recoil & Sway
  private recoilZ: number = 0;
  private recoilPitch: number = 0;
  private recoilYaw: number = 0;
  private swayX: number = 0;
  private swayY: number = 0;

  // Flashlight
  public flashlight: THREE.SpotLight;
  private flashlightTarget: THREE.Object3D;

  // Movement & Physics
  public position: THREE.Vector3 = new THREE.Vector3(0, 1.7, 0);
  public velocity: THREE.Vector3 = new THREE.Vector3();
  private isGrounded: boolean = true;
  private yaw: number = 0;
  private pitch: number = 0;
  private bobTimer: number = 0;
  private footstepTimer: number = 0;

  // Input states
  private keys: Record<string, boolean> = {};
  public isLocked: boolean = false;

  // Callbacks
  public onFireBullet?: (origin: THREE.Vector3, direction: THREE.Vector3) => void;
  public onGunshotNoise?: (origin: THREE.Vector3) => void;
  public onMeleeSwing?: (lookDir: THREE.Vector3) => void;
  public onTogglePause?: () => void;
  public onInteract?: () => void;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.stats = {
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
    };

    // Setup Flashlight (Wide tactical beam)
    this.flashlight = new THREE.SpotLight(0xfffaed, 3.2, 42, Math.PI / 4.2, 0.4, 1.4);
    this.flashlight.castShadow = true;
    this.flashlight.shadow.mapSize.width = 1024;
    this.flashlight.shadow.mapSize.height = 1024;
    this.flashlight.shadow.bias = -0.0005;

    this.flashlightTarget = new THREE.Object3D();
    this.flashlight.target = this.flashlightTarget;

    this.camera.add(this.flashlight);
    this.camera.add(this.flashlightTarget);
    this.flashlight.position.set(0.2, -0.15, 0.1);
    this.flashlightTarget.position.set(0.2, -0.15, -6);

    // Build Viewmodels
    this.buildTacticalRifle();
    this.buildLeadPipe();

    this.viewmodelsGroup.add(this.rifleGroup);
    this.viewmodelsGroup.add(this.pipeGroup);
    this.camera.add(this.viewmodelsGroup);

    // Muzzle light setup
    this.muzzleLight = new THREE.PointLight(0xffa233, 0, 14, 2);
    this.camera.add(this.muzzleLight);

    this.updateWeaponVisibility();
    this.initListeners();
  }

  // 1. Procedural 3D Tactical Rifle Viewmodel (8+ distinct parts)
  private buildTacticalRifle() {
    const gunTex = createGunMetalTexture();
    const gunMat = new THREE.MeshStandardMaterial({
      map: gunTex,
      roughness: 0.35,
      metalness: 0.85,
    });

    const polymerMat = new THREE.MeshStandardMaterial({
      color: 0x181a1d,
      roughness: 0.7,
      metalness: 0.2,
    });

    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x3a3e45,
      roughness: 0.25,
      metalness: 0.9,
    });

    // Receiver Body
    const receiverGeo = new THREE.BoxGeometry(0.048, 0.08, 0.38);
    const receiver = new THREE.Mesh(receiverGeo, gunMat);
    receiver.position.set(0, 0, 0);
    this.rifleGroup.add(receiver);

    // Top Picatinny Rail
    const railGeo = new THREE.BoxGeometry(0.024, 0.016, 0.34);
    const rail = new THREE.Mesh(railGeo, steelMat);
    rail.position.set(0, 0.048, 0);
    this.rifleGroup.add(rail);

    // Barrel
    const barrelGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.32, 12);
    barrelGeo.rotateX(Math.PI / 2);
    const barrel = new THREE.Mesh(barrelGeo, steelMat);
    barrel.position.set(0, 0.015, -0.32);
    this.rifleGroup.add(barrel);

    // Muzzle Brake / Flash Hider
    const muzzleGeo = new THREE.CylinderGeometry(0.019, 0.017, 0.06, 8);
    muzzleGeo.rotateX(Math.PI / 2);
    const muzzle = new THREE.Mesh(muzzleGeo, gunMat);
    muzzle.position.set(0, 0.015, -0.5);
    this.rifleGroup.add(muzzle);

    // Handguard / Heat Shield
    const handguardGeo = new THREE.BoxGeometry(0.044, 0.06, 0.22);
    const handguard = new THREE.Mesh(handguardGeo, polymerMat);
    handguard.position.set(0, 0.005, -0.22);
    this.rifleGroup.add(handguard);

    // Curved Magazine
    const magGeo = new THREE.BoxGeometry(0.035, 0.16, 0.09);
    const mag = new THREE.Mesh(magGeo, steelMat);
    mag.position.set(0, -0.11, -0.05);
    mag.rotation.x = -0.22;
    this.rifleGroup.add(mag);

    // Pistol Grip
    const gripGeo = new THREE.BoxGeometry(0.038, 0.14, 0.055);
    const grip = new THREE.Mesh(gripGeo, polymerMat);
    grip.position.set(0, -0.1, 0.12);
    grip.rotation.x = 0.35;
    this.rifleGroup.add(grip);

    // Trigger & Guard
    const guardGeo = new THREE.TorusGeometry(0.03, 0.006, 6, 8, Math.PI);
    guardGeo.rotateZ(Math.PI);
    const guard = new THREE.Mesh(guardGeo, steelMat);
    guard.position.set(0, -0.05, 0.06);
    this.rifleGroup.add(guard);

    // Iron Sights: Front Post & Rear Ring
    const frontSightGeo = new THREE.BoxGeometry(0.006, 0.024, 0.008);
    const frontSight = new THREE.Mesh(frontSightGeo, steelMat);
    frontSight.position.set(0, 0.04, -0.46);
    this.rifleGroup.add(frontSight);

    const rearSightGeo = new THREE.BoxGeometry(0.024, 0.02, 0.01);
    const rearSight = new THREE.Mesh(rearSightGeo, steelMat);
    rearSight.position.set(0, 0.062, 0.14);
    this.rifleGroup.add(rearSight);

    // Muzzle Flash Effect (Faceted glowing star)
    const flashGeo = new THREE.OctahedronGeometry(0.08, 0);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffe680,
      transparent: true,
      opacity: 0.9,
    });
    const flashMesh = new THREE.Mesh(flashGeo, flashMat);
    this.muzzleFlashGroup.position.set(0, 0.015, -0.55);
    this.muzzleFlashGroup.add(flashMesh);
    this.muzzleFlashGroup.visible = false;
    this.rifleGroup.add(this.muzzleFlashGroup);

    // Default resting position relative to camera (down-right in FPS view)
    this.rifleGroup.position.set(0.24, -0.24, -0.48);
    this.rifleGroup.rotation.set(0.05, -0.02, 0);
  }

  // 2. Lead Pipe Viewmodel
  private buildLeadPipe() {
    const pipeGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.7, 12);
    const pipeMat = new THREE.MeshStandardMaterial({
      color: 0x6e747b,
      roughness: 0.45,
      metalness: 0.85,
    });
    this.pipeMesh = new THREE.Mesh(pipeGeo, pipeMat);
    this.pipeMesh.position.set(0.32, -0.32, -0.55);
    this.pipeMesh.rotation.set(0.5, -0.3, -0.6);

    const gripGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.22, 12);
    const gripMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.95,
    });
    const gripMesh = new THREE.Mesh(gripGeo, gripMat);
    gripMesh.position.y = -0.2;
    this.pipeMesh.add(gripMesh);

    this.pipeGroup.add(this.pipeMesh);
  }

  private updateWeaponVisibility() {
    this.rifleGroup.visible = this.stats.equippedWeapon === 'rifle';
    this.pipeGroup.visible = this.stats.equippedWeapon === 'pipe';
  }

  public setWeapon(weapon: WeaponType) {
    if (this.stats.equippedWeapon === weapon) return;
    this.stats.equippedWeapon = weapon;
    this.stats.isReloading = false;
    this.reloadTimer = 0;
    this.updateWeaponVisibility();
  }

  private initListeners() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
  }

  public lockPointer() {
    this.domElement.requestPointerLock();
  }

  public unlockPointer() {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  private handlePointerLockChange = () => {
    this.isLocked = document.pointerLockElement === this.domElement;
  };

  private handleBlur = () => {
    this.keys = {};
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;

    if (e.code === 'KeyF') {
      this.toggleFlashlight();
    } else if (e.code === 'KeyR') {
      this.reload();
    } else if (e.code === 'Digit1') {
      this.setWeapon('pipe');
    } else if (e.code === 'Digit2') {
      this.setWeapon('rifle');
    } else if (e.code === 'KeyE') {
      if (this.onInteract) this.onInteract();
    } else if (e.code === 'Escape') {
      if (this.onTogglePause) this.onTogglePause();
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.isLocked) return;

    const sens = 0.0022;
    const dx = e.movementX * sens;
    const dy = e.movementY * sens;

    this.yaw -= dx;
    this.pitch -= dy;

    // Viewmodel lag / sway
    this.swayX = Math.max(-0.06, Math.min(0.06, this.swayX - dx * 0.15));
    this.swayY = Math.max(-0.05, Math.min(0.05, this.swayY + dy * 0.15));

    // Clamp pitch between -85 and +85 degrees
    const maxPitch = (Math.PI / 2) * 0.95;
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
  };

  public handleMouseDown = (e: MouseEvent) => {
    if (!this.isLocked) return;

    if (e.button === 0) {
      // Left click: Fire primary weapon (or swing pipe)
      if (this.stats.equippedWeapon === 'rifle') {
        this.fireRifle();
      } else {
        this.swingPipe();
      }
    } else if (e.button === 2) {
      // Right click: Quick melee bash with lead pipe or rifle butt!
      this.swingPipe();
    }
  };

  public fireRifle() {
    if (this.stats.isReloading) return;

    const now = performance.now() / 1000;
    if (now - this.lastFireTime < this.fireInterval) return;

    if (this.stats.ammo <= 0) {
      // Dry fire click
      sound.playDryFire();
      if (this.stats.reserveAmmo > 0) {
        this.reload();
      }
      return;
    }

    this.lastFireTime = now;
    this.stats.ammo -= 1;

    // Play procedural gunshot
    sound.playGunshot();

    // Trigger visual muzzle flash
    this.flashTimer = 0.06;
    this.muzzleFlashGroup.visible = true;
    this.muzzleFlashGroup.rotation.z = Math.random() * Math.PI;
    this.muzzleLight.intensity = 3.6;
    this.muzzleLight.position.set(
      this.camera.position.x + 0.2,
      this.camera.position.y - 0.1,
      this.camera.position.z - 0.4
    );

    // Apply procedural recoil to viewmodel & camera
    this.recoilZ = 0.12;
    this.recoilPitch = 0.09;
    this.recoilYaw = (Math.random() - 0.5) * 0.02;

    // Camera kickback
    this.pitch += 0.022;
    this.yaw += (Math.random() - 0.5) * 0.008;

    // Actual Raycast Shooting
    if (this.onFireBullet) {
      const lookDir = new THREE.Vector3();
      this.camera.getWorldDirection(lookDir);
      this.onFireBullet(this.camera.position, lookDir);
    }

    // Gunfire noise attracts nearby zombies within 42m!
    if (this.onGunshotNoise) {
      this.onGunshotNoise(this.position);
    }
  }

  public reload() {
    if (
      this.stats.isReloading ||
      this.stats.ammo >= this.stats.maxAmmo ||
      this.stats.reserveAmmo <= 0 ||
      this.stats.equippedWeapon !== 'rifle'
    ) {
      return;
    }

    this.stats.isReloading = true;
    this.reloadTimer = this.reloadDuration;
    this.stats.reloadProgress = 0;
    sound.playReload();
  }

  public swingPipe() {
    if (this.isSwinging || this.stats.stamina < 8) return;
    this.isSwinging = true;
    this.swingProgress = 0;
    this.stats.stamina = Math.max(0, this.stats.stamina - 8);
    sound.playSwing();

    // Trigger hit check halfway through swing
    setTimeout(() => {
      if (this.onMeleeSwing) {
        const lookDir = new THREE.Vector3();
        this.camera.getWorldDirection(lookDir);
        this.onMeleeSwing(lookDir);
      }
    }, 120);
  }

  public toggleFlashlight() {
    this.stats.flashlightOn = !this.stats.flashlightOn;
    this.flashlight.visible = this.stats.flashlightOn;
    sound.playFlashlight();
  }

  public addAmmo(amount: number) {
    this.stats.reserveAmmo += amount;
  }

  public update(
    dt: number,
    colliders: BoxCollider[],
    getGroundHeight?: (x: number, z: number) => number
  ) {
    // 1. Time Survived & Survival Vitals Simulation
    this.stats.timeSurvived += dt;

    // Hunger and Thirst decay
    this.stats.hunger = Math.max(0, this.stats.hunger - dt * 0.28);
    this.stats.thirst = Math.max(0, this.stats.thirst - dt * 0.42);

    if (this.stats.hunger <= 0) {
      this.stats.health = Math.max(0, this.stats.health - dt * 1.5);
    }
    if (this.stats.thirst <= 0) {
      this.stats.health = Math.max(0, this.stats.health - dt * 2.2);
    }

    sound.updateHeartbeat(this.stats.health);

    // Dynamic Open-World District Detection
    const px = this.position.x;
    const pz = this.position.z;
    if (px < -60) {
      this.stats.currentLocation = 'WHISPERING PINES FOREST & CABIN';
    } else if (pz < -55) {
      this.stats.currentLocation = 'QUARANTINE FIELD HOSPITAL';
    } else if (px > 55 && pz > 40) {
      this.stats.currentLocation = 'INDUSTRIAL WAREHOUSE DEPOT';
    } else if (px > 55) {
      this.stats.currentLocation = 'HIGHWAY 40 GAS STATION';
    } else if (pz > 45) {
      this.stats.currentLocation = 'RIDGEWOOD SUBURBS';
    } else {
      this.stats.currentLocation = 'DOWNTOWN CROSSROADS';
    }

    // 2. Reloading Progress
    if (this.stats.isReloading) {
      this.reloadTimer -= dt;
      this.stats.reloadProgress = 1 - Math.max(0, this.reloadTimer / this.reloadDuration);

      if (this.reloadTimer <= 0) {
        const needed = this.stats.maxAmmo - this.stats.ammo;
        const transfer = Math.min(needed, this.stats.reserveAmmo);
        this.stats.ammo += transfer;
        this.stats.reserveAmmo -= transfer;
        this.stats.isReloading = false;
        this.stats.reloadProgress = 0;
      }
    }

    // 3. Muzzle Flash Decay
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this.muzzleFlashGroup.visible = false;
        this.muzzleLight.intensity = 0;
      }
    }

    // 4. Movement Inputs
    const moveZ = (this.keys['KeyW'] ? 1 : 0) - (this.keys['KeyS'] ? 1 : 0);
    const moveX = (this.keys['KeyD'] ? 1 : 0) - (this.keys['KeyA'] ? 1 : 0);
    const isMoving = moveX !== 0 || moveZ !== 0;

    const wantsSprint = Boolean(this.keys['ShiftLeft'] || this.keys['ShiftRight']);
    const canSprint = wantsSprint && isMoving && this.stats.stamina > 2 && moveZ > 0;
    this.stats.isSprinting = canSprint;

    if (canSprint) {
      this.stats.stamina = Math.max(0, this.stats.stamina - dt * 16);
    } else {
      this.stats.stamina = Math.min(this.stats.maxStamina, this.stats.stamina + dt * 14);
    }

    // Jump
    if (this.keys['Space'] && this.isGrounded && this.stats.stamina >= 10) {
      this.velocity.y = 5.2;
      this.isGrounded = false;
      this.stats.stamina -= 10;
    }

    // Direction & Acceleration
    const speed = canSprint ? 8.0 : (this.isGrounded ? 4.5 : 3.8);
    const inputDir = new THREE.Vector3(moveX, 0, -moveZ);
    if (inputDir.lengthSq() > 0) inputDir.normalize();

    inputDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

    const targetVelX = inputDir.x * speed;
    const targetVelZ = inputDir.z * speed;

    const accel = this.isGrounded ? 18 : 6;
    this.velocity.x += (targetVelX - this.velocity.x) * Math.min(1, dt * accel);
    this.velocity.z += (targetVelZ - this.velocity.z) * Math.min(1, dt * accel);

    // Gravity
    this.velocity.y -= 18.0 * dt;

    // Collision Detection
    const playerRadius = 0.42;
    const playerHeight = 1.7;

    let nextX = this.position.x + this.velocity.x * dt;
    let nextZ = this.position.z + this.velocity.z * dt;
    let nextY = this.position.y + this.velocity.y * dt;

    for (const box of colliders) {
      if (
        nextX + playerRadius > box.minX &&
        nextX - playerRadius < box.maxX &&
        this.position.z + playerRadius > box.minZ &&
        this.position.z - playerRadius < box.maxZ
      ) {
        nextX = this.position.x;
        this.velocity.x = 0;
      }

      if (
        this.position.x + playerRadius > box.minX &&
        this.position.x - playerRadius < box.maxX &&
        nextZ + playerRadius > box.minZ &&
        nextZ - playerRadius < box.maxZ
      ) {
        nextZ = this.position.z;
        this.velocity.z = 0;
      }
    }

    // Sample dynamic surface height at validated horizontal position
    const groundY = getGroundHeight ? getGroundHeight(nextX, nextZ) : 0;
    const playerEyeY = groundY + playerHeight;

    if (nextY <= playerEyeY) {
      nextY = playerEyeY;
      this.velocity.y = 0;
      this.isGrounded = true;
    } else if (this.isGrounded && nextY - playerEyeY < 0.6) {
      // Step smoothly with terrain contour & ramps while grounded
      nextY = playerEyeY;
      this.velocity.y = 0;
    }

    this.position.set(nextX, nextY, nextZ);

    // 5. Head Bobbing & Footsteps
    if (this.isGrounded && isMoving) {
      const bobFreq = canSprint ? 14 : 9.5;
      this.bobTimer += dt * bobFreq;
      this.footstepTimer += dt * (canSprint ? 1.9 : 1.3);

      if (this.footstepTimer >= 0.5) {
        sound.playFootstep(canSprint);
        this.footstepTimer = 0;
      }
    } else {
      this.bobTimer = 0;
      this.footstepTimer = 0;
    }

    const bobOffset = Math.sin(this.bobTimer) * (canSprint ? 0.055 : 0.03);
    const swayOffset = Math.cos(this.bobTimer * 0.5) * (canSprint ? 0.025 : 0.015);

    // Camera orientation
    this.camera.position.set(
      this.position.x + swayOffset,
      this.position.y + bobOffset,
      this.position.z
    );

    const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);

    // 6. Viewmodel Animation & Physics Recovery
    // Recoil recovery
    this.recoilZ = THREE.MathUtils.damp(this.recoilZ, 0, 18, dt);
    this.recoilPitch = THREE.MathUtils.damp(this.recoilPitch, 0, 20, dt);
    this.recoilYaw = THREE.MathUtils.damp(this.recoilYaw, 0, 20, dt);

    // Sway recovery
    this.swayX = THREE.MathUtils.damp(this.swayX, 0, 12, dt);
    this.swayY = THREE.MathUtils.damp(this.swayY, 0, 12, dt);

    // Rifle Viewmodel Transform
    if (this.stats.equippedWeapon === 'rifle') {
      const idleSwayX = Math.sin(Date.now() * 0.0018) * 0.004;
      const idleSwayY = Math.cos(Date.now() * 0.0014) * 0.004;

      let reloadDipY = 0;
      let reloadRotZ = 0;
      if (this.stats.isReloading) {
        const reloadPhase = Math.sin(this.stats.reloadProgress * Math.PI);
        reloadDipY = -reloadPhase * 0.18;
        reloadRotZ = reloadPhase * 0.35;
      }

      this.rifleGroup.position.set(
        0.24 + this.swayX + idleSwayX,
        -0.24 + this.swayY + idleSwayY + reloadDipY + bobOffset * 0.5,
        -0.48 + this.recoilZ
      );

      this.rifleGroup.rotation.set(
        0.05 + this.recoilPitch + this.swayY * 0.5,
        -0.02 + this.recoilYaw - this.swayX * 0.5,
        reloadRotZ
      );
    }

    // Pipe Viewmodel Transform
    if (this.isSwinging) {
      this.swingProgress += dt * 4.5;
      const t = this.swingProgress;

      if (t >= 1) {
        this.isSwinging = false;
        this.swingProgress = 0;
        this.pipeMesh.position.set(0.32, -0.32, -0.55);
        this.pipeMesh.rotation.set(0.5, -0.3, -0.6);
      } else {
        const swingAngle = Math.sin(t * Math.PI);
        this.pipeMesh.position.set(
          0.32 - swingAngle * 0.35,
          -0.32 - swingAngle * 0.15,
          -0.55 + swingAngle * 0.12
        );
        this.pipeMesh.rotation.set(
          0.5 - swingAngle * 1.5,
          -0.3 - swingAngle * 0.9,
          -0.6 + swingAngle * 1.8
        );
      }
    } else {
      const idleSway = Math.sin(Date.now() * 0.002) * 0.008;
      this.pipeMesh.position.y = -0.32 + idleSway;
    }
  }

  public takeDamage(amount: number) {
    this.stats.health = Math.max(0, this.stats.health - amount);
    this.pitch += 0.08;
    this.yaw += (Math.random() - 0.5) * 0.06;
  }

  public restoreHealth(amount: number) {
    this.stats.health = Math.min(this.stats.maxHealth, this.stats.health + amount);
  }

  public restoreHunger(amount: number) {
    this.stats.hunger = Math.min(100, this.stats.hunger + amount);
  }

  public restoreThirst(amount: number) {
    this.stats.thirst = Math.min(100, this.stats.thirst + amount);
  }

  public reset(spawnPos: THREE.Vector3) {
    this.position.copy(spawnPos);
    this.velocity.set(0, 0, 0);
    this.yaw = 0;
    this.pitch = 0;
    this.stats.health = 100;
    this.stats.stamina = 100;
    this.stats.hunger = 95;
    this.stats.thirst = 90;
    this.stats.flashlightOn = true;
    this.flashlight.visible = true;
    this.stats.score = 0;
    this.stats.zombiesKilled = 0;
    this.stats.itemsFound = 0;
    this.stats.timeSurvived = 0;
    this.stats.equippedWeapon = 'rifle';
    this.stats.ammo = 12;
    this.stats.maxAmmo = 12;
    this.stats.reserveAmmo = 36;
    this.stats.isReloading = false;
    this.stats.reloadProgress = 0;
    this.isSwinging = false;
    this.recoilZ = 0;
    this.recoilPitch = 0;
    this.keys = {};
    this.updateWeaponVisibility();
  }

  public dispose() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
  }
}
