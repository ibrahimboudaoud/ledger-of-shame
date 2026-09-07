"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./CreateCaseForm.module.css";

export default function CreateCaseForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [members, setMembers] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Every case needs a name.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const memberNames = members
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);

    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), memberNames }),
    });

    if (!res.ok) {
      setError("Couldn't open the case. Try again.");
      setSubmitting(false);
      return;
    }

    const group = await res.json();
    router.push(`/case/${group.id}`);
  }

  return (
    <form className={`torn-note ${styles.form}`} onSubmit={handleSubmit}>
      <h2 className={styles.heading}>Open a new case</h2>

      <label className="field-label" htmlFor="case-name">
        Case name
      </label>
      <input
        id="case-name"
        className="text-input"
        placeholder="e.g. Cabin Trip 2026"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <label className="field-label" htmlFor="case-members">
        Suspects (comma separated, optional)
      </label>
      <input
        id="case-members"
        className="text-input"
        placeholder="Alice, Bob, Carol"
        value={members}
        onChange={(e) => setMembers(e.target.value)}
      />

      {error && <p className={styles.error}>{error}</p>}

      <button type="submit" className="note-button" disabled={submitting}>
        {submitting ? "Filing paperwork..." : "Pin it to the board"}
      </button>
    </form>
  );
}
