import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const groups = await prisma.group.findMany({
    orderBy: { createdAt: 'desc' },
    include: { people: true },
  });
  return NextResponse.json(groups);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const name = body?.name;
  const memberNames = body?.memberNames;

  if (typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  if (
    memberNames !== undefined &&
    (!Array.isArray(memberNames) ||
      !memberNames.every((n) => typeof n === 'string' && n.trim().length > 0))
  ) {
    return NextResponse.json(
      { error: 'memberNames must be an array of non-empty strings' },
      { status: 400 }
    );
  }

  const group = await prisma.group.create({
    data: {
      name: name.trim(),
      people: memberNames
        ? { create: memberNames.map((n: string) => ({ name: n.trim() })) }
        : undefined,
    },
    include: { people: true },
  });

  return NextResponse.json(group, { status: 201 });
}
