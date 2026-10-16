import * as THREE from 'three';
import { VehicleState, BoxCollider, ZombieData } from '../types/game';
import { sound } from '../audio/SoundSystem';
import { createRustedMetalTexture } from './textures';

export class VehicleController {
  public mesh: THREE.Group = new THREE.Group();
  public state: VehicleState;

  // Visual sub-meshes for animation
  private wheelFL!: THREE.Group;
  private wheelFR!: THREE.Group;
  private wheelRL!: THREE.Group;
  private wheelRR!: THREE.Group;
  private steeringWheel!: THREE.Mesh;
  private headlightLeft!: THREE.SpotLight;
  private headlightRight!: THREE.SpotLight;
  private taillightMeshL!: THREE.Mesh;
  private taillightMeshR!: THREE.Mesh;

  // Physics & controls
  private steerAngle: number = 0;
  private maxSteerAngle: number = 0.55; // radians (~32 degrees)
  private isBraking: boolean = false;
  private engineTimer: number = 0;
  private lastHonkTime: number = 0;

  // Constants
  public readonly wheelBase: number = 3.2;
  public readonly trackWidth: number = 2.0;
  public readonly vehicleRadius: number = 1.6;

  constructor(initialPosition: THREE.Vector3, initialRotationY: number = 0) {
    this.state = {
      id: 'pickup_truck_01',
      name: '4x4 Off-Road Pickup Truck',
      position: [initialPosition.x, initialPosition.y, initialPosition.z],
      rotationY: initialRotationY,
      speed: 0,
      maxSpeed: 18.0, // ~65 km/h
      health: 100,
      maxHealth: 100,
      fuel: 75,
      maxFuel: 100,
      isOccupied: false,
      headlightsOn: true,
    };

    this.buildVehicleMesh();
    this.mesh.position.copy(initialPosition);
    this.mesh.rotation.y = initialRotationY;
  }

  // Build high-detail rugged 4x4 pickup truck model
  private buildVehicleMesh() {
    const rustTex = createRustedMetalTexture();

    // Body paint material (olive / tactical military weathered green)
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x3e4a38,
      map: rustTex,
      roughness: 0.65,
      metalness: 0.35,
    });

    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x1f2326,
      roughness: 0.45,
      metalness: 0.85,
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x6b8294,
      roughness: 0.15,
      metalness: 0.1,
      transmission: 0.7,
      transparent: true,
      opacity: 0.75,
    });

    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x151618,
      roughness: 0.95,
      metalness: 0.05,
    });

    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x4a4f55,
      roughness: 0.3,
      metalness: 0.9,
    });

    const lightBulbMat = new THREE.MeshBasicMaterial({ color: 0xfffaed });
    const redTailMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    // 1. Heavy Frame Chassis
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.45, 5.0), steelMat);
    chassis.position.y = 0.65;
    chassis.castShadow = true;
    this.mesh.add(chassis);

    // 2. Front Hood & Engine Bay (Local +Z is Front)
    const hood = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.6, 1.8), bodyMat);
    hood.position.set(0, 0.95, 1.6);
    hood.castShadow = true;
    this.mesh.add(hood);

    // Heavy Steel Bull-Bar Push Bumper
    const bullBar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 0.3), steelMat);
    bullBar.position.set(0, 0.7, 2.55);
    this.mesh.add(bullBar);

    // 3. Passenger Cabin (with Windshield, Roof, Dashboard, Seats)
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.95, 1.8), bodyMat);
    cab.position.set(0, 1.45, -0.2);
    cab.castShadow = true;
    this.mesh.add(cab);

    // Windshield (Front glass)
    const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.75), glassMat);
    windshield.position.set(0, 1.5, 0.71);
    windshield.rotation.x = -0.35;
    this.mesh.add(windshield);

    // Rear Cab Window
    const rearWindow = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.6), glassMat);
    rearWindow.position.set(0, 1.55, -1.11);
    rearWindow.rotation.y = Math.PI;
    this.mesh.add(rearWindow);

    // Dashboard & Steering Wheel inside cab
    const dash = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 0.5), steelMat);
    dash.position.set(0, 1.25, 0.45);
    this.mesh.add(dash);

    const steerGeo = new THREE.TorusGeometry(0.18, 0.03, 6, 16);
    this.steeringWheel = new THREE.Mesh(steerGeo, steelMat);
    this.steeringWheel.position.set(-0.5, 1.35, 0.28);
    this.steeringWheel.rotation.x = -0.45;
    this.mesh.add(this.steeringWheel);

    // Driver & Passenger Seats
    const seatL = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.75, 0.6), steelMat);
    seatL.position.set(-0.5, 1.2, -0.2);
    this.mesh.add(seatL);

    const seatR = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.75, 0.6), steelMat);
    seatR.position.set(0.5, 1.2, -0.2);
    this.mesh.add(seatR);

    // 4. Rear Cargo Bed (open pickup bed with roll bar)
    const bedSidesL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.6, 1.8), bodyMat);
    bedSidesL.position.set(-0.95, 1.15, -1.8);
    this.mesh.add(bedSidesL);

    const bedSidesR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.6, 1.8), bodyMat);
    bedSidesR.position.set(0.95, 1.15, -1.8);
    this.mesh.add(bedSidesR);

    const tailgate = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 0.15), bodyMat);
    tailgate.position.set(0, 1.15, -2.65);
    this.mesh.add(tailgate);

    // Tubular Steel Roll Bar
    const rollBarTop = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.1, 0.1), steelMat);
    rollBarTop.position.set(0, 2.05, -1.25);
    this.mesh.add(rollBarTop);

    // Jerrycan Fuel Cans in truck bed
    const fuelCanMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.5 });
    const fuelCan = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.25), fuelCanMat);
    fuelCan.position.set(0.6, 1.05, -1.6);
    this.mesh.add(fuelCan);

    // 5. Dual High-Beam Headlights
    const hlLensL = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 12), lightBulbMat);
    hlLensL.rotation.x = Math.PI / 2;
    hlLensL.position.set(-0.75, 0.95, 2.5);
    this.mesh.add(hlLensL);

    const hlLensR = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 12), lightBulbMat);
    hlLensR.rotation.x = Math.PI / 2;
    hlLensR.position.set(0.75, 0.95, 2.5);
    this.mesh.add(hlLensR);

    this.headlightLeft = new THREE.SpotLight(0xfff8e8, 3.8, 48, Math.PI / 4.8, 0.35, 1.4);
    this.headlightLeft.position.set(-0.75, 0.95, 2.5);
    const targetL = new THREE.Object3D();
    targetL.position.set(-0.75, 0.4, 18);
    this.mesh.add(this.headlightLeft);
    this.mesh.add(targetL);
    this.headlightLeft.target = targetL;

    this.headlightRight = new THREE.SpotLight(0xfff8e8, 3.8, 48, Math.PI / 4.8, 0.35, 1.4);
    this.headlightRight.position.set(0.75, 0.95, 2.5);
    const targetR = new THREE.Object3D();
    targetR.position.set(0.75, 0.4, 18);
    this.mesh.add(this.headlightRight);
    this.mesh.add(targetR);
    this.headlightRight.target = targetR;

    // Red Tail-lights
    this.taillightMeshL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.05), redTailMat);
    this.taillightMeshL.position.set(-0.85, 1.15, -2.71);
    this.mesh.add(this.taillightMeshL);

    this.taillightMeshR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.05), redTailMat);
    this.taillightMeshR.position.set(0.85, 1.15, -2.71);
    this.mesh.add(this.taillightMeshR);

    // 6. 4 Large Off-Road All-Terrain Wheels with Rims
    const buildWheelGroup = () => {
      const g = new THREE.Group();
      // Tire cylinder (rotated to roll along Z)
      const tireGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.38, 16);
      tireGeo.rotateZ(Math.PI / 2);
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.castShadow = true;
      g.add(tire);

      const rimGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.39, 10);
      rimGeo.rotateZ(Math.PI / 2);
      const rim = new THREE.Mesh(rimGeo, rimMat);
      g.add(rim);
      return g;
    };

    this.wheelFL = buildWheelGroup();
    this.wheelFL.position.set(-1.08, 0.48, 1.45);
    this.mesh.add(this.wheelFL);

    this.wheelFR = buildWheelGroup();
    this.wheelFR.position.set(1.08, 0.48, 1.45);
    this.mesh.add(this.wheelFR);

    this.wheelRL = buildWheelGroup();
    this.wheelRL.position.set(-1.08, 0.48, -1.45);
    this.mesh.add(this.wheelRL);

    this.wheelRR = buildWheelGroup();
    this.wheelRR.position.set(1.08, 0.48, -1.45);
    this.mesh.add(this.wheelRR);
  }

  // Get driver eye position for first-person cockpit driving view
  public getDriverCameraPosition(): THREE.Vector3 {
    // Driver seat is located at local (-0.5, 1.55, -0.2)
    const localPos = new THREE.Vector3(-0.5, 1.55, -0.2);
    localPos.applyEuler(this.mesh.rotation);
    return localPos.add(this.mesh.position);
  }

  // Get safe position on the driver's side to dismount smoothly on the ground
  public getExitPosition(getSurfaceHeight: (x: number, z: number) => number): THREE.Vector3 {
    const exitOffset = new THREE.Vector3(-1.9, 0, 0);
    exitOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.state.rotationY);
    const exitX = this.state.position[0] + exitOffset.x;
    const exitZ = this.state.position[2] + exitOffset.z;
    const exitY = getSurfaceHeight(exitX, exitZ) + 1.7;
    return new THREE.Vector3(exitX, exitY, exitZ);
  }

  public enter() {
    this.state.isOccupied = true;
    sound.startEngine();
  }

  public exit() {
    this.state.isOccupied = false;
    this.state.speed = 0;
    sound.stopEngine();
  }

  public refuel(amount: number = 100) {
    this.state.fuel = Math.min(this.state.maxFuel, this.state.fuel + amount);
    sound.playRefuel();
  }

  // Update driving physics, wheel rotation, collision, terrain tracking, and audio
  public update(
    dt: number,
    keys: Record<string, boolean>,
    colliders: BoxCollider[],
    getSurfaceHeight: (x: number, z: number) => number,
    zombies: ZombieData[],
    onZombieRunOver?: (zombie: ZombieData) => void,
    onVehicleCrash?: () => void
  ) {
    // 1. Process Inputs (only if player is inside driving)
    let throttle = 0;
    let steerInput = 0;
    this.isBraking = false;

    if (this.state.isOccupied && this.state.health > 0) {
      if (keys['KeyW']) throttle += 1;
      if (keys['KeyS']) throttle -= 1;
      if (keys['KeyA']) steerInput -= 1;
      if (keys['KeyD']) steerInput += 1;
      if (keys['Space']) this.isBraking = true;
    }

    // Out of fuel check
    if (this.state.fuel <= 0) {
      throttle = 0;
    }

    // 2. Steering & Turning Mechanics
    const steerSpeed = dt * 3.8;
    const targetSteer = steerInput * this.maxSteerAngle;
    this.steerAngle += (targetSteer - this.steerAngle) * Math.min(1, steerSpeed);

    // Animate visual front wheels steering and steering wheel
    this.wheelFL.rotation.y = this.steerAngle;
    this.wheelFR.rotation.y = this.steerAngle;
    this.steeringWheel.rotation.z = -this.steerAngle * 2.2;

    // 3. Acceleration & Braking Dynamics
    const accelRate = 7.5; // m/s^2
    const reverseRate = 4.5;
    const friction = 2.4; // rolling resistance
    const brakeForce = 16.0;

    if (this.isBraking) {
      // Handbrake
      const brakeDecel = brakeForce * dt;
      if (Math.abs(this.state.speed) > 0.05) {
        sound.playBrakeScreech();
      }
      if (this.state.speed > 0) {
        this.state.speed = Math.max(0, this.state.speed - brakeDecel);
      } else {
        this.state.speed = Math.min(0, this.state.speed + brakeDecel);
      }
    } else if (throttle > 0) {
      // Forward throttle
      this.state.speed = Math.min(this.state.maxSpeed, this.state.speed + accelRate * dt);
      if (this.state.fuel > 0) {
        this.state.fuel = Math.max(0, this.state.fuel - dt * 0.35); // fuel burn
      }
    } else if (throttle < 0) {
      // Reversing or foot braking
      if (this.state.speed > 0.5) {
        // Foot brake
        this.state.speed = Math.max(0, this.state.speed - brakeForce * dt);
      } else {
        // Reverse gear
        this.state.speed = Math.max(-5.5, this.state.speed - reverseRate * dt);
        if (this.state.fuel > 0) {
          this.state.fuel = Math.max(0, this.state.fuel - dt * 0.35);
        }
      }
    } else {
      // Coasting with natural friction
      const drag = friction * dt;
      if (this.state.speed > 0) {
        this.state.speed = Math.max(0, this.state.speed - drag);
      } else if (this.state.speed < 0) {
        this.state.speed = Math.min(0, this.state.speed + drag);
      }
    }

    // 4. Yaw Turn Angular Velocity proportional to speed and steer
    if (Math.abs(this.state.speed) > 0.1) {
      const turnMultiplier = this.state.speed >= 0 ? 1 : -1;
      const turnRate = (this.state.speed / this.wheelBase) * Math.sin(this.steerAngle) * turnMultiplier;
      this.state.rotationY -= turnRate * dt * 0.85;
    }

    // 5. Candidate Movement Translation
    const moveDist = this.state.speed * dt;
    const forwardX = Math.sin(this.state.rotationY) * moveDist;
    const forwardZ = Math.cos(this.state.rotationY) * moveDist;

    let nextX = this.state.position[0] + forwardX;
    let nextZ = this.state.position[2] + forwardZ;

    // 6. Obstacle Collision Detection vs World Colliders
    let hasCollided = false;
    const truckBound = 1.35;

    for (const box of colliders) {
      if (
        nextX + truckBound > box.minX &&
        nextX - truckBound < box.maxX &&
        nextZ + truckBound > box.minZ &&
        nextZ - truckBound < box.maxZ
      ) {
        hasCollided = true;
        break;
      }
    }

    if (hasCollided) {
      // Impact reaction
      const impactSpeed = Math.abs(this.state.speed);
      if (impactSpeed > 2.0) {
        sound.playVehicleImpact(impactSpeed / this.state.maxSpeed);
        // Vehicle health damage
        const damage = Math.round(impactSpeed * 1.5);
        this.state.health = Math.max(0, this.state.health - damage);
        if (onVehicleCrash) onVehicleCrash();
      }

      // Bounce back slightly and halt
      this.state.speed = -this.state.speed * 0.3;
      nextX = this.state.position[0];
      nextZ = this.state.position[2];
    } else {
      this.state.position[0] = nextX;
      this.state.position[2] = nextZ;
    }

    // 7. Dynamic 4-Wheel Terrain & Surface Height Alignment
    // Sample terrain surface at 4 wheel contact coordinates
    const cosY = Math.cos(this.state.rotationY);
    const sinY = Math.sin(this.state.rotationY);

    const halfW = this.trackWidth / 2;
    const halfL = this.wheelBase / 2;

    // Local wheel positions in world space
    const flX = nextX - halfW * cosY + halfL * sinY;
    const flZ = nextZ + halfW * sinY + halfL * cosY;

    const frX = nextX + halfW * cosY + halfL * sinY;
    const frZ = nextZ - halfW * sinY + halfL * cosY;

    const rlX = nextX - halfW * cosY - halfL * sinY;
    const rlZ = nextZ + halfW * sinY - halfL * cosY;

    const rrX = nextX + halfW * cosY - halfL * sinY;
    const rrZ = nextZ - halfW * sinY - halfL * cosY;

    const flY = getSurfaceHeight(flX, flZ);
    const frY = getSurfaceHeight(frX, frZ);
    const rlY = getSurfaceHeight(rlX, rlZ);
    const rrY = getSurfaceHeight(rrX, rrZ);

    const frontY = (flY + frY) / 2;
    const rearY = (rlY + rrY) / 2;
    const leftY = (flY + rlY) / 2;
    const rightY = (frY + rrY) / 2;

    const targetCenterY = (frontY + rearY) / 2 + 0.15;
    this.state.position[1] = targetCenterY;

    // Pitch (climbing hills) and Roll (camber)
    const pitchAngle = Math.atan2(frontY - rearY, this.wheelBase);
    const rollAngle = Math.atan2(leftY - rightY, this.trackWidth);

    // Apply smooth transforms to mesh
    this.mesh.position.set(this.state.position[0], this.state.position[1], this.state.position[2]);
    this.mesh.rotation.set(pitchAngle, this.state.rotationY, -rollAngle);

    // Spin wheels according to speed
    const wheelSpin = (this.state.speed / 0.48) * dt;
    this.wheelFL.rotation.x += wheelSpin;
    this.wheelFR.rotation.x += wheelSpin;
    this.wheelRL.rotation.x += wheelSpin;
    this.wheelRR.rotation.x += wheelSpin;

    // 8. Zombie Collision & Run-Over Mechanics
    if (Math.abs(this.state.speed) > 3.0) {
      for (const z of zombies) {
        if (z.state === 'dead') continue;
        const dx = z.position[0] - this.state.position[0];
        const dz = z.position[2] - this.state.position[2];
        const distSq = dx * dx + dz * dz;

        if (distSq < 2.5 * 2.5) {
          // Impact zombie!
          sound.playVehicleImpact(0.4);
          sound.playZombieHit();
          z.health = 0;
          z.state = 'dead';
          if (onZombieRunOver) onZombieRunOver(z);
        }
      }
    }

    // 9. Audio Engine Updates
    if (this.state.isOccupied) {
      const speedRatio = this.state.speed / this.state.maxSpeed;
      sound.updateEngine(speedRatio, throttle !== 0);
    }
  }

  public dispose() {
    this.mesh.clear();
  }
}
