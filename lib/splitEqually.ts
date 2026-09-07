export interface Share {
  personId: string;
  amountCents: number;
}

/**
 * Splits an integer amount of cents evenly across participants. Since cents
 * don't always divide evenly, the leftover cents go one each to the first
 * `remainder` participants in the order given — callers should pass a
 * stable order (e.g. sorted by id) so results are deterministic.
 */
export function splitEqually(amountCents: number, participantIds: string[]): Share[] {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error(`amountCents must be a positive integer, got ${amountCents}`);
  }
  if (participantIds.length === 0) {
    throw new Error('participantIds must not be empty');
  }
  if (new Set(participantIds).size !== participantIds.length) {
    throw new Error('participantIds must not contain duplicates');
  }

  const n = participantIds.length;
  const base = Math.floor(amountCents / n);
  const remainder = amountCents - base * n;

  return participantIds.map((personId, index) => ({
    personId,
    amountCents: base + (index < remainder ? 1 : 0),
  }));
}
