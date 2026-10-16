import * as THREE from 'three';
import { ZombieData, ZombieState, BoxCollider } from '../types/game';
import { sound } from '../audio/SoundSystem';

export class ZombieSystem {
  public zombies: ZombieData[] = [];
  private group: THREE.Group = new THREE.Group();
  private sharedSkinMat: THREE.MeshStandardMaterial;
  private sharedClothesMat: THREE.MeshStandardMaterial;
  private sharedPantsMat: THREE.MeshStandardMaterial;
  private sharedEyeMat: THREE.MeshBasicMaterial;

  // Impact particles
  private bloodParticles: { mesh: THREE.Mesh; life: number; maxLife: number; vel: THREE.Vector3 }[] = [];

  constructor(scene: THREE.Scene, spawnPositions: THREE.Vector3[]) {
    scene.add(this.group);

    // Materials
    this.sharedSkinMat = new THREE.MeshStandardMaterial({
      color: 0x5a6954,
      roughness: 0.9,
      metalness: 0.05,
    });

    this.sharedClothesMat = new THREE.MeshStandardMaterial({
      color: 0x3e352f,
      roughness: 0.85,
    });

    this.sharedPantsMat = new THREE.MeshStandardMaterial({
      color: 0x272b2e,
      roughness: 0.85,
    });

    this.sharedEyeMat = new THREE.MeshBasicMaterial({
      color: 0xff3b30,
    });

    // Spawn zombies
    spawnPositions.forEach((pos, idx) => {
      this.spawnZombie(`zombie_${idx}`, pos);
    });
  }

  private createZombieMesh(): { group: THREE.Group; parts: Record<string, THREE.Object3D> } {
    const root = new THREE.Group();
    const parts: Record<string, THREE.Object3D> = {};

    // 1. Pelvis / Lower Torso
    const hipsGeo = new THREE.BoxGeometry(0.5, 0.3, 0.3);
    const hips = new THREE.Mesh(hipsGeo, this.sharedPantsMat);
    hips.position.y = 0.9;
    root.add(hips);
    parts.hips = hips;

    // 2. Chest / Torso
    const spineGroup = new THREE.Group();
    spineGroup.position.set(0, 1.05, 0);
    spineGroup.rotation.x = 0.15;

    const torsoGeo = new THREE.BoxGeometry(0.58, 0.65, 0.36);
    const torso = new THREE.Mesh(torsoGeo, this.sharedClothesMat);
    torso.position.y = 0.32;
    torso.castShadow = true;
    spineGroup.add(torso);
    root.add(spineGroup);
    parts.spine = spineGroup;

    // 3. Head & Neck
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.72, 0.05);

    const headGeo = new THREE.BoxGeometry(0.38, 0.42, 0.4);
    const head = new THREE.Mesh(headGeo, this.sharedSkinMat);
    head.castShadow = true;
    headGroup.add(head);

    const eyeGeo = new THREE.SphereGeometry(0.04, 6, 6);
    const eyeL = new THREE.Mesh(eyeGeo, this.sharedEyeMat);
    eyeL.position.set(-0.11, 0.05, 0.2);
    const eyeR = new THREE.Mesh(eyeGeo, this.sharedEyeMat);
    eyeR.position.set(0.11, 0.05, 0.2);
    headGroup.add(eyeL);
    headGroup.add(eyeR);

    const jawGeo = new THREE.BoxGeometry(0.24, 0.12, 0.22);
    const jaw = new THREE.Mesh(jawGeo, this.sharedSkinMat);
    jaw.position.set(0, -0.2, 0.06);
    headGroup.add(jaw);

    spineGroup.add(headGroup);
    parts.head = headGroup;

    // 4. Arms
    const armL = new THREE.Group();
    armL.position.set(-0.36, 0.55, 0);
    const upperArmGeo = new THREE.BoxGeometry(0.18, 0.45, 0.18);
    const uArmL = new THREE.Mesh(upperArmGeo, this.sharedClothesMat);
    uArmL.position.y = -0.22;
    armL.add(uArmL);

    const forearmL = new THREE.Group();
    forearmL.position.set(0, -0.42, 0);
    const foreGeo = new THREE.BoxGeometry(0.15, 0.45, 0.15);
    const fArmL = new THREE.Mesh(foreGeo, this.sharedSkinMat);
    fArmL.position.y = -0.22;
    forearmL.add(fArmL);
    armL.add(forearmL);

    armL.rotation.x = -1.2;
    armL.rotation.z = 0.2;
    spineGroup.add(armL);
    parts.armL = armL;

    const armR = new THREE.Group();
    armR.position.set(0.36, 0.55, 0);
    const uArmR = new THREE.Mesh(upperArmGeo, this.sharedClothesMat);
    uArmR.position.y = -0.22;
    armR.add(uArmR);

    const forearmR = new THREE.Group();
    forearmR.position.set(0, -0.42, 0);
    const fArmR = new THREE.Mesh(foreGeo, this.sharedSkinMat);
    fArmR.position.y = -0.22;
    forearmR.add(fArmR);
    armR.add(forearmR);

    armR.rotation.x = -1.1;
    armR.rotation.z = -0.15;
    spineGroup.add(armR);
    parts.armR = armR;

    // 5. Legs
    const legGeo = new THREE.BoxGeometry(0.2, 0.85, 0.22);

    const legL = new THREE.Group();
    legL.position.set(-0.16, 0.85, 0);
    const lMesh = new THREE.Mesh(legGeo, this.sharedPantsMat);
    lMesh.position.y = -0.42;
    lMesh.castShadow = true;
    legL.add(lMesh);
    root.add(legL);
    parts.legL = legL;

    const legR = new THREE.Group();
    legR.position.set(0.16, 0.85, 0);
    const rMesh = new THREE.Mesh(legGeo, this.sharedPantsMat);
    rMesh.position.y = -0.42;
    rMesh.castShadow = true;
    legR.add(rMesh);
    root.add(legR);
    parts.legR = legR;

    return { group: root, parts };
  }

  private spawnZombie(id: string, pos: THREE.Vector3) {
    const { group, parts } = this.createZombieMesh();
    group.position.copy(pos);
    this.group.add(group);

    this.zombies.push({
      id,
      health: 80,
      maxHealth: 80,
      position: [pos.x, pos.y, pos.z],
      rotationY: Math.random() * Math.PI * 2,
      state: 'patrol',
      speed: 1.8 + Math.random() * 0.8,
      attackCooldown: 0,
      stateTimer: Math.random() * 4,
      targetPos: [pos.x + (Math.random() - 0.5) * 15, pos.y, pos.z + (Math.random() - 0.5) * 15],
      animPhase: Math.random() * 10,
      moanTimer: 1.5 + Math.random() * 4.0,
      shuffleTimer: 0.2 + Math.random() * 0.4,
      pitchVariation: 0.85 + Math.random() * 0.35,
      meshGroup: { group, parts },
    });
  }

  // Gunfire Noise Alert (attracts all zombies within radius)
  public alertZombiesInRadius(sourcePos: THREE.Vector3, radius: number = 42) {
    const radiusSq = radius * radius;
    for (const z of this.zombies) {
      if (z.state === 'dead') continue;
      const dx = z.position[0] - sourcePos.x;
      const dz = z.position[2] - sourcePos.z;
      const distSq = dx * dx + dz * dz;

      if (distSq <= radiusSq) {
        z.state = 'chase';
        z.targetPos = [sourcePos.x, 0, sourcePos.z];
        const dist = Math.sqrt(distSq);
        sound.playSpatialZombieMoan(
          { x: z.position[0], y: z.position[1], z: z.position[2] },
          dist,
          z.pitchVariation,
          true
        );
      }
    }
  }

  // Raycast Hit Detection for Firearms
  public hitZombieWithBullet(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxRange: number = 55
  ): { hit: boolean; isDead: boolean; isHeadshot: boolean; hitPoint?: THREE.Vector3 } {
    let closestZombie: ZombieData | null = null;
    let closestDist = maxRange;
    let isHeadshot = false;

    // Cylinder/Capsule Raycast approximation
    for (const z of this.zombies) {
      if (z.state === 'dead') continue;

      const zPos = new THREE.Vector3(z.position[0], z.position[1], z.position[2]);
      const toZombie = zPos.clone().sub(origin);
      const proj = toZombie.dot(direction);

      if (proj > 0 && proj < closestDist) {
        // Point along ray closest to zombie's vertical axis
        const pointOnRay = origin.clone().add(direction.clone().multiplyScalar(proj));
        const horizontalDist = new THREE.Vector2(pointOnRay.x - zPos.x, pointOnRay.z - zPos.z).length();

        // Hit within radius 0.55m
        if (horizontalDist < 0.55 && pointOnRay.y >= 0 && pointOnRay.y <= 2.1) {
          closestDist = proj;
          closestZombie = z;
          isHeadshot = pointOnRay.y >= 1.45; // Head area
        }
      }
    }

    if (closestZombie) {
      const damage = isHeadshot ? 90 : 45;
      closestZombie.health -= damage;
      closestZombie.state = 'stagger';
      closestZombie.stateTimer = 0.3;

      sound.playHitZombie();

      const hitPoint = origin.clone().add(direction.clone().multiplyScalar(closestDist));
      this.spawnBloodPuff(hitPoint);

      let isDead = false;
      if (closestZombie.health <= 0) {
        closestZombie.health = 0;
        closestZombie.state = 'dead';
        isDead = true;
        sound.playZombieGroan(0.7);
      }

      return { hit: true, isDead, isHeadshot, hitPoint };
    }

    return { hit: false, isDead: false, isHeadshot: false };
  }

  private spawnBloodPuff(pos: THREE.Vector3) {
    const geo = new THREE.DodecahedronGeometry(0.08, 0);
    const mat = new THREE.MeshBasicMaterial({ color: 0x8b0000 });
    for (let i = 0; i < 4; i++) {
      const p = new THREE.Mesh(geo, mat);
      p.position.copy(pos);
      this.group.add(p);
      this.bloodParticles.push({
        mesh: p,
        life: 0.35,
        maxLife: 0.35,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 3,
          Math.random() * 2 + 1,
          (Math.random() - 0.5) * 3
        ),
      });
    }
  }

  // Line of sight check to prevent zombies attacking or tracking through solid walls
  private hasLineOfSight(posA: THREE.Vector3, posB: THREE.Vector3, colliders: BoxCollider[]): boolean {
    const minX = Math.min(posA.x, posB.x);
    const maxX = Math.max(posA.x, posB.x);
    const minZ = Math.min(posA.z, posB.z);
    const maxZ = Math.max(posA.z, posB.z);

    for (const box of colliders) {
      // If box is between them and large enough to be a building wall
      if (
        box.maxX - box.minX > 1.5 &&
        box.maxZ - box.minZ > 1.5 &&
        box.maxX > minX &&
        box.minX < maxX &&
        box.maxZ > minZ &&
        box.minZ < maxZ
      ) {
        // Quick 2D ray vs AABB test
        const intersects = this.lineIntersectsBox(posA.x, posA.z, posB.x, posB.z, box);
        if (intersects) return false;
      }
    }
    return true;
  }

  private lineIntersectsBox(x1: number, z1: number, x2: number, z2: number, b: BoxCollider): boolean {
    // Liang-Barsky line clipping
    let t0 = 0;
    let t1 = 1;
    const dx = x2 - x1;
    const dz = z2 - z1;

    const p = [-dx, dx, -dz, dz];
    const q = [x1 - b.minX, b.maxX - x1, z1 - b.minZ, b.maxZ - z1];

    for (let i = 0; i < 4; i++) {
      if (p[i] === 0) {
        if (q[i] < 0) return false;
      } else {
        const r = q[i] / p[i];
        if (p[i] < 0) {
          if (r > t1) return false;
          if (r > t0) t0 = r;
        } else {
          if (r < t0) return false;
          if (r < t1) t1 = r;
        }
      }
    }
    return t0 <= t1;
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    isPlayerSprinting: boolean,
    isFlashlightOn: boolean,
    isNight: boolean,
    colliders: BoxCollider[],
    onPlayerDamage: (damage: number) => void
  ) {
    // Update blood particles
    for (let i = this.bloodParticles.length - 1; i >= 0; i--) {
      const p = this.bloodParticles[i];
      p.life -= dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.vel.y -= 9.8 * dt;
      const scale = Math.max(0.01, p.life / p.maxLife);
      p.mesh.scale.set(scale, scale, scale);

      if (p.life <= 0) {
        this.group.remove(p.mesh);
        this.bloodParticles.splice(i, 1);
      }
    }

    for (const z of this.zombies) {
      if (z.state === 'dead') {
        if (z.meshGroup) {
          const g = z.meshGroup.group as THREE.Group;
          if (g.rotation.x > -Math.PI / 2 + 0.1) {
            g.rotation.x -= dt * 4;
            g.position.y = Math.max(0.2, g.position.y - dt * 2);
          }
        }
        continue;
      }

      z.stateTimer -= dt;
      z.animPhase += dt * (z.state === 'chase' ? 7.5 : 3.5);
      if (z.attackCooldown > 0) z.attackCooldown -= dt;

      const dx = playerPos.x - z.position[0];
      const dz = playerPos.z - z.position[2];
      const distToPlayer = Math.sqrt(dx * dx + dz * dz);

      // Night multiplier: zombies are more active and alert in the dark!
      const nightMultiplier = isNight ? 1.35 : 1.0;
      const baseRange = isFlashlightOn ? 28 : (isPlayerSprinting ? 20 : 12);
      const detectionRange = baseRange * nightMultiplier;

      const zVec = new THREE.Vector3(z.position[0], 1.2, z.position[2]);
      const hasLOS = distToPlayer < 4 || this.hasLineOfSight(zVec, playerPos, colliders);

      // AI State Transitions
      if (
        distToPlayer <= detectionRange &&
        hasLOS &&
        z.state !== 'chase' &&
        z.state !== 'attack' &&
        z.state !== 'stagger'
      ) {
        z.state = 'chase';
        sound.playSpatialZombieMoan(
          { x: z.position[0], y: z.position[1], z: z.position[2] },
          distToPlayer,
          z.pitchVariation,
          true
        );
      }

      if (z.state === 'chase' && distToPlayer > (isNight ? 42 : 36)) {
        z.state = 'patrol';
        z.stateTimer = 5;
      }

      // Proximity-based Spatial Audio: Distinct Moans & Groans
      z.moanTimer -= dt;
      if (z.moanTimer <= 0) {
        const isAggro = z.state === 'chase' || z.state === 'attack';
        sound.playSpatialZombieMoan(
          { x: z.position[0], y: z.position[1], z: z.position[2] },
          distToPlayer,
          z.pitchVariation,
          isAggro
        );

        // Interval scales dynamically with distance to player:
        // Close range (< 6m): Intense, frequent guttural breathing & snarls (1.6s - 3.2s)
        // Mid range (6m - 16m): Alert moans echoing through streets (3.2s - 5.7s)
        // Far range (16m - 32m): Distant eerie groans (6.5s - 11.5s)
        if (distToPlayer < 6) {
          z.moanTimer = 1.6 + Math.random() * 1.6;
        } else if (distToPlayer < 16) {
          z.moanTimer = 3.2 + Math.random() * 2.5;
        } else {
          z.moanTimer = 6.5 + Math.random() * 5.0;
        }
      }

      // Attack proximity (must have line of sight to attack!)
      if (distToPlayer < 1.75 && z.state === 'chase' && hasLOS) {
        z.state = 'attack';
        z.stateTimer = 0.55;
      }

      let moveSpeed = 0;
      let targetX = z.targetPos[0];
      let targetZ = z.targetPos[2];

      if (z.state === 'patrol') {
        moveSpeed = 1.0;
        if (z.stateTimer <= 0) {
          z.targetPos = [
            z.position[0] + (Math.random() - 0.5) * 16,
            0,
            z.position[2] + (Math.random() - 0.5) * 16,
          ];
          z.stateTimer = 3 + Math.random() * 4;
        }
      } else if (z.state === 'chase') {
        moveSpeed = z.speed * (isNight ? 1.15 : 1.0);
        targetX = playerPos.x;
        targetZ = playerPos.z;
      } else if (z.state === 'attack') {
        moveSpeed = 0.35;
        targetX = playerPos.x;
        targetZ = playerPos.z;

        if (z.stateTimer <= 0) {
          if (distToPlayer < 1.95 && z.attackCooldown <= 0 && hasLOS) {
            sound.playPlayerDamage();
            onPlayerDamage(18);
            z.attackCooldown = 1.25;
          }
          z.state = 'chase';
        }
      } else if (z.state === 'stagger') {
        moveSpeed = -1.6; // Knocked back from bullet/pipe impact
        targetX = playerPos.x;
        targetZ = playerPos.z;
        if (z.stateTimer <= 0) {
          z.state = 'chase';
        }
      }

      // Proximity-based Spatial Audio: Shuffling gait & dragging footsteps
      if (moveSpeed > 0 && distToPlayer < 24) {
        z.shuffleTimer -= dt;
        if (z.shuffleTimer <= 0) {
          sound.playSpatialZombieShuffle(
            { x: z.position[0], y: z.position[1], z: z.position[2] },
            distToPlayer
          );
          z.shuffleTimer = z.state === 'chase'
            ? (0.32 + Math.random() * 0.12)
            : (0.58 + Math.random() * 0.22);
        }
      }

      // Movement & Steering
      if (moveSpeed !== 0) {
        const toTargetX = targetX - z.position[0];
        const toTargetZ = targetZ - z.position[2];
        const toTargetDist = Math.sqrt(toTargetX * toTargetX + toTargetZ * toTargetZ);

        if (toTargetDist > 0.1) {
          const dirX = toTargetX / toTargetDist;
          const dirZ = toTargetZ / toTargetDist;

          const targetAngle = Math.atan2(dirX, dirZ);
          let diff = targetAngle - z.rotationY;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          z.rotationY += diff * Math.min(1, dt * 5.5);

          const nextX = z.position[0] + Math.sin(z.rotationY) * moveSpeed * dt;
          const nextZ = z.position[2] + Math.cos(z.rotationY) * moveSpeed * dt;

          let canMoveX = true;
          let canMoveZ = true;
          const zRadius = 0.45;

          for (const box of colliders) {
            if (
              nextX + zRadius > box.minX &&
              nextX - zRadius < box.maxX &&
              z.position[2] + zRadius > box.minZ &&
              z.position[2] - zRadius < box.maxZ
            ) {
              canMoveX = false;
            }
            if (
              z.position[0] + zRadius > box.minX &&
              z.position[0] - zRadius < box.maxX &&
              nextZ + zRadius > box.minZ &&
              nextZ - zRadius < box.maxZ
            ) {
              canMoveZ = false;
            }
          }

          if (canMoveX) z.position[0] = nextX;
          if (canMoveZ) z.position[2] = nextZ;
        }
      }

      // Procedural Shambling Animation
      if (z.meshGroup) {
        const g = z.meshGroup.group as THREE.Group;
        const p = z.meshGroup.parts;

        g.position.set(z.position[0], z.position[1], z.position[2]);
        g.rotation.y = z.rotationY;

        const walkSwing = Math.sin(z.animPhase);
        if (p.legL) p.legL.rotation.x = walkSwing * 0.45;
        if (p.legR) p.legR.rotation.x = -walkSwing * 0.45;

        if (p.spine) {
          p.spine.rotation.z = Math.sin(z.animPhase * 0.5) * 0.08;
          p.spine.rotation.x = 0.2 + (z.state === 'chase' ? 0.15 : 0) + (z.state === 'stagger' ? -0.3 : 0);
        }

        if (p.armL && p.armR) {
          if (z.state === 'attack') {
            p.armL.rotation.x = -1.8 + Math.sin(z.animPhase * 2) * 0.6;
            p.armR.rotation.x = -1.8 - Math.sin(z.animPhase * 2) * 0.6;
          } else {
            p.armL.rotation.x = -1.2 + Math.cos(z.animPhase) * 0.25;
            p.armR.rotation.x = -1.2 - Math.cos(z.animPhase) * 0.25;
          }
        }

        if (p.head) {
          p.head.rotation.y = Math.sin(z.animPhase * 0.3) * 0.2;
          p.head.rotation.z = Math.cos(z.animPhase * 0.4) * 0.1;
        }
      }
    }
  }

  public hitZombieInFront(
    playerPos: THREE.Vector3,
    lookDir: THREE.Vector3,
    reachDist: number = 2.4,
    damage: number = 35
  ): boolean {
    let hitAny = false;

    for (const z of this.zombies) {
      if (z.state === 'dead') continue;

      const toZombie = new THREE.Vector3(
        z.position[0] - playerPos.x,
        0,
        z.position[2] - playerPos.z
      );
      const dist = toZombie.length();

      if (dist < reachDist) {
        toZombie.normalize();
        const dot = lookDir.dot(toZombie);

        if (dot > 0.45) {
          z.health -= damage;
          z.state = 'stagger';
          z.stateTimer = 0.35;
          sound.playHitZombie();
          this.spawnBloodPuff(new THREE.Vector3(z.position[0], 1.2, z.position[2]));
          hitAny = true;

          if (z.health <= 0) {
            z.state = 'dead';
            z.health = 0;
            sound.playZombieGroan(0.7);
          }
          break;
        }
      }
    }

    return hitAny;
  }

  public reset(spawnPositions: THREE.Vector3[]) {
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
    this.bloodParticles = [];
    this.zombies = [];
    spawnPositions.forEach((pos, idx) => {
      this.spawnZombie(`zombie_${idx}`, pos);
    });
  }

  public dispose() {
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
    this.bloodParticles = [];
    this.sharedSkinMat.dispose();
    this.sharedClothesMat.dispose();
    this.sharedPantsMat.dispose();
    this.sharedEyeMat.dispose();
  }
}
