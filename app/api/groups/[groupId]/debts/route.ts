import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const debts = await prisma.debt.findMany({
    where: { groupId },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(debts);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const body = await request.json().catch(() => null);
  const fromId = body?.fromId;
  const toId = body?.toId;
  const amountCents = body?.amountCents;
  const description = body?.description;

  if (typeof fromId !== 'string' || typeof toId !== 'string') {
    return NextResponse.json({ error: 'fromId and toId are required' }, { status: 400 });
  }
  if (fromId === toId) {
    return NextResponse.json({ error: 'fromId and toId must differ' }, { status: 400 });
  }
  if (typeof amountCents !== 'number' || !Number.isInteger(amountCents) || amountCents <= 0) {
    return NextResponse.json(
      { error: 'amountCents must be a positive integer' },
      { status: 400 }
    );
  }
  if (description !== undefined && typeof description !== 'string') {
    return NextResponse.json({ error: 'description must be a string' }, { status: 400 });
  }

  const [from, to] = await Promise.all([
    prisma.person.findUnique({ where: { id: fromId } }),
    prisma.person.findUnique({ where: { id: toId } }),
  ]);

  if (!from || from.groupId !== groupId || !to || to.groupId !== groupId) {
    return NextResponse.json(
      { error: 'fromId and toId must belong to this group' },
      { status: 400 }
    );
  }

  const debt = await prisma.debt.create({
    data: { groupId, fromId, toId, amountCents, description },
  });

  return NextResponse.json(debt, { status: 201 });
}
