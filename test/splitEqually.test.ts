import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { splitEqually } from '../lib/splitEqually.ts';

describe('splitEqually', () => {
  test('splits an evenly-divisible amount into equal shares', () => {
    const shares = splitEqually(900, ['A', 'B', 'C']);
    assert.deepEqual(shares, [
      { personId: 'A', amountCents: 300 },
      { personId: 'B', amountCents: 300 },
      { personId: 'C', amountCents: 300 },
    ]);
  });

  test('distributes leftover cents to the first participants in order', () => {
    const shares = splitEqually(1000, ['A', 'B', 'C']);
    assert.deepEqual(shares, [
      { personId: 'A', amountCents: 334 },
      { personId: 'B', amountCents: 333 },
      { personId: 'C', amountCents: 333 },
    ]);
  });

  test('a single participant gets the full amount', () => {
    assert.deepEqual(splitEqually(1234, ['A']), [{ personId: 'A', amountCents: 1234 }]);
  });

  test('conserves the total exactly regardless of how unevenly it divides', () => {
    const participants = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const shares = splitEqually(10000, participants);
    const total = shares.reduce((sum, s) => sum + s.amountCents, 0);
    assert.equal(total, 10000);
  });

  test('every share differs from any other by at most one cent', () => {
    const shares = splitEqually(1001, ['A', 'B', 'C', 'D']);
    const amounts = shares.map((s) => s.amountCents);
    assert.equal(Math.max(...amounts) - Math.min(...amounts) <= 1, true);
  });

  test('throws on a non-positive amount', () => {
    assert.throws(() => splitEqually(0, ['A', 'B']), /positive integer/);
    assert.throws(() => splitEqually(-50, ['A', 'B']), /positive integer/);
  });

  test('throws on a non-integer amount', () => {
    assert.throws(() => splitEqually(10.5, ['A', 'B']), /positive integer/);
  });

  test('throws on an empty participant list', () => {
    assert.throws(() => splitEqually(500, []), /must not be empty/);
  });

  test('throws on duplicate participant ids', () => {
    assert.throws(() => splitEqually(500, ['A', 'A']), /duplicates/);
  });
});
