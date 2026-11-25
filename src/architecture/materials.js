import * as THREE from 'three';

/**
 * World-space triplanar UV projection on any BufferGeometry.
 * Guarantees consistent real-world texture scale regardless of mesh dimensions.
 * @param {THREE.BufferGeometry} geom
 * @param {number} tileU meters per U repeat
 * @param {number} tileV meters per V repeat
 * @param {{offsetX?: number, offsetY?: number, offsetZ?: number}} [opts]
 */
export function applyWorldUVs(geom, tileU = 2.0, tileV = tileU, opts = {}) {
  if (!geom.attributes.normal) {
    geom.computeVertexNormals();
  }
  const pos = geom.attributes.position;
  const norm = geom.attributes.normal;
  const count = pos.count;
  const uvs = new Float32Array(count * 2);
  const ox = opts.offsetX || 0;
  const oy = opts.offsetY || 0;
  const oz = opts.offsetZ || 0;

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i) + ox;
    const y = pos.getY(i) + oy;
    const z = pos.getZ(i) + oz;
    const nx = Math.abs(norm.getX(i));
    const ny = Math.abs(norm.getY(i));
    const nz = Math.abs(norm.getZ(i));

    let u = 0;
    let v = 0;
    if (ny >= nx && ny >= nz) {
      u = x / tileU;
      v = z / tileV;
    } else if (nx >= ny && nx >= nz) {
      u = z / tileU;
      v = y / tileV;
    } else {
      u = x / tileU;
      v = y / tileV;
    }
    uvs[i * 2] = u;
    uvs[i * 2 + 1] = v;
  }

  geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geom.setAttribute('uv1', new THREE.BufferAttribute(uvs.slice(), 2));
  return geom;
}

/**
 * Scales existing UVs (e.g. from LatheGeometry or TubeGeometry) into meters.
 */
export function scaleUVs(geom, scaleU, scaleV = scaleU) {
  const uv = geom.attributes.uv;
  if (!uv) return geom;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * scaleU, uv.getY(i) * scaleV);
  }
  uv.needsUpdate = true;
  geom.setAttribute('uv1', uv.clone());
  return geom;
}

/**
 * Box geometry with exact world-space UVs in meters (never stretched).
 */
export function createWorldBox(w, h, d, tileU = 2.0, tileV = tileU, segW = 1, segH = 1, segD = 1) {
  const geom = new THREE.BoxGeometry(w, h, d, segW, segH, segD);
  return applyWorldUVs(geom, tileU, tileV);
}

/**
 * Loads a single texture with error checking and proper wrapping/anisotropy.
 */
function loadTex(loader, url, isColor, maxAniso) {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (tex) => {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.anisotropy = Math.min(8, maxAniso);
        tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        tex.channel = 0;
        resolve(tex);
      },
      undefined,
      (err) => reject(new Error(`Failed to load texture ${url}: ${err?.message || err}`))
    );
  });
}

const ASSET_BASE = (import.meta.env?.BASE_URL ? import.meta.env.BASE_URL.replace(/\/$/, '') + '/' : './') + 'assets/';

async function loadPBRSet(loader, folder, maxAniso, options = {}) {
  const base = `${ASSET_BASE}textures/${folder}`;
  const [map, normalMap, roughnessMap, aoMap] = await Promise.all([
    loadTex(loader, `${base}/diff.jpg`, true, maxAniso),
    loadTex(loader, `${base}/nor.jpg`, false, maxAniso),
    loadTex(loader, `${base}/rough.jpg`, false, maxAniso),
    loadTex(loader, `${base}/ao.jpg`, false, maxAniso),
  ]);

  const mat = new THREE.MeshStandardMaterial({
    map,
    normalMap,
    normalScale: new THREE.Vector2(options.normalScale ?? 1.0, options.normalScale ?? 1.0),
    roughnessMap,
    roughness: options.roughness ?? 1.0,
    metalness: options.metalness ?? 0.0,
    aoMap,
    aoMapIntensity: options.aoIntensity ?? 0.75,
    color: new THREE.Color(options.tint ?? 0xffffff),
    side: options.side ?? THREE.FrontSide,
  });
  return mat;
}

/**
 * Loads all CC0 PBR material sets required for Tokat Taşhan.
 */
export async function loadTashanMaterials(renderer) {
  const loader = new THREE.TextureLoader();
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const [
    stone,
    stoneTrim,
    brick,
    cobble,
    roof,
    wood,
    plaster,
    bark,
    grass,
    iron,
    leafColor,
    leafAlpha,
    leafNormal,
    leafRough,
  ] = await Promise.all([
    loadPBRSet(loader, 'stone', maxAniso, {
      normalScale: 1.05,
      roughness: 0.92,
      aoIntensity: 0.75,
      tint: 0xf7efe2,
    }),
    loadPBRSet(loader, 'stone_alt', maxAniso, {
      normalScale: 0.85,
      roughness: 0.88,
      aoIntensity: 0.65,
      tint: 0xfbf4e8,
    }),
    loadPBRSet(loader, 'brick', maxAniso, {
      normalScale: 1.1,
      roughness: 0.95,
      aoIntensity: 0.8,
      tint: 0xe8d0bf,
    }),
    loadPBRSet(loader, 'cobble', maxAniso, {
      normalScale: 0.95,
      roughness: 0.86,
      aoIntensity: 0.8,
      tint: 0xf2ebe0,
    }),
    loadPBRSet(loader, 'roof', maxAniso, {
      normalScale: 1.15,
      roughness: 0.88,
      aoIntensity: 0.8,
      tint: 0xf2dcd0,
    }),
    loadPBRSet(loader, 'wood', maxAniso, {
      normalScale: 1.0,
      roughness: 0.88,
      aoIntensity: 0.75,
      tint: 0xe6d6c3,
    }),
    loadPBRSet(loader, 'plaster', maxAniso, {
      normalScale: 0.65,
      roughness: 0.95,
      aoIntensity: 0.65,
      tint: 0xf7efe0,
      side: THREE.DoubleSide,
    }),
    loadPBRSet(loader, 'bark', maxAniso, {
      normalScale: 1.15,
      roughness: 0.95,
      aoIntensity: 0.8,
    }),
    loadPBRSet(loader, 'grass', maxAniso, {
      normalScale: 0.9,
      roughness: 0.95,
      aoIntensity: 0.7,
      tint: 0xbfd49f,
    }),
    loadPBRSet(loader, 'iron', maxAniso, {
      normalScale: 0.9,
      roughness: 0.68,
      metalness: 0.82,
      aoIntensity: 0.75,
      tint: 0x3b3836,
    }),
    loadTex(loader, `${ASSET_BASE}textures/foliage/LeafSet022_1K-JPG_Color.jpg`, true, maxAniso),
    loadTex(loader, `${ASSET_BASE}textures/foliage/LeafSet022_1K-JPG_Opacity.jpg`, false, maxAniso),
    loadTex(loader, `${ASSET_BASE}textures/foliage/LeafSet022_1K-JPG_NormalGL.jpg`, false, maxAniso),
    loadTex(loader, `${ASSET_BASE}textures/foliage/LeafSet022_1K-JPG_Roughness.jpg`, false, maxAniso),
  ]);

  // Foliage cards must clamp rather than wrap across the 6-leaf botanical sheet
  [leafColor, leafAlpha, leafNormal, leafRough].forEach((t) => {
    t.wrapS = THREE.ClampToEdgeWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
  });

  const foliage = new THREE.MeshStandardMaterial({
    map: leafColor,
    alphaMap: leafAlpha,
    normalMap: leafNormal,
    roughnessMap: leafRough,
    roughness: 0.96,
    metalness: 0.0,
    alphaTest: 0.45,
    side: THREE.DoubleSide,
    color: new THREE.Color(0x9fc26c),
  });

  // Warm 2700K frosted lantern glass (reuses plaster maps for physical texture)
  const lanternGlass = new THREE.MeshStandardMaterial({
    map: plaster.map,
    normalMap: plaster.normalMap,
    roughness: 0.35,
    color: new THREE.Color(0xffe4b8),
    emissive: new THREE.Color(0xff9d3b),
    emissiveIntensity: 1.4,
  });

  // Shadırvan basin water (textured normal map + soft reflections without blinding glare)
  const water = new THREE.MeshStandardMaterial({
    map: stoneTrim.map,
    normalMap: plaster.normalMap,
    normalScale: new THREE.Vector2(0.32, 0.32),
    roughness: 0.26,
    metalness: 0.04,
    color: new THREE.Color(0x3a645c),
    transparent: true,
    opacity: 0.88,
  });

  // Warm oiled timber interior backing behind recessed shop windows/doors
  const interiorDark = new THREE.MeshStandardMaterial({
    map: wood.map,
    normalMap: wood.normalMap,
    roughnessMap: wood.roughnessMap,
    roughness: 0.95,
    color: new THREE.Color(0x5a4534),
  });

  return {
    stone,
    stoneTrim,
    brick,
    cobble,
    roof,
    wood,
    plaster,
    bark,
    grass,
    iron,
    foliage,
    lanternGlass,
    water,
    interiorDark,
  };
}
