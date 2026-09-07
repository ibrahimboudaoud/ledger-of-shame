export interface RawDebt {
  from: string;
  to: string;
  amountCents: number;
}

export interface Settlement {
  from: string;
  to: string;
  amountCents: number;
}

/**
 * Collapses a list of raw pairwise debts into the minimum-ish set of
 * settlement transactions needed to zero everyone out, by netting each
 * person's balance and greedily matching the largest debtor against the
 * largest creditor. This is the standard "optimal account balancing"
 * heuristic (Splitwise-style) — not provably minimal in every case
 * (that variant is NP-hard), but minimal transaction count is not the
 * point here; a debt-free group is.
 */
export function simplifyDebts(debts: RawDebt[]): Settlement[] {
  const balances = new Map<string, number>();

  for (const { from, to, amountCents } of debts) {
    if (amountCents < 0) {
      throw new Error(`amountCents must be non-negative, got ${amountCents}`);
    }
    if (from === to || amountCents === 0) {
      continue;
    }
    balances.set(from, (balances.get(from) ?? 0) - amountCents);
    balances.set(to, (balances.get(to) ?? 0) + amountCents);
  }

  const debtors: Array<{ id: string; amount: number }> = [];
  const creditors: Array<{ id: string; amount: number }> = [];

  for (const [id, balance] of balances) {
    if (balance < 0) debtors.push({ id, amount: -balance });
    else if (balance > 0) creditors.push({ id, amount: balance });
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements: Settlement[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.amount, creditor.amount);

    settlements.push({ from: debtor.id, to: creditor.id, amountCents: amount });

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount === 0) i++;
    if (creditor.amount === 0) j++;
  }

  return settlements;
}
