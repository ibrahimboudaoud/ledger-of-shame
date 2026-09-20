import { createYoga } from 'graphql-yoga';
import { prisma } from '@/lib/prisma';
import { buildSchema } from '@/lib/graphql/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const yoga = createYoga({
  schema: buildSchema(prisma),
  graphqlEndpoint: '/api/graphql',
  graphiql: process.env.NODE_ENV !== 'production',
  fetchAPI: { Response },
});

// Next passes a route context ({ params }) that yoga doesn't use.
async function handler(request: Request): Promise<Response> {
  return yoga.handleRequest(request, {});
}

export { handler as GET, handler as POST, handler as OPTIONS };
