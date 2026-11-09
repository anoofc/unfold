import assert from 'node:assert/strict';
import test from 'node:test';
import { Group } from 'three';
import { gradeCellChallenge } from '../src/cell-challenge.js';
import { lessons } from '../src/lessons.js';
import { cells } from '../src/models/cells.js';

test('cell comparison gives each listed structure the right cell anchors', () => {
  const model = cells(new Group());
  const lesson = lessons.find(({ id }) => id === 'cells');
  assert.deepEqual(Object.keys(model.parts).sort(), lesson.parts.map(([id]) => id).sort());
  const locations = id => model.parts[id].children.map(anchor => Math.sign(anchor.position.x));
  for (const id of ['nucleus', 'membrane', 'cytoplasm', 'mitochondria', 'er']) {
    assert.deepEqual(locations(id), [-1, 1], id);
  }
  for (const id of ['wall', 'chloroplasts', 'vacuole']) {
    assert.deepEqual(locations(id), [-1], id);
  }
  assert.deepEqual(locations('lysosomes'), [1]);
});

test('the unlabeled sample restores the wall and hides the animal cell without changing the comparison state', () => {
  const model = cells(new Group());
  const [leafMembrane, animalMembrane] = model.parts.membrane.children;
  model.setView({ wallVisible: false, challenge: false });
  assert.equal(model.parts.wall.children[0].children[0].visible, false);
  assert.equal(leafMembrane.visible, true);
  assert.equal(animalMembrane.visible, true);

  model.setView({ wallVisible: true, challenge: true });
  assert.equal(leafMembrane.position.x, 0);
  assert.equal(animalMembrane.visible, false);
  assert.equal(model.parts.wall.children[0].children[0].visible, true);

  model.setView({ wallVisible: false, challenge: false });
  assert(leafMembrane.position.x < 0);
  assert(animalMembrane.position.x > 0);
  assert.equal(animalMembrane.visible, true);
  assert.equal(model.parts.wall.children[0].children[0].visible, false);
});

test('the cell challenge requires an identification and exactly two distinctive structures', () => {
  for (const evidence of [['wall', 'chloroplasts'], ['vacuole', 'wall'], ['chloroplasts', 'vacuole']]) {
    assert.match(gradeCellChallenge('plant', evidence), /^Correct/);
  }
  assert.match(gradeCellChallenge('animal', ['wall', 'vacuole']), /^Try again/);
  assert.match(gradeCellChallenge('plant', ['wall', 'nucleus']), /^Try again/);
  assert.match(gradeCellChallenge('plant', ['wall']), /exactly two/);
  assert.match(gradeCellChallenge('plant', ['wall', 'chloroplasts', 'vacuole']), /exactly two/);
});
