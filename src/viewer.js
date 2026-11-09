import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { T, v, group } from './geometry.js';
import { engine } from './models/engine.js';
import { earth } from './models/earth.js';
import { telephone } from './models/telephone.js';
import { cells } from './models/cells.js';
import { gears } from './models/gears.js';
import { SoftwareRenderer } from './software-renderer.js';
import { createPanLimit } from './camera-pan.js';

const models = { engine, earth, telephone, cells, gears };

export async function prepareViewerModel(id) {
  if (id === 'body' && !models.body) {
    const { loadBodyModel } = await import('./models/body.js');
    models.body = await loadBodyModel();
  }
}

function setup() {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2', { alpha: true, antialias: true });
  const scene = new T.Scene();
  if (!context) return { renderer: new SoftwareRenderer(document.createElement('canvas')), scene };
  const renderer = new T.WebGLRenderer({ canvas, context, alpha: true, antialias: true });
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.23;
  const room = new RoomEnvironment();
  const pmrem = new T.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(room, 0.06);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.85;
  room.dispose();
  pmrem.dispose();
  const key = new T.DirectionalLight(0xffecdf, 2.8);
  key.position.set(-4, 6, 7);
  scene.add(key);
  const fill = new T.DirectionalLight(0xb7caff, 1.7);
  fill.position.set(6, 2, -4);
  scene.add(fill);
  const rim = new T.DirectionalLight(0xcc92ff, 1.3);
  rim.position.set(-3, 2, -7);
  scene.add(rim, new T.HemisphereLight(0xe3e9ff, 0x302443, 1.08));
  return { renderer, scene, environment };
}

function disposeModel(root) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  root.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    if (object.material) {
      materials.add(object.material);
      if (object.material.map) textures.add(object.material.map);
    }
  });
  textures.forEach(texture => texture.dispose());
  materials.forEach(material => material.dispose());
  geometries.forEach(geometry => geometry.dispose());
}

function frameObject(object, camera, direction, margin) {
  object.updateWorldMatrix(true, true);
  const box = new T.Box3().setFromObject(object);
  const center = box.getCenter(v());
  camera.position.copy(center).add(direction.clone().normalize());
  camera.lookAt(center);
  camera.updateMatrixWorld();
  const right = v().setFromMatrixColumn(camera.matrixWorld, 0);
  const up = v().setFromMatrixColumn(camera.matrixWorld, 1);
  const depth = v().setFromMatrixColumn(camera.matrixWorld, 2);
  const verticalTangent = Math.tan(T.MathUtils.degToRad(camera.fov / 2));
  const horizontalTangent = verticalTangent * camera.aspect;
  let distance = 0;
  const corner = v();
  object.traverseVisible(child => {
    if (!child.geometry) return;
    if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
    const bounds = child.geometry.boundingBox;
    for (const x of [bounds.min.x, bounds.max.x]) {
      for (const y of [bounds.min.y, bounds.max.y]) {
        for (const z of [bounds.min.z, bounds.max.z]) {
          corner.set(x, y, z).applyMatrix4(child.matrixWorld).sub(center);
          const minimum = Math.max(Math.abs(corner.dot(right)) / horizontalTangent, Math.abs(corner.dot(up)) / verticalTangent);
          distance = Math.max(distance, corner.dot(depth) + minimum * margin);
        }
      }
    }
  });
  camera.position.copy(center).addScaledVector(depth, distance);
  camera.lookAt(center);
  camera.updateMatrixWorld();
  return { center, distance };
}

function hitPart(object, root) {
  let part;
  while (object && object !== root) {
    if (!object.visible) return null;
    if (!part && object.userData.part) part = object;
    object = object.parent;
  }
  return part ?? null;
}

export function createViewer(host, lesson, { onSelect, onBack, onStage, onModelProgress, autoPlay }) {
  const { renderer, scene, environment } = setup();
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', '3D model. Drag or use arrow keys to rotate. Right-drag, use two fingers, or press Shift and an arrow key to pan. Scroll, pinch, or press plus or minus to zoom.');
  renderer.setPixelRatio?.(Math.min(window.devicePixelRatio || 1, 1.75));
  host.append(canvas);
  const root = group(scene);
  const model = models[lesson.id](root);
  const camera = new T.PerspectiveCamera(37, 1, 0.012, 150);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = true;
  controls.screenSpacePanning = true;
  controls.rotateSpeed = 0.69;
  controls.zoomSpeed = 0.84;

  let activeObject = root;
  let isolated;
  let pickingEnabled = true;
  let playing = autoPlay;
  let time = 0;
  let lastStage = -1;
  let needsRender = true;
  let panLimit;
  controls.addEventListener('change', () => {
    if (!transition) panLimit?.(camera, controls.target);
    needsRender = true;
  });
  let raf;
  let lastFrame = performance.now();
  let assemblyPose;
  let assemblyAspect;
  let frameDistance;
  let transition;
  let contextOpacity = 1;
  let hiddenOriginal;
  let originalVisibility;
  const fadedMaterials = new Map();
  const materialOwners = [];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const raycaster = new T.Raycaster();

  function fittedPose() {
    const direction = isolated ? v(1.8, 1.1, 7) : model.direction;
    const margin = isolated ? 1.17 : 1.14;
    const previewCamera = camera.clone();
    const fit = frameObject(activeObject, previewCamera, direction, margin);
    return { position: previewCamera.position.clone(), target: fit.center, frameDistance: fit.distance };
  }

  function applyPose(pose) {
    frameDistance = pose.frameDistance;
    camera.position.copy(pose.position);
    controls.target.copy(pose.target);
    controls.minDistance = frameDistance * 0.36;
    controls.maxDistance = frameDistance * 2.7;
    panLimit = createPanLimit(activeObject);
    panLimit(camera, controls.target);
    controls.update();
    needsRender = true;
  }

  function restoreOriginal() {
    if (hiddenOriginal) hiddenOriginal.visible = originalVisibility;
    hiddenOriginal = null;
  }

  function assemblyFit() {
    const previewCamera = camera.clone();
    if (hiddenOriginal) hiddenOriginal.visible = originalVisibility;
    const fit = frameObject(root, previewCamera, model.direction, 1.14);
    if (hiddenOriginal) hiddenOriginal.visible = false;
    return { position: previewCamera.position.clone(), target: fit.center, frameDistance: fit.distance };
  }

  function prepareContext() {
    if (materialOwners.length) return;
    root.traverse(object => {
      if (!object.isMesh) return;
      const original = object.material;
      const faded = original.clone();
      fadedMaterials.set(faded, original);
      materialOwners.push({ object, original });
      object.material = faded;
    });
  }

  function fadeContext(opacity) {
    contextOpacity = opacity;
    root.visible = opacity > 0;
    for (const [faded, original] of fadedMaterials) {
      faded.opacity = original.opacity * opacity;
      faded.transparent = true;
      faded.depthWrite = opacity === 1 && original.depthWrite;
    }
  }

  function clearIsolation() {
    if (isolated) scene.remove(isolated);
    isolated = null;
    restoreOriginal();
    materialOwners.forEach(({ object, original }) => { object.material = original; });
    materialOwners.length = 0;
    fadedMaterials.forEach((original, faded) => faded.dispose());
    fadedMaterials.clear();
    contextOpacity = 1;
    root.visible = true;
    activeObject = root;
  }

  function finishTransition() {
    const completed = transition;
    if (!completed) return;
    transition = null;
    if (completed.returning) clearIsolation();
    else fadeContext(0);
    controls.enabled = true;
    applyPose(completed.pose);
  }

  function moveTo(pose, returning = false) {
    // Clear any remaining orbit damping before taking the starting camera pose.
    if (!transition) {
      controls.enableDamping = false;
      controls.update();
      controls.enableDamping = true;
    }
    const offset = camera.position.clone().sub(controls.target);
    const destination = pose.position.clone().sub(pose.target);
    transition = {
      pose, returning, start: performance.now(),
      target: controls.target.clone(), offset,
      rotation: new T.Quaternion().setFromUnitVectors(offset.clone().normalize(), destination.clone().normalize()),
      radius: destination.length(), opacity: contextOpacity,
    };
    controls.enabled = false;
    if (reducedMotion.matches) finishTransition();
    needsRender = true;
  }

  function fit() {
    if (transition) finishTransition();
    controls.enableDamping = false;
    controls.update();
    controls.enableDamping = true;
    applyPose(fittedPose());
  }

  function resize() {
    const { clientWidth: width, clientHeight: height } = host;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    if (transition) {
      const returning = transition.returning;
      // Layout changes must not turn an in-progress zoom into an instant jump.
      if (returning) {
        const pose = assemblyPose && Math.abs(camera.aspect - assemblyAspect) < 0.01 ? assemblyPose : assemblyFit();
        moveTo(pose, true);
      } else moveTo(fittedPose());
    } else {
      const pose = fittedPose();
      if (frameDistance) {
        const offset = camera.position.clone().sub(controls.target);
        pose.target = controls.target.clone();
        pose.position = pose.target.clone().addScaledVector(offset, pose.frameDistance / frameDistance);
      }
      applyPose(pose);
    }
  }

  function isolate(id, clickedObject) {
    const original = clickedObject ?? model.parts[id];
    if (!original) return false;
    if (!isolated) {
      assemblyPose = { position: camera.position.clone(), target: controls.target.clone(), frameDistance };
      assemblyAspect = camera.aspect;
    }
    restoreOriginal();
    if (isolated) scene.remove(isolated);
    original.updateWorldMatrix(true, false);
    isolated = original.clone();
    // A newly selected part must retain its real materials while its surroundings fade.
    isolated.traverse(object => {
      if (fadedMaterials.has(object.material)) object.material = fadedMaterials.get(object.material);
    });
    model.prepareIsolation?.(isolated);
    original.matrixWorld.decompose(isolated.position, isolated.quaternion, isolated.scale);
    scene.add(isolated);
    prepareContext();
    hiddenOriginal = original;
    originalVisibility = original.visible;
    original.visible = false;
    fadeContext(contextOpacity);
    activeObject = isolated;
    moveTo(fittedPose());
    return true;
  }

  function showAssembly() {
    if (!isolated) return;
    // Keep the part in place as the assembly fades back in around it.
    root.visible = true;
    activeObject = root;
    let pose = assemblyFit();
    if (assemblyPose && Math.abs(camera.aspect - assemblyAspect) < 0.01) {
      pose = assemblyPose;
    }
    moveTo(pose, true);
  }

  let pointer;
  const activePointers = new Set();
  function pointerDown(event) {
    activePointers.add(event.pointerId);
    if (activePointers.size !== 1 || event.button !== 0 || event.shiftKey || event.ctrlKey || event.metaKey) {
      pointer = null;
      return;
    }
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
  }
  function pointerMove(event) {
    if (pointer && pointer.id === event.pointerId && Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 7) pointer = null;
    if (event.pointerType !== 'mouse') return;
    canvas.style.cursor = activePointers.size ? 'grabbing' : (pick(event) ? 'pointer' : 'grab');
  }
  function pick(event) {
    if (transition || !pickingEnabled) return null;
    const rect = canvas.getBoundingClientRect();
    const normalized = new T.Vector2((event.clientX - rect.left) * 2 / rect.width - 1, 1 - (event.clientY - rect.top) * 2 / rect.height);
    raycaster.setFromCamera(normalized, camera);
    const hits = raycaster.intersectObject(activeObject, true);
    if (isolated) return hits.length ? isolated : null;
    return hits.map(hit => hitPart(hit.object, root)).find(Boolean) ?? null;
  }
  function pointerUp(event) {
    activePointers.delete(event.pointerId);
    if (!pointer || event.pointerId !== pointer.id) return;
    const tap = Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) <= 7;
    pointer = null;
    if (!tap || transition) return;
    const object = pick(event);
    if (isolated && !object) onBack();
    if (!isolated && object) onSelect(object.userData.part, object);
  }
  function cancel(event) {
    activePointers.delete(event.pointerId);
    if (pointer?.id === event.pointerId) pointer = null;
  }
  function keyboard(event) {
    if (transition) return;
    const direction = v().subVectors(camera.position, controls.target);
    const key = event.key;
    if (event.shiftKey && key.startsWith('Arrow')) {
      const axis = key === 'ArrowLeft' || key === 'ArrowRight' ? 0 : 1;
      const sign = key === 'ArrowLeft' || key === 'ArrowDown' ? 1 : -1;
      const offset = v().setFromMatrixColumn(camera.matrixWorld, axis)
        .multiplyScalar(sign * direction.length() * 0.07);
      controls.target.add(offset);
      camera.position.add(offset);
      controls.update();
      event.preventDefault();
      return;
    }
    const rotation = new T.Spherical().setFromVector3(direction);
    const step = 0.15;
    switch (event.key) {
      case 'ArrowLeft': rotation.theta -= step; break;
      case 'ArrowRight': rotation.theta += step; break;
      case 'ArrowUp': rotation.phi -= step; break;
      case 'ArrowDown': rotation.phi += step; break;
      case '+': case '=': rotation.radius *= 0.87; break;
      case '-': rotation.radius *= 1.15; break;
      default: return;
    }
    event.preventDefault();
    rotation.makeSafe();
    rotation.radius = T.MathUtils.clamp(rotation.radius, controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target).add(direction.setFromSpherical(rotation));
    controls.update();
  }
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', cancel);
  canvas.addEventListener('lostpointercapture', cancel);
  canvas.addEventListener('keydown', keyboard);

  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  function draw(now) {
    // The first animation-frame timestamp can predate the viewer setup.
    const elapsed = T.MathUtils.clamp((now - lastFrame) / 1000, 0, 0.1);
    lastFrame = now;
    if (playing && !isolated) time += elapsed;
    const progress = isolated ? undefined : model.advance?.(elapsed);
    if (progress !== undefined) {
      needsRender = true;
      onModelProgress?.(progress);
    }
    if (!isolated && (playing || lastStage < 0)) {
      const stage = model.update(time);
      if (lastStage !== stage) {
        lastStage = stage;
        onStage(stage);
      }
    }
    if (transition) {
      const progress = reducedMotion.matches ? 1 : Math.min(1, (now - transition.start) / 750);
      const eased = progress * progress * (3 - 2 * progress);
      controls.target.lerpVectors(transition.target, transition.pose.target, eased);
      const turn = new T.Quaternion().slerp(transition.rotation, eased);
      const radius = T.MathUtils.lerp(transition.offset.length(), transition.radius, eased);
      const offset = transition.offset.clone().normalize().applyQuaternion(turn).multiplyScalar(radius);
      camera.position.copy(controls.target).add(offset);
      camera.lookAt(controls.target);
      fadeContext(T.MathUtils.lerp(transition.opacity, transition.returning ? 1 : 0, eased));
      needsRender = true;
      if (progress === 1) finishTransition();
    } else controls.update();
    if (needsRender || (playing && !isolated)) {
      renderer.render(scene, camera);
      needsRender = false;
    }
    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  return {
    isolate,
    showAssembly,
    setPlaying(value) { playing = value; },
    setModelView(view, reframe) {
      if (transition) finishTransition();
      const changedGeometry = model.setView(view);
      pickingEnabled = !view.challenge;
      if (reframe) fit();
      else if (changedGeometry !== false) {
        panLimit = createPanLimit(activeObject);
        panLimit(camera, controls.target);
      }
      needsRender = true;
    },
    setPanMode(enabled) {
      controls.mouseButtons.LEFT = enabled ? T.MOUSE.PAN : T.MOUSE.ROTATE;
      controls.touches.ONE = enabled ? T.TOUCH.PAN : T.TOUCH.ROTATE;
    },
    resetView: fit,
    destroy() {
      observer.disconnect();
      cancelAnimationFrame(raf);
      controls.dispose();
      clearIsolation();
      disposeModel(root);
      environment?.dispose();
      renderer.dispose?.();
      renderer.forceContextLoss?.();
      canvas.remove();
    },
  };
}

export async function drawThumbnails(cards) {
  const { renderer, scene, environment } = setup();
  const width = 720;
  const height = 390;
  renderer.setSize(width, height);
  const camera = new T.PerspectiveCamera(35, width / height, 0.01, 100);
  try {
    for (const [id, canvas] of cards) {
      await prepareViewerModel(id);
      const root = group(scene);
      const model = models[id](root);
      model.update(model.previewTime);
      frameObject(root, camera, model.direction, id === 'body' ? 1.07 : 1.04);
      renderer.render(scene, camera);
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(renderer.domElement, 0, 0, width, height);
      canvas.classList.add('drawn');
      scene.remove(root);
      disposeModel(root);
    }
  } finally {
    environment?.dispose();
    renderer.dispose?.();
    renderer.forceContextLoss?.();
  }
}
