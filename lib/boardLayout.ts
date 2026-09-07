export interface CardPosition {
  x: number;
  y: number;
  rotation: number;
}

export const CARD_WIDTH = 150;
export const CARD_HEIGHT = 170;
const GAP_X = 70;
const GAP_Y = 80;
const MARGIN = 48;

/**
 * Deterministic pseudo-random in [-range, range], stable across server/client renders.
 * Uses only integer bit-mixing (Math.imul/xor/shift) rather than Math.sin: transcendental
 * functions are only spec'd to implementation-defined precision and can return different
 * bits on Node's V8 vs Chrome's V8, which broke SSR/hydration parity.
 */
export function seededJitter(seed: number, range: number): number {
  let x = Math.imul(Math.floor(seed * 1000) ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  const frac = (x >>> 0) / 4294967296;
  return (frac - 0.5) * 2 * range;
}

function columnsFor(total: number): number {
  return Math.max(1, Math.min(4, Math.ceil(Math.sqrt(Math.max(total, 1)))));
}

export function getCardPosition(index: number, total: number): CardPosition {
  const cols = columnsFor(total);
  const col = index % cols;
  const row = Math.floor(index / cols);

  const baseX = col * (CARD_WIDTH + GAP_X) + MARGIN;
  const baseY = row * (CARD_HEIGHT + GAP_Y) + MARGIN;

  return {
    x: baseX + seededJitter(index * 3.1 + 1, 16),
    y: baseY + seededJitter(index * 5.7 + 2, 12),
    rotation: seededJitter(index * 7.3 + 3, 6),
  };
}

export function getBoardSize(total: number): { width: number; height: number } {
  const cols = columnsFor(total);
  const rows = Math.max(1, Math.ceil(Math.max(total, 1) / cols));
  return {
    width: cols * (CARD_WIDTH + GAP_X) + MARGIN * 2,
    height: rows * (CARD_HEIGHT + GAP_Y) + MARGIN * 2,
  };
}

export function getPinAnchor(pos: CardPosition): { x: number; y: number } {
  return { x: pos.x + CARD_WIDTH / 2, y: pos.y + 6 };
}
