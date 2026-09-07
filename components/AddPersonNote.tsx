"use client";

import { useState, type FormEvent } from "react";
import type { PersonLite } from "@/lib/types";
import formStyles from "./FormNote.module.css";

export interface AddPersonNoteProps {
  groupId: string;
  onAdded: (person: PersonLite) => void;
}

export default function AddPersonNote({ groupId, onAdded }: AddPersonNoteProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    setError(null);

    const res = await fetch(`/api/groups/${groupId}/people`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Couldn't pin that suspect.");
      return;
    }

    const person: PersonLite = await res.json();
    onAdded(person);
    setName("");
    setOpen(false);
  }

  if (!open) {
    return (
      <button className="note-button" onClick={() => setOpen(true)}>
        Pin a suspect
      </button>
    );
  }

  return (
    <form className={`torn-note ${formStyles.form}`} onSubmit={submit}>
      <label className="field-label" htmlFor="new-person-name">
        Name
      </label>
      <input
        id="new-person-name"
        className="text-input"
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      {error && <p className={formStyles.error}>{error}</p>}
      <div className={formStyles.actions}>
        <button type="submit" className="note-button" disabled={submitting}>
          {submitting ? "Pinning..." : "Pin"}
        </button>
        <button type="button" className="note-button" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
