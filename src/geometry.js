import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export { T };
export const v = (x, y, z) => new T.Vector3(x, y, z);
export const metal = (color, metalness = 0.58, roughness = 0.32) =>
  new T.MeshStandardMaterial({ color, metalness, roughness });
export const matte = (color, props = {}) =>
  new T.MeshStandardMaterial({ color, roughness: 0.52, ...props });

export function group(parent, x = 0, y = 0, z = 0) {
  const object = new T.Group();
  object.position.set(x, y, z);
  parent.add(object);
  return object;
}

export function mesh(parent, geometry, material, x = 0, y = 0, z = 0) {
  const object = new T.Mesh(geometry, material);
  object.position.set(x, y, z);
  parent.add(object);
  return object;
}

export function part(parts, id, parent, x, y, z) {
  const object = group(parent, x, y, z);
  object.userData.part = id;
  if (!parts[id]) parts[id] = object;
  return object;
}

export function box(parent, material, w, h, d, x, y, z, radius = 0.07) {
  return mesh(parent, new RoundedBoxGeometry(w, h, d, 3, radius), material, x, y, z);
}

export function cylinder(parent, material, top, bottom, length, x, y, z, along = 'y', segments = 32) {
  const object = mesh(parent, new T.CylinderGeometry(top, bottom, length, segments), material, x, y, z);
  if (along === 'x') object.rotation.z = Math.PI / 2;
  if (along === 'z') object.rotation.x = Math.PI / 2;
  return object;
}

export function sphere(parent, material, sx, sy, sz, x = 0, y = 0, z = 0, detail = 32) {
  const object = mesh(parent, new T.SphereGeometry(1, detail, Math.ceil(detail / 1.6)), material, x, y, z);
  object.scale.set(sx, sy, sz);
  return object;
}

export function ring(parent, material, radius, thickness, x, y, z, along = 'z') {
  const object = mesh(parent, new T.TorusGeometry(radius, thickness, 10, 44), material, x, y, z);
  if (along === 'y') object.rotation.x = Math.PI / 2;
  if (along === 'x') object.rotation.y = Math.PI / 2;
  return object;
}

export function path(points) {
  return new T.CatmullRomCurve3(points.map(point => v(...point)));
}

export function tube(parent, material, curve, radius, segments = 34, closed = false) {
  return mesh(parent, new T.TubeGeometry(curve, segments, radius, 8, closed), material);
}

export function bar(parent, material, a, b, radius, endRadius = radius) {
  const start = v(...a);
  const end = v(...b);
  const delta = end.clone().sub(start);
  const object = cylinder(parent, material, endRadius, radius, delta.length(), 0, 0, 0);
  object.position.copy(start.addScaledVector(delta, 0.5));
  object.quaternion.setFromUnitVectors(v(0, 1, 0), delta.normalize());
  return object;
}
