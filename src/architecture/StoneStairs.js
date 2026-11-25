import * as THREE from 'three';
import { TASHAN } from './constants.js';
import { applyWorldUVs } from './materials.js';
import { createChamferedBlock } from './ArchBay.js';

/**
 * Builds the two symmetric 30-step stone staircases on the East interior side
 * flanking the central entrance axis (Z = 0), connecting the ground floor (Y = 0.12 m)
 * cleanly to the 2nd-floor revak gallery (Y = 5.10 m).
 */
export function buildStoneStairs(materials) {
  const group = new THREE.Group();
  group.name = 'TashanStoneStairs';
  const colliders = [];
  const floorMeshes = [];

  const nSteps = TASHAN.STAIR_COUNT;   // 30
  const riser = TASHAN.STAIR_RISER;    // 0.166 m
  const tread = TASHAN.STAIR_TREAD;    // 0.30 m
  const totalRun = nSteps * tread;     // 9.00 m
  const totalRise = nSteps * riser;    // 4.98 m (0.12 -> 5.10)

  const stairInnerX = TASHAN.STAIR_INNER_X; // +15.85 m
  const wallX = TASHAN.WALL_EAST_X;         // +17.70 m
  const parapetThick = 0.24;
  const clearStairW = wallX - (stairInnerX + parapetThick); // 1.61 m
  const stairCenterX = stairInnerX + parapetThick + clearStairW / 2; // +16.895 m
  const parapetX = stairInnerX + parapetThick / 2; // +15.97 m

  // Chamfered stone tread geometry (instanced across both North & South flights = 60 steps)
  const stepGeom = createChamferedBlock(clearStairW, riser + 0.04, tread + 0.03, 0.016, 1.4);
  const stepMatrices = [];

  // Under-stair solid cut-stone masonry wedge + sloped stone parapet wall (extruded in Z-Y plane)
  function createStairUnderWall(width, run, rise) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(run, 0);
    shape.lineTo(run, rise);
    shape.lineTo(0, 0.08);
    shape.closePath();

    const geom = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false });
    geom.translate(0, 0, -width / 2);
    // Rotate from X-Y to Z-Y plane (local +X -> +Z)
    geom.rotateY(-Math.PI / 2);
    applyWorldUVs(geom, 2.0, 2.0);
    return geom;
  }

  function createParapetWall(width, run, rise, railH = 0.96) {
    const shape = new THREE.Shape();
    shape.moveTo(-0.18, 0);
    shape.lineTo(run + 0.15, 0);
    shape.lineTo(run + 0.15, rise + railH);
    shape.lineTo(-0.18, railH);
    shape.closePath();

    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: width,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.014,
      bevelSegments: 1,
    });
    geom.translate(0, 0, -width / 2);
    geom.rotateY(-Math.PI / 2);
    applyWorldUVs(geom, 1.8, 1.8);
    return geom;
  }

  const underWallGeom = createStairUnderWall(clearStairW, totalRun, totalRise - 0.12);
  const parapetGeom = createParapetWall(parapetThick, totalRun, totalRise, 0.92);
  const newelGeom = createChamferedBlock(0.36, 1.26, 0.36, 0.025, 1.4);
  const topNewelGeom = createChamferedBlock(0.36, 1.15, 0.36, 0.025, 1.4);

  // Sloped stone coping cap along the parapet wall top
  const slopeLen = Math.hypot(totalRun + 0.35, totalRise);
  const slopeAngle = Math.atan2(totalRise, totalRun);
  const copingGeom = createChamferedBlock(0.30, 0.09, slopeLen, 0.016, 1.4);

  // Smooth invisible collision ramp for seamless player traversal (no camera jitter on steps)
  const rampLen = Math.hypot(totalRun, totalRise);
  const rampGeom = new THREE.BoxGeometry(clearStairW, 0.16, rampLen + 0.45);

  for (const sign of [-1, 1]) {
    // Flight runs from zStart = sign * 3.20 outward to zEnd = sign * 12.20
    const zStart = sign * TASHAN.STAIR_START_Z;
    const zEnd = sign * TASHAN.STAIR_END_Z;

    for (let s = 0; s < nSteps; s++) {
      const sy = TASHAN.REVAK_Y + s * riser;
      const sz = zStart + sign * ((s + 0.5) * tread);
      const m = new THREE.Matrix4().makeTranslation(stairCenterX, sy, sz);
      stepMatrices.push(m);
    }

    // Solid masonry support wedge under steps
    const underMesh = new THREE.Mesh(underWallGeom, materials.stone);
    underMesh.position.set(stairCenterX, TASHAN.REVAK_Y, zStart);
    if (sign < 0) underMesh.rotation.y = Math.PI;
    underMesh.castShadow = true;
    underMesh.receiveShadow = true;
    group.add(underMesh);

    // Outer stone stair parapet wall (courtyard-facing side of stair)
    const paraMesh = new THREE.Mesh(parapetGeom, materials.stone);
    paraMesh.position.set(parapetX, TASHAN.REVAK_Y, zStart);
    if (sign < 0) paraMesh.rotation.y = Math.PI;
    paraMesh.castShadow = true;
    paraMesh.receiveShadow = true;
    group.add(paraMesh);

    // Sloped stone cap coping on top of parapet
    const coping = new THREE.Mesh(copingGeom, materials.stoneTrim);
    const zMid = (zStart + zEnd) / 2;
    const yMid = TASHAN.REVAK_Y + totalRise / 2 + 0.92;
    coping.position.set(parapetX, yMid, zMid);
    coping.rotation.x = sign > 0 ? -slopeAngle : slopeAngle;
    coping.castShadow = true;
    coping.receiveShadow = true;
    group.add(coping);

    // Bottom newel post (baba taşı) with subtle stepped cap
    const botNewel = new THREE.Mesh(newelGeom, materials.stoneTrim);
    botNewel.position.set(parapetX, TASHAN.REVAK_Y, zStart - sign * 0.14);
    botNewel.castShadow = true;
    botNewel.receiveShadow = true;
    group.add(botNewel);

    const topNewel = new THREE.Mesh(topNewelGeom, materials.stoneTrim);
    topNewel.position.set(parapetX, TASHAN.UPPER_FLOOR_Y, zEnd + sign * 0.12);
    topNewel.castShadow = true;
    topNewel.receiveShadow = true;
    group.add(topNewel);

    // Smooth walkable BVH floor ramp covering the steps
    const ramp = new THREE.Mesh(rampGeom);
    ramp.position.set(stairCenterX, TASHAN.REVAK_Y + totalRise / 2 - 0.06, zMid);
    ramp.rotation.x = sign > 0 ? -slopeAngle : slopeAngle;
    ramp.updateMatrixWorld(true);
    floorMeshes.push(ramp);

    // Parapet collider so player cannot step sideways off the stairs
    const pCol = new THREE.Mesh(new THREE.BoxGeometry(0.32, totalRise + 1.4, totalRun + 0.5));
    pCol.position.set(parapetX, TASHAN.REVAK_Y + (totalRise + 1.4) / 2, zMid);
    colliders.push(pCol);
  }

  // Instanced carved stone steps
  const stepsIM = new THREE.InstancedMesh(stepGeom, materials.stoneTrim, stepMatrices.length);
  stepsIM.castShadow = true;
  stepsIM.receiveShadow = true;
  for (let i = 0; i < stepMatrices.length; i++) {
    stepsIM.setMatrixAt(i, stepMatrices[i]);
  }
  stepsIM.instanceMatrix.needsUpdate = true;
  group.add(stepsIM);

  return { group, colliders, floorMeshes };
}
