"use client";

import { useState, type FormEvent } from "react";
import { splitEqually } from "@/lib/splitEqually";
import type { PersonLite } from "@/lib/types";
import formStyles from "./FormNote.module.css";

export interface AddExpenseNoteProps {
  groupId: string;
  people: PersonLite[];
  onLogged: () => void;
}

export default function AddExpenseNote({ groupId, people, onLogged }: AddExpenseNoteProps) {
  const [open, setOpen] = useState(false);
  const [paidBy, setPaidBy] = useState(people[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [participantIds, setParticipantIds] = useState<string[]>(people.map((p) => p.id));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleParticipant(id: string) {
    setParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  function openForm() {
    setPaidBy(people[0]?.id ?? "");
    setParticipantIds(people.map((p) => p.id));
    setOpen(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const dollars = parseFloat(amount);
    if (!paidBy) {
      setError("Who paid?");
      return;
    }
    if (!Number.isFinite(dollars) || dollars <= 0) {
      setError("Enter a real amount.");
      return;
    }
    if (!participantIds.includes(paidBy)) {
      setError("The payer has to be one of the suspects splitting it.");
      return;
    }
    if (participantIds.length < 2) {
      setError("Pick at least one more suspect to split with.");
      return;
    }

    const amountCents = Math.round(dollars * 100);
    const orderedParticipants = people
      .filter((p) => participantIds.includes(p.id))
      .map((p) => p.id);

    const shares = splitEqually(amountCents, orderedParticipants);
    const debtsToCreate = shares.filter((s) => s.personId !== paidBy);

    setSubmitting(true);
    try {
      const results = await Promise.all(
        debtsToCreate.map((s) =>
          fetch(`/api/groups/${groupId}/debts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fromId: s.personId,
              toId: paidBy,
              amountCents: s.amountCents,
              description: description.trim() || undefined,
            }),
          })
        )
      );
      if (results.some((r) => !r.ok)) {
        throw new Error("a debt failed to file");
      }
    } catch {
      setError("Something didn't file right. Try again.");
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setAmount("");
    setDescription("");
    setOpen(false);
    onLogged();
  }

  if (!open) {
    return (
      <button className="note-button" onClick={openForm} disabled={people.length < 2}>
        File evidence
      </button>
    );
  }

  return (
    <form className={`torn-note ${formStyles.form} ${formStyles.wide}`} onSubmit={submit}>
      <h3 className="typewriter" style={{ fontSize: "0.9rem" }}>
        New expense
      </h3>

      <label className="field-label" htmlFor="paid-by">
        Paid by
      </label>
      <select
        id="paid-by"
        className="text-input"
        value={paidBy}
        onChange={(e) => setPaidBy(e.target.value)}
      >
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <label className="field-label" htmlFor="expense-amount">
        Amount ($)
      </label>
      <input
        id="expense-amount"
        className="text-input"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.00"
      />

      <label className="field-label" htmlFor="expense-desc">
        What for
      </label>
      <input
        id="expense-desc"
        className="text-input"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="groceries, rent, ..."
      />

      <span className="field-label">Split evenly between</span>
      <div className={formStyles.checkboxRow}>
        {people.map((p) => (
          <label key={p.id} className={formStyles.checkboxLabel}>
            <input
              type="checkbox"
              checked={participantIds.includes(p.id)}
              onChange={() => toggleParticipant(p.id)}
            />
            {p.name}
          </label>
        ))}
      </div>

      {error && <p className={formStyles.error}>{error}</p>}

      <div className={formStyles.actions}>
        <button type="submit" className="note-button" disabled={submitting}>
          {submitting ? "Filing..." : "File it"}
        </button>
        <button type="button" className="note-button" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
