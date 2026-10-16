import * as THREE from 'three';

/**
 * Unified Terrain Surface Engine for DEAD ZONE: SURVIVAL
 * 
 * Provides a single mathematical ground-height function `getTerrainHeight(x, z)`
 * used consistently by:
 * - Terrain geometry vertex displacement
 * - Player movement & grounding (never falls through, smoothly navigates hills)
 * - Zombie movement & limb placement (feet always firmly grounded)
 * - Supply item spawning & hovering (never buried in ground, rocks, or below floors)
 */

export interface RoadMask {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  width: number;
}

// Key roads and flat zones where terrain is automatically flattened
const ROAD_MASKS: RoadMask[] = [
  // Downtown Main Crossroad (North-South Avenue)
  { x1: 0, z1: -130, x2: 0, z2: 120, width: 13 },
  // East-West Highway connecting Forest to Gas Station & Warehouse
  { x1: -140, z1: 0, x2: 150, z2: 0, width: 12 },
  // South Suburbia Boulevard
  { x1: -30, z1: 65, x2: 30, z2: 65, width: 10 },
  // North Hospital Access Road
  { x1: -25, z1: -85, x2: 25, z2: -85, width: 10 },
  // Industrial Depot Highway Spur
  { x1: 75, z1: 0, x2: 130, z2: 80, width: 10 },
];

// District Flat Zones (building footprints where ground is leveled)
interface FlatZone {
  cx: number;
  cz: number;
  radius: number;
  baseHeight: number;
}

const FLAT_ZONES: FlatZone[] = [
  // Downtown Core
  { cx: 0, cz: 0, radius: 42, baseHeight: 0 },
  // Suburbia
  { cx: 0, cz: 75, radius: 38, baseHeight: 0.2 },
  // Highway Gas Station & Diner
  { cx: 85, cz: 10, radius: 36, baseHeight: 0.1 },
  // Quarantine Field Hospital
  { cx: -15, cz: -85, radius: 40, baseHeight: 0.3 },
  // Industrial Warehouse & Rail Depot
  { cx: 125, cz: 75, radius: 45, baseHeight: 0.2 },
  // Forest Ranger Cabin
  { cx: -105, cz: 25, radius: 24, baseHeight: 2.2 },
];

/**
 * Returns the exact terrain surface height Y at coordinate (x, z).
 * Fast, deterministic, and continuous everywhere in the world.
 */
export function getTerrainHeight(x: number, z: number): number {
  const distFromCenter = Math.sqrt(x * x + z * z);

  // 1. Check if point is inside a designated flat building district
  for (const zone of FLAT_ZONES) {
    const dx = x - zone.cx;
    const dz = z - zone.cz;
    const distSq = dx * dx + dz * dz;
    const radSq = zone.radius * zone.radius;
    if (distSq < radSq) {
      const t = Math.sqrt(distSq) / zone.radius;
      // Smooth hermite blend at edge of district
      const blend = t * t * (3 - 2 * t);
      // Compute raw natural height outside
      const rawNatural = getNaturalHeight(x, z, distFromCenter);
      return zone.baseHeight * (1 - blend) + rawNatural * blend;
    }
  }

  // 2. Check if point is on a paved road corridor
  for (const road of ROAD_MASKS) {
    const d = distanceToSegment(x, z, road.x1, road.z1, road.x2, road.z2);
    if (d < road.width) {
      const roadBlend = d / road.width;
      const smoothBlend = roadBlend * roadBlend;
      const raw = getNaturalHeight(x, z, distFromCenter);
      return raw * smoothBlend;
    }
  }

  // 3. Natural Open-World Topography
  return getNaturalHeight(x, z, distFromCenter);
}

function getNaturalHeight(x: number, z: number, distFromCenter: number): number {
  // Gentle rolling terrain in near zone, rising into hills and mountain perimeter
  let height = 0;

  // Low rolling hills
  height += Math.sin(x * 0.035) * Math.cos(z * 0.035) * 1.8;
  height += Math.sin(x * 0.015 + z * 0.02) * 2.4;

  // Western Forest Elevated Ridge
  if (x < -50) {
    const forestWeight = Math.min(1, (-x - 50) / 60);
    height += (Math.sin(z * 0.05) * 2.0 + 3.0) * forestWeight;
  }

  // Eastern Industrial Flat Valley
  if (x > 50 && z > 20) {
    height *= 0.3; // Flatter basin for freight tracks and warehouse
  }

  // Natural Outer Mountain Boundary (Ring at radius 140m to 190m)
  // Replaces artificial invisible walls with natural impassable mountain slopes
  if (distFromCenter > 130) {
    const rimDist = distFromCenter - 130;
    const mountainRise = Math.pow(rimDist / 40, 2.2) * 18.0;
    height += mountainRise;
  }

  return Math.max(0, height);
}

// Distance from point (px, pz) to 2D line segment (x1, z1)-(x2, z2)
function distanceToSegment(px: number, pz: number, x1: number, z1: number, x2: number, z2: number): number {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const lenSq = dx * dx + dz * dz;
  if (lenSq === 0) {
    const ex = px - x1;
    const ez = pz - z1;
    return Math.sqrt(ex * ex + ez * ez);
  }
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (pz - z1) * dz) / lenSq));
  const projX = x1 + t * dx;
  const projZ = z1 + t * dz;
  const diffX = px - projX;
  const diffZ = pz - projZ;
  return Math.sqrt(diffX * diffX + diffZ * diffZ);
}

/**
 * Creates the high-resolution terrain mesh matching `getTerrainHeight(x, z)`.
 */
export function createOpenWorldTerrainMesh(groundMat: THREE.Material): THREE.Mesh {
  // 360m x 360m vast terrain with 72x72 subdivisions
  const size = 360;
  const segments = 72;
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  const posAttr = geo.attributes.position;

  for (let i = 0; i < posAttr.count; i++) {
    // In PlaneGeometry, local X and Y map to World X and -Z when rotated by -PI/2 on X
    const wx = posAttr.getX(i);
    const wy = posAttr.getY(i);
    const wz = -wy; // World Z
    const height = getTerrainHeight(wx, wz);
    posAttr.setZ(i, height);
  }

  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, groundMat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Unified World Surface Height Engine
 * Returns the true highest walkable/placeable surface at (x, z), checking:
 * 1. Base terrain ground height
 * 2. Elevated building platforms, porches, interior floors, and ramps:
 *    - Ranger Cabin floor & deck (-105, 25): floor at base + 1.5
 *    - Ranger Cabin access ramp (-105, 29.5 to 34.5): slopes from ground to base + 1.5
 *    - Building interior floors (Pharmacy, Police, Gas Station, Clinic, Warehouse, Houses)
 */
export function getWorldSurfaceHeight(x: number, z: number): number {
  const terrainY = getTerrainHeight(x, z);

  // 1. Forest Ranger Cabin Elevated Deck, Floor & Access Ramp
  // Center is (-105, 25). Cabin is 10m wide (x: -110 to -100), depth 9m (z: 20.5 to 29.5).
  // Deck is 10m wide, depth 3m (z: 29.5 to 32.5).
  const cabinBase = getTerrainHeight(-105, 25);
  const cabinElevatedFloor = cabinBase + 1.5;

  if (x >= -110 && x <= -100 && z >= 20.5 && z <= 32.5) {
    return Math.max(terrainY, cabinElevatedFloor);
  }

  // Access Ramp (x: -106.5 to -103.5, z: 32.5 to 36.5)
  if (x >= -106.5 && x <= -103.5 && z > 32.5 && z <= 36.5) {
    // Slope down from cabinElevatedFloor at z=32.5 to terrainY at z=36.5
    const rampT = (36.5 - z) / 4.0;
    const rampY = terrainY + (cabinElevatedFloor - terrainY) * rampT;
    return Math.max(terrainY, rampY);
  }

  // 2. Interior Building Foundations & Floors (+0.15m above terrain)
  // Pharmacy (22, -24)
  if (x >= 14.5 && x <= 29.5 && z >= -31.5 && z <= -16.5) {
    return terrainY + 0.15;
  }
  // Police Station (-22, -24)
  if (x >= -30 && x <= -14 && z >= -32 && z <= -16) {
    return terrainY + 0.15;
  }
  // Suburban Houses (-24, 75), (24, 75), (-24, 30), (24, 30)
  for (const hx of [-24, 24]) {
    for (const hz of [30, 75]) {
      if (Math.abs(x - hx) <= 6.5 && Math.abs(z - hz) <= 6.5) {
        return terrainY + 0.15;
      }
    }
  }
  // Gas Station Convenience Store (85, 10)
  if (x >= 78 && x <= 92 && z >= 4.5 && z <= 15.5) {
    return terrainY + 0.15;
  }
  // Field Hospital Clinic (-15, -88)
  if (x >= -23 && x <= -7 && z >= -94.5 && z <= -81.5) {
    return terrainY + 0.15;
  }
  // Warehouse Depot (128, 72)
  if (x >= 116 && x <= 140 && z >= 62 && z <= 82) {
    return terrainY + 0.15;
  }

  return terrainY;
}
