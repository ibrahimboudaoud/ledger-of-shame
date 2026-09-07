import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { people: true, debts: true },
  });

  if (!group) {
    return NextResponse.json({ error: 'group not found' }, { status: 404 });
  }

  return NextResponse.json(group);
}
