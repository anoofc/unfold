import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { T, v, group, matte, mesh, part, path, sphere } from '../geometry.js';
import assetUrl from './assets/human-body.glb?url';
import vesselTraces from './assets/human-body.json';

const leftLobes = ['leftUpper', 'leftLower'];
const rightLobes = ['rightUpper', 'rightMiddle', 'rightLower'];
const meshNames = [
  'bones', 'cutaway', 'brain', ...leftLobes, ...rightLobes, 'airway',
  'heart', 'coronaries', 'pulmonary', 'arteries', 'veins',
];

let pendingAsset;

export function loadBodyModel() {
  if (!pendingAsset) {
    pendingAsset = new GLTFLoader().loadAsync(assetUrl).then(({ scene }) => {
      const geometries = new Map();
      for (const name of meshNames) {
        const object = scene.getObjectByName(name);
        if (!object?.isMesh) throw new Error(`The anatomy model is missing ${name}.`);
        geometries.set(name, object.geometry);
      }
      return root => buildBody(root, geometries);
    }).catch(error => {
      pendingAsset = undefined;
      throw error;
    });
  }
  return pendingAsset;
}

function buildBody(root, geometries) {
  const parts = {};
  const bone = matte(0xc5b096, { roughness: 0.65 });
  const cutawayBone = matte(0xb3afd2, { transparent: true, opacity: 0.19, depthWrite: false });
  const tissue = matte(0xb66576, { roughness: 0.66 });
  const lungColors = [0x9e4c59, 0x8e3e51, 0xb05766].map(color => matte(color, { roughness: 0.63 }));
  const airway = matte(0xbb8172);
  const myocardium = matte(0x90283e, { roughness: 0.39 });
  const coronary = matte(0xd16c53, { roughness: 0.48 });
  const artery = matte(0xb8364b);
  const vein = matte(0x3968ae);

  function anatomy(parent, name, material, pivot) {
    const geometry = geometries.get(name).clone();
    if (pivot) geometry.translate(-pivot.x, -pivot.y, -pivot.z);
    return mesh(parent, geometry, material);
  }

  const skeleton = part(parts, 'skeleton', root);
  anatomy(skeleton, 'bones', bone);
  const cutaway = anatomy(skeleton, 'cutaway', cutawayBone);
  cutaway.name = 'skeleton-cover';
  cutaway.raycast = () => {}; // Click through the translucent bones to the organs beneath.

  const brain = part(parts, 'brain', root);
  anatomy(brain, 'brain', tissue);

  const lungs = part(parts, 'lungs', root);
  anatomy(lungs, 'airway', airway);
  const lobes = [
    [leftLobes, v(0.15, 1.59, 0.03)],
    [rightLobes, v(-0.15, 1.58, 0.03)],
  ].map(([names, pivot]) => {
    const side = group(lungs, pivot.x, pivot.y, pivot.z);
    names.forEach((name, i) => anatomy(side, name, lungColors[i], pivot));
    return side;
  });

  const heartPivot = v(0.068, 1.41, 0.15);
  const heart = part(parts, 'heart', root, ...heartPivot.toArray());
  anatomy(heart, 'heart', myocardium, heartPivot);
  anatomy(heart, 'coronaries', coronary, heartPivot);
  anatomy(heart, 'pulmonary', vein, heartPivot);

  const vessels = part(parts, 'vessels', root);
  anatomy(vessels, 'arteries', artery);
  anatomy(vessels, 'veins', vein);

  const arterialPulse = new T.MeshBasicMaterial({ color: 0xffb49d });
  const venousPulse = new T.MeshBasicMaterial({ color: 0xb3d4ff });
  const flows = vesselTraces.map(({ arterial, points }, index) => {
    const dot = sphere(root, arterial ? arterialPulse : venousPulse, 0.008, 0.008, 0.008, 0, 0, 0, 10);
    dot.raycast = () => {};
    return { dot, curve: path(points), offset: index * 0.29 };
  });

  function update(time) {
    const phase = time * 1.25 % 1;
    heart.scale.setScalar(1 + 0.085 * Math.exp(-((phase - 0.21) ** 2) * 160));
    const breath = (1 - Math.cos(time * Math.PI / 2)) * 0.5;
    lobes.forEach(lobe => lobe.scale.set(1 + 0.035 * breath, 1 + 0.07 * breath, 1 + 0.045 * breath));
    for (const { dot, curve, offset } of flows) {
      dot.position.copy(curve.getPointAt((time * 0.56 + offset) % 1));
    }
    return 0;
  }

  update(0);
  return {
    parts,
    update,
    direction: v(1.3, 0.35, 7),
    previewTime: 1.15,
    prepareIsolation(object) {
      const cover = object.getObjectByName('skeleton-cover');
      if (cover) cover.material = bone;
    },
  };
}
