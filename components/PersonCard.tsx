import type { CardPosition } from "@/lib/boardLayout";
import { getPinAnchor } from "@/lib/boardLayout";
import styles from "./PersonCard.module.css";

function formatCents(cents: number): string {
  return `$${(Math.abs(cents) / 100).toFixed(2)}`;
}

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export interface PersonCardProps {
  name: string;
  position: CardPosition;
  netCents: number;
  isPrimeSuspect: boolean;
}

export default function PersonCard({ name, position, netCents, isPrimeSuspect }: PersonCardProps) {
  const anchor = getPinAnchor(position);

  const balanceLabel =
    netCents < 0
      ? `owes ${formatCents(netCents)}`
      : netCents > 0
        ? `is owed ${formatCents(netCents)}`
        : "settled up";

  const balanceClass =
    netCents < 0 ? styles.owes : netCents > 0 ? styles.owed : styles.even;

  return (
    <>
      <div
        className={`polaroid-card ${styles.card}`}
        style={{
          left: position.x,
          top: position.y,
          transform: `rotate(${position.rotation}deg)`,
        }}
      >
        {isPrimeSuspect && <span className={`stamp ${styles.suspectStamp}`}>Prime suspect</span>}
        <div className={styles.mugshot}>
          <span className={styles.initials}>{initialsOf(name)}</span>
        </div>
        <div className={styles.name}>{name}</div>
        <div className={`${styles.balance} ${balanceClass}`}>{balanceLabel}</div>
      </div>
      <div className="pushpin" style={{ left: anchor.x, top: anchor.y }} />
    </>
  );
}
