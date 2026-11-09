import assert from 'node:assert/strict';
import test from 'node:test';
import { Group } from 'three';
import { driverTeeth, drivenOptions, gearSpeedFraction, isHalfSpeed, outputTurns } from '../src/gear-ratios.js';
import { gears } from '../src/models/gears.js';

test('external gears turn in opposite directions at the expected speed for every choice', () => {
  assert.deepEqual(drivenOptions.map(gearSpeedFraction), ['4/3', '1', '2/3', '1/2']);
  assert.deepEqual(drivenOptions.map(teeth => outputTurns(1, teeth)), [-4 / 3, -1, -2 / 3, -1 / 2]);
  assert.equal(outputTurns(-2, 48), 1);
  assert.deepEqual(drivenOptions.filter(isHalfSpeed), [48]);
});

test('the driven mesh swaps size and moves to the matching shaft spacing', () => {
  const { parts, setView } = gears(new Group());
  const { driver, driven, support } = parts;
  const bearing = support.children.at(-1);
  for (const drivenTeeth of drivenOptions) {
    setView({ drivenTeeth, inputTurns: 0, animate: false });
    const mesh = driven.children[0];
    mesh.geometry.computeBoundingSphere();
    const spacing = driven.position.x - driver.position.x;
    assert(Math.abs(spacing - (driverTeeth + drivenTeeth) * 0.075 / 2) < 1e-10);
    assert.equal(bearing.position.x, driven.position.x);
    assert(Math.abs(mesh.geometry.boundingSphere.radius - (drivenTeeth * 0.075 / 2 + 0.075)) < 0.01);
  }
});

test('one crank turn keeps both gears in sync through partial and completed turns', () => {
  const { parts, setView, advance } = gears(new Group());
  setView({ drivenTeeth: 48, inputTurns: 0, animate: false });
  const phase = parts.driven.rotation.z;
  setView({ inputTurns: 1 });
  const partial = advance(0.25);
  assert(partial > 0 && partial < 1);
  assert.equal(parts.driver.rotation.z, -partial * 2 * Math.PI);
  assert.equal(parts.crank.rotation.z, parts.driver.rotation.z);
  assert.equal(parts.driven.rotation.z, partial * Math.PI + phase);
  assert.equal(advance(2), 1);
  assert.equal(parts.driven.rotation.z, Math.PI + phase);
  assert.equal(advance(1), undefined);
  setView({ inputTurns: -1, animate: false });
  assert.equal(parts.driver.rotation.z, 2 * Math.PI);
  assert.equal(parts.driven.rotation.z, -Math.PI + phase);
});
