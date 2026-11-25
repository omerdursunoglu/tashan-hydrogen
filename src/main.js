import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import {
  BloomEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
  SMAAEffect,
  SMAAPreset,
  ToneMappingEffect,
  ToneMappingMode,
} from 'postprocessing';
import { N8AOPostPass } from 'n8ao';
import { loadTashanMaterials } from './architecture/materials.js';
import { buildTokatTashan } from './architecture/TashanBuilder.js';
import { FirstPersonController } from './player/FirstPersonController.js';

const TIME_PRESETS = {
  noon: {
    sunPos: new THREE.Vector3(24, 58, 22),
    sunColor: 0xfff7ea,
    sunIntensity: 3.3,
    hemiSky: 0xc8e0ff,
    hemiGround: 0x857058,
    hemiIntensity: 0.72,
    envIntensity: 0.85,
    bgIntensity: 0.82,
    exposure: 0.96,
    lanternLight: 0.25,
    lanternEmissive: 0.3,
    bloomIntensity: 0.0,
  },
  golden: {
    sunPos: new THREE.Vector3(38, 23, 34),
    sunColor: 0xffc680,
    sunIntensity: 3.4,
    hemiSky: 0xffd7a8,
    hemiGround: 0x6e5642,
    hemiIntensity: 0.65,
    envIntensity: 0.72,
    bgIntensity: 0.62,
    exposure: 0.98,
    lanternLight: 2.4,
    lanternEmissive: 2.2,
    bloomIntensity: 0.08,
  },
  evening: {
    sunPos: new THREE.Vector3(-28, 32, -26),
    sunColor: 0x7b98cc,
    sunIntensity: 0.55,
    hemiSky: 0x2c3f66,
    hemiGround: 0x241a12,
    hemiIntensity: 0.48,
    envIntensity: 0.22,
    bgIntensity: 0.14,
    exposure: 1.05,
    lanternLight: 7.4,
    lanternEmissive: 3.2,
    bloomIntensity: 0.55,
  },
};

async function init() {
  const canvas = document.getElementById('scene-canvas');
  const width = window.innerWidth;
  const height = window.innerHeight;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    powerPreference: 'high-performance',
    antialias: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping; // Handled cleanly once in ToneMappingEffect
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(62, width / height, 0.12, 260);
  camera.rotation.order = 'YXZ';

  // Load real CC0 HDRI + PBR Texture Sets in parallel
  const assetBase = (import.meta.env?.BASE_URL ? import.meta.env.BASE_URL.replace(/\/$/, '') + '/' : './') + 'assets/';
  const rgbeLoader = new RGBELoader();
  const [hdrTex, materials] = await Promise.all([
    rgbeLoader.loadAsync(`${assetBase}hdri/golden_hour_2k.hdr`),
    loadTashanMaterials(renderer),
  ]);

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envMap = pmrem.fromEquirectangular(hdrTex).texture;
  hdrTex.dispose();
  pmrem.dispose();

  scene.environment = envMap;
  scene.background = envMap;
  scene.backgroundBlurriness = 0.04;

  // Build Tokat Taşhan modular geometry + BVH trees
  const tashan = buildTokatTashan(materials);
  scene.add(tashan.root);

  // Primary Sun Light with high-resolution PCFSoftShadowMap
  const sunLight = new THREE.DirectionalLight(0xffc680, 3.6);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 5;
  sunLight.shadow.camera.far = 165;
  const d = 54;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  sunLight.shadow.bias = -0.00035;
  sunLight.shadow.normalBias = 0.025;
  sunLight.shadow.radius = 2.0;
  scene.add(sunLight);
  scene.add(sunLight.target);

  const hemiLight = new THREE.HemisphereLight(0xffd7a8, 0x6e5642, 0.65);
  scene.add(hemiLight);
  // Subtle warm stone bounce light for shaded revak undersides and stairwells
  const bounceAmbient = new THREE.AmbientLight(0xffe6c7, 0.14);
  scene.add(bounceAmbient);

  // Postprocessing: RenderPass -> N8AOPostPass -> Bloom + ACESFilmic + SMAA
  const composer = new EffectComposer(renderer, {
    frameBufferType: THREE.HalfFloatType,
  });
  composer.addPass(new RenderPass(scene, camera));

  const n8aoPass = new N8AOPostPass(scene, camera, width, height);
  n8aoPass.configuration.aoRadius = 1.65;
  n8aoPass.configuration.distanceFalloff = 0.85;
  n8aoPass.configuration.intensity = 2.4;
  n8aoPass.configuration.aoSamples = 16;
  n8aoPass.configuration.denoiseSamples = 8;
  n8aoPass.configuration.gammaCorrection = false;
  composer.addPass(n8aoPass);

  const bloomEffect = new BloomEffect({
    luminanceThreshold: 2.15,
    luminanceSmoothing: 0.22,
    intensity: 0.08,
    mipmapBlur: true,
  });
  const toneMappingEffect = new ToneMappingEffect({
    mode: ToneMappingMode.ACES_FILMIC,
  });
  const smaaEffect = new SMAAEffect({
    preset: SMAAPreset.HIGH,
  });

  composer.addPass(new EffectPass(camera, bloomEffect, toneMappingEffect, smaaEffect));

  // First-person controller with BVH collision + floor height tracking
  const controller = new FirstPersonController(
    camera,
    canvas,
    tashan.wallBVH,
    tashan.floorBVH
  );

  let currentTime = 'golden';
  function applyTimeOfDay(mode) {
    const p = TIME_PRESETS[mode];
    if (!p) return;
    currentTime = mode;

    sunLight.position.copy(p.sunPos);
    sunLight.color.setHex(p.sunColor);
    sunLight.intensity = p.sunIntensity;

    hemiLight.color.setHex(p.hemiSky);
    hemiLight.groundColor.setHex(p.hemiGround);
    hemiLight.intensity = p.hemiIntensity;
    bounceAmbient.intensity = mode === 'evening' ? 0.03 : 0.14;

    scene.environmentIntensity = p.envIntensity;
    scene.backgroundIntensity = p.bgIntensity;
    renderer.toneMappingExposure = p.exposure;
    bloomEffect.intensity = p.bloomIntensity;

    materials.lanternGlass.emissiveIntensity = p.lanternEmissive;
    for (const pt of tashan.lanternLights) {
      pt.intensity = p.lanternLight;
    }

    document.querySelectorAll('.time-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.time === mode);
    });
  }

  applyTimeOfDay('golden');

  // Minimalist HUD wiring
  canvas.addEventListener('click', () => {
    if (!controller.controls.isLocked) {
      controller.lock();
    }
  });

  document.querySelectorAll('.time-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      applyTimeOfDay(btn.dataset.time);
    });
  });

  const helpToggle = document.getElementById('help-toggle');
  const helpPanel = document.getElementById('help-panel');
  helpToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const hidden = helpPanel.classList.toggle('hidden');
    helpToggle.setAttribute('aria-expanded', String(!hidden));
  });

  window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
  });

  // Expose debug handle for automated visual inspection & collision/stair checks
  window.__TASHAN__ = {
    setCamera(pos, lookAt) {
      controller.setPose(new THREE.Vector3(...pos), new THREE.Vector3(...lookAt));
    },
    setTime(mode) {
      applyTimeOfDay(mode);
    },
    getState() {
      return {
        time: currentTime,
        position: camera.position.toArray(),
        feetY: controller.feetY,
        drawCalls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
      };
    },
    stepTest(pos, deltaX, deltaZ) {
      controller.setPose(new THREE.Vector3(...pos), new THREE.Vector3(pos[0] + deltaX, pos[1], pos[2] + deltaZ));
      const dist = Math.hypot(deltaX, deltaZ);
      const subSteps = Math.max(1, Math.ceil(dist / 0.12));
      for (let s = 0; s < subSteps; s++) {
        controller.camera.position.x += deltaX / subSteps;
        controller.camera.position.z += deltaZ / subSteps;
        controller._resolveWalls();
      }
      controller._updateFloorHeight(0.05);
      return {
        position: controller.camera.position.toArray(),
        feetY: controller.feetY,
      };
    },
  };

  let lastTime = performance.now();
  function animate(now) {
    requestAnimationFrame(animate);
    const dt = (now - lastTime) * 0.001;
    lastTime = now;

    controller.update(dt);
    composer.render(dt);
  }
  requestAnimationFrame(animate);
}

init().catch((err) => {
  console.error('Initialization failed:', err);
});
