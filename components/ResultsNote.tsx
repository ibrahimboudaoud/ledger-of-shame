import type { SettlementLite } from "@/lib/types";
import styles from "./ResultsNote.module.css";

export interface ResultsNoteProps {
  settlements: SettlementLite[];
  nameById: Record<string, string>;
}

export default function ResultsNote({ settlements, nameById }: ResultsNoteProps) {
  if (settlements.length === 0) {
    return <div className={`stamp ${styles.closedStamp}`}>Case closed</div>;
  }

  return (
    <div className={`torn-note ${styles.note}`}>
      <h3 className="typewriter" style={{ fontSize: "0.85rem", marginBottom: 8 }}>
        Case file: settle up
      </h3>
      <ul className={styles.list}>
        {settlements.map((s, i) => (
          <li key={i} className={`typewriter ${styles.line}`}>
            {nameById[s.from] ?? "someone"} pays {nameById[s.to] ?? "someone"} — $
            {(s.amountCents / 100).toFixed(2)}
          </li>
        ))}
      </ul>
    </div>
  );
}
