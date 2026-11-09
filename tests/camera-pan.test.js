import assert from 'node:assert/strict';
import test from 'node:test';
import { BoxGeometry, Group, Mesh, PerspectiveCamera, Vector3 } from 'three';
import { createPanLimit } from '../src/camera-pan.js';

function createScene(aspect = 1.6) {
  const model = new Group();
  const mesh = new Mesh(new BoxGeometry(0.3, 6, 0.2));
  model.add(mesh);
  const camera = new PerspectiveCamera(37, aspect, 0.01, 100);
  camera.position.z = 2;
  const target = new Vector3();
  camera.lookAt(target);
  return { camera, target, mesh, limit: createPanLimit(model) };
}

function move(camera, target, x, y) {
  const offset = new Vector3(x, y, 0);
  camera.position.add(offset);
  target.add(offset);
}

function hasVisibleVertex(mesh, camera) {
  const positions = mesh.geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const point = new Vector3().fromBufferAttribute(positions, i).project(camera);
    if (Math.abs(point.x) < 0.8 && Math.abs(point.y) < 0.8 && Math.abs(point.z) < 1) return true;
  }
  return false;
}

test('can pan a zoomed-in model to both ends without changing zoom or angle', () => {
  const { camera, target, limit } = createScene();
  const orbit = camera.position.clone().sub(target);
  for (const direction of [0, 1, -1]) {
    target.set(0, 0, 0);
    camera.position.copy(orbit);
    move(camera, target, 0, direction * 3);
    assert.equal(limit(camera, target), false);
    assert.equal(target.y, direction * 3);
    assert.deepEqual(camera.position.clone().sub(target), orbit);
  }
});

test('keeps real geometry on screen after diagonal over-panning at either aspect', () => {
  for (const aspect of [0.58, 2.25]) {
    const { camera, target, mesh, limit } = createScene(aspect);
    move(camera, target, 10, 11);
    assert.equal(limit(camera, target), true);
    assert.ok(hasVisibleVertex(mesh, camera));
    assert.deepEqual(camera.position.clone().sub(target), new Vector3(0, 0, 2));
  }
});

test('recenters if an orbit leaves the model behind the camera', () => {
  const { camera, target, limit } = createScene();
  target.z = -4;
  camera.position.z = -2;
  assert.equal(limit(camera, target), true);
  assert.equal(target.length(), 0);
  assert.deepEqual(camera.position, new Vector3(0, 0, 2));
});
