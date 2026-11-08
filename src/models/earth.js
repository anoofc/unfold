import { feature } from 'topojson-client';
import atlas from 'world-atlas/land-110m.json';
import { T, v, matte, group, mesh, part, sphere } from '../geometry.js';

const tau = Math.PI * 2;
const halfPi = Math.PI / 2;

function surfaceTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const ocean = ctx.createLinearGradient(0, 0, 0, 512);
  ocean.addColorStop(0, '#32639b');
  ocean.addColorStop(0.52, '#14538e');
  ocean.addColorStop(1, '#2e679b');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, 1024, 512);
  const land = ctx.createLinearGradient(0, 0, 0, 512);
  ['#d3e7e5', '#668d78', '#548c61', '#b2a36a', '#497d5c', '#d3e7e5'].forEach((color, i) =>
    land.addColorStop([0, 0.22, 0.39, 0.51, 0.68, 1][i], color));
  ctx.fillStyle = land;
  ctx.strokeStyle = '#71b2a2';
  ctx.lineWidth = 1.2;
  const geo = feature(atlas, atlas.objects.land);
  for (const shape of geo.features) {
    const polygons = shape.geometry.type === 'MultiPolygon' ? shape.geometry.coordinates : [shape.geometry.coordinates];
    for (const polygon of polygons) {
      ctx.beginPath();
      for (const ring of polygon) {
        ring.forEach(([longitude, latitude], i) => {
          const x = (longitude + 180) / 360 * 1024;
          const y = (90 - latitude) / 180 * 512;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
      }
      ctx.stroke();
      ctx.fill('evenodd');
    }
  }
  let seed = 997;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let n = 0; n < 4400; n++) {
    const x = rand() * 1024;
    const y = rand() * 512;
    ctx.fillStyle = n % 2 ? 'rgba(155,230,247,0.075)' : 'rgba(7,29,66,0.14)';
    ctx.fillRect(x, y, 1 + rand() * 4, 1);
  }
  ctx.fillStyle = 'rgba(233,249,255,.54)';
  ctx.fillRect(0, 0, 1024, 10);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  return texture;
}

function coloredFace(inner, outer, color, axis) {
  const positions = [];
  const colors = [];
  const base = new T.Color(color);
  for (let i = 0; i < 8; i++) {
    for (let n = 0; n < 64; n++) {
      for (const [ring, step] of [[i, n], [i + 1, n], [i + 1, n + 1], [i, n], [i + 1, n + 1], [i, n + 1]]) {
        const r = T.MathUtils.lerp(inner, outer, ring / 8);
        const angle = -halfPi + step * Math.PI / 64;
        const a = r * Math.cos(angle);
        const y = r * Math.sin(angle);
        positions.push(...(axis === 'x' ? [a, y, 0] : [0, y, a]));
        const shade = 0.76 + 0.22 * Math.sin(ring * 0.9) ** 2 + 0.13 * Math.cos(step * 0.51 + ring * 0.28) ** 2;
        colors.push(base.r * shade, base.g * shade, base.b * shade);
      }
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function earth(root) {
  const parts = {};
  const globe = group(root);
  const rings = [
    ['crust', 2.21, 2.35, 0x77d5b4, 0x4f8f9d],
    ['mantle', 1.27, 2.21, 0xff7350, 0xb73932],
    ['outer', 0.48, 1.27, 0xffc664, 0xe77929],
    ['inner', 0, 0.48, 0xffefa9, 0xffbe59],
  ];
  const map = surfaceTexture();
  for (const [id, inner, outer, face, shell] of rings) {
    const layer = part(parts, id, globe);
    const skin = new T.SphereGeometry(outer, 64, 44, Math.PI, 3 * halfPi);
    const uv = skin.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, 0.18 + 0.75 * uv.getX(i));
    const material = id === 'crust' ? matte(0xffffff, { map, side: T.DoubleSide }) : matte(shell, { side: T.DoubleSide });
    mesh(layer, skin, material);
    if (inner > 0) mesh(layer, new T.SphereGeometry(inner + 0.001, 48, 32, Math.PI, 3 * halfPi), matte(shell, { side: T.BackSide }));
    for (const axis of ['x', 'z']) mesh(layer, coloredFace(inner, outer, face, axis), matte(0xffffff, {
      side: T.DoubleSide, vertexColors: true, emissive: face, emissiveIntensity: id === 'inner' ? 0.28 : 0.12,
    }));
  }
  const glow = group(globe);
  const spots = [];
  const material = new T.MeshBasicMaterial({ color: 0xffd187 });
  for (let i = 0; i < 16; i++) {
    const dot = sphere(glow, material, 0.028, 0.028, 0.028, 0, 0, 0, 10);
    dot.raycast = () => {};
    spots.push(dot);
  }
  function update(time) {
    globe.rotation.y = 0.35 * Math.sin(time * 0.48);
    spots.forEach((dot, i) => {
      const angle = i % 8 * tau / 8 + time * (i < 8 ? 0.95 : -1.2);
      const radius = (i < 8 ? 1.67 : 0.84) + 0.18 * Math.cos(angle);
      const spread = 0.52 * Math.sin(angle);
      dot.position.set(Math.sqrt(radius ** 2 - spread ** 2), spread, 0.02);
      dot.scale.setScalar(0.018 + (i % 4) * 0.005);
    });
    return 0;
  }
  update(0);
  return { parts, update, direction: v(5.6, 1.8, 7.5), previewTime: 1 };
}
