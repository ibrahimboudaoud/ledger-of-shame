import { getControlPoint, getBezierMidpoint, buildPathD, type Point } from "@/lib/stringPath";

export type StringPhase = "idle" | "leaving" | "entering";

export interface StringLineProps {
  from: Point;
  to: Point;
  amountCents: number;
  seed: number;
  phase: StringPhase;
}

export default function StringLine({ from, to, amountCents, seed, phase }: StringLineProps) {
  const control = getControlPoint(from, to, seed);
  const mid = getBezierMidpoint(from, control, to);
  const d = buildPathD(from, control, to);

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const approxLength = Math.sqrt(dx * dx + dy * dy) * 1.08;

  const fading = phase === "leaving";
  const entering = phase === "entering";

  return (
    <g style={{ opacity: fading ? 0 : 1, transition: "opacity 0.45s ease" }}>
      <path
        d={d}
        fill="none"
        stroke="var(--string-red)"
        strokeWidth={2.5}
        strokeLinecap="round"
        style={{
          strokeDasharray: approxLength,
          strokeDashoffset: entering ? approxLength : 0,
          animation: entering ? "string-draw-in 0.7s ease forwards" : undefined,
        }}
      />
      <foreignObject x={mid.x - 30} y={mid.y - 12} width={60} height={26} style={{ overflow: "visible" }}>
        <div className="tag-label">${(amountCents / 100).toFixed(2)}</div>
      </foreignObject>
    </g>
  );
}
