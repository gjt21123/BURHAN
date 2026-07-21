"use client";

import { useMemo, useState } from "react";

type Clause = {
  id: string;
  group: "Must become true" | "Must remain true" | "Must never happen";
  statement: string;
  evidence: string;
};

const clauses: Clause[] = [
  {
    id: "OUT-001",
    group: "Must become true",
    statement: "Twenty concurrent requests using the same idempotency key create exactly one charge.",
    evidence: "Deterministic concurrency test",
  },
  {
    id: "OUT-002",
    group: "Must become true",
    statement: "Different idempotency keys continue creating independent charges.",
    evidence: "Integration test",
  },
  {
    id: "DOC-001",
    group: "Must become true",
    statement: "The API documentation explains the Idempotency-Key header.",
    evidence: "Documentation check",
  },
  {
    id: "INV-001",
    group: "Must remain true",
    statement: "Existing checkout behavior remains passing.",
    evidence: "Regression suite",
  },
  {
    id: "PRO-001",
    group: "Must never happen",
    statement: "Files under db/migrations/** change.",
    evidence: "Baseline diff",
  },
  {
    id: "PRO-002",
    group: "Must never happen",
    statement: "Existing tests or dependency manifests change.",
    evidence: "Baseline manifest diff",
  },
];

export default function Home() {
  const [task, setTask] = useState(
    "Fix payment retries so twenty concurrent requests using the same idempotency key create exactly one charge.",
  );
  const [reviewing, setReviewing] = useState(false);
  const [sealed, setSealed] = useState(false);
  const [repairApproved, setRepairApproved] = useState(false);
  const [repairExecuted, setRepairExecuted] = useState(false);
  const [resetStatus, setResetStatus] = useState<"idle" | "resetting" | "complete" | "failed">("idle");
  const groupedClauses = useMemo(
    () => ["Must become true", "Must remain true", "Must never happen"] as const,
    [],
  );

  async function resetDemo() {
    setResetStatus("resetting");
    try {
      const response = await fetch("/api/demo/reset", { method: "POST" });
      if (!response.ok) throw new Error("Reset failed");
      setRepairApproved(false);
      setRepairExecuted(false);
      setResetStatus("complete");
    } catch {
      setResetStatus("failed");
    }
  }

  if (!reviewing) {
    return (
      <main className="shell">
        <section className="hero">
          <p className="eyebrow">BURHAN / DEFINE</p>
          <h1>Agents don’t say done.<br />They prove it.</h1>
          <p className="lede">Compile a bounded coding task into an independently verifiable proof contract.</p>
        </section>
        <section className="card define-card">
          <label htmlFor="task">What must the agent accomplish?</label>
          <textarea id="task" value={task} onChange={(event) => setTask(event.target.value)} rows={5} />
          <label htmlFor="restrictions">What must it never do?</label>
          <div id="restrictions" className="restrictions">Do not modify <code>db/migrations/**</code> · Do not modify tests or dependency manifests</div>
          <button onClick={() => setReviewing(true)}>Compile Proof Contract <span>→</span></button>
        </section>
      </main>
    );
  }

  if (sealed) return (
    <main className="shell">
      <section className="card"><p className="eyebrow">LIVE CODEX RUN</p><h1>BURHAN rejected the empty candidate</h1><p>Architect completed · Validators qualified · Executor completed · Agent claim: INVALID · Original patch: EMPTY</p><p className="seal">LIVE BURHAN VERIFICATION / REJECTED</p></section>
      <section className="card"><p className="eyebrow">COUNTEREXAMPLE</p><h2>Concurrent idempotency remains unsatisfied</h2><p>Expected one charge for twenty concurrent same-key requests. Observed: baseline behavior fails the deterministic outcome.</p><p>Hidden validator details withheld · One repair attempt maximum</p><button disabled={repairApproved || resetStatus === "resetting"} onClick={() => { setRepairApproved(true); setRepairExecuted(true); setResetStatus("idle"); }}>{repairApproved ? "Repair approved" : "Approve Repair"}</button></section>
      <section className="card"><p className="eyebrow">DETERMINISTIC REPAIR DEMO</p><h2>{repairExecuted ? "Fresh verification / VERIFIED" : "Awaiting human approval"}</h2><p>Approval recorded: {repairApproved ? "YES" : "PENDING"} · Same contract: YES · Same Validator Pack: YES · SamePackProof: VERIFIED</p><p>{repairExecuted ? "Complete patch captured · Fresh verification workspace · Attempt 1 and Attempt 2 receipts verified" : "Receipt status: NOT GENERATED · The original BURHAN verdict remains REJECTED"}</p><button className="secondary" disabled={resetStatus === "resetting"} onClick={resetDemo}>{resetStatus === "resetting" ? "RESETTING" : "Reset demo"}</button>{resetStatus === "complete" && <p className="seal">RESET COMPLETE</p>}{resetStatus === "failed" && <p className="seal">RESET FAILED</p>}</section>
    </main>
  );
  return (
    <main className="shell">
      <header className="review-header">
        <div>
          <p className="eyebrow">BURHAN / REVIEW</p>
          <h1>Payment retry idempotency</h1>
          <p>Draft contract derived from the requested outcome.</p>
        </div>
        <div className={sealed ? "seal sealed" : "seal"}>{sealed ? "SEALED" : "DRAFT"}</div>
      </header>
      <section className="contract-grid">
        {groupedClauses.map((group) => (
          <article className="card clause-group" key={group}>
            <h2>{group}</h2>
            {clauses.filter((clause) => clause.group === group).map((clause) => (
              <div className="clause" key={clause.id}>
                <span>{clause.id}</span>
                <p>{clause.statement}</p>
                <small>{clause.evidence}</small>
              </div>
            ))}
          </article>
        ))}
        <article className="card clause-group ambiguity">
          <h2>Cannot yet be verified</h2>
          <p>None identified in this focused demo.</p>
        </article>
      </section>
      <footer className="review-actions">
        <button className="secondary" onClick={() => setReviewing(false)}>Back to Define</button>
        <button onClick={() => setSealed(true)} disabled={sealed}>{sealed ? "Contract sealed" : "Seal Contract"}</button>
      </footer>
      {sealed && <p className="sealed-message">Contract hash is reserved for the trusted runner in the next milestone.</p>}
    </main>
  );
}
