import * as THREE from 'three';
import { TASHAN, pierX, pierZ } from './constants.js';
import { applyWorldUVs, createWorldBox } from './materials.js';
import { sampleOttomanArch, createChamferedBlock } from './ArchBay.js';

/**
 * Extrudes a bay-wide shop facade wall with genuinely recessed arched door + window cutouts.
 */
function createShopWallWithOpenings(span, height, thickness, hasDoor = true, hasWindow = true) {
  const hw = span / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, 0);
  shape.lineTo(hw, 0);
  shape.lineTo(hw, height);
  shape.lineTo(-hw, height);
  shape.closePath();

  if (hasDoor) {
    const dx = -0.92;
    const dw = 1.32;
    const dh = 2.02;
    const archRise = 0.44;
    const hole = new THREE.Path();
    hole.moveTo(dx - dw / 2, 0);
    hole.lineTo(dx + dw / 2, 0);
    hole.lineTo(dx + dw / 2, dh);
    const pts = sampleOttomanArch(dw / 2, archRise, 14, 0);
    for (const p of pts) {
      hole.lineTo(dx + p.x, dh + p.y);
    }
    hole.lineTo(dx - dw / 2, dh);
    hole.closePath();
    shape.holes.push(hole);
  }

  if (hasWindow) {
    const wx = 1.02;
    const ww = 1.12;
    const wy0 = 0.90;
    const wy1 = 2.04;
    const archRise = 0.28;
    const hole = new THREE.Path();
    hole.moveTo(wx - ww / 2, wy0);
    hole.lineTo(wx + ww / 2, wy0);
    hole.lineTo(wx + ww / 2, wy1);
    const pts = sampleOttomanArch(ww / 2, archRise, 12, 0);
    for (const p of pts) {
      hole.lineTo(wx + p.x, wy1 + p.y);
    }
    hole.lineTo(wx - ww / 2, wy1);
    hole.closePath();
    shape.holes.push(hole);
  }

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
    curveSegments: 14,
  });
  // Front face sits at local Z = 0, wall extends backward to Z = -thickness
  geom.translate(0, 0, -thickness);
  applyWorldUVs(geom, 2.2, 2.2);
  return geom;
}

/**
 * Creates molded stone arch frame (söve) around a door or window opening.
 */
function createOpeningFrameGeometry(openW, openBaseY, jambH, archRise, trimW = 0.15, depth = 0.12) {
  const outerShape = new THREE.Shape();
  const hw = openW / 2;
  const ohw = hw + trimW;
  const ptsOut = sampleOttomanArch(ohw, archRise + trimW * 0.9, 14, 0);
  const ptsIn = sampleOttomanArch(hw, archRise, 14, 0);

  outerShape.moveTo(-ohw, openBaseY);
  outerShape.lineTo(-hw, openBaseY);
  outerShape.lineTo(-hw, openBaseY + jambH);
  for (let i = ptsIn.length - 1; i >= 0; i--) {
    outerShape.lineTo(ptsIn[i].x, openBaseY + jambH + ptsIn[i].y);
  }
  outerShape.lineTo(hw, openBaseY);
  outerShape.lineTo(ohw, openBaseY);
  outerShape.lineTo(ohw, openBaseY + jambH);
  for (let i = 0; i < ptsOut.length; i++) {
    outerShape.lineTo(ptsOut[i].x, openBaseY + jambH + ptsOut[i].y);
  }
  outerShape.closePath();

  const geom = new THREE.ExtrudeGeometry(outerShape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.014,
    bevelSegments: 1,
  });
  geom.translate(0, 0, -depth * 0.65);
  applyWorldUVs(geom, 1.5, 1.5);
  return geom;
}

/**
 * Creates a recessed arched wooden door leaf matching the opening curve.
 */
function createArchedDoorGeometry(width, jambH, archRise, thick = 0.09) {
  const hw = width / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, 0);
  shape.lineTo(hw, 0);
  shape.lineTo(hw, jambH);
  const pts = sampleOttomanArch(hw, archRise, 14, 0);
  for (const p of pts) {
    shape.lineTo(p.x, jambH + p.y);
  }
  shape.lineTo(-hw, jambH);
  shape.closePath();

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: thick,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.01,
    bevelSegments: 1,
  });
  applyWorldUVs(geom, 1.4, 1.4);
  return geom;
}

/**
 * Builds all inner courtyard shop facades (ground + upper), recessed doors,
 * stone frames, iron grilles, open wooden shutters, almaşık brick courses,
 * and the complete outer perimeter building enclosure (80.80 m x 52.60 m).
 */
export function buildShopFacades(materials) {
  const group = new THREE.Group();
  group.name = 'TashanShopFacades';
  const colliders = [];

  const wallThick = 0.56;
  const gWallH = TASHAN.UPPER_FLOOR_Y - TASHAN.REVAK_Y; // 4.98 m
  const uWallH = TASHAN.EAVE_Y - TASHAN.UPPER_FLOOR_Y; // 4.55 m

  // Wall geometries for Z-span (4.85 m) and X-span (4.70 m)
  const gShopZGeom = createShopWallWithOpenings(TASHAN.BAY_SPAN_Z, gWallH, wallThick, true, true);
  const gShopXGeom = createShopWallWithOpenings(TASHAN.BAY_SPAN_X, gWallH, wallThick, true, true);
  const uShopZGeom = createShopWallWithOpenings(TASHAN.BAY_SPAN_Z, uWallH, wallThick, true, true);
  const uShopXGeom = createShopWallWithOpenings(TASHAN.BAY_SPAN_X, uWallH, wallThick, true, true);

  // Solid blind bay wall (for stairwell backing & corner returns)
  const blindWallZGeom = createShopWallWithOpenings(TASHAN.BAY_SPAN_Z, gWallH, wallThick, false, false);

  // Trim & details
  const doorFrameGeom = createOpeningFrameGeometry(1.32, 0, 2.02, 0.44, 0.16, 0.14);
  const winFrameGeom = createOpeningFrameGeometry(1.12, 0.90, 1.14, 0.28, 0.14, 0.14);
  const winSillGeom = createChamferedBlock(1.44, 0.10, 0.46, 0.018, 1.4);
  const doorSillGeom = createChamferedBlock(1.66, 0.08, 0.46, 0.016, 1.4);

  const doorLeafGeom = createArchedDoorGeometry(1.30, 2.00, 0.43, 0.08);
  const doorBattenGeom = createChamferedBlock(1.12, 0.08, 0.05, 0.01, 1.0);
  const doorStileGeom = createChamferedBlock(0.06, 2.15, 0.05, 0.008, 1.0);
  const backDropGeom = createWorldBox(3.40, 2.70, 0.08, 1.6);

  // Iron window grille & wooden shutter geometries
  const ironBarVGeom = new THREE.CylinderGeometry(0.014, 0.014, 1.38, 8);
  const ironBarHGeom = new THREE.CylinderGeometry(0.014, 0.014, 1.12, 8);
  ironBarHGeom.rotateZ(Math.PI / 2);
  const shutterGeom = createChamferedBlock(0.54, 1.12, 0.05, 0.01, 1.2);
  const shutterBraceGeom = createChamferedBlock(0.46, 0.06, 0.07, 0.008, 1.0);

  // Almaşık brick bands on upper shop walls (avoiding door/window heights or spanning full lintel/cornice bands)
  const almBandZTopGeom = createWorldBox(TASHAN.BAY_SPAN_Z, 0.22, 0.06, 1.6);
  const almBandXTopGeom = createWorldBox(TASHAN.BAY_SPAN_X, 0.22, 0.06, 1.6);

  const lists = {
    gShopZ: [],
    gShopX: [],
    uShopZ: [],
    uShopX: [],
    blindZ: [],
    doorFrame: [],
    winFrame: [],
    winSill: [],
    doorSill: [],
    doorLeaf: [],
    doorBatten: [],
    doorStile: [],
    backDrop: [],
    ironV: [],
    ironH: [],
    shutter: [],
    shutterBrace: [],
    almBandZ: [],
    almBandX: [],
  };

  /**
   * Computes a Matrix4 positioned in bay-local coordinates and transformed to world space.
   */
  function localMat(wx, wy, wz, rotY, lx, ly, lz, lRotY = 0) {
    const bayMat = new THREE.Matrix4().makeRotationY(rotY);
    bayMat.setPosition(wx, wy, wz);
    const loc = new THREE.Matrix4().makeRotationY(lRotY);
    loc.setPosition(lx, ly, lz);
    return bayMat.multiply(loc);
  }

  function addShopDetails(wx, wy, wz, rotY) {
    // Door at local x = -0.92, recessed Z = -0.34
    lists.doorFrame.push(localMat(wx, wy, wz, rotY, -0.92, 0, 0.02));
    lists.doorSill.push(localMat(wx, wy, wz, rotY, -0.92, 0, -0.18));
    lists.doorLeaf.push(localMat(wx, wy, wz, rotY, -0.92, 0.02, -0.36));
    lists.doorBatten.push(localMat(wx, wy, wz, rotY, -0.92, 0.48, -0.29));
    lists.doorBatten.push(localMat(wx, wy, wz, rotY, -0.92, 1.48, -0.29));
    lists.doorStile.push(localMat(wx, wy, wz, rotY, -0.92, 0.04, -0.29)); // Center astragal seam

    // Window at local x = +1.02, recessed Z = -0.32
    lists.winFrame.push(localMat(wx, wy, wz, rotY, 1.02, 0, 0.02));
    lists.winSill.push(localMat(wx, wy, wz, rotY, 1.02, 0.84, -0.16));
    lists.backDrop.push(localMat(wx, wy, wz, rotY, 0.10, 1.38, -0.54));

    // Iron window grille bars (5 vertical + 2 horizontal) at Z = -0.22
    for (let k = -2; k <= 2; k++) {
      lists.ironV.push(localMat(wx, wy, wz, rotY, 1.02 + k * 0.21, 1.59, -0.22));
    }
    lists.ironH.push(localMat(wx, wy, wz, rotY, 1.02, 1.30, -0.22));
    lists.ironH.push(localMat(wx, wy, wz, rotY, 1.02, 1.78, -0.22));

    // Twin open wooden shutters hinged cleanly at stone window jamb edges (±0.64 from window center)
    lists.shutter.push(localMat(wx, wy, wz, rotY, 1.02 - 0.725, 0.91, 0.306, 1.25));
    lists.shutter.push(localMat(wx, wy, wz, rotY, 1.02 + 0.725, 0.91, 0.306, -1.25));
    lists.shutterBrace.push(localMat(wx, wy, wz, rotY, 1.02 - 0.725, 1.12, 0.306, 1.25));
    lists.shutterBrace.push(localMat(wx, wy, wz, rotY, 1.02 + 0.725, 1.12, 0.306, -1.25));
    lists.shutterBrace.push(localMat(wx, wy, wz, rotY, 1.02 - 0.725, 1.78, 0.306, 1.25));
    lists.shutterBrace.push(localMat(wx, wy, wz, rotY, 1.02 + 0.725, 1.78, 0.306, -1.25));
  }

  function addUpperBrickBands(wx, wy, wz, rotY, isZBay) {
    const arr = isZBay ? lists.almBandZ : lists.almBandX;
    // Continuous upper almaşık brick hatıl bands above doorway/window lintel line
    arr.push(localMat(wx, wy, wz, rotY, 0, 2.75, 0.01));
    arr.push(localMat(wx, wy, wz, rotY, 0, 3.45, 0.01));
    arr.push(localMat(wx, wy, wz, rotY, 0, 4.15, 0.01));
  }

  // Populate West & East inner shop walls (11 bays each)
  for (let i = 0; i < TASHAN.BAYS_Z; i++) {
    const zMid = (pierZ(i) + pierZ(i + 1)) / 2;

    // West wing (wall at X = -17.70, facing +X -> rotY = +PI/2)
    lists.gShopZ.push(localMat(TASHAN.WALL_WEST_X, TASHAN.REVAK_Y, zMid, Math.PI / 2, 0, 0, 0));
    addShopDetails(TASHAN.WALL_WEST_X, TASHAN.REVAK_Y, zMid, Math.PI / 2);

    lists.uShopZ.push(localMat(TASHAN.WALL_WEST_X, TASHAN.UPPER_FLOOR_Y, zMid, Math.PI / 2, 0, 0, 0));
    addShopDetails(TASHAN.WALL_WEST_X, TASHAN.UPPER_FLOOR_Y, zMid, Math.PI / 2);
    addUpperBrickBands(TASHAN.WALL_WEST_X, TASHAN.UPPER_FLOOR_Y, zMid, Math.PI / 2, true);

    // East wing (wall at X = +17.70, facing -X -> rotY = -PI/2)
    if (i === 5) {
      // Center entrance bay (Z = 0): open on ground floor (Taçkapı corridor) AND open doorway into Mescit upstairs
      // Upper floor Mescit entrance wall is built in MainPortal.js
    } else if (i === 3 || i === 4 || i === 6 || i === 7) {
      // Stairwell backdrop on ground floor: blind masonry wall behind StoneStairs
      lists.blindZ.push(localMat(TASHAN.WALL_EAST_X, TASHAN.REVAK_Y, zMid, -Math.PI / 2, 0, 0, 0));
      // Upper level behind stairs: solid upper wall with almaşık bands & high window
      lists.uShopZ.push(localMat(TASHAN.WALL_EAST_X, TASHAN.UPPER_FLOOR_Y, zMid, -Math.PI / 2, 0, 0, 0));
      addShopDetails(TASHAN.WALL_EAST_X, TASHAN.UPPER_FLOOR_Y, zMid, -Math.PI / 2);
      addUpperBrickBands(TASHAN.WALL_EAST_X, TASHAN.UPPER_FLOOR_Y, zMid, -Math.PI / 2, true);
    } else {
      lists.gShopZ.push(localMat(TASHAN.WALL_EAST_X, TASHAN.REVAK_Y, zMid, -Math.PI / 2, 0, 0, 0));
      addShopDetails(TASHAN.WALL_EAST_X, TASHAN.REVAK_Y, zMid, -Math.PI / 2);

      lists.uShopZ.push(localMat(TASHAN.WALL_EAST_X, TASHAN.UPPER_FLOOR_Y, zMid, -Math.PI / 2, 0, 0, 0));
      addShopDetails(TASHAN.WALL_EAST_X, TASHAN.UPPER_FLOOR_Y, zMid, -Math.PI / 2);
      addUpperBrickBands(TASHAN.WALL_EAST_X, TASHAN.UPPER_FLOOR_Y, zMid, -Math.PI / 2, true);
    }
  }

  // Populate North & South inner shop walls (6 bays each)
  for (let j = 0; j < TASHAN.BAYS_X; j++) {
    const xMid = (pierX(j) + pierX(j + 1)) / 2;

    // North wing (wall at Z = -30.275, facing +Z -> rotY = 0)
    lists.gShopX.push(localMat(xMid, TASHAN.REVAK_Y, TASHAN.WALL_NORTH_Z, 0, 0, 0, 0));
    addShopDetails(xMid, TASHAN.REVAK_Y, TASHAN.WALL_NORTH_Z, 0);

    lists.uShopX.push(localMat(xMid, TASHAN.UPPER_FLOOR_Y, TASHAN.WALL_NORTH_Z, 0, 0, 0, 0));
    addShopDetails(xMid, TASHAN.UPPER_FLOOR_Y, TASHAN.WALL_NORTH_Z, 0);
    addUpperBrickBands(xMid, TASHAN.UPPER_FLOOR_Y, TASHAN.WALL_NORTH_Z, 0, false);

    // South wing (wall at Z = +30.275, facing -Z -> rotY = PI)
    lists.gShopX.push(localMat(xMid, TASHAN.REVAK_Y, TASHAN.WALL_SOUTH_Z, Math.PI, 0, 0, 0));
    addShopDetails(xMid, TASHAN.REVAK_Y, TASHAN.WALL_SOUTH_Z, Math.PI);

    lists.uShopX.push(localMat(xMid, TASHAN.UPPER_FLOOR_Y, TASHAN.WALL_SOUTH_Z, Math.PI, 0, 0, 0));
    addShopDetails(xMid, TASHAN.UPPER_FLOOR_Y, TASHAN.WALL_SOUTH_Z, Math.PI);
    addUpperBrickBands(xMid, TASHAN.UPPER_FLOOR_Y, TASHAN.WALL_SOUTH_Z, Math.PI, false);
  }

  const addInst = (geom, mat, mats, cast = true) => {
    if (!mats.length) return;
    const im = new THREE.InstancedMesh(geom, mat, mats.length);
    im.castShadow = cast;
    im.receiveShadow = true;
    for (let i = 0; i < mats.length; i++) im.setMatrixAt(i, mats[i]);
    im.instanceMatrix.needsUpdate = true;
    group.add(im);
  };

  addInst(gShopZGeom, materials.stone, lists.gShopZ);
  addInst(gShopXGeom, materials.stone, lists.gShopX);
  addInst(uShopZGeom, materials.stone, lists.uShopZ);
  addInst(uShopXGeom, materials.stone, lists.uShopX);
  addInst(blindWallZGeom, materials.stone, lists.blindZ);

  addInst(doorFrameGeom, materials.stoneTrim, lists.doorFrame);
  addInst(winFrameGeom, materials.stoneTrim, lists.winFrame);
  addInst(winSillGeom, materials.stoneTrim, lists.winSill);
  addInst(doorSillGeom, materials.stoneTrim, lists.doorSill);
  addInst(doorLeafGeom, materials.wood, lists.doorLeaf);
  addInst(doorBattenGeom, materials.wood, lists.doorBatten);
  addInst(doorStileGeom, materials.wood, lists.doorStile);
  addInst(backDropGeom, materials.interiorDark, lists.backDrop, false);

  addInst(ironBarVGeom, materials.iron, lists.ironV);
  addInst(ironBarHGeom, materials.iron, lists.ironH);
  addInst(shutterGeom, materials.wood, lists.shutter);
  addInst(shutterBraceGeom, materials.iron, lists.shutterBrace);

  addInst(almBandZTopGeom, materials.brick, lists.almBandZ);
  addInst(almBandXTopGeom, materials.brick, lists.almBandX);

  // Fill 4 solid corner masonry blocks bridging the wall thickness junction (±17.70..±18.26, ±30.275..±30.835)
  const cornerPlugGeom = createWorldBox(0.65, TASHAN.EAVE_Y, 0.65, 2.2);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const plug = new THREE.Mesh(cornerPlugGeom, materials.stone);
      plug.position.set(sx * (TASHAN.WALL_EAST_X + 0.28), TASHAN.EAVE_Y / 2, sz * (TASHAN.WALL_SOUTH_Z + 0.28));
      plug.castShadow = true;
      plug.receiveShadow = true;
      group.add(plug);
    }
  }

  // Colliders for all 4 inner courtyard shop walls (leaving East entrance bay Z=-2.10..+2.10 open on ground floor!)
  const addWallCollider = (w, h, d, x, y, z) => {
    const c = new THREE.Mesh(new THREE.BoxGeometry(w, h, d));
    c.position.set(x, y, z);
    colliders.push(c);
  };
  const fullZLen = TASHAN.WALL_SOUTH_Z - TASHAN.WALL_NORTH_Z + 1.2; // ~61.75 m
  const fullXLen = TASHAN.WALL_EAST_X - TASHAN.WALL_WEST_X + 1.2;   // ~36.60 m

  // West, North, South full height colliders
  addWallCollider(0.70, TASHAN.EAVE_Y, fullZLen, TASHAN.WALL_WEST_X - 0.28, TASHAN.EAVE_Y / 2, 0);
  addWallCollider(fullXLen, TASHAN.EAVE_Y, 0.70, 0, TASHAN.EAVE_Y / 2, TASHAN.WALL_NORTH_Z - 0.28);
  addWallCollider(fullXLen, TASHAN.EAVE_Y, 0.70, 0, TASHAN.EAVE_Y / 2, TASHAN.WALL_SOUTH_Z + 0.28);

  // East inner shop wall colliders: split North & South of center entrance bay (Z = -2.05 .. +2.05)
  const eastHalfZ = (TASHAN.WALL_SOUTH_Z - 2.05) + 0.60; // ~28.825 m
  const eastMidZ = 2.05 + eastHalfZ / 2;
  addWallCollider(0.70, TASHAN.EAVE_Y, eastHalfZ, TASHAN.WALL_EAST_X + 0.28, TASHAN.EAVE_Y / 2, -eastMidZ);
  addWallCollider(0.70, TASHAN.EAVE_Y, eastHalfZ, TASHAN.WALL_EAST_X + 0.28, TASHAN.EAVE_Y / 2, eastMidZ);
  // East upper lintel collider above entrance doorway (allows walking through ground entrance & into upper Mescit doorway!)
  addWallCollider(0.70, 1.40, 4.20, TASHAN.WALL_EAST_X + 0.28, TASHAN.UPPER_FLOOR_Y - 0.5, 0);

  // =========================================================================
  // OUTER PERIMETER BUILDING MASS & HISTORIC FACADES (80.80 m x 52.60 m)
  // =========================================================================
  const outerBuildGroup = buildOuterPerimeterWalls(materials, colliders);
  group.add(outerBuildGroup);

  return { group, colliders };
}

/**
 * Builds the massive 80.80 m x 52.60 m outer Tokat Taşhan perimeter walls:
 * cut stone ground level with recessed exterior arched shops + upper almaşık masonry
 * with rhythmic recessed upper windows and brick bands.
 */
function buildOuterPerimeterWalls(materials, colliders) {
  const outerGroup = new THREE.Group();
  outerGroup.name = 'TashanOuterWalls';

  const outerH = TASHAN.EAVE_Y - TASHAN.STREET_Y; // -0.18 -> +9.65 (9.83 m)
  const gH = TASHAN.UPPER_FLOOR_Y - TASHAN.STREET_Y; // 5.28 m
  const uH = TASHAN.EAVE_Y - TASHAN.UPPER_FLOOR_Y;   // 4.55 m
  const wallT = 0.85;

  // Outer wing backing slabs (dark stone roof-supporting perimeter parapet & wing top cap under roof)
  const addOuterSection = (len, x, z, rotY, skipCenterPortal = false) => {
    const nBays = Math.round(len / 5.20);
    const bayW = len / nBays;

    // Upper floor wall with small arched room windows (one per bay)
    const winWallShape = new THREE.Shape();
    winWallShape.moveTo(-bayW / 2, 0);
    winWallShape.lineTo(bayW / 2, 0);
    winWallShape.lineTo(bayW / 2, uH);
    winWallShape.lineTo(-bayW / 2, uH);
    winWallShape.closePath();

    const wh = new THREE.Path();
    const ww = 1.04;
    wh.moveTo(-ww / 2, 1.05);
    wh.lineTo(ww / 2, 1.05);
    wh.lineTo(ww / 2, 2.25);
    const wPts = sampleOttomanArch(ww / 2, 0.30, 10, 0);
    for (const p of wPts) wh.lineTo(p.x, 2.25 + p.y);
    wh.lineTo(-ww / 2, 2.25);
    wh.closePath();
    winWallShape.holes.push(wh);

    const uWallGeom = new THREE.ExtrudeGeometry(winWallShape, { depth: wallT, bevelEnabled: false });
    uWallGeom.translate(0, 0, -wallT);
    applyWorldUVs(uWallGeom, 2.2, 2.2);

    // Ground floor exterior shop bay (arched shop opening)
    const gWallShape = new THREE.Shape();
    gWallShape.moveTo(-bayW / 2, 0);
    gWallShape.lineTo(bayW / 2, 0);
    gWallShape.lineTo(bayW / 2, gH);
    gWallShape.lineTo(-bayW / 2, gH);
    gWallShape.closePath();

    const sh = new THREE.Path();
    const sw = 2.05;
    sh.moveTo(-sw / 2, 0.18);
    sh.lineTo(sw / 2, 0.18);
    sh.lineTo(sw / 2, 2.35);
    const sPts = sampleOttomanArch(sw / 2, 0.65, 12, 0);
    for (const p of sPts) sh.lineTo(p.x, 2.35 + p.y);
    sh.lineTo(-sw / 2, 2.35);
    sh.closePath();
    gWallShape.holes.push(sh);

    const gWallGeom = new THREE.ExtrudeGeometry(gWallShape, { depth: wallT, bevelEnabled: false });
    gWallGeom.translate(0, 0, -wallT);
    applyWorldUVs(gWallGeom, 2.2, 2.2);

    const winFrameGeom = createOpeningFrameGeometry(ww, 1.05, 1.20, 0.30, 0.14, 0.14);
    const shopFrameGeom = createOpeningFrameGeometry(sw, 0.18, 2.17, 0.65, 0.18, 0.14);
    const uSillGeom = createChamferedBlock(1.36, 0.10, 0.36, 0.016, 1.4);
    const gShutterGeom = createArchedDoorGeometry(sw - 0.04, 2.15, 0.63, 0.08);
    const gShopBattenGeom = createChamferedBlock(sw - 0.18, 0.08, 0.05, 0.008, 1.0);
    const gShopStileGeom = createChamferedBlock(0.06, 2.25, 0.05, 0.008, 1.0);
    const gShopSillGeom = createChamferedBlock(sw + 0.28, 0.16, 0.42, 0.018, 1.4);
    const winBackGeom = createWorldBox(1.40, 1.80, 0.08, 1.4);
    const barVGeom = new THREE.CylinderGeometry(0.015, 0.015, 1.42, 8);

    const brickBandGeom = createWorldBox(bayW, 0.24, 0.06, 1.6);
    const beltGeom = createWorldBox(bayW, 0.20, 0.18, 1.8);

    const mG = [], mU = [], mSF = [], mWF = [], mSill = [], mDoor = [], mGBatten = [], mGStile = [], mGSill = [], mBack = [], mBar = [], mBrick = [], mBelt = [];

    const parent = new THREE.Matrix4().makeRotationY(rotY);
    parent.setPosition(x, 0, z);
    const put = (lx, ly, lz) => {
      const m = new THREE.Matrix4().makeTranslation(lx, ly, lz);
      return parent.clone().multiply(m);
    };

    for (let k = 0; k < nBays; k++) {
      const offset = -len / 2 + (k + 0.5) * bayW;
      // Leave center ~7.4 m open on East facade for the projecting Taçkapı & Mescit!
      if (skipCenterPortal && Math.abs(offset) < 3.70) {
        continue;
      }
      mG.push(put(offset, TASHAN.STREET_Y, 0));
      mU.push(put(offset, TASHAN.UPPER_FLOOR_Y, 0));
      mSF.push(put(offset, TASHAN.STREET_Y, 0.02));
      mWF.push(put(offset, TASHAN.UPPER_FLOOR_Y, 0.02));
      mSill.push(put(offset, TASHAN.UPPER_FLOOR_Y + 0.99, -0.10));
      mDoor.push(put(offset, TASHAN.STREET_Y + 0.18, -0.34));
      mGSill.push(put(offset, TASHAN.STREET_Y, -0.12));
      mGBatten.push(put(offset, TASHAN.STREET_Y + 0.65, -0.27));
      mGBatten.push(put(offset, TASHAN.STREET_Y + 1.65, -0.27));
      mGStile.push(put(offset, TASHAN.STREET_Y + 0.18, -0.27));
      mBack.push(put(offset, TASHAN.UPPER_FLOOR_Y + 1.75, -0.48));
      for (let b = -2; b <= 2; b++) {
        mBar.push(put(offset + b * 0.19, TASHAN.UPPER_FLOOR_Y + 1.75, -0.22));
      }
      // Almaşık brick bands on upper outer facade
      mBrick.push(put(offset, TASHAN.UPPER_FLOOR_Y + 0.45, 0.02));
      mBrick.push(put(offset, TASHAN.UPPER_FLOOR_Y + 2.88, 0.02));
      mBrick.push(put(offset, TASHAN.UPPER_FLOOR_Y + 3.65, 0.02));
      mBrick.push(put(offset, TASHAN.UPPER_FLOOR_Y + 4.18, 0.02));
      // Stone belt & cornice
      mBelt.push(put(offset, TASHAN.UPPER_FLOOR_Y - 0.05, 0.04));
      mBelt.push(put(offset, TASHAN.EAVE_Y - 0.11, 0.06));
    }

    const addI = (geom, mat, arr, cast = true) => {
      if (!arr.length) return;
      const im = new THREE.InstancedMesh(geom, mat, arr.length);
      im.castShadow = cast;
      im.receiveShadow = true;
      for (let i = 0; i < arr.length; i++) im.setMatrixAt(i, arr[i]);
      im.instanceMatrix.needsUpdate = true;
      outerGroup.add(im);
    };

    addI(gWallGeom, materials.stone, mG);
    addI(uWallGeom, materials.stone, mU);
    addI(shopFrameGeom, materials.stoneTrim, mSF);
    addI(winFrameGeom, materials.stoneTrim, mWF);
    addI(uSillGeom, materials.stoneTrim, mSill);
    addI(gShutterGeom, materials.wood, mDoor);
    addI(gShopBattenGeom, materials.wood, mGBatten);
    addI(gShopStileGeom, materials.wood, mGStile);
    addI(gShopSillGeom, materials.stoneTrim, mGSill);
    addI(winBackGeom, materials.interiorDark, mBack, false);
    addI(barVGeom, materials.iron, mBar);
    addI(brickBandGeom, materials.brick, mBrick);
    addI(beltGeom, materials.stoneTrim, mBelt);
  };

  // West outer wall (X = -26.30, facing -X -> rotY = -PI/2)
  addOuterSection(TASHAN.OUTER_Z, -TASHAN.HALF_OUTER_X, 0, -Math.PI / 2, false);
  // East outer wall (X = +26.30, facing +X -> rotY = +PI/2, skip center Taçkapı!)
  addOuterSection(TASHAN.OUTER_Z, TASHAN.HALF_OUTER_X, 0, Math.PI / 2, true);
  // North outer wall (Z = -40.40, facing -Z -> rotY = PI)
  addOuterSection(TASHAN.OUTER_X, 0, -TASHAN.HALF_OUTER_Z, Math.PI, false);
  // South outer wall (Z = +40.40, facing +Z -> rotY = 0)
  addOuterSection(TASHAN.OUTER_X, 0, TASHAN.HALF_OUTER_Z, 0, false);

  // Corner cut-stone quoin pilasters at all 4 outer building corners
  const cornerQuoinGeom = createChamferedBlock(1.10, outerH, 1.10, 0.03, 1.8);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const q = new THREE.Mesh(cornerQuoinGeom, materials.stoneTrim);
      q.position.set(sx * (TASHAN.HALF_OUTER_X - 0.35), TASHAN.STREET_Y, sz * (TASHAN.HALF_OUTER_Z - 0.35));
      q.castShadow = true;
      q.receiveShadow = true;
      outerGroup.add(q);
    }
  }

  // Outer perimeter colliders (keep player inside courtyard/entrance street safely, leaving East portal open!)
  const addC = (w, h, d, x, y, z) => {
    const c = new THREE.Mesh(new THREE.BoxGeometry(w, h, d));
    c.position.set(x, y, z);
    colliders.push(c);
  };
  addC(1.0, outerH, TASHAN.OUTER_Z, -TASHAN.HALF_OUTER_X + 0.4, outerH / 2, 0);
  addC(TASHAN.OUTER_X, outerH, 1.0, 0, outerH / 2, -TASHAN.HALF_OUTER_Z + 0.4);
  addC(TASHAN.OUTER_X, outerH, 1.0, 0, outerH / 2, TASHAN.HALF_OUTER_Z - 0.4);
  // East outer facade colliders flanking the open Taçkapı (Z = -2.2 .. +2.2 is open!)
  const eastSegLen = TASHAN.HALF_OUTER_Z - 2.15;
  addC(1.0, outerH, eastSegLen, TASHAN.HALF_OUTER_X - 0.4, outerH / 2, -(2.15 + eastSegLen / 2));
  addC(1.0, outerH, eastSegLen, TASHAN.HALF_OUTER_X - 0.4, outerH / 2, 2.15 + eastSegLen / 2);

  return outerGroup;
}
