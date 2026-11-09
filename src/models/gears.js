import { T, v, metal, matte, group, mesh, part, box, cylinder, ring, bar } from '../geometry.js';
import { driverTeeth, initialDrivenTeeth, outputTurns } from '../gear-ratios.js';

const tau = 2 * Math.PI;
const gearModule = 0.075;
const pressureAngle = Math.PI / 9;
const driverX = -1.44;
const shaftY = 0.23;
const pitchRadius = teeth => gearModule * teeth / 2;
const centerDistance = teeth => pitchRadius(driverTeeth) + pitchRadius(teeth);

function wheelGeometry(teeth) {
  const pitch = pitchRadius(teeth);
  const base = pitch * Math.cos(pressureAngle);
  const root = pitch - 1.25 * gearModule;
  const tip = pitch + gearModule;
  const step = tau / teeth;
  const flankStart = Math.max(base, root);
  const thicknessAngle = step / 4 - 0.002 + Math.tan(pressureAngle) - pressureAngle;
  const halfAngle = radius => {
    const angle = Math.acos(Math.min(1, base / radius));
    return thicknessAngle - (Math.tan(angle) - angle);
  };

  const shape = new T.Shape();
  const samples = [];
  const flankSteps = 5;
  for (let index = 0; index <= flankSteps; index++) {
    const radius = T.MathUtils.lerp(flankStart, tip, index / flankSteps);
    samples.push([radius, halfAngle(radius)]);
  }
  const point = (radius, angle) => [radius * Math.cos(angle), radius * Math.sin(angle)];
  shape.moveTo(...point(root, -step / 2));
  for (let tooth = 0; tooth < teeth; tooth++) {
    const center = tooth * step;
    const rootHalf = samples[0][1];
    shape.lineTo(...point(root, center - rootHalf));
    for (const [radius, angle] of samples) shape.lineTo(...point(radius, center - angle));
    shape.lineTo(...point(tip, center));
    for (let index = samples.length - 1; index >= 0; index--) {
      const [radius, angle] = samples[index];
      shape.lineTo(...point(radius, center + angle));
    }
    shape.lineTo(...point(root, center + rootHalf));
    shape.lineTo(...point(root, center + step / 2));
  }
  shape.closePath();

  for (let index = 0; index < 3; index++) {
    const angle = (index + 0.5) * tau / 3;
    const hole = new T.Path();
    hole.absarc(...point(pitch * 0.53, angle), pitch * 0.125, 0, tau, true);
    shape.holes.push(hole);
  }
  return new T.ExtrudeGeometry(shape, { depth: 0.21, bevelEnabled: false, curveSegments: 14 });
}

export function gears(root) {
  const parts = {};
  const steel = metal(0xb9c9e0, 0.64, 0.29);
  const slate = matte(0x354560);
  const rail = metal(0x536d8b, 0.55, 0.37);
  const driverColor = metal(0x49a7ea, 0.32, 0.3);
  const drivenColor = metal(0xeab35a, 0.42, 0.3);
  const crankColor = matte(0xe47754);
  const marker = new T.MeshBasicMaterial({ color: 0xfff5d8 });

  const support = part(parts, 'support', root);
  box(support, slate, 5.92, 2.64, 0.22, 0.32, 0.1, -0.72, 0.14);
  for (const side of [-1, 1]) {
    box(support, rail, 3.18, 0.12, 0.13, 0.3, shaftY + side * 0.33, -0.55, 0.04);
    for (const x of [-2.44, 3.07]) {
      cylinder(support, steel, 0.073, 0.073, 0.065, x, side * 1.04 + 0.1, -0.59, 'z', 8);
    }
  }
  function bearing(x) {
    const mount = group(support, x, shaftY, -0.52);
    box(mount, rail, 0.65, 0.65, 0.21, 0, 0, 0.03, 0.09);
    cylinder(mount, steel, 0.27, 0.27, 0.15, 0, 0, 0.18, 'z');
    ring(mount, slate, 0.198, 0.032, 0, 0, 0.264);
    return mount;
  }
  bearing(driverX);
  const drivenBearing = bearing(driverX + centerDistance(initialDrivenTeeth));

  const driver = part(parts, 'driver', root, driverX, shaftY, 0);
  const driven = part(parts, 'driven', root, drivenBearing.position.x, shaftY, 0);
  const crank = part(parts, 'crank', root, driverX, shaftY, 0);

  function wheel(parent, teeth, material) {
    const face = mesh(parent, wheelGeometry(teeth), material, 0, 0, -0.07);
    cylinder(parent, steel, 0.175, 0.175, 0.62, 0, 0, -0.05, 'z');
    cylinder(parent, material, 0.29, 0.29, 0.12, 0, 0, 0.19, 'z', 36);
    cylinder(parent, steel, 0.116, 0.116, 0.09, 0, 0, 0.27, 'z', 8);
    const dot = cylinder(parent, marker, 0.053, 0.053, 0.017, 0, pitchRadius(teeth) * 0.79, 0.151, 'z', 16);
    return { face, dot };
  }
  wheel(driver, driverTeeth, driverColor);
  const drivenWheel = wheel(driven, initialDrivenTeeth, drivenColor);

  cylinder(crank, steel, 0.155, 0.155, 0.27, 0, 0, 0.36, 'z');
  bar(crank, steel, [0, 0, 0.48], [0.60, 0, 0.48], 0.071);
  cylinder(crank, steel, 0.105, 0.105, 0.37, 0.60, 0, 0.61, 'z');
  cylinder(crank, crankColor, 0.135, 0.135, 0.27, 0.60, 0, 0.72, 'z');
  for (const z of [0.62, 0.69, 0.76, 0.83]) ring(crank, slate, 0.132, 0.012, 0.60, 0, z);

  let teeth = initialDrivenTeeth;
  let turns = 0;
  let targetTurns = 0;
  function pose() {
    driver.rotation.z = crank.rotation.z = -turns * tau;
    driven.rotation.z = -outputTurns(turns, teeth) * tau + Math.PI / teeth;
  }
  pose();

  function setView({ drivenTeeth = teeth, inputTurns = targetTurns, animate = true }) {
    const changedGear = teeth !== drivenTeeth;
    if (changedGear) {
      teeth = drivenTeeth;
      drivenWheel.face.geometry.dispose();
      drivenWheel.face.geometry = wheelGeometry(teeth);
      drivenWheel.dot.position.y = pitchRadius(teeth) * 0.79;
      driven.position.x = drivenBearing.position.x = driverX + centerDistance(teeth);
    }
    targetTurns = inputTurns;
    if (!animate || changedGear) turns = targetTurns;
    pose();
    return changedGear;
  }

  function advance(elapsed) {
    if (turns === targetTurns) return;
    const remaining = targetTurns - turns;
    const step = elapsed * 0.9;
    turns = Math.abs(remaining) <= step ? targetTurns : turns + Math.sign(remaining) * step;
    pose();
    return turns;
  }

  return { parts, direction: v(0.75, 0.92, 8), previewTime: 0, update: () => 0, setView, advance };
}
