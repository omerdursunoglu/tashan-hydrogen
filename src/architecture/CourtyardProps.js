import * as THREE from 'three';
import { TASHAN, pierX, pierZ } from './constants.js';
import { applyWorldUVs, createWorldBox } from './materials.js';
import { createChamferedBlock } from './ArchBay.js';

/**
 * Deterministic PRNG for reproducible courtyard trees and props.
 */
function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Builds a botanical twig spray geometry containing 6 individually UV-mapped,
 * angled leaves sliced cleanly from the 3x2 LeafSet022 atlas.
 */
function createLeafSprayGeometry() {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  const leafConfigs = [
    { col: 0, row: 1, yaw: 0.0, pitch: 0.35, roll: 0.1, scale: 0.42, ox: 0.0, oy: 0.08, oz: 0.14 },
    { col: 1, row: 1, yaw: 1.05, pitch: 0.42, roll: -0.15, scale: 0.40, ox: 0.12, oy: 0.12, oz: 0.06 },
    { col: 2, row: 1, yaw: 2.15, pitch: 0.30, roll: 0.12, scale: 0.44, ox: 0.10, oy: 0.06, oz: -0.11 },
    { col: 0, row: 0, yaw: 3.20, pitch: 0.45, roll: -0.1, scale: 0.38, ox: -0.04, oy: 0.14, oz: -0.14 },
    { col: 1, row: 0, yaw: 4.30, pitch: 0.32, roll: 0.14, scale: 0.42, ox: -0.14, oy: 0.09, oz: -0.03 },
    { col: 2, row: 0, yaw: 5.30, pitch: 0.55, roll: 0.05, scale: 0.36, ox: -0.08, oy: 0.18, oz: 0.10 },
  ];

  const dummy = new THREE.Object3D();
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();

  let vertIdx = 0;
  for (const cfg of leafConfigs) {
    const u0 = cfg.col / 3 + 0.02;
    const u1 = (cfg.col + 1) / 3 - 0.02;
    const v0 = cfg.row / 2 + 0.02;
    const v1 = (cfg.row + 1) / 2 - 0.02;

    const w = cfg.scale * 0.72;
    const l = cfg.scale;
    // Slight mid-rib fold (4 vertices + 2 tris with gentle arch)
    const localVerts = [
      [-w * 0.5, 0.02, 0],
      [w * 0.5, 0.02, 0],
      [w * 0.5, 0.04, l],
      [-w * 0.5, 0.04, l],
    ];
    const localUVs = [
      [u0, v0],
      [u1, v0],
      [u1, v1],
      [u0, v1],
    ];

    dummy.position.set(cfg.ox, cfg.oy, cfg.oz);
    dummy.rotation.set(cfg.pitch, cfg.yaw, cfg.roll);
    dummy.updateMatrix();

    const normalMat = new THREE.Matrix3().getNormalMatrix(dummy.matrix);
    n.set(0, 1, 0).applyMatrix3(normalMat).normalize();

    for (let k = 0; k < 4; k++) {
      v.set(localVerts[k][0], localVerts[k][1], localVerts[k][2]).applyMatrix4(dummy.matrix);
      positions.push(v.x, v.y, v.z);
      normals.push(n.x, n.y, n.z);
      uvs.push(localUVs[k][0], localUVs[k][1]);
    }

    indices.push(vertIdx, vertIdx + 1, vertIdx + 2, vertIdx, vertIdx + 2, vertIdx + 3);
    vertIdx += 4;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  return geom;
}

/**
 * Builds an articulated multi-branch courtyard plane tree (no spheres!)
 * and pushes leaf-spray matrices into `leafMatrices`.
 */
function buildBranchingTree(group, materials, x, y, z, seed, leafMatrices, colliders) {
  const rand = mulberry32(seed);
  const treeGroup = new THREE.Group();
  treeGroup.position.set(x, y, z);
  group.add(treeGroup);

  const addLimb = (p0, p1, r0, r1) => {
    const dir = new THREE.Vector3().subVectors(p1, p0);
    const len = dir.length();
    const geom = new THREE.CylinderGeometry(r1, r0, len, 8, 2);
    applyWorldUVs(geom, 1.2, 1.2);
    const mesh = new THREE.Mesh(geom, materials.bark);
    mesh.position.copy(p0).addScaledVector(dir, 0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    treeGroup.add(mesh);
  };

  // Multi-segment tapered main trunk (0 -> 2.75 m)
  const pBase = new THREE.Vector3(0, 0, 0);
  const pMid = new THREE.Vector3((rand() - 0.5) * 0.16, 1.35, (rand() - 0.5) * 0.16);
  const pFork = new THREE.Vector3((rand() - 0.5) * 0.22, 2.75, (rand() - 0.5) * 0.22);
  addLimb(pBase, pMid, 0.30, 0.23);
  addLimb(pMid, pFork, 0.23, 0.18);

  const dummy = new THREE.Object3D();
  const nPrimary = 6;

  for (let i = 0; i < nPrimary; i++) {
    const az = (i / nPrimary) * Math.PI * 2 + (rand() - 0.5) * 0.45;
    const reach = 1.65 + rand() * 0.75;
    const rise = 1.85 + rand() * 0.85;
    const p1 = new THREE.Vector3(
      pFork.x + Math.cos(az) * reach,
      pFork.y + rise,
      pFork.z + Math.sin(az) * reach
    );
    addLimb(pFork, p1, 0.14, 0.085);

    // Secondary branches splitting off each primary limb
    for (let s = 0; s < 3; s++) {
      const subAz = az + (s - 1) * 0.65 + (rand() - 0.5) * 0.35;
      const subReach = 1.05 + rand() * 0.65;
      const subRise = 0.85 + rand() * 0.90;
      const branchStart = new THREE.Vector3().lerpVectors(pFork, p1, 0.55 + s * 0.20);
      const p2 = new THREE.Vector3(
        branchStart.x + Math.cos(subAz) * subReach,
        branchStart.y + subRise,
        branchStart.z + Math.sin(subAz) * subReach
      );
      addLimb(branchStart, p2, 0.075, 0.035);

      // Leaf spray clusters clustered organically along branch end
      const sprays = 13;
      for (let l = 0; l < sprays; l++) {
        const lp = new THREE.Vector3().lerpVectors(branchStart, p2, 0.34 + (l / sprays) * 0.78);
        lp.x += (rand() - 0.5) * 0.95;
        lp.y += (rand() - 0.5) * 0.62;
        lp.z += (rand() - 0.5) * 0.95;

        dummy.position.set(x + lp.x, y + lp.y, z + lp.z);
        dummy.rotation.set((rand() - 0.5) * 0.85, rand() * Math.PI * 2, (rand() - 0.5) * 0.85);
        const sc = 1.0 + rand() * 0.60;
        dummy.scale.set(sc, sc, sc);
        dummy.updateMatrix();
        leafMatrices.push(dummy.matrix.clone());
      }
    }
  }

  // Crown apex central limb + canopy sprays
  const pTop = new THREE.Vector3(pFork.x + (rand() - 0.5) * 0.3, pFork.y + 3.25, pFork.z + (rand() - 0.5) * 0.3);
  addLimb(pFork, pTop, 0.13, 0.05);
  for (let l = 0; l < 18; l++) {
    const a = rand() * Math.PI * 2;
    const r = 0.4 + rand() * 1.15;
    dummy.position.set(
      x + pTop.x + Math.cos(a) * r,
      y + pTop.y - 0.3 + rand() * 0.9,
      z + pTop.z + Math.sin(a) * r
    );
    dummy.rotation.set((rand() - 0.5) * 0.7, rand() * Math.PI * 2, (rand() - 0.5) * 0.7);
    const sc = 1.0 + rand() * 0.5;
    dummy.scale.set(sc, sc, sc);
    dummy.updateMatrix();
    leafMatrices.push(dummy.matrix.clone());
  }

  // Trunk collider
  const trunkCol = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.40, 2.5, 8));
  trunkCol.position.set(x, y + 1.25, z);
  colliders.push(trunkCol);
}

/**
 * Builds the central courtyard stone floor, historic octagonal şadırvan fountain,
 * bordered green planter beds, branching layered-leaf plane trees,
 * tea-garden tables/chairs, and hanging wrought-iron arcade lanterns with 2700K lights.
 */
export function buildCourtyardProps(materials) {
  const group = new THREE.Group();
  group.name = 'TashanCourtyardProps';
  const colliders = [];
  const floorMeshes = [];
  const lanternLights = [];

  // 1. Main Courtyard Cobblestone Pavement (Y = 0.00 m)
  const yardW = TASHAN.COURTYARD_PIER_X + 0.90; // 29.10 m
  const yardL = TASHAN.COURTYARD_PIER_Z + 0.90; // 54.25 m
  const yardFloor = new THREE.Mesh(createWorldBox(yardW, 0.24, yardL, 2.8, 2.8), materials.cobble);
  yardFloor.position.set(0, -0.12, 0);
  yardFloor.receiveShadow = true;
  group.add(yardFloor);
  floorMeshes.push(yardFloor);

  // Dressed stone axial walkways crossing the courtyard (East-West & North-South)
  const walkNS = new THREE.Mesh(createChamferedBlock(3.20, 0.035, yardL - 1.2, 0.015, 2.0), materials.stoneTrim);
  walkNS.position.set(0, -0.01, 0);
  walkNS.receiveShadow = true;
  group.add(walkNS);

  const walkEW = new THREE.Mesh(createChamferedBlock(yardW - 1.2, 0.035, 3.60, 0.015, 2.0), materials.stoneTrim);
  walkEW.position.set(0, -0.008, 0);
  walkEW.receiveShadow = true;
  group.add(walkEW);

  // 2. Central Historic Stone Şadırvan / Fountain at (0, 0, 0)
  const fountGroup = new THREE.Group();
  group.add(fountGroup);

  const step1 = new THREE.Mesh(new THREE.CylinderGeometry(3.85, 3.95, 0.14, 8), materials.stoneTrim);
  applyWorldUVs(step1.geometry, 1.8, 1.8);
  step1.position.y = 0.07;
  step1.receiveShadow = true;
  step1.castShadow = true;
  fountGroup.add(step1);

  const step2 = new THREE.Mesh(new THREE.CylinderGeometry(3.35, 3.45, 0.14, 8), materials.stoneTrim);
  applyWorldUVs(step2.geometry, 1.8, 1.8);
  step2.position.y = 0.21;
  step2.receiveShadow = true;
  step2.castShadow = true;
  fountGroup.add(step2);

  // Octagonal stone fountain basin walls (8 carved stone panels + coping rim)
  const basinRadius = 2.45;
  const basinH = 0.72;
  const sideLen = 2 * basinRadius * Math.tan(Math.PI / 8);
  for (let s = 0; s < 8; s++) {
    const ang = (s / 8) * Math.PI * 2;
    const panel = new THREE.Mesh(createChamferedBlock(sideLen + 0.12, basinH, 0.24, 0.02, 1.4), materials.stone);
    panel.position.set(Math.sin(ang) * basinRadius, 0.28, Math.cos(ang) * basinRadius);
    panel.rotation.y = ang;
    panel.castShadow = true;
    panel.receiveShadow = true;
    fountGroup.add(panel);

    const rim = new THREE.Mesh(createChamferedBlock(sideLen + 0.22, 0.10, 0.34, 0.02, 1.2), materials.stoneTrim);
    rim.position.set(Math.sin(ang) * basinRadius, 0.28 + basinH - 0.02, Math.cos(ang) * basinRadius);
    rim.rotation.y = ang;
    rim.castShadow = true;
    fountGroup.add(rim);
  }

  // Water surface inside basin
  const waterMesh = new THREE.Mesh(new THREE.CylinderGeometry(2.38, 2.38, 0.06, 8), materials.water);
  applyWorldUVs(waterMesh.geometry, 1.8, 1.8);
  waterMesh.position.y = 0.84;
  waterMesh.receiveShadow = true;
  fountGroup.add(waterMesh);

  // Central carved stone fountain column & upper bowl
  const fCol = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.36, 1.45, 12), materials.stoneTrim);
  applyWorldUVs(fCol.geometry, 1.2, 1.2);
  fCol.position.y = 0.28 + 0.725;
  fCol.castShadow = true;
  fountGroup.add(fCol);

  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.32, 0.32, 12), materials.stoneTrim);
  applyWorldUVs(bowl.geometry, 1.2, 1.2);
  bowl.position.y = 1.78;
  bowl.castShadow = true;
  fountGroup.add(bowl);

  const finial = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 10), materials.stoneTrim);
  applyWorldUVs(finial.geometry, 1.0, 1.0);
  finial.position.y = 2.22;
  finial.castShadow = true;
  fountGroup.add(finial);

  const fColCollider = new THREE.Mesh(new THREE.CylinderGeometry(2.70, 2.75, 1.5, 8));
  fColCollider.position.set(0, 0.75, 0);
  colliders.push(fColCollider);

  // 3. Stone-Bordered Green Planter Beds & Articulated Branching Plane Trees
  const bedCoords = [
    { x: -6.8, z: -12.5 },
    { x: 6.8, z: -12.5 },
    { x: -6.8, z: 12.5 },
    { x: 6.8, z: 12.5 },
  ];
  const bedW = 4.80;
  const bedL = 7.40;
  const curbH = 0.32;
  const curbT = 0.28;

  const leafMatrices = [];
  const curbWGeom = createChamferedBlock(bedW + curbT, curbH, curbT, 0.025, 1.4);
  const curbLGeom = createChamferedBlock(curbT, curbH, bedL - curbT, 0.025, 1.4);
  const grassBedGeom = createWorldBox(bedW - curbT, 0.24, bedL - curbT, 2.0, 2.0);

  bedCoords.forEach((b, idx) => {
    const soil = new THREE.Mesh(grassBedGeom, materials.grass);
    soil.position.set(b.x, 0.12, b.z);
    soil.receiveShadow = true;
    group.add(soil);

    for (const sz of [-1, 1]) {
      const c = new THREE.Mesh(curbWGeom, materials.stoneTrim);
      c.position.set(b.x, 0, b.z + sz * (bedL / 2));
      c.castShadow = true;
      c.receiveShadow = true;
      group.add(c);
    }
    for (const sx of [-1, 1]) {
      const c = new THREE.Mesh(curbLGeom, materials.stoneTrim);
      c.position.set(b.x + sx * (bedW / 2), 0, b.z);
      c.castShadow = true;
      c.receiveShadow = true;
      group.add(c);
    }

    const bedCol = new THREE.Mesh(new THREE.BoxGeometry(bedW + 0.3, 0.9, bedL + 0.3));
    bedCol.position.set(b.x, 0.45, b.z);
    colliders.push(bedCol);

    // Place mature branching courtyard tree inside each stone-bordered bed
    buildBranchingTree(group, materials, b.x, 0.24, b.z, 1631 + idx * 97, leafMatrices, colliders);

    // Add compact ornamental boxwood shrubs near bed corners (pitched so leaves don't lie flat)
    const rand = mulberry32(420 + idx * 31);
    const dummy = new THREE.Object3D();
    for (const sx of [-1.45, 1.45]) {
      for (const sz of [-2.4, 2.4]) {
        for (let k = 0; k < 7; k++) {
          dummy.position.set(
            b.x + sx + (rand() - 0.5) * 0.45,
            0.30 + rand() * 0.32,
            b.z + sz + (rand() - 0.5) * 0.45
          );
          dummy.rotation.set(0.35 + rand() * 0.55, rand() * Math.PI * 2, (rand() - 0.5) * 0.6);
          const sc = 0.58 + rand() * 0.25;
          dummy.scale.set(sc, sc, sc);
          dummy.updateMatrix();
          leafMatrices.push(dummy.matrix.clone());
        }
      }
    }
  });

  const leafSprayGeom = createLeafSprayGeometry();
  const leavesIM = new THREE.InstancedMesh(leafSprayGeom, materials.foliage, leafMatrices.length);
  leavesIM.castShadow = true;
  leavesIM.receiveShadow = true;
  for (let i = 0; i < leafMatrices.length; i++) leavesIM.setMatrixAt(i, leafMatrices[i]);
  leavesIM.instanceMatrix.needsUpdate = true;
  group.add(leavesIM);

  // 4. Tea Garden Wooden Tables & Chairs (Çay Bahçesi Ahşap Masa-Sandalyeleri)
  const tableCenters = [
    { x: -6.8, z: -5.4 },
    { x: -9.8, z: -5.4 },
    { x: 6.8, z: -5.4 },
    { x: 9.8, z: -5.4 },
    { x: -6.8, z: 5.4 },
    { x: -9.8, z: 5.4 },
    { x: 6.8, z: 5.4 },
    { x: 9.8, z: 5.4 },
    { x: -6.8, z: -19.8 },
    { x: 6.8, z: -19.8 },
    { x: -6.8, z: 19.8 },
    { x: 6.8, z: 19.8 },
  ];

  const tableTopGeom = new THREE.CylinderGeometry(0.42, 0.42, 0.045, 8);
  applyWorldUVs(tableTopGeom, 1.0, 1.0);
  const tableLegGeom = createChamferedBlock(0.055, 0.68, 0.055, 0.008, 0.8);
  const tableBraceGeom = createChamferedBlock(0.46, 0.04, 0.04, 0.006, 0.8);

  const chairSeatGeom = createChamferedBlock(0.38, 0.04, 0.38, 0.008, 0.8);
  const chairLegGeom = createChamferedBlock(0.042, 0.44, 0.042, 0.006, 0.8);
  const chairBackPostGeom = createChamferedBlock(0.042, 0.42, 0.042, 0.006, 0.8);
  const chairBackSlatGeom = createChamferedBlock(0.36, 0.09, 0.032, 0.006, 0.8);

  const mTTop = [], mTLeg = [], mTBrace = [];
  const mCSeat = [], mCLeg = [], mCBackPost = [], mCBackSlat = [];
  const dummy = new THREE.Object3D();

  for (const tc of tableCenters) {
    // Table
    mTTop.push(new THREE.Matrix4().makeTranslation(tc.x, 0.69, tc.z));
    for (const lx of [-0.21, 0.21]) {
      for (const lz of [-0.21, 0.21]) {
        mTLeg.push(new THREE.Matrix4().makeTranslation(tc.x + lx, 0, tc.z + lz));
      }
    }
    mTBrace.push(new THREE.Matrix4().makeTranslation(tc.x, 0.22, tc.z));
    const brRot = new THREE.Matrix4().makeRotationY(Math.PI / 2);
    brRot.setPosition(tc.x, 0.22, tc.z);
    mTBrace.push(brRot);

    // Table collider
    const tCol = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 1.0, 8));
    tCol.position.set(tc.x, 0.5, tc.z);
    colliders.push(tCol);

    // 4 Wooden Chairs around each table
    for (let c = 0; c < 4; c++) {
      const ang = (c / 4) * Math.PI * 2 + 0.35;
      const dist = 0.74;
      const cx = tc.x + Math.cos(ang) * dist;
      const cz = tc.z + Math.sin(ang) * dist;
      const faceYaw = Math.atan2(-Math.cos(ang), -Math.sin(ang)); // Faces table center

      const cMat = new THREE.Matrix4().makeRotationY(faceYaw);
      cMat.setPosition(cx, 0, cz);
      const putC = (lx, ly, lz) => cMat.clone().multiply(new THREE.Matrix4().makeTranslation(lx, ly, lz));

      mCSeat.push(putC(0, 0.44, 0));
      for (const lx of [-0.15, 0.15]) {
        for (const lz of [-0.15, 0.15]) {
          mCLeg.push(putC(lx, 0, lz));
        }
        mCBackPost.push(putC(lx, 0.44, -0.15));
      }
      mCBackSlat.push(putC(0, 0.62, -0.15));
      mCBackSlat.push(putC(0, 0.76, -0.15));
    }
  }

  const addInst = (geom, mat, list) => {
    if (!list.length) return;
    const im = new THREE.InstancedMesh(geom, mat, list.length);
    im.castShadow = true;
    im.receiveShadow = true;
    for (let i = 0; i < list.length; i++) im.setMatrixAt(i, list[i]);
    im.instanceMatrix.needsUpdate = true;
    group.add(im);
  };

  addInst(tableTopGeom, materials.wood, mTTop);
  addInst(tableLegGeom, materials.wood, mTLeg);
  addInst(tableBraceGeom, materials.wood, mTBrace);
  addInst(chairSeatGeom, materials.wood, mCSeat);
  addInst(chairLegGeom, materials.wood, mCLeg);
  addInst(chairBackPostGeom, materials.wood, mCBackPost);
  addInst(chairBackSlatGeom, materials.wood, mCBackSlat);

  // 5. Hanging Wrought-Iron Arcade Lanterns (Dövme Demir Fenerler) + Warm 2700K PointLights
  const chainGeom = new THREE.CylinderGeometry(0.012, 0.012, 0.62, 6);
  const capGeom = new THREE.ConeGeometry(0.20, 0.18, 6);
  const basePlateGeom = new THREE.CylinderGeometry(0.14, 0.08, 0.08, 6);
  const glassCoreGeom = new THREE.CylinderGeometry(0.11, 0.09, 0.28, 6);
  const ribGeom = new THREE.CylinderGeometry(0.01, 0.01, 0.30, 5);

  const mChain = [], mCap = [], mBase = [], mGlass = [], mRib = [];
  const lanternPositions = [];

  // Every 2nd ground & upper arcade bay arch apex along all 4 sides + entrance corridor
  for (let i = 0; i < TASHAN.BAYS_Z; i++) {
    const zMid = (pierZ(i) + pierZ(i + 1)) / 2;
    if (i % 2 === 0 || i === 5) {
      lanternPositions.push({ x: pierX(0) - 0.85, y: TASHAN.GROUND_SPRING_Y + 1.55, z: zMid, key: i === 1 || i === 5 || i === 9 });
      lanternPositions.push({ x: pierX(TASHAN.BAYS_X) + 0.85, y: TASHAN.GROUND_SPRING_Y + 1.55, z: zMid, key: i === 1 || i === 5 || i === 9 });
      lanternPositions.push({ x: pierX(0) - 0.85, y: TASHAN.UPPER_SPRING_Y + 1.45, z: zMid, key: i === 5 });
      lanternPositions.push({ x: pierX(TASHAN.BAYS_X) + 0.85, y: TASHAN.UPPER_SPRING_Y + 1.45, z: zMid, key: i === 5 });
    }
  }
  for (let j = 0; j < TASHAN.BAYS_X; j++) {
    const xMid = (pierX(j) + pierX(j + 1)) / 2;
    if (j % 2 === 1) {
      lanternPositions.push({ x: xMid, y: TASHAN.GROUND_SPRING_Y + 1.55, z: pierZ(0) - 0.85, key: j === 3 });
      lanternPositions.push({ x: xMid, y: TASHAN.GROUND_SPRING_Y + 1.55, z: pierZ(TASHAN.BAYS_Z) + 0.85, key: j === 3 });
      lanternPositions.push({ x: xMid, y: TASHAN.UPPER_SPRING_Y + 1.45, z: pierZ(0) - 0.85, key: j === 3 });
      lanternPositions.push({ x: xMid, y: TASHAN.UPPER_SPRING_Y + 1.45, z: pierZ(TASHAN.BAYS_Z) + 0.85, key: j === 3 });
    }
  }
  // Entrance corridor & Taçkapı lantern
  lanternPositions.push({ x: 22.0, y: TASHAN.GROUND_SPRING_Y + 1.72, z: 0, key: true });
  lanternPositions.push({ x: 27.1, y: 4.55, z: 0, key: true });

  for (const lp of lanternPositions) {
    const topY = lp.y;
    const bodyY = topY - 0.56;
    mChain.push(new THREE.Matrix4().makeTranslation(lp.x, topY - 0.20, lp.z));
    mCap.push(new THREE.Matrix4().makeTranslation(lp.x, bodyY + 0.22, lp.z));
    mGlass.push(new THREE.Matrix4().makeTranslation(lp.x, bodyY, lp.z));
    mBase.push(new THREE.Matrix4().makeTranslation(lp.x, bodyY - 0.18, lp.z));

    for (let r = 0; r < 6; r++) {
      const a = (r / 6) * Math.PI * 2;
      mRib.push(new THREE.Matrix4().makeTranslation(lp.x + Math.cos(a) * 0.125, bodyY, lp.z + Math.sin(a) * 0.125));
    }

    if (lp.key) {
      // Warm 2700K point light with bounded range
      const pt = new THREE.PointLight(0xffa94d, 2.2, 13.5, 1.7);
      pt.position.set(lp.x, bodyY - 0.05, lp.z);
      pt.castShadow = false;
      group.add(pt);
      lanternLights.push(pt);
    }
  }

  addInst(chainGeom, materials.iron, mChain);
  addInst(capGeom, materials.iron, mCap);
  addInst(basePlateGeom, materials.iron, mBase);
  addInst(ribGeom, materials.iron, mRib);

  const glassIM = new THREE.InstancedMesh(glassCoreGeom, materials.lanternGlass, mGlass.length);
  for (let i = 0; i < mGlass.length; i++) glassIM.setMatrixAt(i, mGlass[i]);
  glassIM.instanceMatrix.needsUpdate = true;
  group.add(glassIM);

  return { group, colliders, floorMeshes, lanternLights };
}
