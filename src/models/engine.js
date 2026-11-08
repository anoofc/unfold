import { T, v, metal, matte, group, mesh, part, box, cylinder, ring, bar } from '../geometry.js';

const tau = 2 * Math.PI;
const colors = [0x57c9ff, 0xad9aff, 0xff7434, 0xb19bab];

export function engine(root) {
  const parts = {};
  const steel = metal(0xb4c7dd);
  const dark = metal(0x42546f);
  const edge = metal(0x7c96b3);
  const blockMaterial = metal(0x3b5777, 0.4, 0.48);
  const rubber = matte(0x1a2137);
  const brass = metal(0xd3a267);
  const white = matte(0xf4e9d1);
  const intakeColor = metal(0x77bded);
  const exhaustColor = metal(0xf1a36f);
  const crankY = -1.49;
  const radius = 0.38;
  const length = 1.46;
  const crank = part(parts, 'crank', root, 0, crankY, 0);
  cylinder(crank, edge, 0.16, 0.16, 5.32, 0, 0, 0, 'x');
  cylinder(crank, dark, 0.65, 0.65, 0.18, -2.55, 0, 0, 'x');
  cylinder(crank, edge, 0.53, 0.53, 0.24, -2.55, 0, 0, 'x');
  for (let n = 0; n < 36; n++) {
    const angle = n * tau / 36;
    const tooth = box(crank, steel, 0.2, 0.08, 0.065, -2.55, 0.663 * Math.cos(angle), 0.663 * Math.sin(angle), 0.015);
    tooth.rotation.x = angle;
  }
  cylinder(crank, steel, 0.34, 0.34, 0.23, 2.51, 0, 0, 'x');
  const block = part(parts, 'block', root);
  box(block, blockMaterial, 4.92, 0.23, 0.9, 0, 0.99, -0.38);
  box(block, dark, 4.94, 0.11, 0.9, 0, 1.13, -0.38);
  box(block, blockMaterial, 4.85, 0.2, 0.6, 0, -0.77, -0.62);
  for (let n = 0; n < 12; n++) {
    box(block, edge, 0.062, 1.42, 0.09, -2.31 + n * 0.42, 0.09, -0.81, 0.015);
  }
  const cams = [part(parts, 'cam', root, 0, 1.72, -0.38), part(parts, 'cam', root, 0, 1.72, 0.38)];
  const camGroups = cams.map((cam, index) => {
    const rotor = group(cam);
    cylinder(rotor, dark, 0.11, 0.11, 5.05, 0, 0, 0, 'x');
    cylinder(rotor, edge, 0.26, 0.26, 0.15, 2.47, 0, 0, 'x');
    const gear = ring(rotor, index === 0 ? intakeColor : exhaustColor, 0.21, 0.035, 2.56, 0, 0, 'x');
    gear.name = 'Timing gear';
    return rotor;
  });
  const offsets = [0, 3 * Math.PI, Math.PI, 2 * Math.PI];
  const cylinders = offsets.map((offset, i) => {
    const x = (i - 1.5) * 1.16;
    const piston = part(parts, 'piston', root, x, 0, 0);
    cylinder(piston, steel, 0.428, 0.42, 0.39, 0, 0.2, 0);
    cylinder(piston, edge, 0.411, 0.41, 0.12, 0, -0.027, 0);
    for (const y of [0.27, 0.321, 0.368]) ring(piston, dark, 0.425, 0.013, 0, y, 0, 'y');
    cylinder(piston, dark, 0.088, 0.088, 0.014, 0, 0.083, 0.42, 'z');
    cylinder(piston, steel, 0.052, 0.052, 0.021, 0, 0.083, 0.43, 'z');

    const rod = part(parts, 'rod', root, x, 0, 0);
    bar(rod, edge, [0, 0, 0], [0, length, 0], 0.112, 0.071);
    bar(rod, steel, [0, 0.14, 0.051], [0, length - 0.10, 0.051], 0.046, 0.032);
    ring(rod, steel, 0.157, 0.054, 0, 0, 0, 'x');
    ring(rod, steel, 0.087, 0.036, 0, length, 0, 'x');

    const throwGroup = group(crank, x);
    throwGroup.rotation.x = offset;
    for (const side of [-1, 1]) {
      box(throwGroup, dark, 0.14, 0.76, 0.42, side * 0.2, -0.01, 0, 0.065);
      cylinder(throwGroup, dark, 0.27, 0.27, 0.15, side * 0.2, -0.29, 0, 'x');
    }
    cylinder(throwGroup, steel, 0.11, 0.11, 0.55, 0, radius, 0, 'x');

    for (const [r, material] of [[0.52, blockMaterial], [0.46, edge]]) {
      mesh(block, new T.CylinderGeometry(r, r, 1.60, 36, 1, true, Math.PI / 2, Math.PI), material, x, 0.08, 0).material.side = T.DoubleSide;
    }
    for (const y of [-0.7, 0.9]) {
      const lip = mesh(block, new T.TorusGeometry(0.487, 0.035, 8, 32, Math.PI), edge, x, y, 0);
      lip.rotation.x = -Math.PI / 2;
    }

    const valves = ['intake', 'exhaust'].map((id, n) => {
      const material = n === 0 ? intakeColor : exhaustColor;
      const z = n === 0 ? -0.27 : 0.27;
      const valve = part(parts, id, root, x, 0, z);
      valve.rotation.x = n === 0 ? -0.15 : 0.15;
      cylinder(valve, material, 0.047, 0.047, 0.67, 0, 1.12, 0);
      cylinder(valve, material, 0.116, 0.165, 0.06, 0, 0.82, 0);
      cylinder(valve, edge, 0.122, 0.122, 0.07, 0, 1.43, 0);
      const springPoints = Array.from({ length: 56 }, (_, step) => {
        const p = step / 55;
        return v(0.085 * Math.cos(p * tau * 5), 1.07 + p * 0.32, 0.085 * Math.sin(p * tau * 5));
      });
      mesh(valve, new T.TubeGeometry(new T.CatmullRomCurve3(springPoints), 55, 0.017, 6), dark);
      const lobe = group(camGroups[n], x);
      lobe.rotation.x = offset / 2 + (n === 0 ? -Math.PI / 4 : Math.PI / 4);
      const shape = cylinder(lobe, edge, 0.149, 0.149, 0.17, 0, -0.064, 0, 'x');
      shape.scale.x = 1.17;
      return valve;
    });
    const plug = part(parts, 'plug', root, x + 0.16, 0.99, 0.01);
    plug.rotation.z = -0.22;
    cylinder(plug, steel, 0.053, 0.052, 0.26, 0, 0.005, 0);
    cylinder(plug, white, 0.065, 0.078, 0.23, 0, 0.21, 0);
    for (let n = 0; n < 4; n++) ring(plug, white, 0.067, 0.014, 0, 0.16 + n * 0.039, 0, 'y');
    cylinder(plug, brass, 0.054, 0.054, 0.09, 0, 0.36, 0);
    const gas = mesh(root, new T.CylinderGeometry(0.402, 0.402, 1, 30), new T.MeshBasicMaterial({
      color: colors[0], transparent: true, opacity: 0.21, depthWrite: false,
    }), x, 0, 0);
    gas.raycast = () => {};
    return { offset, piston, rod, valves, gas };
  });

  function update(time) {
    const angle = time * tau / 3;
    crank.rotation.x = angle;
    camGroups.forEach(cam => { cam.rotation.x = angle / 2; });
    for (const { offset, piston, rod, valves, gas } of cylinders) {
      const cycle = (angle + offset) % (2 * tau);
      const stage = Math.floor(cycle / Math.PI);
      const travel = cycle % Math.PI;
      const z = radius * Math.sin(cycle);
      const y = radius * Math.cos(cycle);
      const pistonY = crankY + y + Math.sqrt(length * length - z * z);
      piston.position.y = pistonY;
      rod.position.set(piston.position.x, crankY + y, z);
      rod.quaternion.setFromUnitVectors(v(0, 1, 0), v(0, pistonY - rod.position.y, -z).normalize());
      valves[0].position.y = stage === 0 ? -0.19 * Math.sin(travel) : 0;
      valves[1].position.y = stage === 3 ? -0.19 * Math.sin(travel) : 0;
      const chamber = Math.max(0.02, 0.87 - (pistonY + 0.4));
      gas.position.y = 0.87 - chamber / 2;
      gas.scale.y = chamber;
      gas.material.color.setHex(colors[stage]);
      gas.material.opacity = stage === 2 ? 0.24 + 0.47 * Math.exp(-travel * 2) : 0.26;
    }
    return Math.floor((angle % (2 * tau)) / Math.PI);
  }
  update(0);
  return { parts, update, direction: v(4.0, 2.15, 7), previewTime: 3.45 };
}
