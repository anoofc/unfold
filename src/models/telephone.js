import { T, v, metal, matte, group, mesh, part, box, cylinder, ring, path, tube, sphere, bar } from '../geometry.js';

const tau = Math.PI * 2;

export function telephone(root) {
  const parts = {};
  const black = metal(0x202438, 0.36, 0.23);
  const brass = metal(0xe5aa58, 0.66, 0.29);
  const bright = metal(0xffce81, 0.47, 0.24);
  const copper = metal(0xa9553b, 0.42, 0.3);
  const wood = matte(0x7f3d25);
  const trim = matte(0xad6542);
  const iron = metal(0x66758e);
  const signal = new T.MeshBasicMaterial({ color: 0x90fcfa });

  function instrument(x, y, z, yaw) {
    const unit = group(root, x, y, z);
    unit.rotation.y = yaw;
    const base = part(parts, 'base', unit);
    box(base, wood, 1.79, 0.22, 2.21, 0, -0.6, 0, 0.095);
    box(base, trim, 1.77, 0.075, 2.19, 0, -0.482, 0, 0.04);
    for (const side of [-1, 1]) {
      cylinder(base, brass, 0.069, 0.095, 0.25, side * 0.61, -0.39, -0.72);
      ring(base, bright, 0.078, 0.02, side * 0.61, -0.278, -0.72, 'y');
      box(base, wood, 0.09, 0.013, 1.5, side * 0.72, -0.44, 0.03, 0.006);
    }

    const mouth = part(parts, 'mouth', unit, 0, 0.34, 0.22);
    const profile = [[0.34, -0.28], [0.28, -0.23], [0.20, 0.06], [0.15, 0.37], [0.16, 0.53], [0.21, 0.62], [0.215, 0.71], [0.17, 0.70], [0.166, 0.64], [0.121, 0.54], [0.116, 0.37], [0.17, 0.06], [0.24, -0.23], [0.31, -0.28], [0.34, -0.28]];
    const horn = mesh(mouth, new T.LatheGeometry(profile.map(([r, h]) => new T.Vector2(r, h)), 56, -0.2, tau - 0.89), black);
    horn.rotation.x = Math.PI / 2;
    ring(mouth, iron, 0.19, 0.018, 0, 0, 0.705);
    ring(mouth, brass, 0.327, 0.028, 0, 0, -0.275);

    const diaphragm = part(parts, 'diaphragm', unit, 0, 0.34, -0.23);
    const disc = cylinder(diaphragm, iron, 0.393, 0.393, 0.05, 0, 0, 0.075, 'z', 48);
    ring(diaphragm, bright, 0.414, 0.055, 0, 0, 0.045);
    ring(diaphragm, brass, 0.413, 0.036, 0, 0, -0.059);
    for (let n = 0; n < 6; n++) {
      const angle = n * tau / 6;
      cylinder(diaphragm, bright, 0.038, 0.038, 0.16, 0.412 * Math.cos(angle), 0.412 * Math.sin(angle), 0, 'z', 12);
    }
    bar(diaphragm, brass, [-0.32, -0.2, -0.01], [-0.32, -0.79, -0.01], 0.035);
    bar(diaphragm, brass, [0.32, -0.2, -0.01], [0.32, -0.79, -0.01], 0.035);

    const coil = part(parts, 'coil', unit, 0, 0.34, -0.42);
    cylinder(coil, iron, 0.085, 0.085, 0.55, 0, 0, -0.20, 'z');
    cylinder(coil, copper, 0.145, 0.145, 0.34, 0, 0, -0.21, 'z');
    for (let i = 0; i < 16; i++) ring(coil, i % 5 === 0 ? bright : copper, 0.143, 0.012, 0, 0, -0.36 + i * 0.019);
    cylinder(coil, brass, 0.174, 0.174, 0.042, 0, 0, -0.393, 'z');
    cylinder(coil, brass, 0.174, 0.174, 0.042, 0, 0, -0.034, 'z');
    bar(coil, brass, [0, 0, -0.39], [0, -0.79, -0.39], 0.044);

    const waves = group(unit, 0, 0.34, 0.94);
    for (let n = 0; n < 3; n++) {
      const line = ring(waves, new T.MeshBasicMaterial({ color: 0x92edff, transparent: true, opacity: 0.8, depthWrite: false }), 0.17, 0.012, 0, 0, 0.1);
      line.raycast = () => {};
    }
    unit.updateMatrixWorld();
    return { disc, waves, terminal: unit.localToWorld(v(0.61, -0.29, -0.72)) };
  }

  const sender = instrument(-1.42, 0.06, 0.21, -0.64);
  const receiver = instrument(1.55, 0.06, -0.27, 0.43);
  const wire = part(parts, 'wire', root);
  const wirePath = path([sender.terminal.toArray(), [-0.94, -0.28, -1.02], [-0.66, -0.46, -0.73], [-0.1, -0.43, -0.38], [0.47, -0.27, -0.8], receiver.terminal.toArray()]);
  tube(wire, copper, wirePath, 0.027, 70);
  const lights = Array.from({ length: 4 }, () => {
    const dot = sphere(root, signal, 0.063, 0.063, 0.063, 0, 0, 0, 12);
    dot.raycast = () => {};
    return dot;
  });

  function update(time) {
    const phase = time % 5.4 / 1.8;
    const stage = Math.floor(phase);
    for (const [device, active] of [[sender, stage === 0], [receiver, stage === 2]]) {
      device.disc.position.z = 0.075 + (active ? 0.025 * Math.sin(time * 28) : 0);
      device.waves.visible = active;
      device.waves.children.forEach((wave, i) => {
        const t = (time * 0.8 + i / 3) % 1;
        wave.scale.setScalar(0.75 + 1.7 * t);
        wave.position.z = t * 0.62;
        wave.material.opacity = 0.75 * (1 - t);
      });
    }
    lights.forEach((dot, i) => {
      dot.visible = stage === 1;
      dot.position.copy(wirePath.getPointAt(T.MathUtils.clamp(phase - 1 - i * 0.063, 0, 1)));
    });
    return stage;
  }

  update(0);
  return { parts, update, direction: v(3.45, 3.35, 7.8), previewTime: 2.78 };
}
