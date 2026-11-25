import * as THREE from 'three';
import { TASHAN, pierX, pierZ } from './constants.js';
import { applyWorldUVs, createWorldBox } from './materials.js';

/**
 * Generates sample points along a classic Ottoman slightly-pointed arch curve
 * from right springing (+r, 0) over apex (0, rise) to left springing (-r, 0).
 */
export function sampleOttomanArch(halfSpan, rise, segments = 24, offsetRadial = 0) {
  const pts = [];
  const e = halfSpan * 0.10; // Slight Ottoman two-center pointedness
  const R = halfSpan + e;
  const maxY = Math.sqrt(R * R - e * e);
  const yScale = rise / maxY;

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    let x, y;
    if (t <= 0.5) {
      // Right side: from (halfSpan, 0) to (0, rise)
      const u = t * 2; // 0 -> 1
      const angMax = Math.acos(e / R);
      const ang = u * angMax;
      x = R * Math.cos(ang) - e;
      y = R * Math.sin(ang) * yScale;
    } else {
      // Left side: from (0, rise) to (-halfSpan, 0)
      const u = (t - 0.5) * 2; // 0 -> 1
      const angMax = Math.acos(e / R);
      const ang = (1 - u) * angMax;
      x = -(R * Math.cos(ang) - e);
      y = R * Math.sin(ang) * yScale;
    }

    if (offsetRadial !== 0) {
      // Push outward radially from (0, 0)
      const len = Math.hypot(x, y) || 1;
      const nx = x / len;
      const ny = y / len;
      x += nx * offsetRadial;
      y += ny * offsetRadial;
    }
    pts.push(new THREE.Vector2(x, y));
  }
  return pts;
}

/**
 * Builds extruded spandrel wall geometry with an open Ottoman arch cutout.
 */
function createSpandrelGeometry(baySpan, pierW, spandrelHeight, archRise, thickness) {
  const halfSpan = baySpan / 2;
  const clearHalf = (baySpan - pierW) / 2;
  const shape = new THREE.Shape();

  shape.moveTo(-halfSpan, spandrelHeight);
  shape.lineTo(halfSpan, spandrelHeight);
  shape.lineTo(halfSpan, 0);

  const archPts = sampleOttomanArch(clearHalf, archRise, 26, 0);
  for (const p of archPts) {
    shape.lineTo(p.x, p.y);
  }

  shape.lineTo(-halfSpan, 0);
  shape.closePath();

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.012,
    bevelSegments: 1,
    curveSegments: 24,
  });
  geom.translate(0, 0, -thickness / 2);
  applyWorldUVs(geom, 2.2, 2.2);
  return geom;
}

/**
 * Builds proud carved stone voussoir arch ring (kemer kuşağı).
 */
function createVoussoirRingGeometry(clearHalf, archRise, ringWidth, depth) {
  const inner = sampleOttomanArch(clearHalf, archRise, 26, 0);
  const outer = sampleOttomanArch(clearHalf, archRise, 26, ringWidth);
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
    depth,
    bevelEnabled: true,
    bevelThickness: 0.016,
    bevelSize: 0.014,
    bevelSegments: 1,
  });
  geom.translate(0, 0, -depth / 2);
  applyWorldUVs(geom, 1.6, 1.6);
  return geom;
}

/**
 * Builds tapered protruding keystone (kilit taşı) using beveled ExtrudeGeometry.
 */
function createKeystoneGeometry(widthTop, widthBot, height, depth) {
  const shape = new THREE.Shape();
  shape.moveTo(-widthBot / 2, 0);
  shape.lineTo(widthBot / 2, 0);
  shape.lineTo(widthTop / 2, height);
  shape.lineTo(-widthTop / 2, height);
  shape.closePath();

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.016,
    bevelSegments: 2,
  });
  geom.translate(0, 0, -depth / 2);
  applyWorldUVs(geom, 1.2, 1.2);
  return geom;
}

/**
 * Creates a chamfered square stone prism via beveled ExtrudeGeometry (no raw BoxGeometry).
 */
export function createChamferedBlock(width, height, depth, bevel = 0.025, tileSize = 1.8) {
  const hw = width / 2 - bevel;
  const hd = depth / 2 - bevel;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, -hd);
  shape.lineTo(hw, -hd);
  shape.lineTo(hw, hd);
  shape.lineTo(-hw, hd);
  shape.closePath();

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.02, height - bevel * 2),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
  });
  geom.rotateX(-Math.PI / 2);
  geom.computeBoundingBox();
  // Pin bottom exactly to y = 0 so stacked blocks and piers sit flush without floating
  geom.translate(0, -geom.boundingBox.min.y, 0);
  applyWorldUVs(geom, tileSize, tileSize);
  return geom;
}

/**
 * Populates InstancedMesh from an array of Matrix4 transforms.
 */
function makeInstanced(geom, mat, matrices, castShadow = true, receiveShadow = true) {
  if (matrices.length === 0) return null;
  const im = new THREE.InstancedMesh(geom, mat, matrices.length);
  im.castShadow = castShadow;
  im.receiveShadow = receiveShadow;
  for (let i = 0; i < matrices.length; i++) {
    im.setMatrixAt(i, matrices[i]);
  }
  im.instanceMatrix.needsUpdate = true;
  return im;
}

/**
 * Builds all ground & upper story piers, arches, keystones, almaşık upper bands,
 * arcade floor slabs, courtyard stone curbs, and upper floor timber balustrades.
 */
export function buildArcades(materials) {
  const group = new THREE.Group();
  group.name = 'TashanArcades';
  const colliders = [];
  const floorMeshes = [];

  // 1. Arcade Pier Coordinates (all 34 perimeter piers on ground & upper floors)
  const pierPositions = [];
  // West (j=0) & East (j=BAYS_X) piers along Z: i=0..BAYS_Z
  for (let i = 0; i <= TASHAN.BAYS_Z; i++) {
    pierPositions.push({ x: pierX(0), z: pierZ(i) });
    pierPositions.push({ x: pierX(TASHAN.BAYS_X), z: pierZ(i) });
  }
  // North (i=0) & South (i=BAYS_Z) intermediate piers: j=1..BAYS_X-1
  for (let j = 1; j < TASHAN.BAYS_X; j++) {
    pierPositions.push({ x: pierX(j), z: pierZ(0) });
    pierPositions.push({ x: pierX(j), z: pierZ(TASHAN.BAYS_Z) });
  }

  // Geometries for Pier Base, Shaft, and Stepped Capital (Ground & Upper)
  const gBaseGeom1 = createChamferedBlock(1.08, 0.22, 1.08, 0.03, 1.6);
  const gBaseGeom2 = createChamferedBlock(0.98, 0.18, 0.98, 0.025, 1.6);
  const gShaftGeom = createChamferedBlock(TASHAN.GROUND_PIER_W, TASHAN.GROUND_SHAFT_H, TASHAN.GROUND_PIER_W, 0.025, 2.0);
  const gCapGeom1 = createChamferedBlock(0.98, 0.14, 0.98, 0.025, 1.5);
  const gCapGeom2 = createChamferedBlock(1.08, 0.16, 1.08, 0.03, 1.5);

  const uBaseGeom = createChamferedBlock(0.94, TASHAN.UPPER_BASE_H, 0.94, 0.025, 1.6);
  const uShaftGeom = createChamferedBlock(TASHAN.UPPER_PIER_W, TASHAN.UPPER_SHAFT_H, TASHAN.UPPER_PIER_W, 0.022, 2.0);
  const uCapGeom1 = createChamferedBlock(0.88, 0.12, 0.88, 0.02, 1.5);
  const uCapGeom2 = createChamferedBlock(0.98, 0.14, 0.98, 0.025, 1.5);

  const mGBase1 = [];
  const mGBase2 = [];
  const mGShaft = [];
  const mGCap1 = [];
  const mGCap2 = [];

  const mUBase = [];
  const mUShaft = [];
  const mUCap1 = [];
  const mUCap2 = [];

  // Collider box template for piers
  const pierColGeom = new THREE.BoxGeometry(TASHAN.GROUND_PIER_W, 4.9, TASHAN.GROUND_PIER_W);
  const upperPierColGeom = new THREE.BoxGeometry(TASHAN.UPPER_PIER_W, 4.5, TASHAN.UPPER_PIER_W);

  const mat4 = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);

  for (const { x, z } of pierPositions) {
    // Ground pier stack (Y = 0.12 -> 2.75)
    mGBase1.push(mat4(x, TASHAN.REVAK_Y, z));
    mGBase2.push(mat4(x, TASHAN.REVAK_Y + 0.22, z));
    mGShaft.push(mat4(x, TASHAN.REVAK_Y + 0.40, z));
    mGCap1.push(mat4(x, TASHAN.REVAK_Y + 2.33, z));
    mGCap2.push(mat4(x, TASHAN.REVAK_Y + 2.47, z));

    // Ground collider
    const gc = new THREE.Mesh(pierColGeom);
    gc.position.set(x, 2.55, z);
    colliders.push(gc);

    // Upper pier stack (Y = 5.10 -> 7.36)
    mUBase.push(mat4(x, TASHAN.UPPER_FLOOR_Y, z));
    mUShaft.push(mat4(x, TASHAN.UPPER_FLOOR_Y + TASHAN.UPPER_BASE_H, z));
    mUCap1.push(mat4(x, TASHAN.UPPER_FLOOR_Y + TASHAN.UPPER_BASE_H + TASHAN.UPPER_SHAFT_H, z));
    mUCap2.push(mat4(x, TASHAN.UPPER_FLOOR_Y + TASHAN.UPPER_BASE_H + TASHAN.UPPER_SHAFT_H + 0.12, z));

    const uc = new THREE.Mesh(upperPierColGeom);
    uc.position.set(x, TASHAN.UPPER_FLOOR_Y + 2.25, z);
    colliders.push(uc);
  }

  [
    makeInstanced(gBaseGeom1, materials.stoneTrim, mGBase1),
    makeInstanced(gBaseGeom2, materials.stoneTrim, mGBase2),
    makeInstanced(gShaftGeom, materials.stone, mGShaft),
    makeInstanced(gCapGeom1, materials.stoneTrim, mGCap1),
    makeInstanced(gCapGeom2, materials.stoneTrim, mGCap2),
    makeInstanced(uBaseGeom, materials.stoneTrim, mUBase),
    makeInstanced(uShaftGeom, materials.stone, mUShaft),
    makeInstanced(uCapGeom1, materials.stoneTrim, mUCap1),
    makeInstanced(uCapGeom2, materials.stoneTrim, mUCap2),
  ].forEach((m) => m && group.add(m));

  // 2. Arch Bays along all 4 sides (Ground & Upper)
  const gSpandrelH = TASHAN.UPPER_FLOOR_Y - TASHAN.GROUND_SPRING_Y; // 2.35 m
  const uSpandrelH = TASHAN.EAVE_Y - TASHAN.UPPER_SPRING_Y;        // 2.29 m

  const gSpanZGeom = createSpandrelGeometry(TASHAN.BAY_SPAN_Z, TASHAN.GROUND_PIER_W, gSpandrelH, TASHAN.GROUND_ARCH_RISE, 0.84);
  const gSpanXGeom = createSpandrelGeometry(TASHAN.BAY_SPAN_X, TASHAN.GROUND_PIER_W, gSpandrelH, TASHAN.GROUND_ARCH_RISE, 0.84);
  const uSpanZGeom = createSpandrelGeometry(TASHAN.BAY_SPAN_Z, TASHAN.UPPER_PIER_W, uSpandrelH, TASHAN.UPPER_ARCH_RISE, 0.74);
  const uSpanXGeom = createSpandrelGeometry(TASHAN.BAY_SPAN_X, TASHAN.UPPER_PIER_W, uSpandrelH, TASHAN.UPPER_ARCH_RISE, 0.74);

  const gRingZGeom = createVoussoirRingGeometry((TASHAN.BAY_SPAN_Z - TASHAN.GROUND_PIER_W) / 2, TASHAN.GROUND_ARCH_RISE, 0.34, 0.90);
  const gRingXGeom = createVoussoirRingGeometry((TASHAN.BAY_SPAN_X - TASHAN.GROUND_PIER_W) / 2, TASHAN.GROUND_ARCH_RISE, 0.34, 0.90);
  const uRingZGeom = createVoussoirRingGeometry((TASHAN.BAY_SPAN_Z - TASHAN.UPPER_PIER_W) / 2, TASHAN.UPPER_ARCH_RISE, 0.30, 0.80);
  const uRingXGeom = createVoussoirRingGeometry((TASHAN.BAY_SPAN_X - TASHAN.UPPER_PIER_W) / 2, TASHAN.UPPER_ARCH_RISE, 0.30, 0.80);

  const keyGeomG = createKeystoneGeometry(0.32, 0.22, 0.42, 0.98);
  const keyGeomU = createKeystoneGeometry(0.28, 0.20, 0.38, 0.88);

  const mGSpanZ = [];
  const mGSpanX = [];
  const mUSpanZ = [];
  const mUSpanX = [];
  const mGRingZ = [];
  const mGRingX = [];
  const mURingZ = [];
  const mURingX = [];
  const mGKey = [];
  const mUKey = [];

  // Almaşık horizontal brick hatıl strips along upper spandrel top (y = 8.95..9.35)
  const mBrickBandZ = [];
  const mBrickBandX = [];
  const brickBandZGeom = createWorldBox(TASHAN.BAY_SPAN_Z - 0.1, 0.26, 0.78, 1.6);
  const brickBandXGeom = createWorldBox(TASHAN.BAY_SPAN_X - 0.1, 0.26, 0.78, 1.6);

  // Balustrade matrices (balusters & rails)
  const mBaluster = [];
  const mRailZ = [];
  const mRailX = [];
  const balusterGeom = createChamferedBlock(0.068, 0.84, 0.068, 0.012, 1.2);
  const railZGeom = createChamferedBlock(TASHAN.BAY_SPAN_Z - TASHAN.UPPER_PIER_W + 0.04, 0.09, 0.13, 0.015, 1.6);
  const railXGeom = createChamferedBlock(TASHAN.BAY_SPAN_X - TASHAN.UPPER_PIER_W + 0.04, 0.09, 0.13, 0.015, 1.6);
  const railColZGeom = new THREE.BoxGeometry(0.18, 1.15, TASHAN.BAY_SPAN_Z - TASHAN.UPPER_PIER_W);
  const railColXGeom = new THREE.BoxGeometry(TASHAN.BAY_SPAN_X - TASHAN.UPPER_PIER_W, 1.15, 0.18);

  const makeOrientedMatrix = (x, y, z, rotY) => {
    const m = new THREE.Matrix4().makeRotationY(rotY);
    m.setPosition(x, y, z);
    return m;
  };

  // Helper to add a bay along Z (West & East wings)
  function addZBay(x, zCenter, rotY) {
    mGSpanZ.push(makeOrientedMatrix(x, TASHAN.GROUND_SPRING_Y, zCenter, rotY));
    mGRingZ.push(makeOrientedMatrix(x, TASHAN.GROUND_SPRING_Y, zCenter, rotY));
    mGKey.push(makeOrientedMatrix(x, TASHAN.GROUND_SPRING_Y + TASHAN.GROUND_ARCH_RISE - 0.02, zCenter, rotY));

    mUSpanZ.push(makeOrientedMatrix(x, TASHAN.UPPER_SPRING_Y, zCenter, rotY));
    mURingZ.push(makeOrientedMatrix(x, TASHAN.UPPER_SPRING_Y, zCenter, rotY));
    mUKey.push(makeOrientedMatrix(x, TASHAN.UPPER_SPRING_Y + TASHAN.UPPER_ARCH_RISE - 0.02, zCenter, rotY));
    mBrickBandZ.push(makeOrientedMatrix(x, TASHAN.EAVE_Y - 0.42, zCenter, rotY));

    // Upper floor timber balustrade (spans clear opening)
    const clearLen = TASHAN.BAY_SPAN_Z - TASHAN.UPPER_PIER_W;
    const nBal = 11;
    for (let k = 1; k <= nBal; k++) {
      const bz = zCenter - clearLen / 2 + (clearLen * k) / (nBal + 1);
      mBaluster.push(mat4(x, TASHAN.UPPER_FLOOR_Y + 0.08, bz));
    }
    mRailZ.push(makeOrientedMatrix(x, TASHAN.UPPER_FLOOR_Y, zCenter, rotY));
    mRailZ.push(makeOrientedMatrix(x, TASHAN.UPPER_FLOOR_Y + 0.92, zCenter, rotY));

    const rc = new THREE.Mesh(railColZGeom);
    rc.position.set(x, TASHAN.UPPER_FLOOR_Y + 0.55, zCenter);
    colliders.push(rc);
  }

  // Helper to add a bay along X (North & South wings)
  function addXBay(xCenter, z, rotY) {
    mGSpanX.push(makeOrientedMatrix(xCenter, TASHAN.GROUND_SPRING_Y, z, rotY));
    mGRingX.push(makeOrientedMatrix(xCenter, TASHAN.GROUND_SPRING_Y, z, rotY));
    mGKey.push(makeOrientedMatrix(xCenter, TASHAN.GROUND_SPRING_Y + TASHAN.GROUND_ARCH_RISE - 0.02, z, rotY));

    mUSpanX.push(makeOrientedMatrix(xCenter, TASHAN.UPPER_SPRING_Y, z, rotY));
    mURingX.push(makeOrientedMatrix(xCenter, TASHAN.UPPER_SPRING_Y, z, rotY));
    mUKey.push(makeOrientedMatrix(xCenter, TASHAN.UPPER_SPRING_Y + TASHAN.UPPER_ARCH_RISE - 0.02, z, rotY));
    mBrickBandX.push(makeOrientedMatrix(xCenter, TASHAN.EAVE_Y - 0.42, z, rotY));

    const clearLen = TASHAN.BAY_SPAN_X - TASHAN.UPPER_PIER_W;
    const nBal = 10;
    for (let k = 1; k <= nBal; k++) {
      const bx = xCenter - clearLen / 2 + (clearLen * k) / (nBal + 1);
      mBaluster.push(mat4(bx, TASHAN.UPPER_FLOOR_Y + 0.08, z));
    }
    mRailX.push(makeOrientedMatrix(xCenter, TASHAN.UPPER_FLOOR_Y, z, rotY));
    mRailX.push(makeOrientedMatrix(xCenter, TASHAN.UPPER_FLOOR_Y + 0.92, z, rotY));

    const rc = new THREE.Mesh(railColXGeom);
    rc.position.set(xCenter, TASHAN.UPPER_FLOOR_Y + 0.55, z);
    colliders.push(rc);
  }

  for (let i = 0; i < TASHAN.BAYS_Z; i++) {
    const zMid = (pierZ(i) + pierZ(i + 1)) / 2;
    addZBay(pierX(0), zMid, Math.PI / 2);              // West wing (facing +X)
    addZBay(pierX(TASHAN.BAYS_X), zMid, -Math.PI / 2); // East wing (facing -X)
  }

  for (let j = 0; j < TASHAN.BAYS_X; j++) {
    const xMid = (pierX(j) + pierX(j + 1)) / 2;
    addXBay(xMid, pierZ(0), 0);                        // North wing (facing +Z)
    addXBay(xMid, pierZ(TASHAN.BAYS_Z), Math.PI);      // South wing (facing -Z)
  }

  [
    makeInstanced(gSpanZGeom, materials.stone, mGSpanZ),
    makeInstanced(gSpanXGeom, materials.stone, mGSpanX),
    makeInstanced(uSpanZGeom, materials.stone, mUSpanZ),
    makeInstanced(uSpanXGeom, materials.stone, mUSpanX),
    makeInstanced(gRingZGeom, materials.stoneTrim, mGRingZ),
    makeInstanced(gRingXGeom, materials.stoneTrim, mGRingX),
    makeInstanced(uRingZGeom, materials.brick, mURingZ),
    makeInstanced(uRingXGeom, materials.brick, mURingX),
    makeInstanced(keyGeomG, materials.stoneTrim, mGKey),
    makeInstanced(keyGeomU, materials.stoneTrim, mUKey),
    makeInstanced(brickBandZGeom, materials.brick, mBrickBandZ),
    makeInstanced(brickBandXGeom, materials.brick, mBrickBandX),
    makeInstanced(balusterGeom, materials.wood, mBaluster),
    makeInstanced(railZGeom, materials.wood, mRailZ),
    makeInstanced(railXGeom, materials.wood, mRailX),
  ].forEach((m) => m && group.add(m));

  // 3. Stone Molded Belt Courses (kat silmesi) & Upper Eave Cornice
  const addBelt = (w, h, d, x, y, z, mat) => {
    const mesh = new THREE.Mesh(createWorldBox(w, h, d, 2.0, 1.0), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  };

  const fullZ = TASHAN.COURTYARD_PIER_Z + 0.90;
  const fullX = TASHAN.COURTYARD_PIER_X + 0.90;

  // Ground-to-upper stone belt molding at Y = 5.02 and eave stone cornice at Y = 9.54
  for (const [y, h, extra] of [
    [5.00, 0.20, 0.14],
    [9.54, 0.22, 0.18],
  ]) {
    addBelt(0.92 + extra, h, fullZ, pierX(0), y, 0, materials.stoneTrim);
    addBelt(0.92 + extra, h, fullZ, pierX(TASHAN.BAYS_X), y, 0, materials.stoneTrim);
    addBelt(fullX, h, 0.92 + extra, 0, y, pierZ(0), materials.stoneTrim);
    addBelt(fullX, h, 0.92 + extra, 0, y, pierZ(TASHAN.BAYS_Z), materials.stoneTrim);
  }

  // 4. Arcade Floor Slabs (Ground Revak Y=0.12 + Upper Floor Y=5.10 with East stairwell cutouts)
  const revakSlabH = TASHAN.REVAK_Y; // 0.12 m
  const revakStripW = TASHAN.REVAK_DEPTH + 0.50; // 4.10 m (under pier + up to shop wall)
  const wingZSpan = TASHAN.WALL_SOUTH_Z - TASHAN.WALL_NORTH_Z; // 60.55 m
  const wingXSpan = TASHAN.WALL_EAST_X - TASHAN.WALL_WEST_X;   // 35.40 m

  const addFloorSlab = (w, h, d, x, yBottom, z, mat = materials.cobble) => {
    const mesh = new THREE.Mesh(createWorldBox(w, h, d, 2.6, 2.6), mat);
    mesh.position.set(x, yBottom + h / 2, z);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    group.add(mesh);
    floorMeshes.push(mesh);
    return mesh;
  };

  // Ground revak slabs (West, North, South, East)
  addFloorSlab(revakStripW, revakSlabH, wingZSpan, pierX(0) - 1.55, 0, 0);
  addFloorSlab(revakStripW, revakSlabH, wingZSpan, pierX(TASHAN.BAYS_X) + 1.55, 0, 0);
  addFloorSlab(wingXSpan - 8.2, revakSlabH, revakStripW, 0, 0, pierZ(0) - 1.55);
  addFloorSlab(wingXSpan - 8.2, revakSlabH, revakStripW, 0, 0, pierZ(TASHAN.BAYS_Z) + 1.55);

  // Subtle stepped stone border curb around courtyard edge (makes 12cm step visually crisp & easily walkable)
  const addCurb = (w, d, x, z) => {
    const geom = createChamferedBlock(w, 0.12, d, 0.025, 1.8);
    const mesh = new THREE.Mesh(geom, materials.stoneTrim);
    mesh.position.set(x, 0, z);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    group.add(mesh);
    floorMeshes.push(mesh);
  };
  addCurb(0.28, TASHAN.COURTYARD_PIER_Z + 0.90, pierX(0) + 0.45, 0);
  addCurb(0.28, TASHAN.COURTYARD_PIER_Z + 0.90, pierX(TASHAN.BAYS_X) - 0.45, 0);
  addCurb(TASHAN.COURTYARD_PIER_X - 0.90, 0.28, 0, pierZ(0) + 0.45);
  addCurb(TASHAN.COURTYARD_PIER_X - 0.90, 0.28, 0, pierZ(TASHAN.BAYS_Z) - 0.45);

  // Upper floor deck (Y = 4.78 .. 5.10, thickness 0.32 m)
  const uSlabH = 0.32;
  const uSlabY = TASHAN.UPPER_FLOOR_Y - uSlabH; // 4.78 m
  // West wing full upper slab
  addFloorSlab(4.35, uSlabH, wingZSpan, -15.725, uSlabY, 0);
  // North & South wing upper slabs (flush against West & East slabs at X = ±13.55)
  addFloorSlab(27.10, uSlabH, 4.35, 0, uSlabY, -28.475);
  addFloorSlab(27.10, uSlabH, 4.35, 0, uSlabY, 28.475);

  // East wing upper floor slabs — split carefully around the two symmetric stairwells!
  // Outer East gallery corridor (walkway passing beside stairwells): X = +13.65 .. +15.85 (2.20 m wide!)
  addFloorSlab(2.20, uSlabH, 24.40, 14.75, uSlabY, 0);
  // Plastered soffit underside beneath East upper walkway (so looking up from stairs shows lime plaster, not cobble)
  const eastSoffit = new THREE.Mesh(createWorldBox(2.16, 0.04, 24.30, 2.4), materials.plaster);
  eastSoffit.position.set(14.75, uSlabY - 0.015, 0);
  eastSoffit.receiveShadow = true;
  group.add(eastSoffit);
  // North-East landing & gallery (Z = -30.275 .. -12.20)
  addFloorSlab(4.35, uSlabH, 18.075, 15.725, uSlabY, -21.2375);
  // South-East landing & gallery (Z = +12.20 .. +30.275)
  addFloorSlab(4.35, uSlabH, 18.075, 15.725, uSlabY, 21.2375);
  // Central East Mescit vestibule landing above entrance (Z = -3.20 .. +3.20, X = +15.85 .. +17.90)
  addFloorSlab(2.05, uSlabH, 6.40, 16.875, uSlabY, 0);

  // Stairwell guardrails along X = +15.82 (Z = -12.10..-3.30 and +3.30..+12.10) so player cannot fall into stairwell
  const swRailGeom = createChamferedBlock(0.11, 0.08, 8.80, 0.014, 1.6);
  const swPostGeom = createChamferedBlock(0.08, 0.96, 0.08, 0.012, 1.2);
  const swColGeom = new THREE.BoxGeometry(0.16, 1.15, 8.80);

  for (const sign of [-1, 1]) {
    const zMid = sign * 7.70;
    const topRail = new THREE.Mesh(swRailGeom, materials.wood);
    topRail.position.set(15.82, TASHAN.UPPER_FLOOR_Y + 0.94, zMid);
    topRail.castShadow = true;
    group.add(topRail);

    const botRail = new THREE.Mesh(swRailGeom, materials.wood);
    botRail.position.set(15.82, TASHAN.UPPER_FLOOR_Y + 0.05, zMid);
    group.add(botRail);

    const postMats = [];
    for (let k = 0; k <= 16; k++) {
      const pz = sign * (3.30 + (8.80 * k) / 16);
      postMats.push(mat4(15.82, TASHAN.UPPER_FLOOR_Y, pz));
    }
    const posts = makeInstanced(swPostGeom, materials.wood, postMats);
    if (posts) group.add(posts);

    const col = new THREE.Mesh(swColGeom);
    col.position.set(15.82, TASHAN.UPPER_FLOOR_Y + 0.55, zMid);
    colliders.push(col);
  }

  return { group, colliders, floorMeshes };
}
