import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { TASHAN } from '../architecture/constants.js';

/**
 * First-person walkthrough controller using PointerLockControls,
 * smooth velocity damping, and three-mesh-bvh collision & floor height tracking.
 */
export class FirstPersonController {
  constructor(camera, domElement, wallBVH, floorBVH) {
    this.camera = camera;
    this.domElement = domElement;
    this.wallBVH = wallBVH;
    this.floorBVH = floorBVH;

    this.controls = new PointerLockControls(camera, domElement);
    this.keys = { w: false, a: false, s: false, d: false, shift: false };
    this.velocity = new THREE.Vector3();
    this.feetY = TASHAN.STREET_Y;
    this.verticalVel = 0;

    // Reusable math objects (zero hot-path allocations)
    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._wishDir = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);
    this._probe = new THREE.Vector3();
    this._hitInfo = { point: new THREE.Vector3(), distance: 0, faceIndex: -1 };
    this._ray = new THREE.Ray(new THREE.Vector3(), new THREE.Vector3(0, -1, 0));

    // Spawn outside the East Taçkapı facing West (-X) into the portal
    this.setPose(new THREE.Vector3(36.2, TASHAN.STREET_Y + TASHAN.EYE_HEIGHT, 0), new THREE.Vector3(26.3, 3.6, 0));

    this._onKeyDown = this._handleKey.bind(this, true);
    this._onKeyUp = this._handleKey.bind(this, false);
    this._onLock = () => document.body.classList.add('pointer-locked');
    this._onUnlock = () => {
      document.body.classList.remove('pointer-locked');
      this.keys.w = this.keys.a = this.keys.s = this.keys.d = this.keys.shift = false;
    };

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    this.controls.addEventListener('lock', this._onLock);
    this.controls.addEventListener('unlock', this._onUnlock);
  }

  _handleKey(isDown, e) {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.w = isDown;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.s = isDown;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.a = isDown;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.d = isDown;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.shift = isDown;
        break;
    }
  }

  lock() {
    this.controls.lock();
  }

  /**
   * Teleports player/camera cleanly for initial spawn or inspection presets.
   */
  setPose(eyePos, lookTarget) {
    this.camera.position.copy(eyePos);
    this.camera.lookAt(lookTarget);
    this.feetY = eyePos.y - TASHAN.EYE_HEIGHT;
    this.velocity.set(0, 0, 0);
    this.verticalVel = 0;
  }

  /**
   * Resolves horizontal capsule collisions against static wallBVH.
   */
  _resolveWalls() {
    const pos = this.camera.position;
    const radius = TASHAN.PLAYER_RADIUS;
    const heights = [this.feetY + 0.48, this.feetY + 1.28];
    const geomPos = this.wallBVH.geometry.attributes.position;
    const vA = new THREE.Vector3();
    const vB = new THREE.Vector3();
    const vC = new THREE.Vector3();
    const triNorm = new THREE.Vector3();

    for (let iter = 0; iter < 4; iter++) {
      for (const py of heights) {
        this._probe.set(pos.x, py, pos.z);
        const hit = this.wallBVH.closestPointToPoint(this._probe, this._hitInfo, 0, radius);
        if (hit && hit.distance < radius) {
          let nx = pos.x - hit.point.x;
          let nz = pos.z - hit.point.z;
          let horizLen = Math.hypot(nx, nz);

          // Check triangle normal so if probe entered slightly inside a face, push strictly outward
          if (hit.faceIndex >= 0 && geomPos) {
            const i0 = hit.faceIndex * 3;
            vA.fromBufferAttribute(geomPos, i0);
            vB.fromBufferAttribute(geomPos, i0 + 1);
            vC.fromBufferAttribute(geomPos, i0 + 2);
            triNorm.subVectors(vB, vA).cross(vC.sub(vA)).normalize();
            if (Math.hypot(triNorm.x, triNorm.z) > 0.35 && nx * triNorm.x + nz * triNorm.z < 0) {
              nx = triNorm.x;
              nz = triNorm.z;
              horizLen = Math.hypot(nx, nz);
              const push = radius + hit.distance;
              pos.x += (nx / horizLen) * push;
              pos.z += (nz / horizLen) * push;
              continue;
            }
          }

          if (horizLen > 1e-5) {
            const push = radius - horizLen;
            if (push > 0) {
              pos.x += (nx / horizLen) * push;
              pos.z += (nz / horizLen) * push;
            }
          }
        }
      }
    }
  }

  /**
   * Tracks exact ground/stair/balcony elevation underneath player using floorBVH.
   */
  _updateFloorHeight(dt) {
    const pos = this.camera.position;
    this._ray.origin.set(pos.x, this.feetY + 0.78, pos.z);
    const hit = this.floorBVH.raycastFirst(this._ray, THREE.DoubleSide, 0, 2.8);

    if (hit) {
      const targetFeetY = hit.point.y;
      const diff = targetFeetY - this.feetY;
      if (diff >= 0) {
        // Smooth step-up over curbs & stair treads
        this.feetY = THREE.MathUtils.lerp(this.feetY, targetFeetY, Math.min(1, dt * 18));
        this.verticalVel = 0;
      } else if (diff > -0.18) {
        this.feetY = THREE.MathUtils.lerp(this.feetY, targetFeetY, Math.min(1, dt * 16));
        this.verticalVel = 0;
      } else {
        this.verticalVel -= 14.0 * dt;
        this.feetY += this.verticalVel * dt;
        if (this.feetY <= targetFeetY) {
          this.feetY = targetFeetY;
          this.verticalVel = 0;
        }
      }
    }
    pos.y = this.feetY + TASHAN.EYE_HEIGHT;
  }

  update(dt) {
    const stepDt = Math.min(dt, 0.05);

    const moveZ = (this.keys.w ? 1 : 0) - (this.keys.s ? 1 : 0);
    const moveX = (this.keys.d ? 1 : 0) - (this.keys.a ? 1 : 0);

    if (this.controls.isLocked && (moveX !== 0 || moveZ !== 0)) {
      this.camera.getWorldDirection(this._forward);
      this._forward.y = 0;
      if (this._forward.lengthSq() > 1e-6) this._forward.normalize();
      this._right.crossVectors(this._forward, this._up).normalize();

      this._wishDir.set(0, 0, 0);
      this._wishDir.addScaledVector(this._forward, moveZ);
      this._wishDir.addScaledVector(this._right, moveX);
      if (this._wishDir.lengthSq() > 0) this._wishDir.normalize();

      const maxSpeed = this.keys.shift ? 6.6 : 4.1;
      const accel = 26.0;
      this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, this._wishDir.x * maxSpeed, Math.min(1, stepDt * accel * 0.45));
      this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, this._wishDir.z * maxSpeed, Math.min(1, stepDt * accel * 0.45));
    } else {
      const damping = Math.exp(-11.0 * stepDt);
      this.velocity.x *= damping;
      this.velocity.z *= damping;
    }

    if (this.velocity.lengthSq() > 1e-5) {
      const dist = Math.hypot(this.velocity.x * stepDt, this.velocity.z * stepDt);
      const subSteps = Math.max(1, Math.ceil(dist / 0.12));
      const subDt = stepDt / subSteps;
      for (let s = 0; s < subSteps; s++) {
        this.camera.position.x += this.velocity.x * subDt;
        this.camera.position.z += this.velocity.z * subDt;
        this._resolveWalls();
      }
      this._updateFloorHeight(stepDt);
    } else if (this.controls.isLocked) {
      this._updateFloorHeight(stepDt);
    }
  }

  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this.controls.removeEventListener('lock', this._onLock);
    this.controls.removeEventListener('unlock', this._onUnlock);
    this.controls.dispose();
  }
}
