import { seededJitter } from "./boardLayout";

export interface Point {
  x: number;
  y: number;
}

/** A control point offset perpendicular to the line, plus a little gravity sag, so strings don't look ruler-straight. */
export function getControlPoint(p1: Point, p2: Point, seed: number): Point {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;

  const perpX = -dy / len;
  const perpY = dx / len;
  const wobble = seededJitter(seed, len * 0.12);
  const sag = len * 0.08;

  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;

  return {
    x: midX + perpX * wobble,
    y: midY + perpY * wobble + sag,
  };
}

export function getBezierMidpoint(p1: Point, control: Point, p2: Point): Point {
  return {
    x: 0.25 * p1.x + 0.5 * control.x + 0.25 * p2.x,
    y: 0.25 * p1.y + 0.5 * control.y + 0.25 * p2.y,
  };
}

export function buildPathD(p1: Point, control: Point, p2: Point): string {
  return `M ${p1.x} ${p1.y} Q ${control.x} ${control.y} ${p2.x} ${p2.y}`;
}
