import { T } from './geometry.js';

const encode = value => Math.round(255 * Math.min(1, Math.max(0, value)) ** 0.46);
const clampByte = value => Math.min(255, Math.round(value));
const shadeNormal = new T.Matrix3();
const worldView = new T.Matrix4();
const transform = new T.Matrix4();

export class SoftwareRenderer {
  constructor(canvas) {
    this.domElement = canvas;
    this.context = canvas.getContext('2d', { alpha: true });
    this.maps = new WeakMap();
    this.projections = new WeakMap();
  }

  setSize(width, height) {
    const ratio = Math.min(1, 570 / width, 440 / height);
    const canvas = this.domElement;
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    this.frame = this.context.createImageData(canvas.width, canvas.height);
    this.depth = new Float32Array(canvas.width * canvas.height);
  }

  textureData(texture) {
    if (!texture?.image) return null;
    if (!this.maps.has(texture)) {
      const source = texture.image;
      const context = source.getContext('2d', { willReadFrequently: true });
      this.maps.set(texture, context.getImageData(0, 0, source.width, source.height));
    }
    return this.maps.get(texture);
  }

  render(scene, camera) {
    if (!this.frame) return;
    scene.updateMatrixWorld();
    camera.updateMatrixWorld();
    this.frame.data.fill(0);
    this.depth.fill(-Infinity);
    const translucent = [];
    scene.traverseVisible(object => {
      if (!object.isMesh) return;
      if (object.material.transparent) {
        translucent.push(object);
      } else {
        this.drawMesh(object, camera, 1);
      }
    });
    translucent.sort((a, b) => {
      const offset = object => {
        const e = object.matrixWorld.elements;
        return (e[12] - camera.position.x) ** 2 + (e[13] - camera.position.y) ** 2 + (e[14] - camera.position.z) ** 2;
      };
      return offset(b) - offset(a);
    });
    for (const object of translucent) this.drawMesh(object, camera, object.material.opacity);
    this.context.putImageData(this.frame, 0, 0);
  }

  drawMesh(object, camera, opacity) {
    const { geometry, material } = object;
    const width = this.frame.width;
    const height = this.frame.height;
    const positions = geometry.attributes.position;
    const normals = geometry.attributes.normal;
    const indices = geometry.index?.array;
    const colors = geometry.attributes.color?.array;
    const uv = geometry.attributes.uv?.array;
    const map = this.textureData(material.map);
    worldView.multiplyMatrices(camera.matrixWorldInverse, object.matrixWorld);
    transform.multiplyMatrices(camera.projectionMatrix, worldView);
    const m = transform.elements;
    const n = shadeNormal.getNormalMatrix(worldView).elements;
    let points = this.projections.get(object);
    if (!points) {
      points = new Float32Array(positions.count * 4);
      this.projections.set(object, points);
    }
    const light = !material.isMeshBasicMaterial;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      const w = m[3] * x + m[7] * y + m[11] * z + m[15];
      const j = 4 * i;
      points[j] = (0.5 + 0.5 * (m[0] * x + m[4] * y + m[8] * z + m[12]) / w) * width;
      points[j + 1] = (0.5 - 0.5 * (m[1] * x + m[5] * y + m[9] * z + m[13]) / w) * height;
      points[j + 2] = w > camera.near ? 1 / w : -1;
      if (!light || !normals) continue;
      const nx = normals.getX(i);
      const ny = normals.getY(i);
      const nz = normals.getZ(i);
      const vx = n[0] * nx + n[3] * ny + n[6] * nz;
      const vy = n[1] * nx + n[4] * ny + n[7] * nz;
      const vz = n[2] * nx + n[5] * ny + n[8] * nz;
      const norm = Math.hypot(vx, vy, vz) || 1;
      const direct = Math.max(0, (-0.47 * vx + 0.58 * vy + 0.66 * vz) / norm);
      const specular = Math.max(0, (-0.28 * vx + 0.38 * vy + 0.88 * vz) / norm) ** 16;
      const fill = Math.max(0, (0.72 * vx + 0.16 * vy - 0.68 * vz) / norm);
      points[j + 3] = 0.37 + 0.73 * direct + 0.27 * fill + (0.1 + 0.5 * (material.metalness || 0)) * specular;
    }

    const color = material.color;
    const emissive = material.emissive;
    const emission = material.emissiveIntensity || 0;
    const count = indices ? indices.length : positions.count;
    const pixels = this.frame.data;
    const depth = this.depth;
    for (let i = 0; i < count; i += 3) {
      const a = indices ? indices[i] : i;
      const b = indices ? indices[i + 1] : i + 1;
      const c = indices ? indices[i + 2] : i + 2;
      const p = a * 4;
      const q = b * 4;
      const r = c * 4;
      const ax = points[p];
      const ay = points[p + 1];
      const bx = points[q];
      const by = points[q + 1];
      const cx = points[r];
      const cy = points[r + 1];
      const az = points[p + 2];
      const bz = points[q + 2];
      const cz = points[r + 2];
      if (az <= 0 || bz <= 0 || cz <= 0) continue;
      const area = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
      if (Math.abs(area) < 0.065) continue;
      if (material.side === T.FrontSide && area > 0) continue;
      if (material.side === T.BackSide && area < 0) continue;
      const minX = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
      const maxX = Math.min(width - 1, Math.ceil(Math.max(ax, bx, cx)));
      const minY = Math.max(0, Math.floor(Math.min(ay, by, cy)));
      const maxY = Math.min(height - 1, Math.ceil(Math.max(ay, by, cy)));
      if (minX > maxX || minY > maxY) continue;

      const intensity = light ? (points[p + 3] + points[q + 3] + points[r + 3]) / 3 : 1;
      const red = colors ? (colors[a * 3] + colors[b * 3] + colors[c * 3]) / 3 : 1;
      const green = colors ? (colors[a * 3 + 1] + colors[b * 3 + 1] + colors[c * 3 + 1]) / 3 : 1;
      const blue = colors ? (colors[a * 3 + 2] + colors[b * 3 + 2] + colors[c * 3 + 2]) / 3 : 1;
      const rgb = [
        encode(color.r * red * intensity + (emissive?.r || 0) * emission),
        encode(color.g * green * intensity + (emissive?.g || 0) * emission),
        encode(color.b * blue * (intensity + (light ? 0.035 : 0)) + (emissive?.b || 0) * emission),
      ];
      const alpha = Math.round(opacity * 255);
      for (let y = minY; y <= maxY; y++) {
        const dy = y + 0.5 - cy;
        for (let x = minX; x <= maxX; x++) {
          const dx = x + 0.5 - cx;
          const wa = ((by - cy) * dx + (cx - bx) * dy) / area;
          const wb = ((cy - ay) * dx + (ax - cx) * dy) / area;
          const wc = 1 - wa - wb;
          if (wa < 0 || wb < 0 || wc < 0) continue;
          const z = wa * az + wb * bz + wc * cz;
          const pixel = y * width + x;
          if (z <= depth[pixel]) continue;
          if (material.depthWrite) depth[pixel] = z;
          const offset = pixel * 4;
          if (map && uv) {
            const u = (wa * az * uv[a * 2] + wb * bz * uv[b * 2] + wc * cz * uv[c * 2]) / z;
            const v = (wa * az * uv[a * 2 + 1] + wb * bz * uv[b * 2 + 1] + wc * cz * uv[c * 2 + 1]) / z;
            const px = Math.min(map.width - 1, Math.max(0, Math.floor(u * map.width)));
            const py = Math.min(map.height - 1, Math.max(0, Math.floor((1 - v) * map.height)));
            const sample = (py * map.width + px) * 4;
            const factor = intensity ** 0.46;
            pixels[offset] = clampByte(map.data[sample] * factor);
            pixels[offset + 1] = clampByte(map.data[sample + 1] * factor);
            pixels[offset + 2] = clampByte(map.data[sample + 2] * factor);
            pixels[offset + 3] = alpha;
            continue;
          }
          const oldOpacity = pixels[offset + 3] / 255;
          const combined = opacity + oldOpacity * (1 - opacity);
          const weight = combined > 0 ? opacity / combined : 0;
          for (let channel = 0; channel < 3; channel++) {
            pixels[offset + channel] = Math.round(rgb[channel] * weight + pixels[offset + channel] * (1 - weight));
          }
          pixels[offset + 3] = Math.round(combined * 255);
        }
      }
    }
  }
}
