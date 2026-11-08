import { T, v, matte, group, mesh, part, bar, ring, sphere, path, tube } from '../geometry.js';

function sculpt(parent, material, transform) {
  const geo = new T.SphereGeometry(1, 52, 36);
  const points = geo.attributes.position;
  for (let i = 0; i < points.count; i++) {
    points.setXYZ(i, ...transform(points.getX(i), points.getY(i), points.getZ(i)));
  }
  geo.computeVertexNormals();
  return mesh(parent, geo, material);
}

export function body(root) {
  const parts = {};
  const bone = matte(0xe0d3bd);
  const cartilage = matte(0xb8a6a3);
  const brainMaterial = matte(0xd995a7);
  const sulcus = matte(0x8c4f78);
  const lungMaterial = matte(0xcc7186);
  const airway = matte(0xefb1ae);
  const muscle = matte(0xc03e57, { roughness: 0.36 });
  const artery = matte(0xef4d63);
  const vein = matte(0x5786df);
  const blood = new T.MeshBasicMaterial({ color: 0xffaf9b });
  const venousBlood = new T.MeshBasicMaterial({ color: 0xa3cbff });
  const ghost = matte(0x779ed2, { transparent: true, opacity: 0.16, depthWrite: false });
  const silhouette = group(root);
  sphere(silhouette, ghost, 0.4, 0.51, 0.34, 0, 2.38, -0.065);
  sphere(silhouette, ghost, 0.67, 0.87, 0.33, 0, 1.03, -0.15);
  sphere(silhouette, ghost, 0.55, 0.57, 0.3, 0, -0.24, -0.08);
  silhouette.traverse(object => { object.raycast = () => {}; });

  const skeleton = part(parts, 'skeleton', root);
  for (let i = 0; i < 17; i++) {
    const y = -0.17 + i * 0.12;
    sphere(skeleton, i % 2 ? bone : cartilage, 0.16 - 0.004 * i, 0.078, 0.12, 0, y, -0.23 + 0.04 * Math.sin(i * 0.3), 16);
  }
  const skull = group(skeleton, 0, 2.34, -0.06);
  // The back of the skull stays in place so the brain is visible in the cutaway.
  const skullBack = new T.SphereGeometry(1, 36, 26, Math.PI, Math.PI);
  mesh(skull, skullBack, matte(0xe0d3bd, { side: T.DoubleSide })).scale.set(0.365, 0.45, 0.31);
  const jaw = path([[-0.28, -0.12, 0.08], [-0.23, -0.32, 0.18], [0, -0.39, 0.24], [0.23, -0.32, 0.18], [0.28, -0.12, 0.08]]);
  tube(skull, bone, jaw, 0.057);
  for (let i = 0; i < 7; i++) sphere(skull, bone, 0.033, 0.043, 0.035, (i - 3) * 0.051, -0.30, 0.23 - Math.abs(i - 3) * 0.012, 12);

  function boneBetween(a, b, r) {
    bar(skeleton, bone, a, b, r, r * 0.82);
    sphere(skeleton, bone, r * 1.48, r * 1.48, r * 1.38, ...a, 16);
    sphere(skeleton, bone, r * 1.3, r * 1.4, r * 1.3, ...b, 16);
  }
  for (const s of [-1, 1]) {
    tube(skeleton, bone, path([[0, 1.54, 0.25], [s * 0.29, 1.64, 0.17], [s * 0.66, 1.55, 0]]), 0.047);
    boneBetween([s * 0.68, 1.50, 0], [s * 0.96, 0.72, 0], 0.076);
    boneBetween([s * 0.93, 0.71, 0.046], [s * 1.13, 0.07, 0.07], 0.037);
    boneBetween([s * 1.0, 0.72, -0.04], [s * 1.18, 0.07, -0.01], 0.041);
    sphere(skeleton, bone, 0.098, 0.139, 0.056, s * 1.17, -0.06, 0.037);
    for (let i = 0; i < 4; i++) {
      boneBetween([s * (1.11 + i * 0.041), -0.09, 0.043], [s * (1.12 + i * 0.043), -0.27 + i * 0.019, 0.075], 0.014);
    }
    const hip = sphere(skeleton, bone, 0.23, 0.29, 0.11, s * 0.3, -0.16, -0.06);
    hip.rotation.z = -s * 0.43;
    tube(skeleton, bone, path([[s * 0.49, -0.17, 0.02], [s * 0.29, -0.48, 0.14], [0, -0.48, 0.14]]), 0.064);
    boneBetween([s * 0.3, -0.47, 0.02], [s * 0.34, -1.42, 0.12], 0.093);
    boneBetween([s * 0.32, -1.43, 0.09], [s * 0.34, -2.41, 0], 0.065);
    boneBetween([s * 0.42, -1.48, 0.025], [s * 0.42, -2.39, -0.022], 0.035);
    sphere(skeleton, bone, 0.118, 0.091, 0.237, s * 0.38, -2.47, 0.15);
    for (let i = 0; i < 6; i++) {
      const width = [0.36, 0.45, 0.53, 0.58, 0.56, 0.49][i];
      const y = 1.43 - i * 0.142;
      tube(skeleton, bone, path([[s * 0.045, y + 0.1, -0.23], [s * width * 0.72, y + 0.01, -0.22], [s * width, y - 0.09, -0.018], [s * width * 0.76, y - 0.20, 0.24], [s * (i < 3 ? 0.055 : 0.22 + i * 0.023), y - 0.22, 0.33]]), 0.024);
    }
  }
  bar(skeleton, cartilage, [0, 0.9, 0.32], [0, 1.46, 0.26], 0.029, 0.055);

  const brain = part(parts, 'brain', root, 0, 2.43, 0.036);
  for (const s of [-1, 1]) {
    const lobe = sculpt(brain, brainMaterial, (x, y, z) => {
      const folds = 1 + 0.049 * Math.cos(x * 17 + z * 12) * Math.sin(y * 13 - z * 9);
      return [x * 0.165 * folds + s * 0.15, y * 0.263 * folds, z * 0.245 * folds];
    });
    lobe.rotation.z = s * 0.09;
    for (let i = 0; i < 5; i++) {
      const line = [];
      for (let n = 0; n < 19; n++) {
        const p = n / 18;
        const elevation = -0.64 + i * 0.31 + 0.092 * Math.sin(19 * p + i);
        const azimuth = -1.02 + 2.42 * p;
        const wide = Math.cos(elevation);
        line.push([s * (0.15 + Math.sin(azimuth) * 0.167 * wide), Math.sin(elevation) * 0.266, Math.cos(azimuth) * 0.248 * wide]);
      }
      tube(brain, sulcus, path(line), 0.009, 28);
    }
  }
  sphere(brain, brainMaterial, 0.133, 0.10, 0.13, 0, -0.228, -0.07);
  bar(brain, brainMaterial, [0, -0.32, -0.095], [0, -0.20, -0.09], 0.054);

  const lungs = part(parts, 'lungs', root, 0, 0.98, 0.035);
  const lobes = [];
  for (const s of [-1, 1]) {
    const lobe = group(lungs, s * 0.30, -0.02, 0);
    sculpt(lobe, lungMaterial, (x, y, z) => {
      const lobeWidth = 0.91 - y * 0.27;
      const notch = s === 1 ? 1 - 0.29 * Math.max(0, -x) * Math.max(0, -y) : 1;
      return [x * 0.231 * lobeWidth * notch - s * y * 0.061, y * 0.43, z * 0.196 * notch];
    });
    tube(lobe, matte(0xb45873), path([[-0.16, -0.025, 0.097], [-0.105, -0.11, 0.18], [0.026, -0.19, 0.18], [0.16, -0.26, 0.067]]), 0.012);
    tube(lungs, airway, path([[0, 0.40, 0.056], [s * 0.14, 0.27, 0.09], [s * 0.23, 0.15, 0.11], [s * 0.26, -0.04, 0.11]]), 0.036);
    lobes.push(lobe);
  }
  bar(lungs, airway, [0, 0.33, 0.055], [0, 0.79, 0.055], 0.061);
  for (let i = 0; i < 9; i++) ring(lungs, cartilage, 0.063, 0.011, 0, 0.36 + i * 0.05, 0.055, 'y');

  const heart = part(parts, 'heart', root, 0.077, 0.89, 0.26);
  sculpt(heart, muscle, (x, y, z) => {
    const width = 0.85 + y * 0.33;
    return [x * 0.22 * width - y * 0.072, y * 0.252, z * 0.168 * (0.9 + y * 0.17)];
  });
  sphere(heart, muscle, 0.109, 0.114, 0.097, -0.092, 0.113, -0.03);
  sphere(heart, muscle, 0.116, 0.108, 0.10, 0.052, 0.134, -0.012);
  tube(heart, artery, path([[0.05, 0.08, -0.08], [0.02, 0.23, -0.072], [-0.065, 0.276, -0.041], [-0.15, 0.218, -0.092]]), 0.045);
  tube(heart, vein, path([[-0.09, 0.10, -0.04], [-0.16, 0.19, -0.04], [-0.22, 0.21, -0.05]]), 0.035);
  tube(heart, matte(0xff9a8d), path([[-0.1, 0.12, 0.111], [-0.042, 0.04, 0.164], [0.02, -0.10, 0.129], [0.068, -0.205, 0.072]]), 0.012);

  const vessels = part(parts, 'vessels', root);
  const flows = [];
  function vessel(material, points, width, withPulse = false) {
    const curve = path(points);
    tube(vessels, material, curve, width);
    if (!withPulse) return;
    const dot = sphere(root, material === vein ? venousBlood : blood, width * 1.3, width * 1.3, width * 1.3, 0, 0, 0, 12);
    dot.raycast = () => {};
    flows.push({ dot, curve });
  }
  vessel(artery, [[0.1, 1.13, 0.22], [-0.036, 1.21, 0.11], [-0.10, 0.67, 0.035], [-0.09, 0, 0.085], [-0.21, -0.42, 0.12], [-0.27, -1.37, 0.17], [-0.28, -2.28, 0.07]], 0.024, true);
  vessel(vein, [[0.29, -2.28, 0.06], [0.28, -1.37, 0.18], [0.22, -0.42, 0.14], [0.047, -0.04, 0.09], [0.02, 0.49, 0.12], [0.05, 0.84, 0.15]], 0.025, true);
  vessel(artery, [[0.1, 1.09, 0.19], [0.04, 1.27, 0.14], [-0.09, 1.46, 0.13], [-0.12, 1.83, 0.11], [-0.12, 2.21, 0.12]], 0.022, true);
  vessel(vein, [[0.13, 2.20, 0.10], [0.13, 1.78, 0.14], [0.14, 1.41, 0.13], [0.16, 1.1, 0.15]], 0.019, true);
  for (const s of [-1, 1]) {
    vessel(artery, [[0, 1.4, 0.14], [s * 0.34, 1.48, 0.20], [s * 0.62, 1.46, 0.12], [s * 0.87, 0.73, 0.09], [s * 1.09, 0.02, 0.12]], 0.016, true);
    vessel(vein, [[s * 1.18, 0.05, 0.105], [s * 0.99, 0.72, 0.12], [s * 0.66, 1.49, 0.18], [s * 0.31, 1.38, 0.16], [0.11, 1.03, 0.14]], 0.014);
  }

  function update(time) {
    const beat = time * 1.25 % 1;
    heart.scale.setScalar(1 + 0.10 * Math.exp(-((beat - 0.22) ** 2) * 130));
    const breath = 1 + 0.085 * (1 - Math.cos(time * Math.PI / 2));
    lobes.forEach(lobe => lobe.scale.set(breath, breath, 1 + (breath - 1) * 0.67));
    flows.forEach(({ dot, curve }, i) => dot.position.copy(curve.getPointAt((time * 0.53 + i * 0.29) % 1)));
    return 0;
  }
  update(0);
  return { parts, update, direction: v(0.56, 0.29, 7), previewTime: 1.15 };
}
