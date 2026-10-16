import * as THREE from 'three';
import { SupplyItem, ItemType } from '../types/game';
import {
  createMedkitTexture,
  createCannedFoodTexture,
  createWaterBottleTexture,
  createAmmoBoxTexture,
} from './textures';

export class SupplySystem {
  public items: SupplyItem[] = [];
  private itemGroup: THREE.Group = new THREE.Group();
  private medkitMat: THREE.MeshStandardMaterial;
  private cannedFoodMat: THREE.MeshStandardMaterial;
  private waterBottleMat: THREE.MeshPhysicalMaterial;
  private ammoBoxMat: THREE.MeshStandardMaterial;
  private metalRimMat: THREE.MeshStandardMaterial;
  private capMat: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene, initialSpawns: { pos: THREE.Vector3; type: ItemType }[]) {
    scene.add(this.itemGroup);

    // Prepare materials
    const medkitTex = createMedkitTexture();
    this.medkitMat = new THREE.MeshStandardMaterial({
      map: medkitTex,
      roughness: 0.4,
      metalness: 0.1,
    });

    const foodTex = createCannedFoodTexture();
    this.cannedFoodMat = new THREE.MeshStandardMaterial({
      map: foodTex,
      roughness: 0.5,
      metalness: 0.3,
    });

    const waterTex = createWaterBottleTexture();
    this.waterBottleMat = new THREE.MeshPhysicalMaterial({
      map: waterTex,
      color: 0x3b82f6,
      roughness: 0.2,
      transmission: 0.7,
      transparent: true,
      opacity: 0.85,
    });

    const ammoTex = createAmmoBoxTexture();
    this.ammoBoxMat = new THREE.MeshStandardMaterial({
      map: ammoTex,
      roughness: 0.5,
      metalness: 0.4,
    });

    this.metalRimMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.9,
      roughness: 0.2,
    });

    this.capMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      roughness: 0.5,
    });

    // Spawn items
    initialSpawns.forEach((spawn, idx) => {
      this.spawnItem(`item_${idx}`, spawn.type, spawn.pos);
    });
  }

  private spawnItem(id: string, type: ItemType, pos: THREE.Vector3) {
    const group = new THREE.Group();
    group.position.copy(pos);

    let name = 'Supplies';
    let description = '';
    let healAmount = 0;
    let foodAmount = 0;
    let waterAmount = 0;
    let ammoAmount = 0;

    if (type === 'medkit') {
      name = 'First Aid Kit';
      description = 'Restores 50 Health and stops bleeding';
      healAmount = 50;

      // Medkit Box
      const boxGeo = new THREE.BoxGeometry(0.5, 0.35, 0.22);
      const boxMesh = new THREE.Mesh(boxGeo, this.medkitMat);
      boxMesh.castShadow = true;
      group.add(boxMesh);

      // Handle
      const handleGeo = new THREE.TorusGeometry(0.08, 0.02, 6, 12, Math.PI);
      const handle = new THREE.Mesh(handleGeo, this.metalRimMat);
      handle.position.set(0, 0.18, 0);
      handle.rotation.z = Math.PI;
      group.add(handle);

      // Soft green/white beacon light
      const pLight = new THREE.PointLight(0x34d399, 0.8, 3.5);
      pLight.position.set(0, 0.3, 0);
      group.add(pLight);
    } else if (type === 'food') {
      name = 'Canned Rations';
      description = 'Replenishes 35 Hunger and 10 Health';
      foodAmount = 35;
      healAmount = 10;

      // Tin Can Cylinder
      const canGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.32, 16);
      const canMesh = new THREE.Mesh(canGeo, this.cannedFoodMat);
      canMesh.castShadow = true;
      group.add(canMesh);

      const rimGeo = new THREE.CylinderGeometry(0.165, 0.165, 0.03, 16);
      const topRim = new THREE.Mesh(rimGeo, this.metalRimMat);
      topRim.position.y = 0.15;
      const botRim = new THREE.Mesh(rimGeo, this.metalRimMat);
      botRim.position.y = -0.15;
      group.add(topRim);
      group.add(botRim);

      const pLight = new THREE.PointLight(0xf59e0b, 0.7, 3.0);
      pLight.position.set(0, 0.25, 0);
      group.add(pLight);
    } else if (type === 'water') {
      name = 'Purified Spring Water';
      description = 'Quenches 45 Thirst and restores Stamina';
      waterAmount = 45;

      const bottleGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.38, 16);
      const bottleMesh = new THREE.Mesh(bottleGeo, this.waterBottleMat);
      bottleMesh.castShadow = true;
      group.add(bottleMesh);

      const neckGeo = new THREE.CylinderGeometry(0.06, 0.12, 0.1, 12);
      const neck = new THREE.Mesh(neckGeo, this.waterBottleMat);
      neck.position.y = 0.24;
      group.add(neck);

      const capGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.05, 12);
      const cap = new THREE.Mesh(capGeo, this.capMat);
      cap.position.y = 0.31;
      group.add(cap);

      const pLight = new THREE.PointLight(0x38bdf8, 0.8, 3.0);
      pLight.position.set(0, 0.25, 0);
      group.add(pLight);
    } else if (type === 'ammo') {
      name = '5.56mm Ammo Box';
      description = 'Contains 18 rounds of military rifle ammunition';
      ammoAmount = 18;

      // Heavy olive drab steel ammo can (Box + Lid + Carry handle)
      const canGeo = new THREE.BoxGeometry(0.42, 0.26, 0.22);
      const canMesh = new THREE.Mesh(canGeo, this.ammoBoxMat);
      canMesh.castShadow = true;
      group.add(canMesh);

      // Steel Latch
      const latchGeo = new THREE.BoxGeometry(0.08, 0.12, 0.04);
      const latch = new THREE.Mesh(latchGeo, this.metalRimMat);
      latch.position.set(0, 0, 0.12);
      group.add(latch);

      // Handle
      const handleGeo = new THREE.BoxGeometry(0.2, 0.03, 0.04);
      const handle = new THREE.Mesh(handleGeo, this.metalRimMat);
      handle.position.set(0, 0.14, 0);
      group.add(handle);

      // Golden/Amber ammo beacon light
      const pLight = new THREE.PointLight(0xfbbf24, 0.85, 3.5);
      pLight.position.set(0, 0.28, 0);
      group.add(pLight);
    }

    this.itemGroup.add(group);

    this.items.push({
      id,
      type,
      name,
      description,
      position: [pos.x, pos.y, pos.z],
      meshGroup: group,
      collected: false,
      healAmount,
      foodAmount,
      waterAmount,
      ammoAmount,
    });
  }

  public update(dt: number, totalTime: number) {
    for (const item of this.items) {
      if (item.collected || !item.meshGroup) continue;
      const g = item.meshGroup;
      g.rotation.y += dt * 1.2;
      g.position.y = item.position[1] + Math.sin(totalTime * 2.5 + item.position[0]) * 0.08;
    }
  }

  public getNearbyItem(playerPos: THREE.Vector3, reachDist: number = 2.4): SupplyItem | null {
    let closestItem: SupplyItem | null = null;
    let closestDistSq = reachDist * reachDist;

    for (const item of this.items) {
      if (item.collected) continue;
      const dx = playerPos.x - item.position[0];
      const dy = playerPos.y - item.position[1];
      const dz = playerPos.z - item.position[2];
      const dSq = dx * dx + dy * dy + dz * dz;

      if (dSq < closestDistSq) {
        closestDistSq = dSq;
        closestItem = item;
      }
    }

    return closestItem;
  }

  public collectItem(id: string): SupplyItem | null {
    const item = this.items.find((i) => i.id === id);
    if (!item || item.collected) return null;

    item.collected = true;
    if (item.meshGroup) {
      this.itemGroup.remove(item.meshGroup);
    }
    return item;
  }

  public reset(initialSpawns: { pos: THREE.Vector3; type: ItemType }[]) {
    while (this.itemGroup.children.length > 0) {
      this.itemGroup.remove(this.itemGroup.children[0]);
    }
    this.items = [];
    initialSpawns.forEach((spawn, idx) => {
      this.spawnItem(`item_${idx}`, spawn.type, spawn.pos);
    });
  }

  public dispose() {
    while (this.itemGroup.children.length > 0) {
      this.itemGroup.remove(this.itemGroup.children[0]);
    }
    this.medkitMat.dispose();
    this.cannedFoodMat.dispose();
    this.waterBottleMat.dispose();
    this.ammoBoxMat.dispose();
    this.metalRimMat.dispose();
    this.capMat.dispose();
  }
}
