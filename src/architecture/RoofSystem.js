import * as THREE from 'three';
import { TASHAN } from './constants.js';
import { applyWorldUVs, createWorldBox } from './materials.js';
import { createChamferedBlock } from './ArchBay.js';

/**
 * Builds a single trapezoidal roof slope panel from 4 world-space vertices
 * (eave0, eave1, ridge1, ridge0) with exact world-space meter UVs.
 */
function createRoofQuadGeometry(p0, p1, p2, p3, tileMeters = 2.0) {
  const positions = new Float32Array([
    p0.x, p0.y, p0.z,
    p1.x, p1.y, p1.z,
    p2.x, p2.y, p2.z,
    p3.x, p3.y, p3.z,
  ]);
  const indices = [0, 1, 2, 0, 2, 3];

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  // Project UVs along slope surface axes (u along eave direction, v up-slope)
  const eaveDir = new THREE.Vector3().subVectors(p1, p0).normalize();
  const slopeDir = new THREE.Vector3().subVectors(p3, p0).normalize();
  const uvs = new Float32Array(8);
  const pts = [p0, p1, p2, p3];
  for (let i = 0; i < 4; i++) {
    const rel = new THREE.Vector3().subVectors(pts[i], p0);
    uvs[i * 2] = rel.dot(eaveDir) / tileMeters;
    uvs[i * 2 + 1] = rel.dot(slopeDir) / tileMeters;
  }
  geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geom.setAttribute('uv1', new THREE.BufferAttribute(uvs.slice(), 2));
  return geom;
}

/**
 * Creates a single curved half-barrel alaturka clay roof tile (oluklu kiremit)
 * for InstancedMesh scattering across roof slopes, eaves, and ridges.
 */
function createBarrelTileGeometry(radius = 0.11, length = 0.44) {
  const geom = new THREE.CylinderGeometry(
    radius * 0.88,
    radius,
    length,
    6,
    1,
    false,
    0,
    Math.PI
  );
  // Orient curved barrel along local +Z, convex arch facing +Y
  geom.rotateY(-Math.PI / 2);
  geom.rotateX(Math.PI / 2);
  applyWorldUVs(geom, 0.8, 0.8);
  return geom;
}

/**
 * Builds the 4-wing hipped terracotta roof (kırma alaturka kiremit çatı),
 * timber overhanging eaves, exposed rafter tails (mertekler),
 * and thousands of instanced 3D alaturka barrel roof tiles.
 */
export function buildRoofSystem(materials) {
  const group = new THREE.Group();
  group.name = 'TashanRoofSystem';

  const eaveY = TASHAN.EAVE_Y;       // 9.65 m
  const ridgeY = 13.04;              // ~26 deg slope over 6.95 m half-wing span
  const ov = TASHAN.ROOF_OVERHANG;   // 0.85 m

  // Inner courtyard eave lines
  const xiW = -TASHAN.HALF_PIER_X + ov;  // -13.25
  const xiE = TASHAN.HALF_PIER_X - ov;   // +13.25
  const ziN = -TASHAN.HALF_PIER_Z + ov;  // -25.825
  const ziS = TASHAN.HALF_PIER_Z - ov;   // +25.825

  // Outer perimeter eave lines
  const xoW = -TASHAN.HALF_OUTER_X - ov; // -27.15
  const xoE = TASHAN.HALF_OUTER_X + ov;  // +27.15
  const zoN = -TASHAN.HALF_OUTER_Z - ov; // -41.25
  const zoS = TASHAN.HALF_OUTER_Z + ov;  // +41.25

  // Ridge intersection coordinates (exact midpoints of wing spans)
  const xrW = (xiW + xoW) / 2; // -20.20
  const xrE = (xiE + xoE) / 2; // +20.20
  const zrN = (ziN + zoN) / 2; // -33.5375
  const zrS = (ziS + zoS) / 2; // +33.5375

  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // Define all roof slope quads (East wing splits cleanly around Z = ±3.08 for the projecting Köşk Mescit!)
  const mescitHalfZ = 3.08;
  const slopes = [
    // West Wing (inner facing courtyard + outer facing street)
    [V(xiW, eaveY, ziS), V(xiW, eaveY, ziN), V(xrW, ridgeY, zrN), V(xrW, ridgeY, zrS)],
    [V(xoW, eaveY, zoN), V(xoW, eaveY, zoS), V(xrW, ridgeY, zrS), V(xrW, ridgeY, zrN)],

    // North Wing
    [V(xiW, eaveY, ziN), V(xiE, eaveY, ziN), V(xrE, ridgeY, zrN), V(xrW, ridgeY, zrN)],
    [V(xoE, eaveY, zoN), V(xoW, eaveY, zoN), V(xrW, ridgeY, zrN), V(xrE, ridgeY, zrN)],

    // South Wing
    [V(xiE, eaveY, ziS), V(xiW, eaveY, ziS), V(xrW, ridgeY, zrS), V(xrE, ridgeY, zrS)],
    [V(xoW, eaveY, zoS), V(xoE, eaveY, zoS), V(xrE, ridgeY, zrS), V(xrW, ridgeY, zrS)],

    // East Wing North half (Z <= -3.15, stops cleanly at Mescit wall)
    [V(xiE, eaveY, ziN), V(xiE, eaveY, -mescitHalfZ), V(xrE, ridgeY, -mescitHalfZ), V(xrE, ridgeY, zrN)],
    [V(xoE, eaveY, -mescitHalfZ), V(xoE, eaveY, zoN), V(xrE, ridgeY, zrN), V(xrE, ridgeY, -mescitHalfZ)],

    // East Wing South half (Z >= +3.15, stops cleanly at Mescit wall)
    [V(xiE, eaveY, mescitHalfZ), V(xiE, eaveY, ziS), V(xrE, ridgeY, zrS), V(xrE, ridgeY, mescitHalfZ)],
    [V(xoE, eaveY, zoS), V(xoE, eaveY, mescitHalfZ), V(xrE, ridgeY, mescitHalfZ), V(xrE, ridgeY, zrS)],
  ];

  // Add base roof deck planes (textured clay_roof_tiles + dark wood soffit underside)
  const roofUnderMat = materials.wood;
  for (const [p0, p1, p2, p3] of slopes) {
    const geom = createRoofQuadGeometry(p0, p1, p2, p3, 2.2);
    const topMesh = new THREE.Mesh(geom, materials.roof);
    topMesh.castShadow = true;
    topMesh.receiveShadow = true;
    group.add(topMesh);

    // Underside timber roof boarding (visible when looking up at projecting eaves!)
    const underGeom = createRoofQuadGeometry(p1, p0, p3, p2, 1.8);
    underGeom.translate(0, -0.04, 0);
    const underMesh = new THREE.Mesh(underGeom, roofUnderMat);
    underMesh.receiveShadow = true;
    group.add(underMesh);
  }

  // 2. Instanced 3D Alaturka Barrel Tiles (along ridges, hips, eave starters, and full courtyard slopes)
  const tileGeom = createBarrelTileGeometry(0.115, 0.48);
  const ridgeCapGeom = createBarrelTileGeometry(0.145, 0.52);
  const tileMatrices = [];
  const ridgeMatrices = [];

  const dummy = new THREE.Object3D();

  // Populate crisp 3D barrel tile courses down every roof slope (visible from courtyard, balcony & outside!)
  for (const [p0, p1, p2, p3] of slopes) {
    const eaveVec = new THREE.Vector3().subVectors(p1, p0);
    const eaveLen = eaveVec.length();
    const eaveDir = eaveVec.clone().normalize();
    const slopeMidStart = new THREE.Vector3().addVectors(p0, p1).multiplyScalar(0.5);
    const slopeMidEnd = new THREE.Vector3().addVectors(p2, p3).multiplyScalar(0.5);
    const upSlopeVec = new THREE.Vector3().subVectors(slopeMidEnd, slopeMidStart);
    const slopeLen = upSlopeVec.length();
    const upDir = upSlopeVec.clone().normalize();
    const slopeNormal = new THREE.Vector3().crossVectors(eaveDir, upDir).normalize();
    if (slopeNormal.y < 0) slopeNormal.negate();

    // Build orthonormal basis for tile orientation (local +Z points down-slope, +Y points along slopeNormal)
    const downDir = upDir.clone().negate();
    const rightDir = new THREE.Vector3().crossVectors(slopeNormal, downDir).normalize();
    const rotMat = new THREE.Matrix4().makeBasis(rightDir, slopeNormal, downDir);
    const baseQuat = new THREE.Quaternion().setFromRotationMatrix(rotMat);

    const nCols = Math.floor(eaveLen / 0.48);
    const nRows = Math.floor(slopeLen / 0.44);

    for (let r = 0; r < nRows; r++) {
      const vFrac = (r + 0.45) / nRows;
      // Interpolate edge endpoints along left & right hip edges so tiles fit trapezoid cleanly!
      const leftPt = new THREE.Vector3().lerpVectors(p0, p3, vFrac);
      const rightPt = new THREE.Vector3().lerpVectors(p1, p2, vFrac);
      const rowLen = leftPt.distanceTo(rightPt);
      const rowCols = Math.max(1, Math.floor(rowLen / 0.46));

      for (let c = 0; c < rowCols; c++) {
        const uFrac = (c + 0.5) / rowCols;
        const pos = new THREE.Vector3().lerpVectors(leftPt, rightPt, uFrac);
        pos.addScaledVector(slopeNormal, 0.03);
        dummy.position.copy(pos);
        dummy.quaternion.copy(baseQuat);
        // Subtle pitch tilt like overlapping real alaturka tiles
        dummy.rotateX(-0.07);
        dummy.updateMatrix();
        tileMatrices.push(dummy.matrix.clone());
      }
    }
  }

  // Ridge & Hip cap tiles (mahya kiremitleri)
  const addCapLine = (a, b) => {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    dir.normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(up, dir).normalize();
    const orthoUp = new THREE.Vector3().crossVectors(dir, right).normalize();
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, orthoUp, dir));
    const count = Math.max(2, Math.floor(len / 0.44));
    for (let i = 0; i < count; i++) {
      const pos = new THREE.Vector3().lerpVectors(a, b, (i + 0.5) / count);
      pos.y += 0.08;
      dummy.position.copy(pos);
      dummy.quaternion.copy(q);
      dummy.updateMatrix();
      ridgeMatrices.push(dummy.matrix.clone());
    }
  };

  // Horizontal ridge lines
  addCapLine(V(xrW, ridgeY, zrN), V(xrW, ridgeY, zrS));
  addCapLine(V(xrW, ridgeY, zrN), V(xrE, ridgeY, zrN));
  addCapLine(V(xrW, ridgeY, zrS), V(xrE, ridgeY, zrS));
  addCapLine(V(xrE, ridgeY, zrN), V(xrE, ridgeY, -mescitHalfZ));
  addCapLine(V(xrE, ridgeY, mescitHalfZ), V(xrE, ridgeY, zrS));

  // 4 outer hips & 4 inner valleys
  addCapLine(V(xoW, eaveY, zoN), V(xrW, ridgeY, zrN));
  addCapLine(V(xoW, eaveY, zoS), V(xrW, ridgeY, zrS));
  addCapLine(V(xoE, eaveY, zoN), V(xrE, ridgeY, zrN));
  addCapLine(V(xoE, eaveY, zoS), V(xrE, ridgeY, zrS));

  const tilesIM = new THREE.InstancedMesh(tileGeom, materials.roof, tileMatrices.length);
  tilesIM.castShadow = true;
  tilesIM.receiveShadow = true;
  for (let i = 0; i < tileMatrices.length; i++) tilesIM.setMatrixAt(i, tileMatrices[i]);
  tilesIM.instanceMatrix.needsUpdate = true;
  group.add(tilesIM);

  const ridgeIM = new THREE.InstancedMesh(ridgeCapGeom, materials.roof, ridgeMatrices.length);
  ridgeIM.castShadow = true;
  ridgeIM.receiveShadow = true;
  for (let i = 0; i < ridgeMatrices.length; i++) ridgeIM.setMatrixAt(i, ridgeMatrices[i]);
  ridgeIM.instanceMatrix.needsUpdate = true;
  group.add(ridgeIM);

  // 3. Overhanging Timber Eaves & Exposed Rafter Tails (çıkıntılı ahşap saçaklar ve mertekler)
  const rafterGeom = createChamferedBlock(0.085, 0.11, 1.05, 0.012, 1.2);
  rafterGeom.translate(0, -0.11, 0);
  const rafterMatrices = [];

  const addRafterRow = (startPt, endPt, rotY, skipCenterMescit = false) => {
    const len = startPt.distanceTo(endPt);
    const count = Math.floor(len / 0.56);

    if (skipCenterMescit) {
      // Split fascia boards cleanly around the projecting Mescit (Z = ±mescitHalfZ)
      const halfSpan = len / 2 - mescitHalfZ;
      for (const sign of [-1, 1]) {
        const segFascia = new THREE.Mesh(createWorldBox(halfSpan, 0.14, 0.08, 1.6), materials.wood);
        segFascia.position.set(startPt.x, startPt.y, sign * (mescitHalfZ + halfSpan / 2));
        segFascia.rotation.y = rotY;
        segFascia.castShadow = true;
        group.add(segFascia);
      }
    } else {
      const fascia = new THREE.Mesh(createWorldBox(len, 0.14, 0.08, 1.6), materials.wood);
      const mid = new THREE.Vector3().addVectors(startPt, endPt).multiplyScalar(0.5);
      fascia.position.copy(mid);
      fascia.rotation.y = rotY;
      fascia.castShadow = true;
      group.add(fascia);
    }

    for (let i = 0; i <= count; i++) {
      const p = new THREE.Vector3().lerpVectors(startPt, endPt, i / count);
      if (skipCenterMescit && Math.abs(p.z) < mescitHalfZ) continue;
      dummy.position.set(p.x, p.y - 0.04, p.z);
      dummy.rotation.set(0, rotY, 0);
      // Local +Z points outward over eave; shift back inward under roof slope and match ~26° pitch
      dummy.rotateX(0.45);
      dummy.translateZ(-0.54);
      dummy.updateMatrix();
      rafterMatrices.push(dummy.matrix.clone());
    }
  };

  // Inner courtyard eaves
  addRafterRow(V(xiW, eaveY - 0.04, ziN), V(xiW, eaveY - 0.04, ziS), Math.PI / 2);
  addRafterRow(V(xiE, eaveY - 0.04, ziN), V(xiE, eaveY - 0.04, ziS), -Math.PI / 2, true);
  addRafterRow(V(xiW, eaveY - 0.04, ziN), V(xiE, eaveY - 0.04, ziN), 0);
  addRafterRow(V(xiW, eaveY - 0.04, ziS), V(xiE, eaveY - 0.04, ziS), Math.PI);

  // Outer perimeter eaves
  addRafterRow(V(xoW, eaveY - 0.04, zoN), V(xoW, eaveY - 0.04, zoS), -Math.PI / 2);
  addRafterRow(V(xoE, eaveY - 0.04, zoN), V(xoE, eaveY - 0.04, zoS), Math.PI / 2, true);
  addRafterRow(V(xoW, eaveY - 0.04, zoN), V(xoE, eaveY - 0.04, zoN), Math.PI);
  addRafterRow(V(xoW, eaveY - 0.04, zoS), V(xoE, eaveY - 0.04, zoS), 0);

  const raftersIM = new THREE.InstancedMesh(rafterGeom, materials.wood, rafterMatrices.length);
  raftersIM.castShadow = true;
  raftersIM.receiveShadow = true;
  for (let i = 0; i < rafterMatrices.length; i++) raftersIM.setMatrixAt(i, rafterMatrices[i]);
  raftersIM.instanceMatrix.needsUpdate = true;
  group.add(raftersIM);

  // 4. Flat masonry capping wall under roof eaves on wing interior room tops (prevents sky leaks inside roof)
  const capH = 0.25;
  const addCap = (w, d, x, z) => {
    const m = new THREE.Mesh(createWorldBox(w, capH, d, 2.5), materials.stone);
    m.position.set(x, eaveY - capH / 2, z);
    group.add(m);
  };
  addCap(8.6, 80.8, -22.0, 0);
  addCap(8.6, 80.8, 22.0, 0);
  addCap(35.4, 10.2, 0, -35.3);
  addCap(35.4, 10.2, 0, 35.3);

  // Stone gable end walls capping East roof halves cleanly at Z = ±mescitHalfZ
  const gableShape = new THREE.Shape();
  gableShape.moveTo(xiE + 0.85, eaveY);
  gableShape.lineTo(xoE - 0.85, eaveY);
  gableShape.lineTo(xrE, ridgeY);
  gableShape.closePath();
  const gableGeom = new THREE.ExtrudeGeometry(gableShape, { depth: 0.35, bevelEnabled: false });
  gableGeom.translate(0, 0, -0.175);
  applyWorldUVs(gableGeom, 2.0, 2.0);
  for (const sign of [-1, 1]) {
    const gable = new THREE.Mesh(gableGeom, materials.stone);
    gable.position.set(0, 0, sign * mescitHalfZ);
    gable.castShadow = true;
    gable.receiveShadow = true;
    group.add(gable);
  }

  return { group };
}
