import * as THREE from 'three';
import { TASHAN } from './constants.js';
import { applyWorldUVs, createWorldBox } from './materials.js';
import { sampleOttomanArch, createChamferedBlock } from './ArchBay.js';

/**
 * Extrudes an arched portal wall section centered on X=0 in local space.
 */
function createArchedPortalWall(width, height, openW, jambH, archRise, depth) {
  const hw = width / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, 0);
  shape.lineTo(hw, 0);
  shape.lineTo(hw, height);
  shape.lineTo(-hw, height);
  shape.closePath();

  const ohw = openW / 2;
  const hole = new THREE.Path();
  hole.moveTo(-ohw, 0);
  hole.lineTo(ohw, 0);
  hole.lineTo(ohw, jambH);
  const pts = sampleOttomanArch(ohw, archRise, 22, 0);
  for (const p of pts) {
    hole.lineTo(p.x, jambH + p.y);
  }
  hole.lineTo(-ohw, jambH);
  hole.closePath();
  shape.holes.push(hole);

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.018,
    bevelSegments: 1,
    curveSegments: 22,
  });
  geom.translate(0, 0, -depth / 2);
  applyWorldUVs(geom, 2.0, 2.0);
  return geom;
}

/**
 * Creates a molded portal arch ring (taçkapı kemer silmesi).
 */
function createPortalArchRing(openW, jambH, archRise, trimW, depth) {
  const hw = openW / 2;
  const ohw = hw + trimW;
  const inner = sampleOttomanArch(hw, archRise, 22, 0);
  const outer = sampleOttomanArch(ohw, archRise + trimW * 0.95, 22, 0);

  const shape = new THREE.Shape();
  shape.moveTo(-ohw, 0);
  shape.lineTo(-hw, 0);
  shape.lineTo(-hw, jambH);
  for (let i = inner.length - 1; i >= 0; i--) {
    shape.lineTo(inner[i].x, jambH + inner[i].y);
  }
  shape.lineTo(hw, 0);
  shape.lineTo(ohw, 0);
  shape.lineTo(ohw, jambH);
  for (let i = 0; i < outer.length; i++) {
    shape.lineTo(outer[i].x, jambH + outer[i].y);
  }
  shape.closePath();

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.016,
    bevelSegments: 2,
  });
  geom.translate(0, 0, -depth / 2);
  applyWorldUVs(geom, 1.5, 1.5);
  return geom;
}

/**
 * Builds the monumental East Taçkapı (main entrance portal), 6.10 m+ barrel-vaulted
 * entrance corridor, heavy studded timber gates, and projecting console-supported
 * domed Köşk Mescit overhead.
 */
export function buildMainPortal(materials) {
  const group = new THREE.Group();
  group.name = 'TashanMainPortal';
  const colliders = [];
  const floorMeshes = [];

  const streetY = TASHAN.STREET_Y; // -0.18 m
  const revakY = TASHAN.REVAK_Y;   // +0.12 m
  const outerX = TASHAN.HALF_OUTER_X; // +26.30 m
  const innerX = TASHAN.WALL_EAST_X;  // +17.70 m
  const corridorLen = outerX - innerX; // 8.60 m total passage (6.10 m clear main barrel vault + portal bays)

  // 1. Flanking outer facade connector walls bridging Z = -5.05 .. -3.70 and +3.70 .. +5.05
  // (closes the 10.10 m center opening left by ShopFacade outer bay skip cleanly)
  const flankW = 1.38;
  const wallH = TASHAN.EAVE_Y - streetY; // 9.83 m
  const flankGeom = createWorldBox(0.86, wallH, flankW, 2.2);
  const flankBrickGeom = createWorldBox(0.90, 0.24, flankW, 1.6);
  const flankBeltGeom = createWorldBox(1.02, 0.20, flankW, 1.8);

  for (const sign of [-1, 1]) {
    const fz = sign * (3.70 + flankW / 2 - 0.01);
    const wall = new THREE.Mesh(flankGeom, materials.stone);
    wall.position.set(outerX - 0.43, streetY + wallH / 2, fz);
    wall.castShadow = true;
    wall.receiveShadow = true;
    group.add(wall);

    for (const by of [TASHAN.UPPER_FLOOR_Y + 0.45, TASHAN.UPPER_FLOOR_Y + 2.88, TASHAN.UPPER_FLOOR_Y + 3.65]) {
      const b = new THREE.Mesh(flankBrickGeom, materials.brick);
      b.position.set(outerX - 0.41, by, fz);
      group.add(b);
    }
    for (const cy of [TASHAN.UPPER_FLOOR_Y - 0.05, TASHAN.EAVE_Y - 0.11]) {
      const belt = new THREE.Mesh(flankBeltGeom, materials.stoneTrim);
      belt.position.set(outerX - 0.39, cy, fz);
      group.add(belt);
    }
  }

  // 2. Monumental Projecting Taçkapı (Z = -3.70 .. +3.70, X = +26.30 .. +27.95)
  const portalGroup = new THREE.Group();
  portalGroup.position.set(outerX, streetY, 0);
  portalGroup.rotation.y = Math.PI / 2; // Local +Z faces East (+X), local X spans along Z!
  group.add(portalGroup);

  const portalW = TASHAN.PORTAL_WIDTH; // 7.40 m
  const portalH = 5.65;                // Lower monumental Taçkapı tier up to corbelled Mescit base
  const portalOpenW = 3.95;

  // Outer deep Taçkapı eyvan surround (projects 1.55 m outward)
  const outerEyvanGeom = createArchedPortalWall(portalW, portalH, 4.45, 2.75, 1.65, 1.05);
  const outerEyvan = new THREE.Mesh(outerEyvanGeom, materials.stone);
  outerEyvan.position.set(0, 0, 1.05);
  outerEyvan.castShadow = true;
  outerEyvan.receiveShadow = true;
  portalGroup.add(outerEyvan);

  // Inner recessed portal wall (frames the actual doorway opening)
  const innerPortalGeom = createArchedPortalWall(portalW - 0.35, portalH, portalOpenW, 2.55, 1.50, 0.85);
  const innerPortal = new THREE.Mesh(innerPortalGeom, materials.stoneTrim);
  innerPortal.position.set(0, 0, 0.25);
  innerPortal.castShadow = true;
  innerPortal.receiveShadow = true;
  portalGroup.add(innerPortal);

  // Stepped decorative arch ring moldings & keystone
  const outerRingGeom = createPortalArchRing(4.45, 2.75, 1.65, 0.38, 0.22);
  const outerRing = new THREE.Mesh(outerRingGeom, materials.stoneTrim);
  outerRing.position.set(0, 0, 1.56);
  outerRing.castShadow = true;
  portalGroup.add(outerRing);

  const innerRingGeom = createPortalArchRing(portalOpenW, 2.55, 1.50, 0.28, 0.20);
  const innerRing = new THREE.Mesh(innerRingGeom, materials.brick);
  innerRing.position.set(0, 0, 0.68);
  innerRing.castShadow = true;
  portalGroup.add(innerRing);

  // Carved keystone at portal apex
  const keystone = new THREE.Mesh(createChamferedBlock(0.36, 0.52, 0.36, 0.025, 1.2), materials.stoneTrim);
  keystone.position.set(0, 4.35, 1.62);
  keystone.castShadow = true;
  portalGroup.add(keystone);

  // Flanking corner colonnettes (sütunce) + stepped side pilasters
  const colShaftGeom = new THREE.CylinderGeometry(0.16, 0.17, 2.85, 12);
  applyWorldUVs(colShaftGeom, 1.4, 1.4);
  const colCapGeom = createChamferedBlock(0.46, 0.34, 0.46, 0.03, 1.2);
  const colBaseGeom = createChamferedBlock(0.48, 0.38, 0.48, 0.03, 1.2);

  for (const sx of [-1, 1]) {
    // Inner portal colonnettes
    const cx = sx * 2.22;
    const cz = 1.52;
    const base = new THREE.Mesh(colBaseGeom, materials.stoneTrim);
    base.position.set(cx, 0, cz);
    const shaft = new THREE.Mesh(colShaftGeom, materials.stoneTrim);
    shaft.position.set(cx, 0.38 + 1.425, cz);
    const cap = new THREE.Mesh(colCapGeom, materials.stoneTrim);
    cap.position.set(cx, 3.23, cz);
    [base, shaft, cap].forEach((m) => {
      m.castShadow = true;
      m.receiveShadow = true;
      portalGroup.add(m);
    });

    // Outer Taçkapı corner frame pilasters
    const pilaster = new THREE.Mesh(createChamferedBlock(0.55, portalH, 0.35, 0.03, 1.6), materials.stoneTrim);
    pilaster.position.set(sx * (portalW / 2 - 0.25), 0, 1.55);
    pilaster.castShadow = true;
    portalGroup.add(pilaster);

    // Carved stone rosette medallions in upper portal spandrels
    const rosette = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.12, 16), materials.stoneTrim);
    rosette.rotation.x = Math.PI / 2;
    rosette.position.set(sx * 2.38, 4.42, 1.60);
    rosette.castShadow = true;
    portalGroup.add(rosette);
  }

  // Carved stone portal crown cornice & inscription frieze plaque (kitabe taşı nişi)
  const portalCornice = new THREE.Mesh(createChamferedBlock(portalW + 0.30, 0.24, 1.45, 0.025, 1.6), materials.stoneTrim);
  portalCornice.position.set(0, portalH - 0.18, 0.72);
  portalCornice.castShadow = true;
  portalGroup.add(portalCornice);

  const kitabePlaque = new THREE.Mesh(createChamferedBlock(2.40, 0.56, 0.14, 0.02, 1.2), materials.stoneTrim);
  kitabePlaque.position.set(0, 4.86, 1.58);
  kitabePlaque.castShadow = true;
  portalGroup.add(kitabePlaque);

  // Heavy double-leaf studded aged timber Han Gates (standing open at ~80° inside the passage)
  const gateW = 1.90;
  const gateH = 3.55;
  const gateThick = 0.14;
  const gateGeom = createChamferedBlock(gateW, gateH, gateThick, 0.015, 1.4);
  const strapGeom = createChamferedBlock(gateW - 0.16, 0.09, 0.18, 0.008, 1.0);
  const studGeom = new THREE.SphereGeometry(0.035, 8, 6);

  for (const sx of [-1, 1]) {
    const leafGroup = new THREE.Group();
    // Hinged at jamb edge (±1.96, 0.25, -0.10), swung open inward (-Z local -> West!)
    leafGroup.position.set(sx * 1.94, 0.28, -0.15);
    leafGroup.rotation.y = sx * 1.38; // Open wide (~79 deg) along passage walls!

    const leaf = new THREE.Mesh(gateGeom, materials.wood);
    leaf.position.set(-sx * (gateW / 2), 0, 0);
    leaf.castShadow = true;
    leaf.receiveShadow = true;
    leafGroup.add(leaf);

    for (const sy of [0.45, 1.55, 2.70]) {
      const strap = new THREE.Mesh(strapGeom, materials.iron);
      strap.position.set(-sx * (gateW / 2), sy, 0);
      leafGroup.add(strap);
      for (let k = -3; k <= 3; k++) {
        const stud = new THREE.Mesh(studGeom, materials.iron);
        stud.position.set(-sx * (gateW / 2) + k * 0.24, sy + 0.045, 0.09);
        leafGroup.add(stud);
      }
    }
    portalGroup.add(leafGroup);
  }

  // 3. Stone Threshold Steps & Walkable Ramp (Street Y=-0.18 -> Corridor Y=+0.12)
  const step1 = new THREE.Mesh(createChamferedBlock(4.60, 0.15, 1.15, 0.02, 1.6), materials.stoneTrim);
  step1.position.set(outerX + 1.55, streetY, 0);
  step1.rotation.y = Math.PI / 2;
  step1.receiveShadow = true;
  group.add(step1);

  const step2 = new THREE.Mesh(createChamferedBlock(4.30, 0.30, 1.25, 0.02, 1.6), materials.stoneTrim);
  step2.position.set(outerX + 0.45, streetY, 0);
  step2.rotation.y = Math.PI / 2;
  step2.receiveShadow = true;
  group.add(step2);

  // Smooth walkable ramp over threshold steps (-X rises from -0.18 up to +0.12)
  const rampLen = 2.60;
  const threshRamp = new THREE.Mesh(new THREE.BoxGeometry(rampLen, 0.14, 4.40));
  threshRamp.position.set(outerX + 0.90, (streetY + revakY) / 2 - 0.04, 0);
  threshRamp.rotation.z = -Math.atan2(revakY - streetY, rampLen);
  floorMeshes.push(threshRamp);

  // Exterior courtyard approach cobblestone apron outside Taçkapı (X = +26.30 .. +44.0)
  const apron = new THREE.Mesh(createWorldBox(18.0, 0.14, 24.0, 2.6, 2.6), materials.cobble);
  apron.position.set(outerX + 9.0, streetY - 0.07, 0);
  apron.receiveShadow = true;
  group.add(apron);
  floorMeshes.push(apron);

  // 4. 6.10m+ Barrel-Vaulted Entrance Corridor (X = +17.70 .. +26.30, Z = -1.975 .. +1.975)
  const corrCenterX = (innerX + outerX) / 2; // +22.00 m
  const corrFloor = new THREE.Mesh(createWorldBox(corridorLen + 0.6, 0.30, 4.40, 2.6, 2.6), materials.cobble);
  corrFloor.position.set(corrCenterX, revakY - 0.15, 0);
  corrFloor.receiveShadow = true;
  group.add(corrFloor);
  floorMeshes.push(corrFloor);

  // Corridor side stone walls (Z = ±1.975 .. ±3.45) with recessed guard/porter niches
  for (const sign of [-1, 1]) {
    const wall = new THREE.Mesh(createWorldBox(corridorLen, 4.85, 0.85, 2.2), materials.stone);
    wall.position.set(corrCenterX, revakY + 4.85 / 2, sign * (portalOpenW / 2 + 0.425));
    wall.castShadow = true;
    wall.receiveShadow = true;
    group.add(wall);

    // Stone bench & arched porter niche inside corridor
    const bench = new THREE.Mesh(createChamferedBlock(2.20, 0.44, 0.50, 0.02, 1.4), materials.stoneTrim);
    bench.position.set(corrCenterX, revakY, sign * (portalOpenW / 2 - 0.22));
    bench.castShadow = true;
    bench.receiveShadow = true;
    group.add(bench);

    const wc = new THREE.Mesh(new THREE.BoxGeometry(corridorLen + 1.2, 5.0, 0.90));
    wc.position.set(corrCenterX, 2.5, sign * (portalOpenW / 2 + 0.425));
    colliders.push(wc);
  }

  // Barrel vault ceiling over entrance corridor (lime plaster + 3 stone transverse ribs)
  const vaultPtsIn = sampleOttomanArch(portalOpenW / 2, 1.75, 20, 0);
  const vaultPtsOut = sampleOttomanArch(portalOpenW / 2, 1.75, 20, 0.22);
  const vShape = new THREE.Shape();
  vShape.moveTo(vaultPtsIn[0].x, vaultPtsIn[0].y);
  for (let i = 1; i < vaultPtsIn.length; i++) vShape.lineTo(vaultPtsIn[i].x, vaultPtsIn[i].y);
  for (let i = vaultPtsOut.length - 1; i >= 0; i--) vShape.lineTo(vaultPtsOut[i].x, vaultPtsOut[i].y);
  vShape.closePath();

  const corrVaultGeom = new THREE.ExtrudeGeometry(vShape, { depth: corridorLen + 0.4, bevelEnabled: false });
  corrVaultGeom.translate(0, 0, -(corridorLen + 0.4) / 2);
  corrVaultGeom.rotateY(Math.PI / 2);
  applyWorldUVs(corrVaultGeom, 2.4, 2.4);

  const corrVault = new THREE.Mesh(corrVaultGeom, materials.plaster);
  corrVault.position.set(corrCenterX, TASHAN.GROUND_SPRING_Y + 0.08, 0);
  corrVault.receiveShadow = true;
  group.add(corrVault);

  const ribGeom = createPortalArchRing(portalOpenW, 0.1, 1.74, 0.24, 0.34);
  ribGeom.rotateY(Math.PI / 2);
  for (const rx of [innerX + 0.45, corrCenterX - 1.8, corrCenterX + 1.8, outerX - 0.55]) {
    const rib = new THREE.Mesh(ribGeom, materials.stoneTrim);
    rib.position.set(rx, TASHAN.GROUND_SPRING_Y + 0.05, 0);
    rib.castShadow = true;
    group.add(rib);
  }

  // 5. Console-Supported Projecting Domed Köşk Mescit above the Taçkapı (Y = 5.10 .. 13.4 m)
  const mescitGroup = new THREE.Group();
  mescitGroup.position.set(corrCenterX + 1.05, TASHAN.UPPER_FLOOR_Y, 0);
  group.add(mescitGroup);

  // Mescit chamber floor & stone corbels projecting outward over the Taçkapı (to X = +28.15!)
  const mescitW = 6.20;  // along Z
  const mescitL = 10.20; // along X (from X = +17.90 out to +28.10, proudly overhanging Taçkapı)
  const mescitH = 5.35;  // Y = 5.10 .. 10.45

  // Carved stone corbel brackets under the East projection of the Mescit
  const corbelPts = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(1.25, 1.25),
    new THREE.Vector2(1.25, 1.48),
    new THREE.Vector2(0, 1.48),
  ];
  const corbelShape = new THREE.Shape(corbelPts);
  const corbelBracketGeom = new THREE.ExtrudeGeometry(corbelShape, {
    depth: 0.38,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 1,
  });
  corbelBracketGeom.translate(0, 0, -0.19);
  applyWorldUVs(corbelBracketGeom, 1.5, 1.5);

  for (const cz of [-2.4, -0.8, 0.8, 2.4]) {
    const bracket = new THREE.Mesh(corbelBracketGeom, materials.stoneTrim);
    bracket.position.set(outerX - (corrCenterX + 1.05) + 1.45, -1.35, cz);
    bracket.castShadow = true;
    mescitGroup.add(bracket);
  }

  // Mescit main cube floor (starts cleanly at X=+17.90 to avoid overlap with East landing slab)
  const mescitFloor = new THREE.Mesh(createWorldBox(mescitL, 0.32, mescitW, 2.2), materials.stoneTrim);
  mescitFloor.position.set(0.0, -0.16, 0);
  mescitFloor.receiveShadow = true;
  mescitFloor.castShadow = true;
  mescitGroup.add(mescitFloor);
  floorMeshes.push(mescitFloor);

  // Mescit ceiling lid around the dome opening so interior stays shaded
  const mCeiling = new THREE.Mesh(createWorldBox(mescitL, 0.24, mescitW, 2.2), materials.plaster);
  mCeiling.position.set(0.0, mescitH - 0.12, 0);
  mescitGroup.add(mCeiling);

  // East face of Mescit with twin arched windows
  const eastFaceShape = new THREE.Shape();
  eastFaceShape.moveTo(-mescitW / 2, 0);
  eastFaceShape.lineTo(mescitW / 2, 0);
  eastFaceShape.lineTo(mescitW / 2, mescitH);
  eastFaceShape.lineTo(-mescitW / 2, mescitH);
  eastFaceShape.closePath();
  for (const wz of [-1.45, 1.45]) {
    const h = new THREE.Path();
    h.moveTo(wz - 0.55, 1.15);
    h.lineTo(wz + 0.55, 1.15);
    h.lineTo(wz + 0.55, 2.45);
    for (const p of sampleOttomanArch(0.55, 0.35, 10, 0)) h.lineTo(wz + p.x, 2.45 + p.y);
    h.lineTo(wz - 0.55, 2.45);
    h.closePath();
    eastFaceShape.holes.push(h);
  }
  const eastMescitWallGeom = new THREE.ExtrudeGeometry(eastFaceShape, { depth: 0.65, bevelEnabled: false });
  eastMescitWallGeom.translate(0, 0, -0.65);
  eastMescitWallGeom.rotateY(Math.PI / 2);
  applyWorldUVs(eastMescitWallGeom, 2.0, 2.0);
  const eastMescitWall = new THREE.Mesh(eastMescitWallGeom, materials.stone);
  eastMescitWall.position.set(mescitL / 2, 0, 0);
  eastMescitWall.castShadow = true;
  eastMescitWall.receiveShadow = true;
  mescitGroup.add(eastMescitWall);

  // Twin arched window iron grilles & interior backing in Mescit East facade
  const mWinBackGeom = createWorldBox(0.08, 1.85, 1.40, 1.4);
  const mBarGeom = new THREE.CylinderGeometry(0.015, 0.015, 1.65, 8);
  for (const wz of [-1.45, 1.45]) {
    const wb = new THREE.Mesh(mWinBackGeom, materials.interiorDark);
    wb.position.set(mescitL / 2 - 0.52, 2.05, wz);
    mescitGroup.add(wb);
    for (let k = -2; k <= 2; k++) {
      const bar = new THREE.Mesh(mBarGeom, materials.iron);
      bar.position.set(mescitL / 2 - 0.25, 1.98, wz + k * 0.20);
      mescitGroup.add(bar);
    }
  }

  // Brick hatıl bands on Mescit East projection
  for (const by of [0.55, 3.25, 4.15]) {
    const b = new THREE.Mesh(createWorldBox(0.70, 0.22, mescitW + 0.04, 1.6), materials.brick);
    b.position.set(mescitL / 2 - 0.32, by, 0);
    mescitGroup.add(b);
  }

  // West (courtyard-facing) wall of Mescit at innerX (X = +17.70) with open arched doorway from 2nd floor
  const westMescitWallGeom = createArchedPortalWall(mescitW, mescitH, 1.95, 2.25, 0.65, 0.62);
  westMescitWallGeom.rotateY(-Math.PI / 2);
  const westMescitWall = new THREE.Mesh(westMescitWallGeom, materials.stone);
  westMescitWall.position.set(innerX - (corrCenterX + 1.05) - 0.28, 0, 0);
  westMescitWall.castShadow = true;
  westMescitWall.receiveShadow = true;
  mescitGroup.add(westMescitWall);

  // North & South side walls of Mescit
  for (const sz of [-1, 1]) {
    const sw = new THREE.Mesh(createWorldBox(mescitL, mescitH, 0.60, 2.2), materials.stone);
    sw.position.set(0.0, mescitH / 2, sz * (mescitW / 2 - 0.30));
    sw.castShadow = true;
    sw.receiveShadow = true;
    mescitGroup.add(sw);
  }

  // Mescit cornice + Octagonal Drum (sekizgen kasnak) + Lead/Terracotta Dome (kubbe) + Alem finial
  const mCornice = new THREE.Mesh(createChamferedBlock(mescitL + 0.45, 0.26, mescitW + 0.45, 0.03, 1.8), materials.stoneTrim);
  mCornice.position.set(0.0, mescitH - 0.06, 0);
  mCornice.castShadow = true;
  mescitGroup.add(mCornice);

  const drum = new THREE.Mesh(new THREE.CylinderGeometry(2.75, 2.88, 1.35, 8), materials.stone);
  applyWorldUVs(drum.geometry, 2.0, 2.0);
  drum.position.set(1.2, mescitH + 0.72, 0);
  drum.castShadow = true;
  drum.receiveShadow = true;
  mescitGroup.add(drum);

  const drumBrick = new THREE.Mesh(new THREE.CylinderGeometry(2.80, 2.80, 0.22, 8), materials.brick);
  applyWorldUVs(drumBrick.geometry, 1.6, 1.6);
  drumBrick.position.set(1.2, mescitH + 0.55, 0);
  mescitGroup.add(drumBrick);

  const domeGeom = new THREE.SphereGeometry(2.62, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.52);
  applyWorldUVs(domeGeom, 1.8, 1.8);
  const dome = new THREE.Mesh(domeGeom, materials.roof);
  dome.position.set(1.2, mescitH + 1.32, 0);
  dome.castShadow = true;
  dome.receiveShadow = true;
  mescitGroup.add(dome);

  // Finial (alem) atop the dome
  const alemPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.95, 10), materials.iron);
  alemPole.position.set(1.2, mescitH + 4.32, 0);
  mescitGroup.add(alemPole);
  const alemOrb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), materials.iron);
  alemOrb.position.set(1.2, mescitH + 4.29, 0);
  mescitGroup.add(alemOrb);

  // Mescit perimeter colliders (keep player inside Mescit walls safely, leaving West doorway open!)
  const mCol = (w, h, d, lx, ly, lz) => {
    const c = new THREE.Mesh(new THREE.BoxGeometry(w, h, d));
    c.position.set(corrCenterX + 1.05 + lx, TASHAN.UPPER_FLOOR_Y + ly, lz);
    colliders.push(c);
  };
  mCol(0.75, mescitH, mescitW, mescitL / 2 - 0.3, mescitH / 2, 0); // East wall
  mCol(mescitL, mescitH, 0.65, 0.0, mescitH / 2, mescitW / 2 - 0.3);
  mCol(mescitL, mescitH, 0.65, 0.0, mescitH / 2, -mescitW / 2 + 0.3);

  // Exterior spawn approach boundaries (keep player within Taçkapı street apron so they don't walk off terrain edge)
  const addStreetBound = (w, h, d, x, y, z) => {
    const c = new THREE.Mesh(new THREE.BoxGeometry(w, h, d));
    c.position.set(x, y, z);
    colliders.push(c);
  };
  addStreetBound(0.6, 5.0, 24.0, outerX + 17.5, 2.0, 0);
  addStreetBound(18.0, 5.0, 0.6, outerX + 9.0, 2.0, -11.5);
  addStreetBound(18.0, 5.0, 0.6, outerX + 9.0, 2.0, 11.5);

  return { group, colliders, floorMeshes };
}
