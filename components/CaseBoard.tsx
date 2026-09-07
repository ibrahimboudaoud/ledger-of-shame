"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import PersonCard from "./PersonCard";
import StringLine, { type StringPhase } from "./StringLine";
import AddPersonNote from "./AddPersonNote";
import AddExpenseNote from "./AddExpenseNote";
import ResultsNote from "./ResultsNote";
import { getBoardSize, getCardPosition, getPinAnchor } from "@/lib/boardLayout";
import type { PersonLite, RawDebtLite, SettlementLite } from "@/lib/types";
import styles from "./CaseBoard.module.css";

export interface CaseBoardProps {
  groupId: string;
  groupName: string;
  initialPeople: PersonLite[];
  initialDebts: RawDebtLite[];
}

interface Edge {
  key: string;
  fromId: string;
  toId: string;
  amountCents: number;
}

function netPairwiseEdges(people: PersonLite[], debts: RawDebtLite[]): Edge[] {
  const indexOf = new Map(people.map((p, i) => [p.id, i]));
  const net = new Map<string, number>();

  for (const d of debts) {
    const fi = indexOf.get(d.fromId);
    const ti = indexOf.get(d.toId);
    if (fi === undefined || ti === undefined) continue;

    const [lo, hi, sign] = fi < ti ? [d.fromId, d.toId, 1] : [d.toId, d.fromId, -1];
    const key = `${lo}|${hi}`;
    net.set(key, (net.get(key) ?? 0) + sign * d.amountCents);
  }

  const edges: Edge[] = [];
  for (const [key, amount] of net) {
    if (amount === 0) continue;
    const [a, b] = key.split("|");
    edges.push(
      amount > 0
        ? { key, fromId: a, toId: b, amountCents: amount }
        : { key, fromId: b, toId: a, amountCents: -amount }
    );
  }
  return edges;
}

function netBalances(people: PersonLite[], debts: RawDebtLite[]): Record<string, number> {
  const balances: Record<string, number> = {};
  for (const p of people) balances[p.id] = 0;
  for (const d of debts) {
    balances[d.fromId] = (balances[d.fromId] ?? 0) - d.amountCents;
    balances[d.toId] = (balances[d.toId] ?? 0) + d.amountCents;
  }
  return balances;
}

function hashKey(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return hash;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function CaseBoard({
  groupId,
  groupName,
  initialPeople,
  initialDebts,
}: CaseBoardProps) {
  const [people, setPeople] = useState<PersonLite[]>(initialPeople);
  const [debts, setDebts] = useState<RawDebtLite[]>(initialDebts);
  const [settlements, setSettlements] = useState<SettlementLite[] | null>(null);
  const [mode, setMode] = useState<"raw" | "settled">("raw");
  const [animPhase, setAnimPhase] = useState<StringPhase>("idle");
  const [cracking, setCracking] = useState(false);

  const positions = useMemo(
    () => people.map((_, i) => getCardPosition(i, people.length)),
    [people]
  );
  const boardSize = useMemo(() => getBoardSize(people.length), [people.length]);
  const anchorById = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    people.forEach((p, i) => map.set(p.id, getPinAnchor(positions[i])));
    return map;
  }, [people, positions]);

  const balances = useMemo(() => netBalances(people, debts), [people, debts]);
  const primeSuspectId = useMemo(() => {
    let worst: string | null = null;
    let worstAmount = 0;
    for (const [id, amount] of Object.entries(balances)) {
      if (amount < worstAmount) {
        worstAmount = amount;
        worst = id;
      }
    }
    return worst;
  }, [balances]);

  const rawEdges = useMemo(() => netPairwiseEdges(people, debts), [people, debts]);
  const settlementEdges: Edge[] = useMemo(
    () =>
      (settlements ?? []).map((s) => ({
        key: `${s.from}|${s.to}`,
        fromId: s.from,
        toId: s.to,
        amountCents: s.amountCents,
      })),
    [settlements]
  );

  const edgesToShow = mode === "raw" ? rawEdges : settlementEdges;

  const nameById = useMemo(() => {
    const map: Record<string, string> = {};
    people.forEach((p) => (map[p.id] = p.name));
    return map;
  }, [people]);

  async function refreshGroup() {
    const res = await fetch(`/api/groups/${groupId}`);
    if (!res.ok) return;
    const group = await res.json();
    setPeople(group.people.map((p: PersonLite) => ({ id: p.id, name: p.name })));
    setDebts(
      group.debts.map((d: RawDebtLite) => ({
        fromId: d.fromId,
        toId: d.toId,
        amountCents: d.amountCents,
      }))
    );
    setSettlements(null);
    setMode("raw");
    setAnimPhase("idle");
  }

  async function crackTheCase() {
    if (cracking) return;
    setCracking(true);
    setAnimPhase("leaving");
    await delay(480);

    const res = await fetch(`/api/groups/${groupId}/settlements`);
    const result: SettlementLite[] = res.ok ? await res.json() : [];
    setSettlements(result);
    setMode("settled");
    setAnimPhase("entering");

    await delay(700);
    setAnimPhase("idle");
    setCracking(false);
  }

  return (
    <div className="frame">
      <div className={styles.topBar}>
        <Link href="/" className={styles.backLink}>
          &larr; all cases
        </Link>
        <h1 className={`typewriter ${styles.caseTitle}`}>{groupName}</h1>
        <button
          className="note-button"
          onClick={() => {
            void crackTheCase();
          }}
          disabled={cracking || people.length === 0}
        >
          Crack the case
        </button>
      </div>

      <div className={`corkboard ${styles.corkboard}`}>
        <div className={styles.controls}>
          <AddPersonNote groupId={groupId} onAdded={() => void refreshGroup()} />
          <AddExpenseNote groupId={groupId} people={people} onLogged={() => void refreshGroup()} />
        </div>

        <div className={styles.boardScroll}>
          <div
            className={styles.board}
            style={{ width: boardSize.width, height: boardSize.height }}
          >
            <svg className={styles.svgLayer} width={boardSize.width} height={boardSize.height}>
              {edgesToShow.map((edge) => {
                const from = anchorById.get(edge.fromId);
                const to = anchorById.get(edge.toId);
                if (!from || !to) return null;
                return (
                  <StringLine
                    key={edge.key}
                    from={from}
                    to={to}
                    amountCents={edge.amountCents}
                    seed={hashKey(edge.key)}
                    phase={animPhase}
                  />
                );
              })}
            </svg>

            {people.map((p, i) => (
              <PersonCard
                key={p.id}
                name={p.name}
                position={positions[i]}
                netCents={balances[p.id] ?? 0}
                isPrimeSuspect={p.id === primeSuspectId}
              />
            ))}

            {people.length === 0 && (
              <p className={styles.emptyBoard}>No suspects pinned yet. Pin one to get started.</p>
            )}
          </div>
        </div>

        {mode === "settled" && animPhase === "idle" && (
          <div className={styles.results}>
            <ResultsNote settlements={settlements ?? []} nameById={nameById} />
          </div>
        )}
      </div>
    </div>
  );
}
