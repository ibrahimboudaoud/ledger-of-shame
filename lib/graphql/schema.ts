import { createSchema } from 'graphql-yoga';
import type { PrismaClient } from '@prisma/client';
import { typeDefs } from './typeDefs.ts';
import { createResolvers } from './resolvers.ts';

export function buildSchema(prisma: PrismaClient) {
  return createSchema({ typeDefs, resolvers: createResolvers(prisma) });
}
