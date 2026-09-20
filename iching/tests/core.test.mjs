import test from 'node:test';
import assert from 'node:assert/strict';
import { createCast, createLine, YARROW_MODEL } from '../core.mjs';

function sequence(values) {
  let index = 0;
  return () => {
    assert.ok(index < values.length, 'random sequence must not be exhausted');
    return values[index++];
  };
}

function assertLineInvariants(line) {
  assert.equal(line.steps.length, 3);
  let previous = 49;
  for (const [index, step] of line.steps.entries()) {
    assert.equal(step.before, previous);
    assert.equal(step.left + step.right, step.before);
    assert.ok(step.left >= 1);
    assert.ok(step.right >= 2);
    assert.equal(step.hanging, 1);
    assert.equal(step.leftRemainder, ((step.left - 1) % 4) + 1);
    assert.equal(step.rightRemainder, ((step.right - step.hanging - 1) % 4) + 1);
    assert.ok(step.leftRemainder >= 1 && step.leftRemainder <= 4);
    assert.ok(step.rightRemainder >= 1 && step.rightRemainder <= 4);
    assert.equal(step.removed, step.hanging + step.leftRemainder + step.rightRemainder);
    assert.ok((index === 0 ? [5, 9] : [4, 8]).includes(step.removed));
    assert.equal(step.remaining, step.before - step.removed);
    assert.equal(step.remaining % 4, 0);
    previous = step.remaining;
  }
  assert.equal(line.value, previous / 4);
  assert.ok([6, 7, 8, 9].includes(line.value));
}

test('all 64 equiprobable remainder paths yield 6:7:8:9 = 1:5:7:3', () => {
  const counts = { 6: 0, 7: 0, 8: 0, 9: 0 };
  for (let a = 0; a < 4; a += 1) {
    for (let b = 0; b < 4; b += 1) {
      for (let c = 0; c < 4; c += 1) {
        const line = createLine(sequence([a, 0, b, 0, c, 0]));
        assertLineInvariants(line);
        counts[line.value] += 1;
      }
    }
  }
  assert.deepEqual(counts, { 6: 4, 7: 20, 8: 28, 9: 12 });
  for (const value of [6, 7, 8, 9]) {
    assert.equal(counts[value] / 64, YARROW_MODEL.probabilities[value]);
  }
});

test('every legal split in each change retains the residue-model outcome', () => {
  // Cover the smallest and largest splits and all intermediate legal splits.
  for (let first = 0; first < 4; first += 1) {
    for (let second = 0; second < 4; second += 1) {
      for (let third = 0; third < 4; third += 1) {
        const residues = [first, second, third];
        const expected = createLine(sequence([first, 0, second, 0, third, 0]));
        for (let change = 0; change < 3; change += 1) {
          const before = expected.steps[change].before;
          const count = Math.floor((before - 2 - (residues[change] + 1)) / 4) + 1;
          for (let split = 0; split < count; split += 1) {
            const draws = residues.flatMap((residue, i) => [residue, i === change ? split : 0]);
            const actual = createLine(sequence(draws));
            assertLineInvariants(actual);
            assert.equal(actual.value, expected.value);
          }
        }
      }
    }
  }
});

test('six lines are built bottom to top with 49 stalks reset for each line', () => {
  const draws = [
    3, 0, 2, 0, 2, 0, // 6: removed 9, 8, 8.
    0, 0, 2, 0, 2, 0, // 7: removed 5, 8, 8.
    0, 0, 0, 0, 2, 0, // 8: removed 5, 4, 8.
    0, 0, 0, 0, 0, 0, // 9: removed 5, 4, 4.
    0, 0, 2, 0, 2, 0,
    3, 0, 2, 0, 2, 0,
  ];
  const cast = createCast(sequence(draws));
  assert.deepEqual(cast.lines.map(line => line.value), [6, 7, 8, 9, 7, 6]);
  cast.lines.forEach(assertLineInvariants);
});

test('divisible piles retain four stalks rather than zero', () => {
  const { steps } = createLine(sequence([3, 0, 3, 0, 3, 0]));
  assert.equal(steps[0].leftRemainder, 4);
  assert.equal(steps[0].rightRemainder, 4);
  assert.equal(steps[0].removed, 9);
});

test('source errors propagate without making up a replacement result', () => {
  const error = new Error('source unavailable');
  assert.throws(() => createCast(() => { throw error; }), error);
});

test('invalid random values and missing sources are rejected', () => {
  for (const value of [-1, 4, 1.5, NaN, Infinity, undefined, null, '1']) {
    assert.throws(() => createLine(() => value), RangeError);
  }
  // The second draw has a different bound; it is checked too.
  assert.throws(() => createLine(sequence([0, 12])), RangeError);
  assert.throws(() => createLine(), TypeError);
  assert.throws(() => createCast(null), TypeError);
});
