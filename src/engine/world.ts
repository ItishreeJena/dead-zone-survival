import * as THREE from 'three';
import { BoxCollider, ItemType, ShelterBed } from '../types/game';
import { getTerrainHeight, getWorldSurfaceHeight, createOpenWorldTerrainMesh } from './terrain';
import {
  createAsphaltTexture,
  createBrickWallTexture,
  createConcreteTexture,
  createRustedMetalTexture,
  createWoodPlankTexture,
  createHazardTexture,
} from './textures';

export interface WorldBuildResult {
  sceneGroup: THREE.Group;
  colliders: BoxCollider[];
  streetlights: THREE.PointLight[];
  windObjects: THREE.Object3D[];
  shelters: ShelterBed[];
  stashLocation: THREE.Vector3;
  vehicleSpawn: { pos: THREE.Vector3; rotationY: number };
  fuelLocation: THREE.Vector3;
  spawnPoints: {
    player: THREE.Vector3;
    supplies: { pos: THREE.Vector3; type: ItemType }[];
    zombies: THREE.Vector3[];
  };
}

export function buildPostApocalypticTown(): WorldBuildResult {
  const sceneGroup = new THREE.Group();
  const colliders: BoxCollider[] = [];
  const streetlights: THREE.PointLight[] = [];
  const windObjects: THREE.Object3D[] = [];

  // 1. Reusable PBR Materials
  const asphaltTex = createAsphaltTexture();
  asphaltTex.repeat.set(2, 40);
  const roadMat = new THREE.MeshStandardMaterial({
    map: asphaltTex,
    roughness: 0.85,
    metalness: 0.1,
  });

  const brickTex = createBrickWallTexture();
  brickTex.repeat.set(3, 2);
  const brickMat = new THREE.MeshStandardMaterial({
    map: brickTex,
    roughness: 0.9,
    metalness: 0.05,
  });

  const concreteTex = createConcreteTexture();
  concreteTex.repeat.set(4, 4);
  const concreteMat = new THREE.MeshStandardMaterial({
    map: concreteTex,
    roughness: 0.8,
    metalness: 0.1,
  });

  const rustTex = createRustedMetalTexture();
  const rustMat = new THREE.MeshStandardMaterial({
    map: rustTex,
    roughness: 0.65,
    metalness: 0.5,
  });

  const woodTex = createWoodPlankTexture();
  woodTex.repeat.set(2, 2);
  const woodMat = new THREE.MeshStandardMaterial({
    map: woodTex,
    roughness: 0.85,
    metalness: 0.05,
  });

  const hazardTex = createHazardTexture();
  const hazardMat = new THREE.MeshStandardMaterial({
    map: hazardTex,
    roughness: 0.7,
  });

  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1a1c1e,
    roughness: 0.45,
    metalness: 0.8,
  });

  const pineNeedleMat = new THREE.MeshStandardMaterial({
    color: 0x1f3322,
    roughness: 0.9,
    flatShading: true,
  });

  const shrubMat = new THREE.MeshStandardMaterial({
    color: 0x3d4a2d,
    roughness: 0.95,
    flatShading: true,
  });

  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x484b47,
    roughness: 0.95,
    flatShading: true,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x5a707a,
    roughness: 0.2,
    metalness: 0.1,
    transmission: 0.65,
    transparent: true,
    opacity: 0.7,
  });

  const tarpMat = new THREE.MeshStandardMaterial({
    color: 0x3b6648,
    roughness: 0.8,
  });

  // 2. Vast Continuous 360m x 360m Open-World Terrain Mesh
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x242820,
    roughness: 0.95,
    metalness: 0.05,
  });
  const terrainMesh = createOpenWorldTerrainMesh(groundMat);
  sceneGroup.add(terrainMesh);

  // 3. Continuous Paved Road Network (Connecting All 6 Regions)
  function createPavedRoadSegment(x1: number, z1: number, x2: number, z2: number, width: number) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const length = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dx, dz);
    const midX = (x1 + x2) / 2;
    const midZ = (z1 + z2) / 2;
    const groundY = getTerrainHeight(midX, midZ);

    const roadGeo = new THREE.PlaneGeometry(width, length);
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.rotation.z = -angle;
    road.position.set(midX, groundY + 0.03, midZ);
    road.receiveShadow = true;
    sceneGroup.add(road);
  }

  // A. Main Downtown North-South Avenue (11m wide, from -125 to 110)
  createPavedRoadSegment(0, -120, 0, 110, 11);
  // B. Main East-West Highway (10m wide, from -135 to 140)
  createPavedRoadSegment(-135, 0, 140, 0, 10);
  // C. South Suburbia Access Boulevard
  createPavedRoadSegment(-35, 70, 35, 70, 9);
  // D. North Field Hospital Loop
  createPavedRoadSegment(-30, -90, 30, -90, 9);
  // E. East Warehouse Industrial Spur
  createPavedRoadSegment(65, 0, 125, 70, 9);
  // F. North-West Boulevard connecting Downtown to Ruined City
  createPavedRoadSegment(0, -30, -80, -75, 11);
  // G. Ruined City North-South Avenue
  createPavedRoadSegment(-80, -45, -80, -115, 11);
  // H. Ruined City Cross Street
  createPavedRoadSegment(-115, -75, -45, -75, 10);

  // Sidewalks in Downtown Core
  function createSidewalk(x: number, z: number, w: number, l: number) {
    const gy = getTerrainHeight(x, z);
    const swGeo = new THREE.BoxGeometry(w, 0.16, l);
    const swMesh = new THREE.Mesh(swGeo, concreteMat);
    swMesh.position.set(x, gy + 0.08, z);
    swMesh.receiveShadow = true;
    sceneGroup.add(swMesh);
  }

  createSidewalk(-9, -24, 5, 42);
  createSidewalk(9, -24, 5, 42);
  createSidewalk(-9, 24, 5, 42);
  createSidewalk(9, 24, 5, 42);
  createSidewalk(-24, -8, 26, 4.5);
  createSidewalk(24, -8, 26, 4.5);
  createSidewalk(-24, 8, 26, 4.5);
  createSidewalk(24, 8, 26, 4.5);

  // -------------------------------------------------------------
  // SECTOR 1: DOWNTOWN CORE (Crossroads, Pharmacy, Police Station)
  // -------------------------------------------------------------
  // A. Ruined Pharmacy & Grocery (North-East Downtown: X: 22, Z: -24)
  function createPharmacyBuilding(cx: number, cz: number) {
    const gy = getTerrainHeight(cx, cz);
    const bGroup = new THREE.Group();
    bGroup.position.set(cx, gy, cz);

    const w = 15;
    const h = 5.6;
    const d = 15;
    const wallThick = 0.5;

    // Foundation & Floor
    const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, d), concreteMat);
    floor.position.set(0, 0.15, 0);
    floor.receiveShadow = true;
    bGroup.add(floor);

    // Front wall with open double doorway
    const doorW = 2.8;
    const segW = (w - doorW) / 2;
    const leftW = new THREE.Mesh(new THREE.BoxGeometry(segW, h, wallThick), brickMat);
    leftW.position.set(-w / 2 + segW / 2, h / 2, d / 2);
    leftW.castShadow = true;
    bGroup.add(leftW);

    const rightW = new THREE.Mesh(new THREE.BoxGeometry(segW, h, wallThick), brickMat);
    rightW.position.set(w / 2 - segW / 2, h / 2, d / 2);
    rightW.castShadow = true;
    bGroup.add(rightW);

    const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorW, h - 3.0, wallThick), brickMat);
    lintel.position.set(0, 3.0 + (h - 3.0) / 2, d / 2);
    bGroup.add(lintel);

    // Back & Side walls
    const back = new THREE.Mesh(new THREE.BoxGeometry(w, h, wallThick), brickMat);
    back.position.set(0, h / 2, -d / 2);
    back.castShadow = true;
    bGroup.add(back);

    const left = new THREE.Mesh(new THREE.BoxGeometry(wallThick, h, d), brickMat);
    left.position.set(-w / 2, h / 2, 0);
    left.castShadow = true;
    bGroup.add(left);

    const right = new THREE.Mesh(new THREE.BoxGeometry(wallThick, h, d), brickMat);
    right.position.set(w / 2, h / 2, 0);
    right.castShadow = true;
    bGroup.add(right);

    // Interior Scavenge Counter & Shelves
    const counter = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.1, 0.8), woodMat);
    counter.position.set(0, 0.55, -1);
    bGroup.add(counter);

    // Ruined partial roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.75, 0.25, d * 0.75), concreteMat);
    roof.position.set(-w * 0.1, h, -d * 0.1);
    bGroup.add(roof);

    sceneGroup.add(bGroup);

    colliders.push({ minX: cx - w / 2, maxX: cx - doorW / 2, minZ: cz + d / 2 - 0.3, maxZ: cz + d / 2 + 0.3 });
    colliders.push({ minX: cx + doorW / 2, maxX: cx + w / 2, minZ: cz + d / 2 - 0.3, maxZ: cz + d / 2 + 0.3 });
    colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2 - 0.3, maxZ: cz - d / 2 + 0.3 });
    colliders.push({ minX: cx - w / 2 - 0.3, maxX: cx - w / 2 + 0.3, minZ: cz - d / 2, maxZ: cz + d / 2 });
    colliders.push({ minX: cx + w / 2 - 0.3, maxX: cx + w / 2 + 0.3, minZ: cz - d / 2, maxZ: cz + d / 2 });
    colliders.push({ minX: cx - 2.3, maxX: cx + 2.3, minZ: cz - 1.4, maxZ: cz - 0.6 });
  }

  createPharmacyBuilding(22, -24);

  // B. Police Armory Station (North-West Downtown: X: -22, Z: -24)
  function createPoliceArmory(cx: number, cz: number) {
    const gy = getTerrainHeight(cx, cz);
    const bGroup = new THREE.Group();
    bGroup.position.set(cx, gy, cz);

    const w = 16;
    const h = 6.8;
    const d = 16;
    const wallThick = 0.5;

    const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, d), concreteMat);
    floor.position.set(0, 0.15, 0);
    bGroup.add(floor);

    const doorW = 3.0;
    const segW = (w - doorW) / 2;
    const leftW = new THREE.Mesh(new THREE.BoxGeometry(segW, h, wallThick), brickMat);
    leftW.position.set(-w / 2 + segW / 2, h / 2, d / 2);
    leftW.castShadow = true;
    bGroup.add(leftW);

    const rightW = new THREE.Mesh(new THREE.BoxGeometry(segW, h, wallThick), brickMat);
    rightW.position.set(w / 2 - segW / 2, h / 2, d / 2);
    rightW.castShadow = true;
    bGroup.add(rightW);

    const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorW, h - 3.2, wallThick), brickMat);
    lintel.position.set(0, 3.2 + (h - 3.2) / 2, d / 2);
    bGroup.add(lintel);

    const back = new THREE.Mesh(new THREE.BoxGeometry(w, h, wallThick), brickMat);
    back.position.set(0, h / 2, -d / 2);
    back.castShadow = true;
    bGroup.add(back);

    const left = new THREE.Mesh(new THREE.BoxGeometry(wallThick, h, d), brickMat);
    left.position.set(-w / 2, h / 2, 0);
    bGroup.add(left);

    const right = new THREE.Mesh(new THREE.BoxGeometry(wallThick, h, d), brickMat);
    right.position.set(w / 2, h / 2, 0);
    bGroup.add(right);

    // Front Pillars
    for (const px of [-3.5, 3.5]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, h, 10), concreteMat);
      col.position.set(px, h / 2, d / 2 + 1.2);
      col.castShadow = true;
      bGroup.add(col);
      colliders.push({ minX: cx + px - 0.4, maxX: cx + px + 0.4, minZ: cz + d / 2 + 0.8, maxZ: cz + d / 2 + 1.6 });
    }

    // Armory Gun Locker Rack inside
    const locker = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.2, 0.6), darkMetalMat);
    locker.position.set(-w / 2 + 2.2, 1.1, -d / 2 + 1.2);
    bGroup.add(locker);

    sceneGroup.add(bGroup);

    colliders.push({ minX: cx - w / 2, maxX: cx - doorW / 2, minZ: cz + d / 2 - 0.3, maxZ: cz + d / 2 + 0.3 });
    colliders.push({ minX: cx + doorW / 2, maxX: cx + w / 2, minZ: cz + d / 2 - 0.3, maxZ: cz + d / 2 + 0.3 });
    colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2 - 0.3, maxZ: cz - d / 2 + 0.3 });
    colliders.push({ minX: cx - w / 2 - 0.3, maxX: cx - w / 2 + 0.3, minZ: cz - d / 2, maxZ: cz + d / 2 });
    colliders.push({ minX: cx + w / 2 - 0.3, maxX: cx + w / 2 + 0.3, minZ: cz - d / 2, maxZ: cz + d / 2 });
  }

  createPoliceArmory(-22, -24);

  // -------------------------------------------------------------
  // SECTOR 2: SUBURBAN RESIDENTIAL DISTRICT (South: Z: 50 to 95)
  // -------------------------------------------------------------
  function createSuburbanHouse(cx: number, cz: number, rotY: number = 0) {
    const gy = getTerrainHeight(cx, cz);
    const hGroup = new THREE.Group();
    hGroup.position.set(cx, gy, cz);
    hGroup.rotation.y = rotY;

    const w = 13;
    const h = 5.2;
    const d = 13;
    const wallThick = 0.4;

    // Interior Floor
    const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.25, d), woodMat);
    floor.position.set(0, 0.125, 0);
    floor.receiveShadow = true;
    hGroup.add(floor);

    // Front Porch
    const porch = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, 3), woodMat);
    porch.position.set(0, 0.1, d / 2 + 1.5);
    porch.receiveShadow = true;
    hGroup.add(porch);

    const doorW = 2.2;
    const segW = (w - doorW) / 2;
    const leftW = new THREE.Mesh(new THREE.BoxGeometry(segW, h, wallThick), woodMat);
    leftW.position.set(-w / 2 + segW / 2, h / 2, d / 2);
    leftW.castShadow = true;
    hGroup.add(leftW);

    const rightW = new THREE.Mesh(new THREE.BoxGeometry(segW, h, wallThick), woodMat);
    rightW.position.set(w / 2 - segW / 2, h / 2, d / 2);
    rightW.castShadow = true;
    hGroup.add(rightW);

    const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorW, h - 2.8, wallThick), woodMat);
    lintel.position.set(0, 2.8 + (h - 2.8) / 2, d / 2);
    hGroup.add(lintel);

    const backW = new THREE.Mesh(new THREE.BoxGeometry(w, h, wallThick), woodMat);
    backW.position.set(0, h / 2, -d / 2);
    backW.castShadow = true;
    hGroup.add(backW);

    const sideL = new THREE.Mesh(new THREE.BoxGeometry(wallThick, h, d), woodMat);
    sideL.position.set(-w / 2, h / 2, 0);
    sideL.castShadow = true;
    hGroup.add(sideL);

    const sideR = new THREE.Mesh(new THREE.BoxGeometry(wallThick, h, d), woodMat);
    sideR.position.set(w / 2, h / 2, 0);
    sideR.castShadow = true;
    hGroup.add(sideR);

    // Gabled Roof
    const roof1 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.58, 0.22, d + 1), woodMat);
    roof1.position.set(-w * 0.25, h + 1.2, 0);
    roof1.rotation.z = 0.4;
    hGroup.add(roof1);

    const roof2 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.58, 0.22, d + 1), woodMat);
    roof2.position.set(w * 0.25, h + 1.2, 0);
    roof2.rotation.z = -0.4;
    hGroup.add(roof2);

    // Enterable Living Room & Kitchen Furniture
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.85, 1.4), woodMat);
    table.position.set(-2.6, 0.425, 1.2);
    hGroup.add(table);

    const couch = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.8, 1.1), tarpMat);
    couch.position.set(2.8, 0.4, 1.2);
    hGroup.add(couch);

    const kitchen = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.0, 0.85), concreteMat);
    kitchen.position.set(-1.8, 0.5, -4.8);
    hGroup.add(kitchen);

    // Warm living room interior lamp
    const roomLight = new THREE.PointLight(0xffdfb0, 0.75, 12, 2);
    roomLight.position.set(0, h - 0.8, 0);
    hGroup.add(roomLight);

    sceneGroup.add(hGroup);

    // Colliders leaving front doorway open
    colliders.push({ minX: cx - w / 2, maxX: cx - doorW / 2, minZ: cz + d / 2 - 0.25, maxZ: cz + d / 2 + 0.25 });
    colliders.push({ minX: cx + doorW / 2, maxX: cx + w / 2, minZ: cz + d / 2 - 0.25, maxZ: cz + d / 2 + 0.25 });
    colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2 - 0.25, maxZ: cz - d / 2 + 0.25 });
    colliders.push({ minX: cx - w / 2 - 0.25, maxX: cx - w / 2 + 0.25, minZ: cz - d / 2, maxZ: cz + d / 2 });
    colliders.push({ minX: cx + w / 2 - 0.25, maxX: cx + w / 2 + 0.25, minZ: cz - d / 2, maxZ: cz + d / 2 });
    colliders.push({ minX: cx - 4.0, maxX: cx - 1.2, minZ: cz + 0.3, maxZ: cz + 2.1 }); // table
    colliders.push({ minX: cx + 1.3, maxX: cx + 4.2, minZ: cz + 0.4, maxZ: cz + 2.0 }); // couch
  }

  createSuburbanHouse(-24, 75);
  createSuburbanHouse(24, 75);
  createSuburbanHouse(-24, 30);
  createSuburbanHouse(24, 30);

  // -------------------------------------------------------------
  // SECTOR 3: HIGHWAY GAS STATION & DINER (East Highway: X: 80 to 110)
  // -------------------------------------------------------------
  function createHighwayGasStation(cx: number, cz: number) {
    const gy = getTerrainHeight(cx, cz);
    const gsGroup = new THREE.Group();
    gsGroup.position.set(cx, gy, cz);

    // 1. Enterable Convenience Store
    const storeW = 14;
    const storeH = 4.8;
    const storeD = 11;
    const wallThick = 0.4;
    const storeCenterZ = -6;

    // Floor
    const floor = new THREE.Mesh(new THREE.BoxGeometry(storeW, 0.25, storeD), concreteMat);
    floor.position.set(0, 0.125, storeCenterZ);
    floor.receiveShadow = true;
    gsGroup.add(floor);

    // Front Wall with open double doorway (doorW: 2.8)
    const doorW = 2.8;
    const segW = (storeW - doorW) / 2;
    const frontZ = storeCenterZ + storeD / 2;

    const frontL = new THREE.Mesh(new THREE.BoxGeometry(segW, storeH, wallThick), brickMat);
    frontL.position.set(-storeW / 2 + segW / 2, storeH / 2, frontZ);
    frontL.castShadow = true;
    gsGroup.add(frontL);

    const frontR = new THREE.Mesh(new THREE.BoxGeometry(segW, storeH, wallThick), brickMat);
    frontR.position.set(storeW / 2 - segW / 2, storeH / 2, frontZ);
    frontR.castShadow = true;
    gsGroup.add(frontR);

    const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorW, storeH - 3.0, wallThick), brickMat);
    lintel.position.set(0, 3.0 + (storeH - 3.0) / 2, frontZ);
    gsGroup.add(lintel);

    // Windows
    const winL = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.8), glassMat);
    winL.position.set(-3.5, 2.2, frontZ + 0.21);
    gsGroup.add(winL);
    const winR = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.8), glassMat);
    winR.position.set(3.5, 2.2, frontZ + 0.21);
    gsGroup.add(winR);

    // Back & Side walls
    const backZ = storeCenterZ - storeD / 2;
    const back = new THREE.Mesh(new THREE.BoxGeometry(storeW, storeH, wallThick), brickMat);
    back.position.set(0, storeH / 2, backZ);
    back.castShadow = true;
    gsGroup.add(back);

    const left = new THREE.Mesh(new THREE.BoxGeometry(wallThick, storeH, storeD), brickMat);
    left.position.set(-storeW / 2, storeH / 2, storeCenterZ);
    left.castShadow = true;
    gsGroup.add(left);

    const right = new THREE.Mesh(new THREE.BoxGeometry(wallThick, storeH, storeD), brickMat);
    right.position.set(storeW / 2, storeH / 2, storeCenterZ);
    right.castShadow = true;
    gsGroup.add(right);

    // Flat roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(storeW + 0.8, 0.35, storeD + 0.8), darkMetalMat);
    roof.position.set(0, storeH + 0.175, storeCenterZ);
    gsGroup.add(roof);

    // Interior Store Furniture
    // Checkout Counter with Cash Register
    const counter = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.1, 0.85), woodMat);
    counter.position.set(-3.2, 0.55, -2.8);
    gsGroup.add(counter);

    const register = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.5), darkMetalMat);
    register.position.set(-2.5, 1.25, -2.8);
    gsGroup.add(register);

    // Center Grocery Snack Aisle Shelves
    const shelf1 = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.9, 0.8), darkMetalMat);
    shelf1.position.set(1.8, 0.95, -4.2);
    gsGroup.add(shelf1);

    const shelf2 = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.9, 0.8), darkMetalMat);
    shelf2.position.set(1.8, 0.95, -7.5);
    gsGroup.add(shelf2);

    // Drink Coolers along back wall
    const cooler = new THREE.Mesh(new THREE.BoxGeometry(7.0, 2.3, 0.8), darkMetalMat);
    cooler.position.set(0, 1.15, backZ + 0.5);
    gsGroup.add(cooler);

    const coolerGlass = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 2.0), glassMat);
    coolerGlass.position.set(0, 1.15, backZ + 0.91);
    gsGroup.add(coolerGlass);

    // Warm interior fluorescent ambient point light
    const intLight = new THREE.PointLight(0xffecd0, 0.9, 14, 1.8);
    intLight.position.set(0, storeH - 0.6, storeCenterZ);
    gsGroup.add(intLight);

    // Exterior Fuel Canopy & Pumps
    const canopyW = 16;
    const canopyD = 10;
    const canopyH = 4.6;
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(canopyW, 0.35, canopyD), rustMat);
    canopy.position.set(0, canopyH, 4);
    canopy.castShadow = true;
    gsGroup.add(canopy);

    // Canopy Posts
    for (const px of [-5.5, 5.5]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, canopyH, 8), darkMetalMat);
      post.position.set(px, canopyH / 2, 4);
      gsGroup.add(post);
      colliders.push({ minX: cx + px - 0.35, maxX: cx + px + 0.35, minZ: cz + 4 - 0.35, maxZ: cz + 4 + 0.35 });
    }

    // Fuel Pumps
    for (const pz of [1.8, 6.2]) {
      const pump = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 0.5), rustMat);
      pump.position.set(0, 0.8, pz);
      gsGroup.add(pump);
      colliders.push({ minX: cx - 0.75, maxX: cx + 0.75, minZ: cz + pz - 0.3, maxZ: cz + pz + 0.3 });
    }

    sceneGroup.add(gsGroup);

    // Exterior Wall Colliders with open doorway at frontZ
    colliders.push({ minX: cx - storeW / 2, maxX: cx - doorW / 2, minZ: cz + frontZ - 0.25, maxZ: cz + frontZ + 0.25 });
    colliders.push({ minX: cx + doorW / 2, maxX: cx + storeW / 2, minZ: cz + frontZ - 0.25, maxZ: cz + frontZ + 0.25 });
    colliders.push({ minX: cx - storeW / 2, maxX: cx + storeW / 2, minZ: cz + backZ - 0.25, maxZ: cz + backZ + 0.25 });
    colliders.push({ minX: cx - storeW / 2 - 0.25, maxX: cx - storeW / 2 + 0.25, minZ: cz + backZ, maxZ: cz + frontZ });
    colliders.push({ minX: cx + storeW / 2 - 0.25, maxX: cx + storeW / 2 + 0.25, minZ: cz + backZ, maxZ: cz + frontZ });

    // Interior Counter & Shelves Colliders
    colliders.push({ minX: cx - 5.0, maxX: cx - 1.4, minZ: cz - 3.3, maxZ: cz - 2.3 });
    colliders.push({ minX: cx - 0.4, maxX: cx + 4.0, minZ: cz - 4.7, maxZ: cz - 3.7 });
    colliders.push({ minX: cx - 0.4, maxX: cx + 4.0, minZ: cz - 8.0, maxZ: cz - 7.0 });
  }

  createHighwayGasStation(85, 12);

  // -------------------------------------------------------------
  // SECTOR 4: QUARANTINE FIELD HOSPITAL (North: Z: -75 to -115)
  // -------------------------------------------------------------
  function createFieldHospital(cx: number, cz: number) {
    const gy = getTerrainHeight(cx, cz);
    const fhGroup = new THREE.Group();
    fhGroup.position.set(cx, gy, cz);

    const clinicW = 16;
    const clinicH = 5.2;
    const clinicD = 13;
    const wallThick = 0.45;

    // Floor
    const floor = new THREE.Mesh(new THREE.BoxGeometry(clinicW, 0.25, clinicD), concreteMat);
    floor.position.set(0, 0.125, 0);
    floor.receiveShadow = true;
    fhGroup.add(floor);

    // Front Wall with open double doorway (doorW: 3.2)
    const doorW = 3.2;
    const segW = (clinicW - doorW) / 2;
    const frontZ = clinicD / 2;

    const frontL = new THREE.Mesh(new THREE.BoxGeometry(segW, clinicH, wallThick), concreteMat);
    frontL.position.set(-clinicW / 2 + segW / 2, clinicH / 2, frontZ);
    frontL.castShadow = true;
    fhGroup.add(frontL);

    const frontR = new THREE.Mesh(new THREE.BoxGeometry(segW, clinicH, wallThick), concreteMat);
    frontR.position.set(clinicW / 2 - segW / 2, clinicH / 2, frontZ);
    frontR.castShadow = true;
    fhGroup.add(frontR);

    const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorW, clinicH - 3.0, wallThick), concreteMat);
    lintel.position.set(0, 3.0 + (clinicH - 3.0) / 2, frontZ);
    fhGroup.add(lintel);

    // Red Cross emblem above entrance
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.2, 0.08), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    crossV.position.set(0, 4.0, frontZ + 0.25);
    fhGroup.add(crossV);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 0.08), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    crossH.position.set(0, 4.0, frontZ + 0.25);
    fhGroup.add(crossH);

    // Back & Side walls
    const backZ = -clinicD / 2;
    const back = new THREE.Mesh(new THREE.BoxGeometry(clinicW, clinicH, wallThick), concreteMat);
    back.position.set(0, clinicH / 2, backZ);
    back.castShadow = true;
    fhGroup.add(back);

    const left = new THREE.Mesh(new THREE.BoxGeometry(wallThick, clinicH, clinicD), concreteMat);
    left.position.set(-clinicW / 2, clinicH / 2, 0);
    left.castShadow = true;
    fhGroup.add(left);

    const right = new THREE.Mesh(new THREE.BoxGeometry(wallThick, clinicH, clinicD), concreteMat);
    right.position.set(clinicW / 2, clinicH / 2, 0);
    right.castShadow = true;
    fhGroup.add(right);

    // Roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(clinicW + 0.8, 0.3, clinicD + 0.8), darkMetalMat);
    roof.position.set(0, clinicH + 0.15, 0);
    fhGroup.add(roof);

    // Interior Triage Clinic Props
    // 2 Hospital Gurney Beds
    for (const bx of [-4.5, 4.5]) {
      const gurney = new THREE.Group();
      gurney.position.set(bx, 0, 0);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.65, 2.4), darkMetalMat);
      frame.position.y = 0.325;
      gurney.add(frame);
      const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 2.3), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.7 }));
      mattress.position.y = 0.74;
      gurney.add(mattress);
      fhGroup.add(gurney);
      colliders.push({ minX: cx + bx - 0.75, maxX: cx + bx + 0.75, minZ: cz - 1.3, maxZ: cz + 1.3 });
    }

    // Medical Privacy Partition Screen
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.9, 2.6), tarpMat);
    screen.position.set(-2.2, 0.95, 0);
    fhGroup.add(screen);

    // Medical Supply Cabinet & Desk along back wall
    const medDesk = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.0, 0.9), woodMat);
    medDesk.position.set(0, 0.5, backZ + 1.2);
    fhGroup.add(medDesk);
    colliders.push({ minX: cx - 1.9, maxX: cx + 1.9, minZ: cz + backZ + 0.7, maxZ: cz + backZ + 1.7 });

    // Interior medical cyan/white light
    const triageLight = new THREE.PointLight(0xa5f3fc, 0.85, 15, 1.7);
    triageLight.position.set(0, clinicH - 0.6, 0);
    fhGroup.add(triageLight);

    // Exterior Triage Tents & Sandbag Barriers
    for (const tx of [-14, 14]) {
      const tentGeo = new THREE.ConeGeometry(4.2, 3.4, 4);
      tentGeo.rotateY(Math.PI / 4);
      const tent = new THREE.Mesh(tentGeo, tarpMat);
      tent.position.set(tx, 1.7, 0);
      tent.castShadow = true;
      fhGroup.add(tent);
      colliders.push({ minX: cx + tx - 2.5, maxX: cx + tx + 2.5, minZ: cz - 2.5, maxZ: cz + 2.5 });
    }

    for (const sz of [-10, 10]) {
      const sandbag = new THREE.Mesh(new THREE.BoxGeometry(10, 1.1, 0.8), woodMat);
      sandbag.position.set(0, 0.55, sz);
      fhGroup.add(sandbag);
      colliders.push({ minX: cx - 5, maxX: cx + 5, minZ: cz + sz - 0.45, maxZ: cz + sz + 0.45 });
    }

    sceneGroup.add(fhGroup);

    // Wall colliders leaving the 3.2m front doorway open
    colliders.push({ minX: cx - clinicW / 2, maxX: cx - doorW / 2, minZ: cz + frontZ - 0.25, maxZ: cz + frontZ + 0.25 });
    colliders.push({ minX: cx + doorW / 2, maxX: cx + clinicW / 2, minZ: cz + frontZ - 0.25, maxZ: cz + frontZ + 0.25 });
    colliders.push({ minX: cx - clinicW / 2, maxX: cx + clinicW / 2, minZ: cz + backZ - 0.25, maxZ: cz + backZ + 0.25 });
    colliders.push({ minX: cx - clinicW / 2 - 0.25, maxX: cx - clinicW / 2 + 0.25, minZ: cz + backZ, maxZ: cz + frontZ });
    colliders.push({ minX: cx + clinicW / 2 - 0.25, maxX: cx + clinicW / 2 + 0.25, minZ: cz + backZ, maxZ: cz + frontZ });
  }

  createFieldHospital(-15, -88);

  // -------------------------------------------------------------
  // SECTOR 5: INDUSTRIAL WAREHOUSE DEPOT (Far East: X: 115 to 150, Z: 60 to 95)
  // -------------------------------------------------------------
  function createIndustrialWarehouse(cx: number, cz: number) {
    const gy = getTerrainHeight(cx, cz);
    const whGroup = new THREE.Group();
    whGroup.position.set(cx, gy, cz);

    const w = 24;
    const h = 8.5;
    const d = 20;

    // Floor
    const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.25, d), concreteMat);
    floor.position.set(0, 0.125, 0);
    floor.receiveShadow = true;
    whGroup.add(floor);

    // Warehouse Hull with open loading bay
    const bayW = 6.0;
    const segW = (w - bayW) / 2;
    const frontL = new THREE.Mesh(new THREE.BoxGeometry(segW, h, 0.5), rustMat);
    frontL.position.set(-w / 2 + segW / 2, h / 2, d / 2);
    whGroup.add(frontL);

    const frontR = new THREE.Mesh(new THREE.BoxGeometry(segW, h, 0.5), rustMat);
    frontR.position.set(w / 2 - segW / 2, h / 2, d / 2);
    whGroup.add(frontR);

    const lintel = new THREE.Mesh(new THREE.BoxGeometry(bayW, h - 4.5, 0.5), rustMat);
    lintel.position.set(0, 4.5 + (h - 4.5) / 2, d / 2);
    whGroup.add(lintel);

    const back = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.5), rustMat);
    back.position.set(0, h / 2, -d / 2);
    whGroup.add(back);

    const left = new THREE.Mesh(new THREE.BoxGeometry(0.5, h, d), rustMat);
    left.position.set(-w / 2, h / 2, 0);
    whGroup.add(left);

    const right = new THREE.Mesh(new THREE.BoxGeometry(0.5, h, d), rustMat);
    right.position.set(w / 2, h / 2, 0);
    whGroup.add(right);

    // Corrugated Gabled Roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 1, 0.3, d + 1), darkMetalMat);
    roof.position.set(0, h + 0.15, 0);
    whGroup.add(roof);

    // Interior Storage Pallet Racks & Crates
    const rack1 = new THREE.Mesh(new THREE.BoxGeometry(7.0, 4.5, 1.2), darkMetalMat);
    rack1.position.set(-8.5, 2.25, 0);
    whGroup.add(rack1);
    colliders.push({ minX: cx - 12.2, maxX: cx - 4.8, minZ: cz - 0.7, maxZ: cz + 0.7 });

    const crateStack = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 2.4), woodMat);
    crateStack.position.set(7.5, 1.1, -4.5);
    whGroup.add(crateStack);
    colliders.push({ minX: cx + 6.2, maxX: cx + 8.8, minZ: cz - 5.8, maxZ: cz - 3.2 });

    // Interior industrial sodium high-bay light
    const bayLight = new THREE.PointLight(0xffbe6b, 1.2, 22, 1.6);
    bayLight.position.set(0, h - 1.2, 0);
    whGroup.add(bayLight);

    // Shipping Container stack outside
    const containerMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.6, metalness: 0.4 });
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 6.5), containerMat);
    c1.position.set(-16, 1.3, 0);
    whGroup.add(c1);
    colliders.push({ minX: cx - 17.5, maxX: cx - 14.5, minZ: cz - 3.5, maxZ: cz + 3.5 });

    sceneGroup.add(whGroup);

    colliders.push({ minX: cx - w / 2, maxX: cx - bayW / 2, minZ: cz + d / 2 - 0.3, maxZ: cz + d / 2 + 0.3 });
    colliders.push({ minX: cx + bayW / 2, maxX: cx + w / 2, minZ: cz + d / 2 - 0.3, maxZ: cz + d / 2 + 0.3 });
    colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2 - 0.3, maxZ: cz - d / 2 + 0.3 });
    colliders.push({ minX: cx - w / 2 - 0.3, maxX: cx - w / 2 + 0.3, minZ: cz - d / 2, maxZ: cz + d / 2 });
    colliders.push({ minX: cx + w / 2 - 0.3, maxX: cx + w / 2 + 0.3, minZ: cz - d / 2, maxZ: cz + d / 2 });
  }

  createIndustrialWarehouse(128, 72);

  // -------------------------------------------------------------
  // SECTOR 6: FOREST RANGER CABIN & LOGGING CAMP (West: X: -105, Z: 25)
  // -------------------------------------------------------------
  function createRangerCabin(cx: number, cz: number) {
    const gy = getTerrainHeight(cx, cz);
    const rcGroup = new THREE.Group();
    rcGroup.position.set(cx, gy, cz);

    const w = 10;
    const h = 4.5;
    const d = 9;
    const floorY = 1.5;

    // Raised Log Stilts under Cabin and Deck
    for (const sx of [-4.2, 4.2]) {
      for (const sz of [-3.8, 0, 3.8, 5.5]) {
        const stilt = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, floorY, 8), darkMetalMat);
        stilt.position.set(sx, floorY / 2, sz);
        stilt.castShadow = true;
        rcGroup.add(stilt);
      }
    }

    // Front Deck / Porch (w: 10, d: 3)
    const deck = new THREE.Mesh(new THREE.BoxGeometry(w, 0.22, 3), woodMat);
    deck.position.set(0, floorY, d / 2 + 1.5);
    deck.receiveShadow = true;
    rcGroup.add(deck);

    // Deck Handrails
    const railL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 3), woodMat);
    railL.position.set(-w / 2 + 0.1, floorY + 0.5, d / 2 + 1.5);
    rcGroup.add(railL);
    colliders.push({ minX: cx - w / 2, maxX: cx - w / 2 + 0.25, minZ: cz + d / 2, maxZ: cz + d / 2 + 3 });

    const railR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 3), woodMat);
    railR.position.set(w / 2 - 0.1, floorY + 0.5, d / 2 + 1.5);
    rcGroup.add(railR);
    colliders.push({ minX: cx + w / 2 - 0.25, maxX: cx + w / 2, minZ: cz + d / 2, maxZ: cz + d / 2 + 3 });

    // Wooden Access Ramp leading smoothly up from ground level to deck
    const rampW = 3.0;
    const rampLen = 4.5;
    const rampAngle = Math.atan2(floorY, rampLen);
    const rampMesh = new THREE.Mesh(new THREE.BoxGeometry(rampW, 0.18, Math.sqrt(rampLen * rampLen + floorY * floorY)), woodMat);
    rampMesh.position.set(0, floorY / 2, d / 2 + 3 + rampLen / 2);
    rampMesh.rotation.x = rampAngle;
    rampMesh.receiveShadow = true;
    rcGroup.add(rampMesh);

    // Cabin Interior Floor
    const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.22, d), woodMat);
    floor.position.set(0, floorY, 0);
    floor.receiveShadow = true;
    rcGroup.add(floor);

    // Front wall with open doorway (doorW: 2.2)
    const doorW = 2.2;
    const segW = (w - doorW) / 2;
    const frontZ = d / 2;

    const frontL = new THREE.Mesh(new THREE.BoxGeometry(segW, h, 0.35), woodMat);
    frontL.position.set(-w / 2 + segW / 2, floorY + h / 2, frontZ);
    frontL.castShadow = true;
    rcGroup.add(frontL);

    const frontR = new THREE.Mesh(new THREE.BoxGeometry(segW, h, 0.35), woodMat);
    frontR.position.set(w / 2 - segW / 2, floorY + h / 2, frontZ);
    frontR.castShadow = true;
    rcGroup.add(frontR);

    const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorW, h - 2.8, 0.35), woodMat);
    lintel.position.set(0, floorY + 2.8 + (h - 2.8) / 2, frontZ);
    rcGroup.add(lintel);

    // Back & Side walls
    const backZ = -d / 2;
    const back = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.35), woodMat);
    back.position.set(0, floorY + h / 2, backZ);
    back.castShadow = true;
    rcGroup.add(back);

    const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.35, h, d), woodMat);
    sideL.position.set(-w / 2, floorY + h / 2, 0);
    sideL.castShadow = true;
    rcGroup.add(sideL);

    const sideR = new THREE.Mesh(new THREE.BoxGeometry(0.35, h, d), woodMat);
    sideR.position.set(w / 2, floorY + h / 2, 0);
    sideR.castShadow = true;
    rcGroup.add(sideR);

    // Gabled Roof
    const roofL = new THREE.Mesh(new THREE.BoxGeometry(w * 0.58, 0.25, d + 1.2), darkMetalMat);
    roofL.position.set(-w * 0.26, floorY + h + 0.9, 0);
    roofL.rotation.z = 0.38;
    rcGroup.add(roofL);

    const roofR = new THREE.Mesh(new THREE.BoxGeometry(w * 0.58, 0.25, d + 1.2), darkMetalMat);
    roofR.position.set(w * 0.26, floorY + h + 0.9, 0);
    roofR.rotation.z = -0.38;
    rcGroup.add(roofR);

    // Interior Furniture
    // Ranger Bunk Bed
    const bunk = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 2.4), woodMat);
    bunk.position.set(-w / 2 + 1.2, floorY + 0.8, -d / 2 + 1.5);
    rcGroup.add(bunk);
    colliders.push({ minX: cx - w / 2, maxX: cx - w / 2 + 2.0, minZ: cz - d / 2, maxZ: cz - d / 2 + 2.8 });

    // Ranger Desk with Radio & Map
    const desk = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 1.1), woodMat);
    desk.position.set(w / 2 - 1.5, floorY + 0.45, -d / 2 + 1.4);
    rcGroup.add(desk);

    const radio = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.4), darkMetalMat);
    radio.position.set(w / 2 - 1.2, floorY + 1.05, -d / 2 + 1.4);
    rcGroup.add(radio);
    colliders.push({ minX: cx + w / 2 - 2.8, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz - d / 2 + 2.2 });

    // Wood-burning stove with vertical chimney pipe
    const stove = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.1, 0.85), darkMetalMat);
    stove.position.set(w / 2 - 1.3, floorY + 0.55, 1.8);
    rcGroup.add(stove);

    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.6, 8), darkMetalMat);
    pipe.position.set(w / 2 - 1.3, floorY + 2.6, 1.8);
    rcGroup.add(pipe);

    // Cozy interior amber light
    const cabinLight = new THREE.PointLight(0xffa843, 0.8, 12, 2);
    cabinLight.position.set(0, floorY + h - 0.7, 0);
    rcGroup.add(cabinLight);

    sceneGroup.add(rcGroup);

    // Colliders leaving doorway open
    colliders.push({ minX: cx - w / 2, maxX: cx - doorW / 2, minZ: cz + frontZ - 0.25, maxZ: cz + frontZ + 0.25 });
    colliders.push({ minX: cx + doorW / 2, maxX: cx + w / 2, minZ: cz + frontZ - 0.25, maxZ: cz + frontZ + 0.25 });
    colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz + backZ - 0.25, maxZ: cz + backZ + 0.25 });
    colliders.push({ minX: cx - w / 2 - 0.25, maxX: cx - w / 2 + 0.25, minZ: cz + backZ, maxZ: cz + frontZ });
    colliders.push({ minX: cx + w / 2 - 0.25, maxX: cx + w / 2 + 0.25, minZ: cz + backZ, maxZ: cz + frontZ });
  }

  createRangerCabin(-105, 25);

  // Radio Transmission Tower Landmark on the western ridge
  function createRadioTransmissionTower(x: number, z: number) {
    const gy = getTerrainHeight(x, z);
    const towerGroup = new THREE.Group();
    towerGroup.position.set(x, gy, z);

    const towerH = 32;
    const baseW = 5.5;
    const topW = 1.2;

    // 4 Truss Legs
    const legGeo = new THREE.CylinderGeometry(0.12, 0.2, towerH, 6);
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 2) {
      const leg = new THREE.Mesh(legGeo, darkMetalMat);
      const lx = (Math.cos(angle) * (baseW + topW)) / 4;
      const lz = (Math.sin(angle) * (baseW + topW)) / 4;
      leg.position.set(lx, towerH / 2, lz);
      leg.rotation.z = -Math.cos(angle) * 0.07;
      leg.rotation.x = Math.sin(angle) * 0.07;
      towerGroup.add(leg);
    }

    // Horizontal cross-tie frames
    for (let ty = 6; ty < towerH; ty += 6) {
      const frac = ty / towerH;
      const bw = baseW * (1 - frac) + topW * frac;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.15, bw), hazardMat);
      frame.position.y = ty;
      towerGroup.add(frame);
    }

    // Top Antenna Spire
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.1, 7.0, 6), darkMetalMat);
    spire.position.y = towerH + 3.5;
    towerGroup.add(spire);

    // Red Blinking Aviation Warning Beacon
    const beaconBulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff1111 }));
    beaconBulb.position.y = towerH + 7.0;
    towerGroup.add(beaconBulb);

    const beaconLight = new THREE.PointLight(0xff1111, 2.5, 80, 1.4);
    beaconLight.position.set(x, gy + towerH + 7.0, z);
    sceneGroup.add(beaconLight);

    sceneGroup.add(towerGroup);
    colliders.push({ minX: x - baseW / 2, maxX: x + baseW / 2, minZ: z - baseW / 2, maxZ: z + baseW / 2 });
  }

  createRadioTransmissionTower(-140, 22);

  // Highway Directional Road Signs for Navigation
  function createRoadSign(x: number, z: number, rotY: number) {
    const gy = getTerrainHeight(x, z);
    const sg = new THREE.Group();
    sg.position.set(x, gy, z);
    sg.rotation.y = rotY;

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.2, 8), darkMetalMat);
    post.position.y = 1.6;
    sg.add(post);

    const board = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 0.08), hazardMat);
    board.position.set(0, 2.5, 0);
    sg.add(board);

    sceneGroup.add(sg);
    colliders.push({ minX: x - 0.25, maxX: x + 0.25, minZ: z - 0.25, maxZ: z + 0.25 });
  }

  createRoadSign(6.8, 8, -Math.PI / 2);
  createRoadSign(62, -6.5, Math.PI);
  createRoadSign(-60, 6.5, 0);
  createRoadSign(-6.8, -60, Math.PI / 2);
  createRoadSign(-35, -45, -Math.PI / 4);

  // -------------------------------------------------------------
  // SECTOR 7: NEW HAVEN RUINED CITY QUARTER & MOTEL SAFEHOUSE
  // (North-West: X: -60 to -115, Z: -50 to -105)
  // -------------------------------------------------------------
  // A. Ruined High-Rise Skyscraper Skeleton (26m tall landmark)
  function createRuinedSkyscraper(cx: number, cz: number) {
    const gy = getTerrainHeight(cx, cz);
    const ssGroup = new THREE.Group();
    ssGroup.position.set(cx, gy, cz);

    const w = 18;
    const d = 18;
    const floorH = 4.2;
    const numFloors = 6;
    const totalH = floorH * numFloors;

    // Concrete elevator/stairwell central core
    const core = new THREE.Mesh(new THREE.BoxGeometry(6, totalH, 6), concreteMat);
    core.position.set(0, totalH / 2, 0);
    core.castShadow = true;
    ssGroup.add(core);
    colliders.push({ minX: cx - 3.2, maxX: cx + 3.2, minZ: cz - 3.2, maxZ: cz + 3.2 });

    // Steel column frame grid
    for (const px of [-w / 2 + 0.5, 0, w / 2 - 0.5]) {
      for (const pz of [-d / 2 + 0.5, 0, d / 2 - 0.5]) {
        if (px === 0 && pz === 0) continue;
        const col = new THREE.Mesh(new THREE.BoxGeometry(0.5, totalH, 0.5), darkMetalMat);
        col.position.set(px, totalH / 2, pz);
        col.castShadow = true;
        ssGroup.add(col);
        colliders.push({ minX: cx + px - 0.4, maxX: cx + px + 0.4, minZ: cz + pz - 0.4, maxZ: cz + pz + 0.4 });
      }
    }

    // Fractured floor slabs with collapsed sections
    for (let f = 1; f <= numFloors; f++) {
      const fy = f * floorH;
      const slabW = f > 4 ? w * 0.7 : w;
      const slabD = f > 3 ? d * 0.65 : d;
      const slab = new THREE.Mesh(new THREE.BoxGeometry(slabW, 0.35, slabD), concreteMat);
      slab.position.set((f % 2 === 0 ? -1 : 1) * 1.5, fy, (f % 2 === 0 ? 1 : -1) * 1.5);
      slab.receiveShadow = true;
      ssGroup.add(slab);
    }

    // Ground rubble piles around skyscraper base
    for (const rx of [-8, 8]) {
      const rubble = new THREE.Mesh(new THREE.DodecahedronGeometry(2.0, 1), concreteMat);
      rubble.position.set(rx, 1.0, 6);
      ssGroup.add(rubble);
      colliders.push({ minX: cx + rx - 1.8, maxX: cx + rx + 1.8, minZ: cz + 4.2, maxZ: cz + 7.8 });
    }

    sceneGroup.add(ssGroup);
  }

  createRuinedSkyscraper(-95, -90);

  // B. 2-Story Abandoned City Motel & Reinforced Safehouse
  function createCityMotelSafehouse(cx: number, cz: number) {
    const gy = getTerrainHeight(cx, cz);
    const mGroup = new THREE.Group();
    mGroup.position.set(cx, gy, cz);

    const w = 24;
    const h = 7.0;
    const d = 15;
    const wallThick = 0.45;

    // Ground Floor Slab
    const groundFloor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, d), concreteMat);
    groundFloor.position.set(0, 0.15, 0);
    groundFloor.receiveShadow = true;
    mGroup.add(groundFloor);

    // Second Floor Slab & Exterior Balcony Walkway
    const secondFloor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, d), concreteMat);
    secondFloor.position.set(0, 3.5, 0);
    mGroup.add(secondFloor);

    // Flat Roof with Overhang
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 1.2, 0.35, d + 1.2), darkMetalMat);
    roof.position.set(0, h + 0.175, 0);
    mGroup.add(roof);

    // Front Neon Motel Signboard ("OAKHAVEN MOTEL // SAFEHOUSE")
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(7.5, 1.4, 0.15), darkMetalMat);
    signBoard.position.set(0, h + 1.0, d / 2 + 0.2);
    mGroup.add(signBoard);

    const signText = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.9, 0.08), hazardMat);
    signText.position.set(0, h + 1.0, d / 2 + 0.3);
    mGroup.add(signText);

    const signLight = new THREE.PointLight(0xf59e0b, 1.5, 18, 1.8);
    signLight.position.set(0, h + 1.0, d / 2 + 1.5);
    mGroup.add(signLight);

    // Back & Outer Side Walls
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(w, h, wallThick), brickMat);
    backWall.position.set(0, h / 2, -d / 2);
    mGroup.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, h, d), brickMat);
    leftWall.position.set(-w / 2, h / 2, 0);
    mGroup.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, h, d), brickMat);
    rightWall.position.set(w / 2, h / 2, 0);
    mGroup.add(rightWall);

    // Interior Partition separating Reinforced Safehouse (left side) from Motel Lobby (right side)
    const partition = new THREE.Mesh(new THREE.BoxGeometry(wallThick, 3.4, d), brickMat);
    partition.position.set(0, 1.7, 0);
    mGroup.add(partition);

    // Front Wall for Ground Floor Safehouse (Room 101, Left: x = -w/2 to 0)
    // Safehouse has reinforced double entrance door (doorW: 2.2 at x = -5.5)
    const shDoorW = 2.2;
    const shFrontL = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.4, wallThick), concreteMat);
    shFrontL.position.set(-w / 2 + 2.2, 1.7, d / 2);
    mGroup.add(shFrontL);

    const shFrontR = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.4, wallThick), concreteMat);
    shFrontR.position.set(-2.2, 1.7, d / 2);
    mGroup.add(shFrontR);

    const shLintel = new THREE.Mesh(new THREE.BoxGeometry(shDoorW, 0.8, wallThick), concreteMat);
    shLintel.position.set(-6.0, 3.0, d / 2);
    mGroup.add(shLintel);

    // Front Wall for Motel Lobby (Right: x = 0 to w/2) with wide open entrance (doorW: 3.0 at x = 6.0)
    const lobbyFrontL = new THREE.Mesh(new THREE.BoxGeometry(4.0, 3.4, wallThick), brickMat);
    lobbyFrontL.position.set(2.0, 1.7, d / 2);
    mGroup.add(lobbyFrontL);

    const lobbyFrontR = new THREE.Mesh(new THREE.BoxGeometry(4.0, 3.4, wallThick), brickMat);
    lobbyFrontR.position.set(10.0, 1.7, d / 2);
    mGroup.add(lobbyFrontR);

    // SAFEHOUSE INTERIOR FURNITURE (The Usable Shelter & Stash)
    // 1. Reinforced Safehouse Bunk Bed (Usable sleeping spot at x = -85, z = -74)
    const bunkGroup = new THREE.Group();
    bunkGroup.position.set(-5.0, 0, -4.0);
    const bunkFrame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.85, 2.5), darkMetalMat);
    bunkFrame.position.y = 0.425;
    bunkGroup.add(bunkFrame);
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.22, 2.4), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 }));
    mattress.position.y = 0.95;
    bunkGroup.add(mattress);
    mGroup.add(bunkGroup);

    // 2. Safehouse Supply Stash Locker (Supply storage chest at x = -82, z = -72)
    const stashLocker = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 0.8), darkMetalMat);
    stashLocker.position.set(-2.0, 0.6, -2.0);
    mGroup.add(stashLocker);

    const stashLatch = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 0.1), hazardMat);
    stashLatch.position.set(-2.0, 0.65, -1.55);
    mGroup.add(stashLatch);

    // Safehouse workbench & emergency lantern
    const bench = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.9, 0.85), woodMat);
    bench.position.set(-8.5, 0.45, 0);
    mGroup.add(bench);

    const safeLantern = new THREE.PointLight(0xffbe6b, 1.2, 14, 1.8);
    safeLantern.position.set(-5.0, 2.6, 0);
    mGroup.add(safeLantern);

    // Motel Lobby Reception Desk on right
    const desk = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.1, 0.9), woodMat);
    desk.position.set(6.0, 0.55, 1.5);
    mGroup.add(desk);

    sceneGroup.add(mGroup);

    // Colliders leaving Safehouse entrance and Lobby entrance wide open
    // Outer walls
    colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2 - 0.25, maxZ: cz - d / 2 + 0.25 });
    colliders.push({ minX: cx - w / 2 - 0.25, maxX: cx - w / 2 + 0.25, minZ: cz - d / 2, maxZ: cz + d / 2 });
    colliders.push({ minX: cx + w / 2 - 0.25, maxX: cx + w / 2 + 0.25, minZ: cz - d / 2, maxZ: cz + d / 2 });
    // Middle partition
    colliders.push({ minX: cx - 0.25, maxX: cx + 0.25, minZ: cz - d / 2, maxZ: cz + d / 2 - 2.5 });
    // Safehouse front walls leaving door open between x = -7.1 and -4.9
    colliders.push({ minX: cx - w / 2, maxX: cx - 7.1, minZ: cz + d / 2 - 0.25, maxZ: cz + d / 2 + 0.25 });
    colliders.push({ minX: cx - 4.9, maxX: cx - 0.2, minZ: cz + d / 2 - 0.25, maxZ: cz + d / 2 + 0.25 });
    // Lobby front walls
    colliders.push({ minX: cx + 0.2, maxX: cx + 4.5, minZ: cz + d / 2 - 0.25, maxZ: cz + d / 2 + 0.25 });
    colliders.push({ minX: cx + 7.5, maxX: cx + w / 2, minZ: cz + d / 2 - 0.25, maxZ: cz + d / 2 + 0.25 });
    // Stash & furniture colliders
    colliders.push({ minX: cx - 2.7, maxX: cx - 1.3, minZ: cz - 2.5, maxZ: cz - 1.5 });
  }

  createCityMotelSafehouse(-80, -70);

  // C. Collapsed City Highway Overpass (iconic drivable/walkable ruined incline ramp)
  function createCollapsedOverpass(cx: number, cz: number) {
    const gy = getTerrainHeight(cx, cz);
    const opGroup = new THREE.Group();
    opGroup.position.set(cx, gy, cz);

    // Thick concrete bridge pillars
    const pillar1 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 9.0, 2.2), concreteMat);
    pillar1.position.set(-10, 4.5, 0);
    pillar1.castShadow = true;
    opGroup.add(pillar1);
    colliders.push({ minX: cx - 11.2, maxX: cx - 8.8, minZ: cz - 1.2, maxZ: cz + 1.2 });

    const pillar2 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 5.0, 2.2), concreteMat);
    pillar2.position.set(10, 2.5, 0);
    pillar2.castShadow = true;
    opGroup.add(pillar2);
    colliders.push({ minX: cx + 8.8, maxX: cx + 11.2, minZ: cz - 1.2, maxZ: cz + 1.2 });

    // Fractured Road Deck (10m wide, 24m long, sloped from 9m high down to 0.4m at road level)
    const deckLen = 22;
    const slopeAngle = Math.atan2(8.0, deckLen);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.7, deckLen), roadMat);
    deck.position.set(0, 4.5, 0);
    deck.rotation.z = slopeAngle;
    deck.castShadow = true;
    opGroup.add(deck);

    // Concrete barrier railings along edge
    const railL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.0, deckLen), concreteMat);
    railL.position.set(-4.1, 5.0, 0);
    railL.rotation.z = slopeAngle;
    opGroup.add(railL);

    sceneGroup.add(opGroup);
  }

  createCollapsedOverpass(-80, -48);

  // D. Ruined City Plaza with broken centerpiece monument
  function createCityPlaza(cx: number, cz: number) {
    const gy = getTerrainHeight(cx, cz);
    const pGroup = new THREE.Group();
    pGroup.position.set(cx, gy, cz);

    // Cracked plaza tile floor
    const plazaTile = new THREE.Mesh(new THREE.BoxGeometry(24, 0.15, 24), concreteMat);
    plazaTile.position.y = 0.075;
    pGroup.add(plazaTile);

    // Broken centerpiece obelisk monument
    const base = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.2, 3.5), rockMat);
    base.position.y = 0.6;
    pGroup.add(base);

    const brokenShaft = new THREE.Mesh(new THREE.BoxGeometry(1.6, 4.5, 1.6), rockMat);
    brokenShaft.position.set(0, 3.2, 0);
    brokenShaft.rotation.z = 0.18;
    pGroup.add(brokenShaft);
    colliders.push({ minX: cx - 2.0, maxX: cx + 2.0, minZ: cz - 2.0, maxZ: cz + 2.0 });

    sceneGroup.add(pGroup);
  }

  createCityPlaza(-60, -75);

  // 4. Abandoned Vehicles Across Roads & Highways
  function createGroundedVehicle(
    x: number,
    z: number,
    rotY: number,
    type: 'sedan' | 'truck' | 'police' = 'sedan',
    rustColor: number = 0x5a2016
  ) {
    const gy = getTerrainHeight(x, z);
    const vGroup = new THREE.Group();
    vGroup.position.set(x, gy, z);
    vGroup.rotation.y = rotY;

    const bodyMat = new THREE.MeshStandardMaterial({
      color: type === 'police' ? 0x1a242c : rustColor,
      roughness: 0.65,
      metalness: 0.45,
    });

    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.9 });
    const bodyW = 2.1;
    const bodyH = 0.75;
    const bodyL = type === 'truck' ? 5.2 : 4.5;

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(bodyW, bodyH, bodyL), bodyMat);
    chassis.position.set(0, 0.65, 0);
    chassis.castShadow = true;
    vGroup.add(chassis);

    const cabinW = 1.9;
    const cabinH = 0.75;
    const cabinL = type === 'truck' ? 1.9 : 2.2;
    const cabinZ = type === 'truck' ? -0.7 : -0.2;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(cabinW, cabinH, cabinL), bodyMat);
    cabin.position.set(0, 0.65 + bodyH / 2 + cabinH / 2, cabinZ);
    vGroup.add(cabin);

    // Windshield
    const ws = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.65), glassMat);
    ws.position.set(0, 1.45, cabinZ + cabinL / 2 + 0.02);
    ws.rotation.x = -0.3;
    vGroup.add(ws);

    // 4 Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelPositions = [
      [-1.05, 0.42, -bodyL * 0.33],
      [1.05, 0.42, -bodyL * 0.33],
      [-1.05, 0.42, bodyL * 0.33],
      [1.05, 0.42, bodyL * 0.33],
    ];
    wheelPositions.forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(wx, wy, wz);
      vGroup.add(wheel);
    });

    sceneGroup.add(vGroup);
    const halfDiag = Math.max(bodyW, bodyL) / 1.7;
    colliders.push({ minX: x - halfDiag, maxX: x + halfDiag, minZ: z - halfDiag, maxZ: z + halfDiag });
  }

  // Vehicles along highways and towns
  createGroundedVehicle(-2.5, -15, 0.25, 'sedan', 0x5a2016);
  createGroundedVehicle(3.2, 14, -0.4, 'truck', 0x22354a);
  createGroundedVehicle(-16, -3, 1.4, 'police');
  createGroundedVehicle(16, 2, -1.2, 'sedan', 0x3d3d3d);
  createGroundedVehicle(55, -2, 0.3, 'sedan', 0x48241b);
  createGroundedVehicle(105, 4, -0.6, 'truck', 0x2d3a45);
  createGroundedVehicle(0, 52, 0.1, 'sedan', 0x6e3820);
  createGroundedVehicle(-4, -68, -0.2, 'police');

  // 5. Instanced Natural Rocks & Boulders Grounded Across All Sectors
  const rockGeo = new THREE.DodecahedronGeometry(1.0, 1);
  const rockPositions = [
    [-18, -12], [16, -14], [-18, 16], [16, 18], [-38, -20], [38, -18],
    [-42, 22], [42, 24], [-10, 25], [10, -25], [-28, 4], [30, -6],
    [-65, -15], [68, 22], [-85, 45], [95, -25], [-110, -35], [115, 35],
    [-55, 60], [58, 75], [-75, -60], [80, -45], [-120, 15], [130, -15],
    [-95, -75], [105, 95], [-45, -110], [50, 110], [-130, 65], [140, 45]
  ];

  const rockInstanced = new THREE.InstancedMesh(rockGeo, rockMat, rockPositions.length);
  rockInstanced.castShadow = true;
  rockInstanced.receiveShadow = true;

  const dummy = new THREE.Object3D();
  rockPositions.forEach(([rx, rz], idx) => {
    const gy = getTerrainHeight(rx, rz);
    const s = 0.7 + Math.random() * 1.1;
    dummy.position.set(rx, gy + s * 0.45, rz);
    dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    dummy.scale.set(s, s * 0.85, s);
    dummy.updateMatrix();
    rockInstanced.setMatrixAt(idx, dummy.matrix);
    colliders.push({ minX: rx - s * 0.65, maxX: rx + s * 0.65, minZ: rz - s * 0.65, maxZ: rz + s * 0.65 });
  });
  rockInstanced.instanceMatrix.needsUpdate = true;
  sceneGroup.add(rockInstanced);

  // 6. Lush Conifer Pine Trees & Dense Whispering Pines Forest
  function createPineTree(x: number, z: number) {
    const gy = getTerrainHeight(x, z);
    const tGroup = new THREE.Group();
    tGroup.position.set(x, gy, z);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.45, 6.2, 8), darkMetalMat);
    trunk.position.y = 3.1;
    trunk.castShadow = true;
    tGroup.add(trunk);

    const tiers = [
      { y: 3.5, r: 2.5, h: 2.8 },
      { y: 5.3, r: 1.9, h: 2.5 },
      { y: 7.0, r: 1.2, h: 2.0 },
    ];
    tiers.forEach((t) => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(t.r, t.h, 7), pineNeedleMat);
      cone.position.y = t.y;
      cone.castShadow = true;
      tGroup.add(cone);
    });

    sceneGroup.add(tGroup);
    windObjects.push(tGroup);
    colliders.push({ minX: x - 0.45, maxX: x + 0.45, minZ: z - 0.45, maxZ: z + 0.45 });
  }

  // Pine tree placement across the open world and dense western forest
  const pineSpawns = [
    [-15, -24], [15, -26], [-18, 24], [18, 20], [-42, -32], [42, -34],
    [-44, 38], [44, 40], [-55, -20], [60, -25], [-70, 15], [75, 25],
    // Deep Western Forest (Dense grove)
    [-85, 10], [-95, 30], [-105, -15], [-115, 20], [-125, -5], [-135, 35],
    [-90, -40], [-100, 50], [-110, -55], [-120, 60], [-130, -30], [-140, 10],
    [-75, 45], [-80, -25], [-95, -10], [-105, 45], [-115, -25], [-125, 50],
    // Eastern and Northern Highway trees
    [95, -15], [110, 10], [130, 30], [80, 50], [100, 65], [-35, -75],
    [-45, -95], [35, -80], [45, -100], [-15, -115], [20, -115]
  ];

  pineSpawns.forEach(([px, pz]) => createPineTree(px, pz));

  // 7. Instanced Bushes & Overgrowth Grounded Correctly
  const bushGeo = new THREE.DodecahedronGeometry(0.9, 1);
  const bushPositions = [
    [-8, -14], [9, -16], [-12, 12], [10, 14], [-24, 18], [25, 16],
    [-38, -14], [40, 16], [-50, 10], [52, -12], [-65, 35], [70, -35],
    [-80, 20], [85, 30], [-95, -20], [105, 15], [-115, 40], [125, -40],
    [-30, 85], [32, 85], [-15, 95], [18, 95], [-45, -85], [45, -85],
    [-75, -45], [80, -60], [-100, 5], [115, 60], [-135, 15], [140, -10]
  ];

  const bushInstanced = new THREE.InstancedMesh(bushGeo, shrubMat, bushPositions.length);
  bushInstanced.castShadow = true;

  bushPositions.forEach(([bx, bz], idx) => {
    const gy = getTerrainHeight(bx, bz);
    const s = 0.7 + Math.random() * 0.55;
    dummy.position.set(bx, gy + s * 0.55, bz);
    dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
    dummy.scale.set(s * 1.3, s * 0.85, s * 1.2);
    dummy.updateMatrix();
    bushInstanced.setMatrixAt(idx, dummy.matrix);
  });
  bushInstanced.instanceMatrix.needsUpdate = true;
  sceneGroup.add(bushInstanced);

  // 8. Streetlights Grounded in Towns and Along Highways
  function createStreetlight(x: number, z: number, lightFacing: number = 0) {
    const gy = getTerrainHeight(x, z);
    const slGroup = new THREE.Group();
    slGroup.position.set(x, gy, z);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 6, 8), darkMetalMat);
    pole.position.set(0, 3, 0);
    pole.castShadow = true;
    slGroup.add(pole);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.8), darkMetalMat);
    arm.position.set(0, 5.9, 0.8);
    slGroup.add(arm);

    const fixture = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.6), darkMetalMat);
    fixture.position.set(0, 5.8, 1.6);
    slGroup.add(fixture);

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffb84d }));
    bulb.position.set(0, 5.65, 1.6);
    slGroup.add(bulb);

    slGroup.rotation.y = lightFacing;
    sceneGroup.add(slGroup);

    const pLight = new THREE.PointLight(0xffa238, 1.4, 26, 1.8);
    const worldPos = new THREE.Vector3(0, 5.5, 1.6).applyAxisAngle(new THREE.Vector3(0, 1, 0), lightFacing).add(new THREE.Vector3(x, gy, z));
    pLight.position.copy(worldPos);
    sceneGroup.add(pLight);
    streetlights.push(pLight);

    colliders.push({ minX: x - 0.3, maxX: x + 0.3, minZ: z - 0.3, maxZ: z + 0.3 });
  }

  createStreetlight(-6.5, -20, Math.PI / 2);
  createStreetlight(6.5, -4, -Math.PI / 2);
  createStreetlight(-6.5, 20, Math.PI / 2);
  createStreetlight(6.5, 36, -Math.PI / 2);
  createStreetlight(50, -6.5, Math.PI);
  createStreetlight(85, -6.5, Math.PI);
  createStreetlight(0, 75, -Math.PI / 2);
  createStreetlight(-6.5, -80, Math.PI / 2);

  // 9. Tactical Barricades & Roadblocks (Placed at logical checkpoints)
  function createBarricade(x: number, z: number, rotY: number) {
    const gy = getTerrainHeight(x, z);
    const bGroup = new THREE.Group();
    bGroup.position.set(x, gy, z);
    bGroup.rotation.y = rotY;

    const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 0.6), woodMat);
    s1.position.set(-1.4, 0.6, 0);
    const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 0.6), woodMat);
    s2.position.set(1.4, 0.6, 0);
    bGroup.add(s1);
    bGroup.add(s2);

    const beam = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.3, 0.1), hazardMat);
    beam.position.set(0, 0.85, 0);
    beam.castShadow = true;
    bGroup.add(beam);

    sceneGroup.add(bGroup);
    colliders.push({ minX: x - 1.6, maxX: x + 1.6, minZ: z - 0.5, maxZ: z + 0.5 });
  }

  createBarricade(0, -42, 0);
  createBarricade(0, 48, 0);
  createBarricade(-42, 0, Math.PI / 2);
  createBarricade(42, 0, Math.PI / 2);

  // -------------------------------------------------------------
  // 10. VALIDATED GROUNDED SUPPLY SPAWN SYSTEM (PROBLEM 2 FIX)
  // -------------------------------------------------------------
  // Every candidate supply position is sampled on the actual terrain or building surface
  // using getWorldSurfaceHeight(x, z). If an item is placed on an interior table,
  // counter, desk, or truck bed, its exact surface elevation is applied.
  // We validate every candidate against colliders so supplies NEVER spawn inside
  // solid walls, rocks, or obstacles. If obstructed, a fallback search finds the
  // nearest clear spot!
  interface RawSupplyCandidate {
    x: number;
    z: number;
    type: ItemType;
    elevateOnSurface?: number; // Exact height of prop surface above floor (e.g. table, counter, truck bed)
  }

  function isSupplyObstructed(x: number, z: number, cols: BoxCollider[], buffer: number = 0.35): boolean {
    for (const box of cols) {
      if (
        x >= box.minX - buffer &&
        x <= box.maxX + buffer &&
        z >= box.minZ - buffer &&
        z <= box.maxZ + buffer
      ) {
        return true;
      }
    }
    return false;
  }

  const rawSupplyCandidates: RawSupplyCandidate[] = [
    // Sector 1: Downtown Pharmacy & Police Station
    { x: 22, z: -21, type: 'medkit', elevateOnSurface: 0 },
    { x: 24, z: -25, type: 'food', elevateOnSurface: 0 },
    { x: 20, z: -25, type: 'water', elevateOnSurface: 0 },
    { x: -21, z: -21, type: 'ammo', elevateOnSurface: 0 },
    { x: -24, z: -24, type: 'ammo', elevateOnSurface: 0 },
    { x: -19, z: -24, type: 'medkit', elevateOnSurface: 0 },

    // Sector 2: Suburban Houses & Yards
    { x: -25, z: 76, type: 'food', elevateOnSurface: 0 },
    { x: -22, z: 74, type: 'water', elevateOnSurface: 0 },
    { x: 25, z: 76, type: 'ammo', elevateOnSurface: 0 },
    { x: 22, z: 74, type: 'food', elevateOnSurface: 0 },
    { x: -10, z: 62, type: 'medkit', elevateOnSurface: 0 },
    { x: 12, z: 62, type: 'water', elevateOnSurface: 0 },

    // Sector 3: Highway Gas Station Convenience Store & Canopy
    { x: 81.8, z: 7.2, type: 'food', elevateOnSurface: 1.1 }, // Convenience store checkout counter
    { x: 86.8, z: 5.8, type: 'water', elevateOnSurface: 0 },  // Snack aisle floor
    { x: 85, z: 3.8, type: 'ammo', elevateOnSurface: 0 },    // Cooler corner
    { x: 105, z: 4, type: 'ammo', elevateOnSurface: 1.1 },    // Truck cargo bed outside
    { x: 55, z: 1, type: 'water', elevateOnSurface: 0 },     // Highway checkpoint

    // Sector 4: Quarantine Field Hospital Emergency Clinic
    { x: -15, z: -92.5, type: 'medkit', elevateOnSurface: 1.0 }, // Medical desk
    { x: -19.5, z: -88, type: 'medkit', elevateOnSurface: 0.8 },  // Examination gurney
    { x: -12, z: -87, type: 'water', elevateOnSurface: 0 },      // Clinic floor
    { x: -14, z: -82, type: 'food', elevateOnSurface: 0 },       // Triage tent
    { x: 14, z: -82, type: 'ammo', elevateOnSurface: 0 },        // Sandbag checkpoint

    // Sector 5: Industrial Warehouse Depot
    { x: 126, z: 70, type: 'ammo', elevateOnSurface: 0 },
    { x: 130, z: 72, type: 'ammo', elevateOnSurface: 0 },
    { x: 124, z: 68, type: 'medkit', elevateOnSurface: 0 },
    { x: 134, z: 68, type: 'food', elevateOnSurface: 0 },

    // Sector 6: Forest Ranger Cabin & Logging Trail
    { x: -102.2, z: 22.2, type: 'ammo', elevateOnSurface: 0.9 }, // Cabin desk top
    { x: -108, z: 23.5, type: 'food', elevateOnSurface: 0.8 },   // Cabin bunk bed
    { x: -105, z: 26, type: 'water', elevateOnSurface: 0 },      // Cabin floor
    { x: -85, z: 22, type: 'medkit', elevateOnSurface: 0 },      // Trail clearing
    { x: -70, z: -15, type: 'food', elevateOnSurface: 0 },       // Forest grove
    { x: -135, z: 20, type: 'ammo', elevateOnSurface: 0 },       // Mountain ridge

    // Roadside abandoned vehicles
    { x: -16, z: -5, type: 'ammo', elevateOnSurface: 0.8 },     // Police cruiser hood
    { x: -2.5, z: -17.5, type: 'water', elevateOnSurface: 0.75 },// Sedan trunk
    { x: 3.2, z: 16.5, type: 'food', elevateOnSurface: 0.8 },    // Pickup truck cargo bed
  ];

  // Ground, elevate, and validate each supply position
  const supplies: { pos: THREE.Vector3; type: ItemType }[] = [];
  rawSupplyCandidates.forEach((cand) => {
    let px = cand.x;
    let pz = cand.z;

    // Validate: if candidate is inside a solid wall or obstacle collider, find nearest clear spot
    if (isSupplyObstructed(px, pz, colliders)) {
      let foundClear = false;
      const searchRadii = [1.0, 1.8, 2.8, 3.8];
      for (const r of searchRadii) {
        if (foundClear) break;
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
          const testX = cand.x + Math.cos(a) * r;
          const testZ = cand.z + Math.sin(a) * r;
          if (!isSupplyObstructed(testX, testZ, colliders)) {
            px = testX;
            pz = testZ;
            foundClear = true;
            break;
          }
        }
      }
      if (!foundClear) {
        // Safe downtown open road fallback
        px = 0;
        pz = -6;
      }
    }

    const surfaceY = getWorldSurfaceHeight(px, pz);
    // True surface height plus exact prop elevation if on counter/table/desk
    const finalY = surfaceY + (cand.elevateOnSurface || 0);

    supplies.push({
      pos: new THREE.Vector3(px, finalY, pz),
      type: cand.type,
    });
  });

  // 11. Zombie Patrol Spawns Across All 6 Open-World Districts
  const rawZombieSpawns = [
    // Downtown Core
    { x: -12, z: -18 },
    { x: 14, z: -16 },
    { x: -16, z: 14 },
    { x: 15, z: 18 },
    // South Suburbia
    { x: -20, z: 65 },
    { x: 22, z: 70 },
    { x: 0, z: 85 },
    // East Highway & Gas Station
    { x: 50, z: 5 },
    { x: 82, z: 8 },
    { x: 92, z: 20 },
    // North Field Hospital
    { x: -10, z: -75 },
    { x: -22, z: -92 },
    { x: 12, z: -85 },
    // East Industrial Depot
    { x: 120, z: 65 },
    { x: 135, z: 80 },
    // West Whispering Pines Forest
    { x: -65, z: 5 },
    { x: -85, z: 20 },
    { x: -102, z: 35 },
    { x: -120, z: -10 },
  ];

  const zombies: THREE.Vector3[] = rawZombieSpawns.map((s) => {
    const gy = getWorldSurfaceHeight(s.x, s.z);
    return new THREE.Vector3(s.x, gy, s.z);
  });

  // Player Start Position (Grounded securely in Downtown Crossroad)
  const startX = 0;
  const startZ = 0;
  const startY = getWorldSurfaceHeight(startX, startZ) + 1.7;
  const player = new THREE.Vector3(startX, startY, startZ);

  // Safehouse Stash Footlocker in Forest Ranger Cabin
  const stashX = -101.5;
  const stashZ = 27.0;
  const stashY = getWorldSurfaceHeight(stashX, stashZ);
  const stashGroup = new THREE.Group();
  stashGroup.position.set(stashX, stashY, stashZ);

  const stashMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a2f,
    roughness: 0.6,
    metalness: 0.5,
  });
  const stashChest = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.65, 0.8), stashMat);
  stashChest.position.y = 0.325;
  stashChest.castShadow = true;
  stashGroup.add(stashChest);

  const latchMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.9 });
  const latch = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.08), latchMat);
  latch.position.set(0, 0.38, 0.42);
  stashGroup.add(latch);

  const stashGlow = new THREE.PointLight(0x10b981, 0.8, 4, 2);
  stashGlow.position.set(0, 0.7, 0);
  stashGroup.add(stashGlow);
  sceneGroup.add(stashGroup);

  const stashLocation = new THREE.Vector3(stashX, stashY + 0.35, stashZ);

  // Shelters & Safe Beds
  const shelters: ShelterBed[] = [
    {
      id: 'ranger_cabin_bed',
      name: 'Ranger Cabin Bunk',
      district: 'Whispering Pines',
      position: [-108.8, getWorldSurfaceHeight(-108.8, 22.0) + 0.8, 22.0],
    },
    {
      id: 'suburb_bed_a',
      name: 'Master Bed (West House)',
      district: 'South Suburbia',
      position: [-27.5, getWorldSurfaceHeight(-27.5, 75.0) + 0.5, 75.0],
    },
    {
      id: 'suburb_bed_b',
      name: 'Guest Bed (East House)',
      district: 'South Suburbia',
      position: [27.5, getWorldSurfaceHeight(27.5, 75.0) + 0.5, 75.0],
    },
    {
      id: 'clinic_gurney',
      name: 'Field Hospital Gurney',
      district: 'Quarantine Camp',
      position: [-10.5, getWorldSurfaceHeight(-10.5, -88.0) + 0.8, -88.0],
    },
  ];

  // Drivable 4x4 Vehicle Spawn Location (Highway forecourt near Gas Station)
  const vehX = 68;
  const vehZ = 4;
  const vehY = getWorldSurfaceHeight(vehX, vehZ) + 0.4;
  const vehicleSpawn = {
    pos: new THREE.Vector3(vehX, vehY, vehZ),
    rotationY: Math.PI / 2,
  };

  // Fuel Station Location (Pumps at Highway Gas Station)
  const fuelLocation = new THREE.Vector3(85, getWorldSurfaceHeight(85, 4) + 0.5, 4);

  return {
    sceneGroup,
    colliders,
    streetlights,
    windObjects,
    shelters,
    stashLocation,
    vehicleSpawn,
    fuelLocation,
    spawnPoints: {
      player,
      supplies,
      zombies,
    },
  };
}
