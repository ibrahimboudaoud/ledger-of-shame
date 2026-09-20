import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { graphql } from 'graphql';
import type { PrismaClient } from '@prisma/client';
import { buildSchema } from '../lib/graphql/schema.ts';

interface PersonRow {
  id: string;
  name: string;
  groupId: string;
}

interface DebtRow {
  id: string;
  groupId: string;
  fromId: string;
  toId: string;
  amountCents: number;
  description: string | null;
  createdAt: Date;
}

// Just enough of the Prisma client for the resolvers, backed by arrays.
function fakePrisma(people: PersonRow[], debts: DebtRow[] = []) {
  let nextId = 1;
  const client = {
    group: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        const groupPeople = people.filter((p) => p.groupId === where.id);
        if (groupPeople.length === 0) return null;
        return {
          id: where.id,
          name: `Case ${where.id}`,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          people: groupPeople,
          debts: debts.filter((d) => d.groupId === where.id),
        };
      },
    },
    person: {
      findMany: async ({ where }: { where: { id: { in: string[] }; groupId: string } }) =>
        people.filter((p) => where.id.in.includes(p.id) && p.groupId === where.groupId),
    },
    debt: {
      create: async ({ data }: { data: Omit<DebtRow, 'id' | 'createdAt' | 'description'> & { description?: string } }) => {
        const row: DebtRow = {
          id: `debt${nextId++}`,
          description: null,
          ...data,
          createdAt: new Date('2026-01-02T00:00:00Z'),
        } as DebtRow;
        debts.push(row);
        return row;
      },
    },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  };
  return { prisma: client as unknown as PrismaClient, debts };
}

const G = 'g1';
const people: PersonRow[] = ['A', 'B', 'C', 'D'].map((name) => ({ id: name, name, groupId: G }));
const outsider: PersonRow = { id: 'X', name: 'X', groupId: 'other' };

interface Result {
  data: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  errors: string[] | undefined;
}

// Round-trips through JSON: graphql-js returns null-prototype objects, which
// deepStrictEqual treats as different from plain ones.
async function run(
  prisma: PrismaClient,
  source: string,
  variableValues?: Record<string, unknown>
): Promise<Result> {
  const res = await graphql({ schema: buildSchema(prisma), source, variableValues });
  return {
    data: res.data ? JSON.parse(JSON.stringify(res.data)) : null,
    errors: res.errors?.map((e) => e.message),
  };
}

const ADD_EXPENSE = /* GraphQL */ `
  mutation ($groupId: ID!, $payerId: ID!, $amountCents: Int!, $participantIds: [ID!]!, $description: String) {
    addExpense(
      groupId: $groupId
      payerId: $payerId
      amountCents: $amountCents
      participantIds: $participantIds
      description: $description
    ) {
      fromId
      toId
      amountCents
      description
    }
  }
`;

const SETTLE_DEBT = /* GraphQL */ `
  mutation ($groupId: ID!, $fromId: ID!, $toId: ID!, $amountCents: Int!) {
    settleDebt(groupId: $groupId, fromId: $fromId, toId: $toId, amountCents: $amountCents) {
      fromId
      toId
      amountCents
    }
  }
`;

const GROUP = /* GraphQL */ `
  query ($id: ID!) {
    group(id: $id) {
      id
      name
      createdAt
      people { id name }
      debts { fromId toId amountCents createdAt }
      settlements { from to amountCents }
    }
  }
`;

describe('Query.group', () => {
  test('returns people, debts and settlements in one round trip', async () => {
    const { prisma } = fakePrisma(people, [
      { id: 'd1', groupId: G, fromId: 'A', toId: 'B', amountCents: 500, description: null, createdAt: new Date() },
    ]);
    const res = await run(prisma, GROUP, { id: G });
    assert.equal(res.errors, undefined);
    const group = res.data.group;
    assert.equal(group.people.length, 4);
    assert.equal(group.debts.length, 1);
    assert.equal(group.createdAt, '2026-01-01T00:00:00.000Z');
    assert.deepEqual(group.settlements, [{ from: 'A', to: 'B', amountCents: 500 }]);
  });

  test('returns null for an unknown group', async () => {
    const { prisma } = fakePrisma(people);
    const res = await run(prisma, GROUP, { id: 'nope' });
    assert.equal(res.errors, undefined);
    assert.equal(res.data.group, null);
  });

  test('a circular debt (A owes B, B owes C, C owes A) simplifies to no settlements', async () => {
    const debt = (id: string, fromId: string, toId: string): DebtRow => ({
      id, groupId: G, fromId, toId, amountCents: 1000, description: null, createdAt: new Date(),
    });
    const { prisma } = fakePrisma(people, [debt('d1', 'A', 'B'), debt('d2', 'B', 'C'), debt('d3', 'C', 'A')]);
    const res = await run(prisma, GROUP, { id: G });
    assert.equal(res.errors, undefined);
    const group = res.data.group;
    assert.equal(group.debts.length, 3);
    assert.deepEqual(group.settlements, []);
  });
});

describe('Mutation.addExpense', () => {
  test('splits evenly and records what each other participant owes the payer', async () => {
    const { prisma, debts } = fakePrisma(people);
    const res = await run(prisma, ADD_EXPENSE, {
      groupId: G, payerId: 'A', amountCents: 900, participantIds: ['A', 'B', 'C'],
    });
    assert.equal(res.errors, undefined);
    assert.deepEqual(res.data.addExpense, [
      { fromId: 'B', toId: 'A', amountCents: 300, description: null },
      { fromId: 'C', toId: 'A', amountCents: 300, description: null },
    ]);
    assert.equal(debts.length, 2);
  });

  test('uneven cents: the extra cent goes to the first participant by sorted id', async () => {
    const { prisma } = fakePrisma(people);
    // 1000 / 3 = 334, 333, 333 across A, B, C. D pays and is not a participant.
    const res = await run(prisma, ADD_EXPENSE, {
      groupId: G, payerId: 'D', amountCents: 1000, participantIds: ['C', 'A', 'B'],
    });
    assert.equal(res.errors, undefined);
    assert.deepEqual(
      res.data.addExpense.map((d: { fromId: string; amountCents: number }) => [d.fromId, d.amountCents]),
      [['A', 334], ['B', 333], ['C', 333]]
    );
  });

  test('uneven cents: shares always add up to the full amount', async () => {
    const { prisma } = fakePrisma(people);
    // 1001 / 4 = 251, 250, 250, 250. Payer D is a participant, so D's share is not recorded.
    const res = await run(prisma, ADD_EXPENSE, {
      groupId: G, payerId: 'D', amountCents: 1001, participantIds: ['A', 'B', 'C', 'D'],
    });
    assert.equal(res.errors, undefined);
    const rows = res.data.addExpense as Array<{ fromId: string; amountCents: number }>;
    assert.deepEqual(rows.map((d: { fromId: string; amountCents: number }) => [d.fromId, d.amountCents]), [['A', 251], ['B', 250], ['C', 250]]);
    assert.equal(rows.reduce((s: number, d: { amountCents: number }) => s + d.amountCents, 0) + 250, 1001);
  });

  test('skips zero-cent shares when the amount is smaller than the party', async () => {
    const { prisma } = fakePrisma(people);
    const res = await run(prisma, ADD_EXPENSE, {
      groupId: G, payerId: 'D', amountCents: 2, participantIds: ['A', 'B', 'C'],
    });
    assert.equal(res.errors, undefined);
    assert.deepEqual(
      res.data.addExpense.map((d: { fromId: string; amountCents: number }) => [d.fromId, d.amountCents]),
      [['A', 1], ['B', 1]]
    );
  });

  test('stores the description on each debt', async () => {
    const { prisma } = fakePrisma(people);
    const res = await run(prisma, ADD_EXPENSE, {
      groupId: G, payerId: 'A', amountCents: 600, participantIds: ['A', 'B'], description: 'pizza',
    });
    assert.equal(res.errors, undefined);
    assert.deepEqual(res.data.addExpense, [{ fromId: 'B', toId: 'A', amountCents: 300, description: 'pizza' }]);
  });

  test('rejects amounts <= 0', async () => {
    for (const amountCents of [0, -100]) {
      const { prisma, debts } = fakePrisma(people);
      const res = await run(prisma, ADD_EXPENSE, {
        groupId: G, payerId: 'A', amountCents, participantIds: ['A', 'B'],
      });
      assert.match(res.errors![0], /amountCents must be a positive integer/);
      assert.equal(debts.length, 0);
    }
  });

  test('rejects a payer or participant outside the group, and writes nothing', async () => {
    const { prisma, debts } = fakePrisma([...people, outsider]);
    const badParticipant = await run(prisma, ADD_EXPENSE, {
      groupId: G, payerId: 'A', amountCents: 900, participantIds: ['A', 'B', 'X'],
    });
    assert.match(badParticipant.errors![0], /must belong to this group/);

    const badPayer = await run(prisma, ADD_EXPENSE, {
      groupId: G, payerId: 'X', amountCents: 900, participantIds: ['A', 'B'],
    });
    assert.match(badPayer.errors![0], /must belong to this group/);
    assert.equal(debts.length, 0);
  });

  test('rejects empty and duplicate participants', async () => {
    const { prisma, debts } = fakePrisma(people);
    const empty = await run(prisma, ADD_EXPENSE, {
      groupId: G, payerId: 'A', amountCents: 900, participantIds: [],
    });
    assert.match(empty.errors![0], /must not be empty/);

    const dupes = await run(prisma, ADD_EXPENSE, {
      groupId: G, payerId: 'A', amountCents: 900, participantIds: ['B', 'B'],
    });
    assert.match(dupes.errors![0], /duplicates/);
    assert.equal(debts.length, 0);
  });

  test('rejects a non-integer amount at the schema level', async () => {
    const { prisma } = fakePrisma(people);
    const res = await run(prisma, ADD_EXPENSE, {
      groupId: G, payerId: 'A', amountCents: 10.5, participantIds: ['A', 'B'],
    });
    assert.ok(res.errors && res.errors.length > 0);
  });
});

describe('Mutation.settleDebt', () => {
  test('records the opposing debt', async () => {
    const { prisma, debts } = fakePrisma(people);
    const res = await run(prisma, SETTLE_DEBT, { groupId: G, fromId: 'A', toId: 'B', amountCents: 400 });
    assert.equal(res.errors, undefined);
    // A paid B, so B now "owes" A the same amount.
    assert.deepEqual(res.data.settleDebt, { fromId: 'B', toId: 'A', amountCents: 400 });
    assert.equal(debts.length, 1);
  });

  test('paying a debt in full leaves nothing to settle', async () => {
    const { prisma } = fakePrisma(people, [
      { id: 'd1', groupId: G, fromId: 'A', toId: 'B', amountCents: 1000, description: null, createdAt: new Date() },
    ]);
    await run(prisma, SETTLE_DEBT, { groupId: G, fromId: 'A', toId: 'B', amountCents: 1000 });
    const res = await run(prisma, GROUP, { id: G });
    assert.deepEqual(res.data.group.settlements, []);
  });

  test('a partial payment leaves the remainder', async () => {
    const { prisma } = fakePrisma(people, [
      { id: 'd1', groupId: G, fromId: 'A', toId: 'B', amountCents: 1000, description: null, createdAt: new Date() },
    ]);
    await run(prisma, SETTLE_DEBT, { groupId: G, fromId: 'A', toId: 'B', amountCents: 300 });
    const res = await run(prisma, GROUP, { id: G });
    assert.deepEqual(res.data.group.settlements, [{ from: 'A', to: 'B', amountCents: 700 }]);
  });

  test('rejects amounts <= 0', async () => {
    for (const amountCents of [0, -5]) {
      const { prisma, debts } = fakePrisma(people);
      const res = await run(prisma, SETTLE_DEBT, { groupId: G, fromId: 'A', toId: 'B', amountCents });
      assert.match(res.errors![0], /amountCents must be a positive integer/);
      assert.equal(debts.length, 0);
    }
  });

  test('rejects people outside the group', async () => {
    const { prisma, debts } = fakePrisma([...people, outsider]);
    const res = await run(prisma, SETTLE_DEBT, { groupId: G, fromId: 'A', toId: 'X', amountCents: 100 });
    assert.match(res.errors![0], /must belong to this group/);
    assert.equal(debts.length, 0);
  });

  test('rejects paying yourself', async () => {
    const { prisma, debts } = fakePrisma(people);
    const res = await run(prisma, SETTLE_DEBT, { groupId: G, fromId: 'A', toId: 'A', amountCents: 100 });
    assert.match(res.errors![0], /must differ/);
    assert.equal(debts.length, 0);
  });
});
