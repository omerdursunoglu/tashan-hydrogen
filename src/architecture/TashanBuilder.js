import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MeshBVH } from 'three-mesh-bvh';
import { TASHAN } from './constants.js';
import { createWorldBox } from './materials.js';
import { buildArcades } from './ArchBay.js';
import { buildVaultCeilings } from './VaultCeiling.js';
import { buildShopFacades } from './ShopFacade.js';
import { buildStoneStairs } from './StoneStairs.js';
import { buildMainPortal } from './MainPortal.js';
import { buildRoofSystem } from './RoofSystem.js';
import { buildCourtyardProps } from './CourtyardProps.js';

/**
 * Normalizes an array of temporary collider/floor meshes into a single
 * position-only BufferGeometry and builds a MeshBVH acceleration structure.
 */
function buildBVHFromMeshes(meshes) {
  const parts = [];
  for (const m of meshes) {
    m.updateMatrixWorld(true);
    let g = m.geometry.clone();
    if (g.index) g = g.toNonIndexed();
    g.applyMatrix4(m.matrixWorld);
    // Keep only position attribute so BoxGeometry/CylinderGeometry/etc. merge cleanly
    for (const key of Object.keys(g.attributes)) {
      if (key !== 'position') g.deleteAttribute(key);
    }
    parts.push(g);
  }
  const merged = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return {
    geometry: merged,
    bvh: new MeshBVH(merged),
  };
}

/**
 * Assembles the complete Tokat Taşhan (Voyvoda Han, 1631) 3D architecture
 * and builds wall & floor MeshBVH trees for first-person traversal.
 */
export function buildTokatTashan(materials) {
  const root = new THREE.Group();
  root.name = 'TokatTashan';

  const arcades = buildArcades(materials);
  const vaults = buildVaultCeilings(materials);
  const shops = buildShopFacades(materials);
  const stairs = buildStoneStairs(materials);
  const portal = buildMainPortal(materials);
  const roof = buildRoofSystem(materials);
  const courtyard = buildCourtyardProps(materials);

  root.add(
    arcades.group,
    vaults.group,
    shops.group,
    stairs.group,
    portal.group,
    roof.group,
    courtyard.group
  );

  // Subtle historical exterior earth/stone ground plane surrounding Taşhan (no modern buildings)
  const surroundGround = new THREE.Mesh(createWorldBox(220, 0.2, 220, 4.5, 4.5), materials.grass);
  surroundGround.position.set(0, TASHAN.STREET_Y - 0.14, 0);
  surroundGround.receiveShadow = true;
  root.add(surroundGround);

  // Stone perimeter sidewalk skirt running tightly around the 80.80 x 52.60 m outer walls
  const skirt = new THREE.Mesh(
    createWorldBox(TASHAN.OUTER_X + 10.0, 0.16, TASHAN.OUTER_Z + 10.0, 2.8, 2.8),
    materials.cobble
  );
  skirt.position.set(0, TASHAN.STREET_Y - 0.08, 0);
  skirt.receiveShadow = true;
  root.add(skirt);

  const allColliders = [
    ...arcades.colliders,
    ...shops.colliders,
    ...stairs.colliders,
    ...portal.colliders,
    ...courtyard.colliders,
  ];

  const allFloors = [
    ...arcades.floorMeshes,
    ...stairs.floorMeshes,
    ...portal.floorMeshes,
    ...courtyard.floorMeshes,
  ];

  const wallData = buildBVHFromMeshes(allColliders);
  const floorData = buildBVHFromMeshes(allFloors);

  return {
    root,
    wallBVH: wallData.bvh,
    floorBVH: floorData.bvh,
    lanternLights: courtyard.lanternLights,
  };
}
