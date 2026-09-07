import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CaseBoard from "@/components/CaseBoard";

export default async function CasePage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { people: true, debts: true },
  });

  if (!group) {
    notFound();
  }

  return (
    <CaseBoard
      groupId={group.id}
      groupName={group.name}
      initialPeople={group.people.map((p) => ({ id: p.id, name: p.name }))}
      initialDebts={group.debts.map((d) => ({
        fromId: d.fromId,
        toId: d.toId,
        amountCents: d.amountCents,
      }))}
    />
  );
}
