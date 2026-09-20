import { GraphQLError } from 'graphql';
import type { PrismaClient } from '@prisma/client';
import { simplifyDebts } from '../simplifyDebts.ts';
import { splitEqually } from '../splitEqually.ts';

interface DebtRow {
  id: string;
  groupId: string;
  fromId: string;
  toId: string;
  amountCents: number;
  description: string | null;
  createdAt: Date;
}

interface GroupRow {
  id: string;
  name: string;
  createdAt: Date;
  people: Array<{ id: string; name: string; groupId: string }>;
  debts: DebtRow[];
}

function userInputError(message: string): GraphQLError {
  return new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

function assertPositiveCents(amountCents: number): void {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw userInputError('amountCents must be a positive integer');
  }
}

async function assertPeopleInGroup(
  prisma: PrismaClient,
  groupId: string,
  personIds: string[]
): Promise<void> {
  const unique = [...new Set(personIds)];
  const found = await prisma.person.findMany({
    where: { id: { in: unique }, groupId },
    select: { id: true },
  });
  if (found.length !== unique.length) {
    throw userInputError('all people must belong to this group');
  }
}

export function createResolvers(prisma: PrismaClient) {
  return {
    Query: {
      group: (_root: unknown, args: { id: string }) =>
        prisma.group.findUnique({
          where: { id: args.id },
          include: { people: true, debts: true },
        }),
    },

    Group: {
      createdAt: (group: GroupRow) => group.createdAt.toISOString(),
      settlements: (group: GroupRow) =>
        simplifyDebts(
          group.debts.map((d) => ({ from: d.fromId, to: d.toId, amountCents: d.amountCents }))
        ),
    },

    Debt: {
      createdAt: (debt: DebtRow) => debt.createdAt.toISOString(),
    },

    Mutation: {
      addExpense: async (
        _root: unknown,
        args: {
          groupId: string;
          payerId: string;
          amountCents: number;
          participantIds: string[];
          description?: string | null;
        }
      ) => {
        const { groupId, payerId, amountCents, participantIds } = args;
        const description = args.description ?? undefined;

        assertPositiveCents(amountCents);
        if (participantIds.length === 0) {
          throw userInputError('participantIds must not be empty');
        }
        if (new Set(participantIds).size !== participantIds.length) {
          throw userInputError('participantIds must not contain duplicates');
        }
        await assertPeopleInGroup(prisma, groupId, [payerId, ...participantIds]);

        // Sorted so leftover cents land on the same people every time.
        const shares = splitEqually(amountCents, [...participantIds].sort());

        // The payer's own share is not a debt, and a zero-cent share
        // (amount smaller than the number of participants) isn't one either.
        const owed = shares.filter((s) => s.personId !== payerId && s.amountCents > 0);

        return prisma.$transaction(
          owed.map((s) =>
            prisma.debt.create({
              data: {
                groupId,
                fromId: s.personId,
                toId: payerId,
                amountCents: s.amountCents,
                description,
              },
            })
          )
        );
      },

      settleDebt: async (
        _root: unknown,
        args: { groupId: string; fromId: string; toId: string; amountCents: number }
      ) => {
        const { groupId, fromId, toId, amountCents } = args;

        assertPositiveCents(amountCents);
        if (fromId === toId) {
          throw userInputError('fromId and toId must differ');
        }
        await assertPeopleInGroup(prisma, groupId, [fromId, toId]);

        // `fromId` paid `toId`, so record the opposite debt (toId owes fromId)
        // to bring their net balance back toward zero.
        return prisma.debt.create({
          data: { groupId, fromId: toId, toId: fromId, amountCents },
        });
      },
    },
  };
}
