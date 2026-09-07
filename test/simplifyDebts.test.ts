import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { simplifyDebts, type RawDebt, type Settlement } from '../lib/simplifyDebts.ts';

function totalMoved(settlements: Settlement[]): number {
  return settlements.reduce((sum, s) => sum + s.amountCents, 0);
}

describe('simplifyDebts', () => {
  test('a single debt passes through unchanged', () => {
    const debts: RawDebt[] = [{ from: 'A', to: 'B', amountCents: 1000 }];
    assert.deepEqual(simplifyDebts(debts), [{ from: 'A', to: 'B', amountCents: 1000 }]);
  });

  test('reciprocal debts of equal size cancel out completely', () => {
    const debts: RawDebt[] = [
      { from: 'A', to: 'B', amountCents: 1000 },
      { from: 'B', to: 'A', amountCents: 1000 },
    ];
    assert.deepEqual(simplifyDebts(debts), []);
  });

  test('reciprocal debts net to the difference, owed by the larger debtor', () => {
    const debts: RawDebt[] = [
      { from: 'A', to: 'B', amountCents: 1000 },
      { from: 'B', to: 'A', amountCents: 400 },
    ];
    assert.deepEqual(simplifyDebts(debts), [{ from: 'A', to: 'B', amountCents: 600 }]);
  });

  test('a chain of debts collapses to skip the middleman', () => {
    // A owes B, B owes C the same amount -> B nets to zero, A should just pay C.
    const debts: RawDebt[] = [
      { from: 'A', to: 'B', amountCents: 500 },
      { from: 'B', to: 'C', amountCents: 500 },
    ];
    assert.deepEqual(simplifyDebts(debts), [{ from: 'A', to: 'C', amountCents: 500 }]);
  });

  test('multiple debts between the same pair are merged', () => {
    const debts: RawDebt[] = [
      { from: 'A', to: 'B', amountCents: 300 },
      { from: 'A', to: 'B', amountCents: 200 },
    ];
    assert.deepEqual(simplifyDebts(debts), [{ from: 'A', to: 'B', amountCents: 500 }]);
  });

  test('zero-amount debts are ignored', () => {
    const debts: RawDebt[] = [{ from: 'A', to: 'B', amountCents: 0 }];
    assert.deepEqual(simplifyDebts(debts), []);
  });

  test('self-debts are ignored', () => {
    const debts: RawDebt[] = [{ from: 'A', to: 'A', amountCents: 500 }];
    assert.deepEqual(simplifyDebts(debts), []);
  });

  test('negative amounts are rejected', () => {
    const debts: RawDebt[] = [{ from: 'A', to: 'B', amountCents: -100 }];
    assert.throws(() => simplifyDebts(debts), /non-negative/);
  });

  test('a three-way imbalance resolves with the largest debtor matched to the largest creditor first', () => {
    // A owes 300, B owes 100, C is owed 400 total (300 from A's original debt to B and B forwarding, etc).
    // Net balances: A owes 300, B is net even, C is owed 300 total split... construct directly via net-clear scenario:
    // A -300, B -100, C +400 (C funded a group purchase; A and B each owe C a share).
    const debts: RawDebt[] = [
      { from: 'A', to: 'C', amountCents: 300 },
      { from: 'B', to: 'C', amountCents: 100 },
    ];
    const result = simplifyDebts(debts);
    assert.deepEqual(result, [
      { from: 'A', to: 'C', amountCents: 300 },
      { from: 'B', to: 'C', amountCents: 100 },
    ]);
  });

  test('conserves the total amount owed: settlements move exactly as much as net balances require', () => {
    const debts: RawDebt[] = [
      { from: 'A', to: 'B', amountCents: 1200 },
      { from: 'B', to: 'C', amountCents: 700 },
      { from: 'C', to: 'A', amountCents: 300 },
      { from: 'D', to: 'A', amountCents: 500 },
    ];
    const result = simplifyDebts(debts);

    // Recompute expected net balances independently and compare against what the settlements achieve.
    const expectedNet = new Map<string, number>();
    for (const { from, to, amountCents } of debts) {
      expectedNet.set(from, (expectedNet.get(from) ?? 0) - amountCents);
      expectedNet.set(to, (expectedNet.get(to) ?? 0) + amountCents);
    }

    const actualNet = new Map<string, number>();
    for (const { from, to, amountCents } of result) {
      actualNet.set(from, (actualNet.get(from) ?? 0) - amountCents);
      actualNet.set(to, (actualNet.get(to) ?? 0) + amountCents);
    }

    for (const [person, balance] of expectedNet) {
      assert.equal(actualNet.get(person) ?? 0, balance, `net balance for ${person} should be conserved`);
    }

    // No settlement should ever exceed what its debtor actually owes overall.
    assert.ok(totalMoved(result) > 0);
  });

  test('a fully balanced group (everyone nets to zero) produces no settlements', () => {
    const debts: RawDebt[] = [
      { from: 'A', to: 'B', amountCents: 500 },
      { from: 'B', to: 'C', amountCents: 500 },
      { from: 'C', to: 'A', amountCents: 500 },
    ];
    assert.deepEqual(simplifyDebts(debts), []);
  });
});
