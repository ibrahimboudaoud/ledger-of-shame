import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { simplifyDebts } from '@/lib/simplifyDebts';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) {
    return NextResponse.json({ error: 'group not found' }, { status: 404 });
  }

  const debts = await prisma.debt.findMany({
    where: { groupId },
    select: { fromId: true, toId: true, amountCents: true },
  });

  const settlements = simplifyDebts(
    debts.map((d) => ({ from: d.fromId, to: d.toId, amountCents: d.amountCents }))
  );

  return NextResponse.json(settlements);
}
