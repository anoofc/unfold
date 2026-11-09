import { T, v, matte, group, mesh, part, box, sphere, tube, path, cylinder } from '../geometry.js';

const spacing = 1.76;

function roundedOutline(outline, width, height, radius) {
  const x = width / 2;
  const y = height / 2;
  outline.moveTo(-x + radius, -y);
  outline.lineTo(x - radius, -y);
  outline.quadraticCurveTo(x, -y, x, -y + radius);
  outline.lineTo(x, y - radius);
  outline.quadraticCurveTo(x, y, x - radius, y);
  outline.lineTo(-x + radius, y);
  outline.quadraticCurveTo(-x, y, -x, y - radius);
  outline.lineTo(-x, -y + radius);
  outline.quadraticCurveTo(-x, -y, -x + radius, -y);
  return outline;
}

function plantBoundary(parent, material, width, height, radius, thickness, depth) {
  const outline = roundedOutline(new T.Shape(), width, height, radius);
  outline.holes.push(roundedOutline(new T.Path(), width - 2 * thickness, height - 2 * thickness, radius - thickness));
  const geometry = new T.ExtrudeGeometry(outline, { depth, bevelEnabled: false, curveSegments: 9 });
  mesh(parent, geometry, material, 0, 0, -0.52);
}

function animalBoundary(membrane, cytoplasm, material) {
  const outline = new T.EllipseCurve(0, 0, 1.3, 1.06).getPoints(40);
  const points = outline.slice(0, -1).map(({ x, y }, i) => {
    const ripple = 1 + 0.065 * Math.cos(i * Math.PI * 6 / 40);
    return v(x * ripple, y * ripple, 0.06);
  });
  const boundary = new T.CatmullRomCurve3(points, true);
  tube(membrane, material.membrane, boundary, 0.065, 52, true);
  const bowl = mesh(membrane, new T.SphereGeometry(1, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), material.membrane, 0, 0, 0.06);
  bowl.rotation.x = -Math.PI / 2;
  bowl.scale.set(1.29, 0.62, 1.06);
  const section = new T.Shape(boundary.getPoints(52).slice(0, -1).map(({ x, y }) => new T.Vector2(x * 0.99, y * 0.99)));
  const fill = new T.ExtrudeGeometry(section, { depth: 0.47, bevelEnabled: false });
  mesh(cytoplasm, fill, material.interior, 0, 0, -0.43);
}

export function cells(root) {
  const parts = {};
  const plantAnchors = [];
  const animalAnchors = [];
  const material = {
    wall: matte(0x91ca62),
    membrane: matte(0x4dccc0),
    interior: matte(0x3f888b),
    nucleus: matte(0xac84ef),
    nucleolus: matte(0xf6beef),
    mitochondria: matte(0xe78455),
    folds: matte(0xffd391),
    er: matte(0x5279ce),
    vacuole: matte(0x4ea5e2),
    chloroplast: matte(0x399952),
    stacks: matte(0xb0d965),
    lysosome: matte(0xf4ac60),
  };

  function structure(id, plant, x = 0, y = 0, z = 0) {
    const shared = parts[id] ?? part(parts, id, root);
    const anchor = group(shared, plant ? -spacing : spacing);
    (plant ? plantAnchors : animalAnchors).push(anchor);
    return group(anchor, x, y, z);
  }

  const wall = structure('wall', true);
  plantBoundary(wall, material.wall, 2.9, 2.28, 0.34, 0.16, 0.81);
  plantBoundary(structure('membrane', true), material.membrane, 2.57, 1.95, 0.20, 0.043, 0.69);
  box(structure('cytoplasm', true), material.interior, 2.49, 1.87, 0.26, 0, 0, -0.34, 0.12);

  animalBoundary(structure('membrane', false), structure('cytoplasm', false), material);

  for (const plant of [true, false]) {
    const nucleus = structure('nucleus', plant, plant ? -0.68 : 0.25, 0.31, 0.12);
    sphere(nucleus, material.nucleus, 0.35, 0.31, 0.27);
    sphere(nucleus, material.nucleolus, 0.10, 0.095, 0.063, 0.055, 0.055, 0.24, 14);

    const er = structure('er', plant, plant ? -0.58 : 0.05, -0.03, 0.04);
    for (let row = 0; row < 4; row++) {
      const y = -0.12 * row;
      tube(er, material.er, path([[-0.37, y + 0.08, 0], [-0.22, y + 0.04, 0.1], [0, y - 0.06, 0.14], [0.23, y - 0.09, 0.11], [0.41, y - 0.02, 0]]), 0.038, 16);
    }

    const mitochondria = structure('mitochondria', plant);
    const locations = plant ? [[-0.72, -0.65, 0.2], [0.85, -0.60, -0.5]] : [[-0.75, 0.31, 0.7], [0.61, -0.39, -0.53]];
    for (const [x, y, angle] of locations) {
      const bean = group(mitochondria, x, y, 0.16);
      bean.rotation.z = angle;
      sphere(bean, material.mitochondria, 0.27, 0.13, 0.12, 0, 0, 0, 18);
      tube(bean, material.folds, path([[-0.19, 0, 0.09], [-0.11, 0.046, 0.11], [-0.04, -0.05, 0.12], [0.04, 0.05, 0.12], [0.11, -0.04, 0.11], [0.19, 0, 0.09]]), 0.016, 19);
    }
  }

  const vacuole = structure('vacuole', true, 0.47, 0, 0.01);
  const sac = sphere(vacuole, material.vacuole, 0.62, 0.63, 0.23);
  sac.rotation.z = -0.12;

  const chloroplasts = structure('chloroplasts', true);
  for (const [x, y, angle] of [[0.34, 0.67, 0.23], [0.9, 0.47, -0.63], [-0.19, -0.67, -0.18]]) {
    const chloroplast = group(chloroplasts, x, y, 0.18);
    chloroplast.rotation.z = angle;
    sphere(chloroplast, material.chloroplast, 0.23, 0.13, 0.11, 0, 0, 0, 18);
    for (const stack of [-0.105, 0, 0.105]) {
      for (const layer of [0, 1]) cylinder(chloroplast, material.stacks, 0.037, 0.037, 0.016, stack, 0, 0.089 + 0.023 * layer, 'z', 10);
    }
  }

  const lysosomes = structure('lysosomes', false);
  for (const [x, y, size] of [[0.75, 0.30, 0.105], [-0.57, -0.39, 0.12], [0.06, -0.68, 0.095]]) {
    sphere(lysosomes, material.lysosome, size, size, size, x, y, 0.14, 14);
  }

  function setView({ wallVisible, challenge }) {
    wall.visible = wallVisible;
    for (const anchor of plantAnchors) anchor.position.x = challenge ? 0 : -spacing;
    for (const anchor of animalAnchors) {
      anchor.position.x = challenge ? 0 : spacing;
      anchor.visible = !challenge;
    }
  }

  return { parts, direction: v(0.4, 1.05, 7), previewTime: 0, update: () => 0, setView };
}
