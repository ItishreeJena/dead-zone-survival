import * as THREE from 'three';
import { BoxCollider, ItemType } from '../types/game';
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

  // Reusable Materials
  const asphaltTex = createAsphaltTexture();
  asphaltTex.repeat.set(2, 22);
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
    color: 0x223624,
    roughness: 0.9,
    flatShading: true,
  });

  const shrubMat = new THREE.MeshStandardMaterial({
    color: 0x3d4a2d,
    roughness: 0.95,
    flatShading: true,
  });

  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x4a4d48,
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

  // 1. Varied Natural Terrain with subtle elevation banks
  const terrainGeo = new THREE.PlaneGeometry(240, 240, 48, 48);
  const posAttr = terrainGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i); // In 2D plane geometry, Y is the second horizontal axis

    // Keep roads and main downtown crossroad flat
    const distToCenter = Math.sqrt(x * x + y * y);
    const isRoadZone = (Math.abs(x) < 8.5 || Math.abs(y) < 8.5) && distToCenter < 55;

    if (!isRoadZone && distToCenter > 18) {
      // Gentle undulating hills and berms on outskirts
      const hill =
        Math.sin(x * 0.06) * Math.cos(y * 0.06) * 1.8 +
        Math.sin(x * 0.02 + y * 0.03) * 2.2;
      posAttr.setZ(i, Math.max(0, hill * Math.min(1, (distToCenter - 18) / 30)));
    }
  }
  terrainGeo.computeVertexNormals();

  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x252a22, // Dark overgrown desolate soil
    roughness: 0.95,
    metalness: 0.05,
  });
  const terrain = new THREE.Mesh(terrainGeo, groundMat);
  terrain.rotation.x = -Math.PI / 2;
  terrain.receiveShadow = true;
  sceneGroup.add(terrain);

  // 2. Roads & Sidewalks
  const mainRoadGeo = new THREE.PlaneGeometry(12, 110);
  const mainRoad = new THREE.Mesh(mainRoadGeo, roadMat);
  mainRoad.rotation.x = -Math.PI / 2;
  mainRoad.position.set(0, 0.03, 0);
  mainRoad.receiveShadow = true;
  sceneGroup.add(mainRoad);

  const crossRoadGeo = new THREE.PlaneGeometry(110, 10);
  const crossRoad = new THREE.Mesh(crossRoadGeo, roadMat);
  crossRoad.rotation.x = -Math.PI / 2;
  crossRoad.position.set(0, 0.04, 0);
  crossRoad.receiveShadow = true;
  sceneGroup.add(crossRoad);

  function createSidewalk(x: number, z: number, w: number, l: number) {
    const swGeo = new THREE.BoxGeometry(w, 0.16, l);
    const swMesh = new THREE.Mesh(swGeo, concreteMat);
    swMesh.position.set(x, 0.08, z);
    swMesh.receiveShadow = true;
    sceneGroup.add(swMesh);
  }

  createSidewalk(-10, -32, 6, 50);
  createSidewalk(10, -32, 6, 50);
  createSidewalk(-10, 32, 6, 50);
  createSidewalk(10, 32, 6, 50);
  createSidewalk(-32, -8.5, 36, 5);
  createSidewalk(32, -8.5, 36, 5);
  createSidewalk(-32, 8.5, 36, 5);
  createSidewalk(32, 8.5, 36, 5);

  // 3. Multi-part Ruined Buildings with Distinct Architectures
  // Building A: Two-Story Ruined Town Hall / Armory (North-West)
  function createArmoryBuilding(cx: number, cz: number) {
    const bGroup = new THREE.Group();
    bGroup.position.set(cx, 0, cz);

    const w = 18;
    const h = 7.5;
    const d = 16;
    const wallThick = 0.5;

    // Foundation
    const fMesh = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.4, d + 0.6), concreteMat);
    fMesh.position.set(0, 0.2, 0);
    fMesh.receiveShadow = true;
    bGroup.add(fMesh);

    // Front Wall with double doorway
    const doorW = 3.2;
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

    // Front Classical Pillars
    for (let i = -1; i <= 1; i += 2) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, h, 10), concreteMat);
      col.position.set(i * 3.5, h / 2, d / 2 + 1.2);
      col.castShadow = true;
      bGroup.add(col);
      colliders.push({ minX: cx + i * 3.5 - 0.4, maxX: cx + i * 3.5 + 0.4, minZ: cz + d / 2 + 0.8, maxZ: cz + d / 2 + 1.6 });
    }

    // Back & Side Walls
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(w, h, wallThick), brickMat);
    backWall.position.set(0, h / 2, -d / 2);
    backWall.castShadow = true;
    bGroup.add(backWall);

    const sideL = new THREE.Mesh(new THREE.BoxGeometry(wallThick, h, d), brickMat);
    sideL.position.set(-w / 2, h / 2, 0);
    sideL.castShadow = true;
    bGroup.add(sideL);

    const sideR = new THREE.Mesh(new THREE.BoxGeometry(wallThick, h, d), brickMat);
    sideR.position.set(w / 2, h / 2, 0);
    sideR.castShadow = true;
    bGroup.add(sideR);

    // Second floor mezzanine (half collapsed)
    const floor2 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.25, d * 0.5), woodMat);
    floor2.position.set(-w * 0.15, 3.6, -d * 0.2);
    bGroup.add(floor2);

    // Partial ruined roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.3, d * 0.6), concreteMat);
    roof.position.set(0, h, -d * 0.1);
    bGroup.add(roof);

    sceneGroup.add(bGroup);

    // Colliders
    colliders.push({ minX: cx - w / 2, maxX: cx - doorW / 2, minZ: cz + d / 2 - 0.3, maxZ: cz + d / 2 + 0.3 });
    colliders.push({ minX: cx + doorW / 2, maxX: cx + w / 2, minZ: cz + d / 2 - 0.3, maxZ: cz + d / 2 + 0.3 });
    colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2 - 0.3, maxZ: cz - d / 2 + 0.3 });
    colliders.push({ minX: cx - w / 2 - 0.3, maxX: cx - w / 2 + 0.3, minZ: cz - d / 2, maxZ: cz + d / 2 });
    colliders.push({ minX: cx + w / 2 - 0.3, maxX: cx + w / 2 + 0.3, minZ: cz - d / 2, maxZ: cz + d / 2 });
  }

  createArmoryBuilding(-24, -28);

  // Building B: Gas Station / Workshop with Canopy (South-East)
  function createGasStation(cx: number, cz: number) {
    const gsGroup = new THREE.Group();
    gsGroup.position.set(cx, 0, cz);

    // Store building
    const storeW = 12;
    const storeH = 4.8;
    const storeD = 10;
    const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(storeW, storeH, storeD), brickMat);
    wallMesh.position.set(0, storeH / 2, -6);
    wallMesh.castShadow = true;
    gsGroup.add(wallMesh);
    colliders.push({ minX: cx - storeW / 2, maxX: cx + storeW / 2, minZ: cz - 6 - storeD / 2, maxZ: cz - 6 + storeD / 2 });

    // Forecourt Canopy with rusted metal corrugated roof
    const canopyW = 14;
    const canopyD = 9;
    const canopyH = 4.6;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(canopyW, 0.4, canopyD), rustMat);
    roof.position.set(0, canopyH, 4);
    roof.castShadow = true;
    gsGroup.add(roof);

    // 2 Canopy Support Posts
    for (const px of [-4.5, 4.5]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, canopyH, 8), darkMetalMat);
      post.position.set(px, canopyH / 2, 4);
      post.castShadow = true;
      gsGroup.add(post);
      colliders.push({ minX: cx + px - 0.3, maxX: cx + px + 0.3, minZ: cz + 4 - 0.3, maxZ: cz + 4 + 0.3 });
    }

    // 2 Gas Pump Islands
    for (const pz of [2.2, 5.8]) {
      const island = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 0.8), concreteMat);
      island.position.set(0, 0.1, pz);
      gsGroup.add(island);

      const pump = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 0.5), rustMat);
      pump.position.set(0, 0.9, pz);
      pump.castShadow = true;
      gsGroup.add(pump);
      colliders.push({ minX: cx - 0.8, maxX: cx + 0.8, minZ: cz + pz - 0.35, maxZ: cz + pz + 0.35 });
    }

    sceneGroup.add(gsGroup);
  }

  createGasStation(24, 26);

  // Building C: Abandoned Pharmacy & Market (North-East)
  function createMarketBuilding(cx: number, cz: number) {
    const mGroup = new THREE.Group();
    mGroup.position.set(cx, 0, cz);

    const w = 15;
    const h = 5.5;
    const d = 15;
    const wallThick = 0.5;

    // Foundation
    const f = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.3, d + 0.4), concreteMat);
    f.position.set(0, 0.15, 0);
    mGroup.add(f);

    // Front Wall with wide display window openings
    const doorW = 2.4;
    const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(5.8, h, wallThick), brickMat);
    wallLeft.position.set(-w / 2 + 2.9, h / 2, d / 2);
    wallLeft.castShadow = true;
    mGroup.add(wallLeft);

    const wallRight = new THREE.Mesh(new THREE.BoxGeometry(5.8, h, wallThick), brickMat);
    wallRight.position.set(w / 2 - 2.9, h / 2, d / 2);
    wallRight.castShadow = true;
    mGroup.add(wallRight);

    const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorW, h - 3.0, wallThick), brickMat);
    lintel.position.set(0, 3.0 + (h - 3.0) / 2, d / 2);
    mGroup.add(lintel);

    // Back & Sides
    const back = new THREE.Mesh(new THREE.BoxGeometry(w, h, wallThick), brickMat);
    back.position.set(0, h / 2, -d / 2);
    back.castShadow = true;
    mGroup.add(back);

    const left = new THREE.Mesh(new THREE.BoxGeometry(wallThick, h, d), brickMat);
    left.position.set(-w / 2, h / 2, 0);
    left.castShadow = true;
    mGroup.add(left);

    const right = new THREE.Mesh(new THREE.BoxGeometry(wallThick, h, d), brickMat);
    right.position.set(w / 2, h / 2, 0);
    right.castShadow = true;
    mGroup.add(right);

    // Collapsed ceiling
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.75, 0.25, d * 0.75), concreteMat);
    roof.position.set(-w * 0.1, h, -d * 0.1);
    roof.rotation.z = 0.04;
    mGroup.add(roof);

    sceneGroup.add(mGroup);

    colliders.push({ minX: cx - w / 2, maxX: cx - doorW / 2, minZ: cz + d / 2 - 0.3, maxZ: cz + d / 2 + 0.3 });
    colliders.push({ minX: cx + doorW / 2, maxX: cx + w / 2, minZ: cz + d / 2 - 0.3, maxZ: cz + d / 2 + 0.3 });
    colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2 - 0.3, maxZ: cz - d / 2 + 0.3 });
    colliders.push({ minX: cx - w / 2 - 0.3, maxX: cx - w / 2 + 0.3, minZ: cz - d / 2, maxZ: cz + d / 2 });
    colliders.push({ minX: cx + w / 2 - 0.3, maxX: cx + w / 2 + 0.3, minZ: cz - d / 2, maxZ: cz + d / 2 });
  }

  createMarketBuilding(24, -28);

  // Building D: Ruined Residential House (South-West)
  function createRuinedHouse(cx: number, cz: number) {
    const hGroup = new THREE.Group();
    hGroup.position.set(cx, 0, cz);

    const w = 14;
    const h = 5.2;
    const d = 14;
    const wallThick = 0.45;

    // Front with porch
    const porch = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, 3), woodMat);
    porch.position.set(0, 0.1, d / 2 + 1.5);
    hGroup.add(porch);

    const doorW = 2.0;
    const leftW = new THREE.Mesh(new THREE.BoxGeometry((w - doorW) / 2, h, wallThick), woodMat);
    leftW.position.set(-w / 4 - doorW / 4, h / 2, d / 2);
    leftW.castShadow = true;
    hGroup.add(leftW);

    const rightW = new THREE.Mesh(new THREE.BoxGeometry((w - doorW) / 2, h, wallThick), woodMat);
    rightW.position.set(w / 4 + doorW / 4, h / 2, d / 2);
    rightW.castShadow = true;
    hGroup.add(rightW);

    const backW = new THREE.Mesh(new THREE.BoxGeometry(w, h, wallThick), woodMat);
    backW.position.set(0, h / 2, -d / 2);
    hGroup.add(backW);

    const sideL = new THREE.Mesh(new THREE.BoxGeometry(wallThick, h, d), woodMat);
    sideL.position.set(-w / 2, h / 2, 0);
    hGroup.add(sideL);

    const sideR = new THREE.Mesh(new THREE.BoxGeometry(wallThick, h, d), woodMat);
    sideR.position.set(w / 2, h / 2, 0);
    hGroup.add(sideR);

    // Gabled Roof
    const roofP1 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, 0.2, d + 1), woodMat);
    roofP1.position.set(-w * 0.25, h + 1.2, 0);
    roofP1.rotation.z = 0.4;
    hGroup.add(roofP1);

    sceneGroup.add(hGroup);

    colliders.push({ minX: cx - w / 2, maxX: cx - doorW / 2, minZ: cz + d / 2 - 0.3, maxZ: cz + d / 2 + 0.3 });
    colliders.push({ minX: cx + doorW / 2, maxX: cx + w / 2, minZ: cz + d / 2 - 0.3, maxZ: cz + d / 2 + 0.3 });
    colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2 - 0.3, maxZ: cz - d / 2 + 0.3 });
    colliders.push({ minX: cx - w / 2 - 0.3, maxX: cx - w / 2 + 0.3, minZ: cz - d / 2, maxZ: cz + d / 2 });
    colliders.push({ minX: cx + w / 2 - 0.3, maxX: cx + w / 2 + 0.3, minZ: cz - d / 2, maxZ: cz + d / 2 });
  }

  createRuinedHouse(-24, 28);

  // 4. Abandoned Vehicles with Detailed Parts (Sedans, Trucks, Police Cruiser)
  function createVehicle(
    x: number,
    z: number,
    rotY: number,
    type: 'sedan' | 'truck' | 'police' = 'sedan',
    rustColor: number = 0x5a2016
  ) {
    const vGroup = new THREE.Group();
    vGroup.position.set(x, 0, z);
    vGroup.rotation.y = rotY;

    const bodyMat = new THREE.MeshStandardMaterial({
      color: type === 'police' ? 0x1a242c : rustColor,
      roughness: 0.65,
      metalness: 0.45,
    });

    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x141416,
      roughness: 0.9,
    });

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
    cabin.castShadow = true;
    vGroup.add(cabin);

    // Windshield
    const ws = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.65), glassMat);
    ws.position.set(0, 1.45, cabinZ + cabinL / 2 + 0.02);
    ws.rotation.x = -0.3;
    vGroup.add(ws);

    // Wheels
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
      wheel.castShadow = true;
      vGroup.add(wheel);
    });

    // Police lightbar if police cruiser
    if (type === 'police') {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.25), darkMetalMat);
      bar.position.set(0, 1.85, cabinZ);
      const sirenL = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.1, 0.2), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      sirenL.position.set(-0.3, 1.9, cabinZ);
      const sirenR = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.1, 0.2), new THREE.MeshBasicMaterial({ color: 0x3b82f6 }));
      sirenR.position.set(0.3, 1.9, cabinZ);
      vGroup.add(bar);
      vGroup.add(sirenL);
      vGroup.add(sirenR);
    }

    sceneGroup.add(vGroup);

    const halfDiag = Math.max(bodyW, bodyL) / 1.7;
    colliders.push({ minX: x - halfDiag, maxX: x + halfDiag, minZ: z - halfDiag, maxZ: z + halfDiag });
  }

  createVehicle(-2.5, -15, 0.25, 'sedan', 0x5a2016);
  createVehicle(3.2, 14, -0.4, 'truck', 0x22354a);
  createVehicle(-16, -3, 1.4, 'police');
  createVehicle(16, 2, -1.2, 'sedan', 0x3d3d3d);
  createVehicle(-1, 38, 0.15, 'truck', 0x4d281a);
  createVehicle(2, -38, -0.2, 'sedan', 0x6e3820);

  // 5. Instanced Natural Rocks & Boulders (Zero-lag 60fps)
  const rockGeo = new THREE.DodecahedronGeometry(1.0, 1);
  const rockCount = 38;
  const rockInstanced = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
  rockInstanced.castShadow = true;
  rockInstanced.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const rockSpawns = [
    [-15, -12], [14, -14], [-18, 16], [16, 18], [-36, -20], [35, -18],
    [-38, 22], [36, 24], [-8, 25], [8, -25], [-26, 4], [28, -6],
    [-46, -10], [45, 12], [-48, 30], [48, -32], [-14, -40], [15, 42],
    [-30, -42], [32, 44], [-4, -48], [6, 48], [-44, 4], [44, -4],
    [-12, 8], [12, -8], [-22, -16], [24, 14], [-34, 10], [33, -12],
    [-40, -35], [42, 38], [-28, 38], [26, -42], [-50, -2], [50, 2],
    [-2, -26], [3, 28]
  ];

  rockSpawns.forEach(([rx, rz], idx) => {
    const s = 0.6 + Math.random() * 0.9;
    dummy.position.set(rx, s * 0.45, rz);
    dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    dummy.scale.set(s * (0.8 + Math.random() * 0.4), s, s * (0.8 + Math.random() * 0.4));
    dummy.updateMatrix();
    rockInstanced.setMatrixAt(idx, dummy.matrix);

    colliders.push({ minX: rx - s * 0.6, maxX: rx + s * 0.6, minZ: rz - s * 0.6, maxZ: rz + s * 0.6 });
  });
  rockInstanced.instanceMatrix.needsUpdate = true;
  sceneGroup.add(rockInstanced);

  // 6. Lush Conifer Pine Trees & Dead Gnarled Oaks
  function createPineTree(x: number, z: number) {
    const tGroup = new THREE.Group();
    tGroup.position.set(x, 0, z);

    // Trunk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.45, 6, 8), darkMetalMat);
    trunk.position.y = 3;
    trunk.castShadow = true;
    tGroup.add(trunk);

    // 3 Tiers of Pine Needle Cones
    const tiers = [
      { y: 3.5, r: 2.4, h: 2.8 },
      { y: 5.2, r: 1.8, h: 2.4 },
      { y: 6.8, r: 1.1, h: 2.0 },
    ];
    tiers.forEach((t) => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(t.r, t.h, 7), pineNeedleMat);
      cone.position.y = t.y;
      cone.castShadow = true;
      tGroup.add(cone);
    });

    sceneGroup.add(tGroup);
    windObjects.push(tGroup); // Will gently sway with wind in the game loop!
    colliders.push({ minX: x - 0.4, maxX: x + 0.4, minZ: z - 0.4, maxZ: z + 0.4 });
  }

  function createDeadTree(x: number, z: number) {
    const tGroup = new THREE.Group();
    tGroup.position.set(x, 0, z);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.4, 5.2, 7), darkMetalMat);
    trunk.position.y = 2.6;
    trunk.rotation.z = (Math.random() - 0.5) * 0.15;
    trunk.castShadow = true;
    tGroup.add(trunk);

    for (let i = 0; i < 4; i++) {
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.15, 2.6, 5), darkMetalMat);
      branch.position.set(0, 3.6 + i * 0.35, 0);
      branch.rotation.y = (i * Math.PI) / 2 + Math.random() * 0.4;
      branch.rotation.z = 0.65 + Math.random() * 0.3;
      branch.castShadow = true;
      tGroup.add(branch);
    }

    sceneGroup.add(tGroup);
    windObjects.push(tGroup);
    colliders.push({ minX: x - 0.45, maxX: x + 0.45, minZ: z - 0.45, maxZ: z + 0.45 });
  }

  // Pine Forest & Dead Tree Clusters
  createPineTree(-14, -22);
  createPineTree(14, -24);
  createPineTree(-18, 22);
  createPineTree(18, 18);
  createPineTree(-36, -30);
  createPineTree(36, -32);
  createPineTree(-38, 34);
  createPineTree(38, 36);
  createPineTree(-46, -18);
  createPineTree(46, 20);

  createDeadTree(-11, -17);
  createDeadTree(12, 14);
  createDeadTree(-32, 2);
  createDeadTree(34, 4);

  // 7. Instanced Bushes & Overgrowth Tufts
  const bushGeo = new THREE.DodecahedronGeometry(0.9, 1);
  const bushCount = 42;
  const bushInstanced = new THREE.InstancedMesh(bushGeo, shrubMat, bushCount);
  bushInstanced.castShadow = true;

  const bushSpawns = [
    [-8, -14], [9, -16], [-12, 12], [10, 14], [-20, -18], [22, -20],
    [-24, 18], [25, 16], [-30, -12], [32, 10], [-40, -14], [42, 16],
    [-15, 30], [16, -30], [-6, 32], [7, -34], [-28, 32], [29, -36],
    [-34, -24], [35, 26], [-42, 28], [44, -28], [-4, -18], [5, 20],
    [-19, -8], [20, 8], [-26, -6], [27, 6], [-33, 18], [34, -16],
    [-37, -6], [39, 8], [-45, 10], [47, -12], [-11, -38], [13, 38],
    [-21, 42], [23, -42], [-47, -38], [49, 40], [-3, 44], [4, -46]
  ];

  bushSpawns.forEach(([bx, bz], idx) => {
    const s = 0.7 + Math.random() * 0.5;
    dummy.position.set(bx, s * 0.55, bz);
    dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
    dummy.scale.set(s * 1.3, s * 0.85, s * 1.2);
    dummy.updateMatrix();
    bushInstanced.setMatrixAt(idx, dummy.matrix);
  });
  bushInstanced.instanceMatrix.needsUpdate = true;
  sceneGroup.add(bushInstanced);

  // 8. Streetlights with Automatic Night Activation
  function createStreetlight(x: number, z: number, lightFacing: number = 0) {
    const slGroup = new THREE.Group();
    slGroup.position.set(x, 0, z);

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

    const pLight = new THREE.PointLight(0xffa238, 1.4, 24, 1.8);
    const worldPos = new THREE.Vector3(0, 5.5, 1.6).applyAxisAngle(new THREE.Vector3(0, 1, 0), lightFacing).add(new THREE.Vector3(x, 0, z));
    pLight.position.copy(worldPos);
    sceneGroup.add(pLight);
    streetlights.push(pLight);

    colliders.push({ minX: x - 0.3, maxX: x + 0.3, minZ: z - 0.3, maxZ: z + 0.3 });
  }

  createStreetlight(-6.5, -20, Math.PI / 2);
  createStreetlight(6.5, -4, -Math.PI / 2);
  createStreetlight(-6.5, 20, Math.PI / 2);
  createStreetlight(6.5, 36, -Math.PI / 2);

  // 9. Barricades, Crates, Barrels
  function createBarricade(x: number, z: number, rotY: number) {
    const bGroup = new THREE.Group();
    bGroup.position.set(x, 0, z);
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
  createBarricade(-38, 0, Math.PI / 2);
  createBarricade(38, 0, Math.PI / 2);

  function createCrate(x: number, y: number, z: number, s: number = 1.0) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), woodMat);
    crate.position.set(x, y + s / 2, z);
    crate.castShadow = true;
    crate.receiveShadow = true;
    sceneGroup.add(crate);
    colliders.push({ minX: x - s / 2, maxX: x + s / 2, minZ: z - s / 2, maxZ: z + s / 2 });
  }

  createCrate(-7.5, 0, -10, 1.1);
  createCrate(-7.5, 0, -11.2, 1.0);
  createCrate(7.2, 0, 8, 1.2);
  createCrate(8.4, 0, 8.5, 1.0);

  function createBarrel(x: number, z: number, rust: boolean = true) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.1, 12), rust ? rustMat : darkMetalMat);
    barrel.position.set(x, 0.55, z);
    barrel.castShadow = true;
    sceneGroup.add(barrel);
    colliders.push({ minX: x - 0.45, maxX: x + 0.45, minZ: z - 0.45, maxZ: z + 0.45 });
  }

  createBarrel(-6.8, -12);
  createBarrel(6.8, 10);
  createBarrel(23, -15);
  createBarrel(-20, 16);

  // 10. Perimeter Boundary Fences
  const perimeterRadius = 54;
  colliders.push({ minX: -perimeterRadius, maxX: perimeterRadius, minZ: -perimeterRadius - 2, maxZ: -perimeterRadius });
  colliders.push({ minX: -perimeterRadius, maxX: perimeterRadius, minZ: perimeterRadius, maxZ: perimeterRadius + 2 });
  colliders.push({ minX: -perimeterRadius - 2, maxX: -perimeterRadius, minZ: -perimeterRadius, maxZ: perimeterRadius });
  colliders.push({ minX: perimeterRadius, maxX: perimeterRadius + 2, minZ: -perimeterRadius, maxZ: perimeterRadius });

  function createFenceSegment(x: number, z: number, length: number, isVertical: boolean) {
    const fence = new THREE.Mesh(
      new THREE.BoxGeometry(isVertical ? 0.2 : length, 2.5, isVertical ? length : 0.2),
      new THREE.MeshStandardMaterial({ color: 0x484d52, roughness: 0.8, metalness: 0.6, wireframe: true })
    );
    fence.position.set(x, 1.25, z);
    sceneGroup.add(fence);
  }

  createFenceSegment(0, -perimeterRadius, 108, false);
  createFenceSegment(0, perimeterRadius, 108, false);
  createFenceSegment(-perimeterRadius, 0, 108, true);
  createFenceSegment(perimeterRadius, 0, 108, true);

  // 11. Strategic Supply Item Spawns (Food, Water, Medkit, and Ammunition!)
  const supplies: { pos: THREE.Vector3; type: ItemType }[] = [
    // Police Station / Armory (Rich in Ammo & Medkits)
    { pos: new THREE.Vector3(-24, 0.4, -28), type: 'ammo' },
    { pos: new THREE.Vector3(-21, 0.4, -25), type: 'ammo' },
    { pos: new THREE.Vector3(-26, 0.4, -27), type: 'medkit' },

    // Gas Station / Workshop (Ammo in trunk + Water)
    { pos: new THREE.Vector3(24, 0.4, 26), type: 'ammo' },
    { pos: new THREE.Vector3(26, 0.4, 28), type: 'water' },

    // Pharmacy / Market (Medkit + Food + Water)
    { pos: new THREE.Vector3(24, 0.4, -28), type: 'medkit' },
    { pos: new THREE.Vector3(26, 0.4, -26), type: 'food' },
    { pos: new THREE.Vector3(21, 0.4, -29), type: 'water' },

    // Ruined Suburban House (Food + Water + Ammo)
    { pos: new THREE.Vector3(-24, 0.4, 28), type: 'food' },
    { pos: new THREE.Vector3(-21, 0.4, 26), type: 'ammo' },
    { pos: new THREE.Vector3(-26, 0.4, 30), type: 'water' },

    // Abandoned Vehicles & Alleys
    { pos: new THREE.Vector3(-16, 0.5, -4.5), type: 'ammo' },  // Police Cruiser trunk!
    { pos: new THREE.Vector3(-2.5, 0.5, -17), type: 'water' },
    { pos: new THREE.Vector3(3.2, 0.5, 16.5), type: 'food' },
    { pos: new THREE.Vector3(-7.5, 0.4, -9), type: 'food' },
    { pos: new THREE.Vector3(8.5, 0.4, 7), type: 'medkit' },
    { pos: new THREE.Vector3(0, 0.4, -36), type: 'ammo' },
  ];

  // 12. Zombie Patrol Spawn Positions
  const zombies: THREE.Vector3[] = [
    new THREE.Vector3(-12, 0, -22),
    new THREE.Vector3(15, 0, -20),
    new THREE.Vector3(-2, 0, -32),
    new THREE.Vector3(-18, 0, 15),
    new THREE.Vector3(16, 0, 22),
    new THREE.Vector3(2, 0, 35),
    new THREE.Vector3(-32, 0, -6),
    new THREE.Vector3(30, 0, 10),
    new THREE.Vector3(-25, 0, 24),
    new THREE.Vector3(25, 0, -18),
  ];

  const player = new THREE.Vector3(0, 1.7, 0);

  return {
    sceneGroup,
    colliders,
    streetlights,
    windObjects,
    spawnPoints: {
      player,
      supplies,
      zombies,
    },
  };
}
