import * as THREE from 'three';
import { TASHAN, pierX, pierZ } from './constants.js';
import { applyWorldUVs } from './materials.js';
import { sampleOttomanArch, createChamferedBlock } from './ArchBay.js';

/**
 * Creates a curved barrel-vault shell extruded along Z (or rotated for X),
 * spanning `width` horizontally and rising `rise` vertically.
 */
function createBarrelVaultGeometry(width, length, rise, thickness = 0.14) {
  const halfW = width / 2;
  const inner = sampleOttomanArch(halfW, rise, 18, 0);
  const outer = sampleOttomanArch(halfW, rise, 18, thickness);

  const shape = new THREE.Shape();
  shape.moveTo(inner[0].x, inner[0].y);
  for (let i = 1; i < inner.length; i++) {
    shape.lineTo(inner[i].x, inner[i].y);
  }
  for (let i = outer.length - 1; i >= 0; i--) {
    shape.lineTo(outer[i].x, outer[i].y);
  }
  shape.closePath();

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: false,
    curveSegments: 18,
  });
  geom.translate(0, 0, -length / 2);
  applyWorldUVs(geom, 2.6, 2.6);
  return geom;
}

/**
 * Creates a transverse stone vault rib (takviye kemeri) across the revak corridor.
 */
function createTransverseRibGeometry(span, rise, ribDepth = 0.24, ribThick = 0.30) {
  const halfSpan = span / 2;
  const inner = sampleOttomanArch(halfSpan, rise, 20, -0.02);
  const outer = sampleOttomanArch(halfSpan, rise, 20, ribDepth);

  const shape = new THREE.Shape();
  shape.moveTo(inner[0].x, inner[0].y);
  for (let i = 1; i < inner.length; i++) {
    shape.lineTo(inner[i].x, inner[i].y);
  }
  for (let i = outer.length - 1; i >= 0; i--) {
    shape.lineTo(outer[i].x, outer[i].y);
  }
  shape.closePath();

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: ribThick,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.01,
    bevelSegments: 1,
  });
  geom.translate(0, 0, -ribThick / 2);
  applyWorldUVs(geom, 1.6, 1.6);
  return geom;
}

/**
 * Creates a cross-vaulted (groin vault) bay shell: two intersecting orthogonal arches
 * creating crisp diagonal groin ridges for each revak bay.
 */
function createGroinVaultBayGeometry(spanU, spanW, rise, segs = 14) {
  const positions = [];
  const uvs = [];
  const indices = [];

  const hu = spanU / 2;
  const hw = spanW / 2;

  for (let iz = 0; iz <= segs; iz++) {
    const vz = (iz / segs) * 2 - 1; // -1 .. +1
    const z = vz * hw;
    for (let ix = 0; ix <= segs; ix++) {
      const ux = (ix / segs) * 2 - 1; // -1 .. +1
      const x = ux * hu;

      // Groin vault height: maximum of the two crossed semi-elliptical profiles (pointing downward at groins)
      const hX = Math.sqrt(Math.max(0, 1 - ux * ux));
      const hZ = Math.sqrt(Math.max(0, 1 - vz * vz));
      const y = rise * Math.max(hX, hZ) * 0.96 + rise * 0.04 * (hX * hZ);

      positions.push(x, y, z);
      uvs.push(x / 2.6, z / 2.6);
    }
  }

  const row = segs + 1;
  for (let iz = 0; iz < segs; iz++) {
    for (let ix = 0; ix < segs; ix++) {
      const a = iz * row + ix;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      // Downward-facing normals (interior ceiling)
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setAttribute('uv1', new THREE.Float32BufferAttribute(uvs.slice(), 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Builds vaulted ceilings (groin vaults + barrel vaults + stone ribs + wall corbels)
 * for all ground and upper revak corridors.
 */
export function buildVaultCeilings(materials) {
  const group = new THREE.Group();
  group.name = 'TashanVaults';

  const revakCenterOffset = TASHAN.REVAK_DEPTH / 2; // 1.80 m from pier line to center of revak
  const ribSpan = TASHAN.REVAK_DEPTH - 0.10;        // 3.50 m clear span from pier to shop wall

  const gRise = TASHAN.GROUND_VAULT_CROWN - TASHAN.GROUND_SPRING_Y; // 2.00 m
  const uRise = TASHAN.UPPER_VAULT_CROWN - TASHAN.UPPER_SPRING_Y;   // 1.92 m

  // 1. Groin Vaults for each bay (West, North, South + non-stair East bays)
  const groinZGround = createGroinVaultBayGeometry(TASHAN.REVAK_DEPTH, TASHAN.BAY_SPAN_Z, gRise);
  const groinXGround = createGroinVaultBayGeometry(TASHAN.BAY_SPAN_X, TASHAN.REVAK_DEPTH, gRise);
  const groinZUpper = createGroinVaultBayGeometry(TASHAN.REVAK_DEPTH, TASHAN.BAY_SPAN_Z, uRise);
  const groinXUpper = createGroinVaultBayGeometry(TASHAN.BAY_SPAN_X, TASHAN.REVAK_DEPTH, uRise);
  const groinCornerG = createGroinVaultBayGeometry(TASHAN.REVAK_DEPTH, TASHAN.REVAK_DEPTH, gRise);
  const groinCornerU = createGroinVaultBayGeometry(TASHAN.REVAK_DEPTH, TASHAN.REVAK_DEPTH, uRise);

  const mGZG = [];
  const mGXG = [];
  const mGZU = [];
  const mGXU = [];
  const mGCG = [];
  const mGCU = [];

  // Transverse stone ribs & wall pilaster corbels
  const ribGGeom = createTransverseRibGeometry(ribSpan, gRise * 0.94, 0.22, 0.28);
  const ribUGeom = createTransverseRibGeometry(ribSpan, uRise * 0.94, 0.20, 0.26);
  const corbelGeom = createChamferedBlock(0.32, 0.38, 0.28, 0.02, 1.4);

  const mRibG = [];
  const mRibU = [];
  const mCorbel = [];

  const makeMat = (x, y, z, rotY = 0) => {
    const m = new THREE.Matrix4().makeRotationY(rotY);
    m.setPosition(x, y, z);
    return m;
  };

  // West Wing (all 11 bays ground & upper)
  const westRevakX = pierX(0) - revakCenterOffset; // -15.90 m
  for (let i = 0; i < TASHAN.BAYS_Z; i++) {
    const zMid = (pierZ(i) + pierZ(i + 1)) / 2;
    mGZG.push(makeMat(westRevakX, TASHAN.GROUND_SPRING_Y, zMid));
    mGZU.push(makeMat(westRevakX, TASHAN.UPPER_SPRING_Y, zMid));
  }
  for (let i = 0; i <= TASHAN.BAYS_Z; i++) {
    const pz = pierZ(i);
    mRibG.push(makeMat(westRevakX, TASHAN.GROUND_SPRING_Y, pz, 0));
    mRibU.push(makeMat(westRevakX, TASHAN.UPPER_SPRING_Y, pz, 0));
    mCorbel.push(makeMat(TASHAN.WALL_WEST_X + 0.14, TASHAN.GROUND_SPRING_Y - 0.36, pz, 0));
    mCorbel.push(makeMat(TASHAN.WALL_WEST_X + 0.14, TASHAN.UPPER_SPRING_Y - 0.36, pz, 0));
  }

  // East Wing (upper floor all 11 bays; ground floor only bays outside stairwells i=0,1,2 and i=8,9,10 + entrance i=5)
  const eastRevakX = pierX(TASHAN.BAYS_X) + revakCenterOffset; // +15.90 m
  for (let i = 0; i < TASHAN.BAYS_Z; i++) {
    const zMid = (pierZ(i) + pierZ(i + 1)) / 2;
    mGZU.push(makeMat(eastRevakX, TASHAN.UPPER_SPRING_Y, zMid));
    // Leave bays i=3,4 and i=6,7 open above ground level for the double-height stairwells!
    if (i <= 2 || i === 5 || i >= 8) {
      mGZG.push(makeMat(eastRevakX, TASHAN.GROUND_SPRING_Y, zMid));
    }
  }
  for (let i = 0; i <= TASHAN.BAYS_Z; i++) {
    const pz = pierZ(i);
    mRibU.push(makeMat(eastRevakX, TASHAN.UPPER_SPRING_Y, pz, 0));
    mCorbel.push(makeMat(TASHAN.WALL_EAST_X - 0.14, TASHAN.UPPER_SPRING_Y - 0.36, pz, 0));
    // Ground ribs outside stairwell zone (skip pier 3, 4, 7, 8 interior ribs so stair climb is uncluttered)
    if (i <= 2 || i === 5 || i === 6 || i >= 9) {
      mRibG.push(makeMat(eastRevakX, TASHAN.GROUND_SPRING_Y, pz, 0));
      mCorbel.push(makeMat(TASHAN.WALL_EAST_X - 0.14, TASHAN.GROUND_SPRING_Y - 0.36, pz, 0));
    }
  }

  // North & South Wings (all 6 bays ground & upper)
  const northRevakZ = pierZ(0) - revakCenterOffset;             // -28.475 m
  const southRevakZ = pierZ(TASHAN.BAYS_Z) + revakCenterOffset; // +28.475 m
  for (let j = 0; j < TASHAN.BAYS_X; j++) {
    const xMid = (pierX(j) + pierX(j + 1)) / 2;
    mGXG.push(makeMat(xMid, TASHAN.GROUND_SPRING_Y, northRevakZ));
    mGXG.push(makeMat(xMid, TASHAN.GROUND_SPRING_Y, southRevakZ));
    mGXU.push(makeMat(xMid, TASHAN.UPPER_SPRING_Y, northRevakZ));
    mGXU.push(makeMat(xMid, TASHAN.UPPER_SPRING_Y, southRevakZ));
  }
  for (let j = 0; j <= TASHAN.BAYS_X; j++) {
    const px = pierX(j);
    mRibG.push(makeMat(px, TASHAN.GROUND_SPRING_Y, northRevakZ, Math.PI / 2));
    mRibG.push(makeMat(px, TASHAN.GROUND_SPRING_Y, southRevakZ, Math.PI / 2));
    mRibU.push(makeMat(px, TASHAN.UPPER_SPRING_Y, northRevakZ, Math.PI / 2));
    mRibU.push(makeMat(px, TASHAN.UPPER_SPRING_Y, southRevakZ, Math.PI / 2));

    mCorbel.push(makeMat(px, TASHAN.GROUND_SPRING_Y - 0.36, TASHAN.WALL_NORTH_Z + 0.14, 0));
    mCorbel.push(makeMat(px, TASHAN.UPPER_SPRING_Y - 0.36, TASHAN.WALL_NORTH_Z + 0.14, 0));
    mCorbel.push(makeMat(px, TASHAN.GROUND_SPRING_Y - 0.36, TASHAN.WALL_SOUTH_Z - 0.14, 0));
    mCorbel.push(makeMat(px, TASHAN.UPPER_SPRING_Y - 0.36, TASHAN.WALL_SOUTH_Z - 0.14, 0));
  }

  // 4 Corner Groin Vaults connecting West/East and North/South wings
  for (const cx of [westRevakX, eastRevakX]) {
    for (const cz of [northRevakZ, southRevakZ]) {
      mGCG.push(makeMat(cx, TASHAN.GROUND_SPRING_Y, cz));
      mGCU.push(makeMat(cx, TASHAN.UPPER_SPRING_Y, cz));
    }
  }

  // Subtle solid masonry backing deck above upper vaults (prevents any sky leak above vaults under roof eaves)
  const ceilingLid = createBarrelVaultGeometry(TASHAN.REVAK_DEPTH + 0.6, 1.0, 0.2, 0.1);
  ceilingLid.dispose();

  const addInst = (geom, mat, list, cast = false) => {
    if (!list.length) return;
    const im = new THREE.InstancedMesh(geom, mat, list.length);
    im.castShadow = cast;
    im.receiveShadow = true;
    for (let i = 0; i < list.length; i++) im.setMatrixAt(i, list[i]);
    im.instanceMatrix.needsUpdate = true;
    group.add(im);
  };

  addInst(groinZGround, materials.plaster, mGZG, false);
  addInst(groinXGround, materials.plaster, mGXG, false);
  addInst(groinZUpper, materials.plaster, mGZU, false);
  addInst(groinXUpper, materials.plaster, mGXU, false);
  addInst(groinCornerG, materials.plaster, mGCG, false);
  addInst(groinCornerU, materials.plaster, mGCU, false);

  addInst(ribGGeom, materials.stoneTrim, mRibG, true);
  addInst(ribUGeom, materials.stoneTrim, mRibU, true);
  addInst(corbelGeom, materials.stoneTrim, mCorbel, true);

  return { group };
}
