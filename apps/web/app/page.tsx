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
  const resetting = resetStatus === "resetting";

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

  function approveRepair() {
    setRepairApproved(true);
    setRepairExecuted(true);
    setResetStatus("idle");
  }

  if (!reviewing) {
    return (
      <main className="shell">
        <p className="product-mark">BURHAN <span>PROOF-CARRYING WORK</span></p>
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
    <main className="shell demo-shell">
      <header className="demo-header">
        <div>
          <p className="product-mark">BURHAN <span>SUBMISSION REPLAY</span></p>
          <h1>One claim. Independent proof.</h1>
          <p>Live execution is historical evidence. Repair below is an explicitly deterministic demonstration.</p>
        </div>
        <div className="mode-legend" aria-label="Demo modes"><span className="mode live">LIVE EVIDENCE</span><span className="mode deterministic">DETERMINISTIC DEMO</span></div>
      </header>
      <ol className="demo-progress" aria-label="Proof flow">
        <li className="complete">Live run</li><li className="complete">Rejected</li><li className="complete">Counterexample</li><li className={repairApproved ? "complete" : "active"}>Approve repair</li><li className={repairExecuted ? "complete" : "pending"}>Fresh verification</li><li className={repairExecuted ? "complete" : "pending"}>Linked receipts</li>
      </ol>
      <section className="demo-flow">
        <article className="stage-card live-stage">
          <div className="stage-number">01</div>
          <div className="stage-copy"><p className="eyebrow">LIVE CODEX RUN</p><h2>BURHAN rejected the empty candidate</h2><p>Architect completed, validators qualified, and the Executor completed. BURHAN captured an empty patch and issued the verdict.</p><div className="evidence-row"><span>Agent claim: INVALID</span><span>Patch: EMPTY</span><span>Fresh verification: COMPLETE</span></div></div>
          <p className="verdict rejected">LIVE BURHAN VERIFICATION <strong>REJECTED</strong></p>
        </article>
        <article className="stage-card counterexample-stage">
          <div className="stage-number">02</div>
          <div className="stage-copy"><p className="eyebrow">SANITIZED COUNTEREXAMPLE</p><h2>Concurrent idempotency remains unsatisfied</h2><p>Expected one charge for twenty concurrent requests using the same key. The deterministic outcome still fails.</p><p className="stage-note">Validator source is withheld · One repair attempt maximum · Human approval required</p></div>
          <button disabled={repairApproved || resetting} onClick={approveRepair}>{repairApproved ? "REPAIR APPROVED" : "APPROVE REPAIR"}</button>
        </article>
        <article className="stage-card repair-stage">
          <div className="stage-number">03</div>
          <div className="stage-copy"><p className="eyebrow">DETERMINISTIC REPAIR DEMO</p><h2>{repairExecuted ? "Fresh verification completed" : "Awaiting human approval"}</h2><p>{repairExecuted ? "The deterministic repair is verified in a fresh workspace with the same contract and validator pack." : "The original rejection remains authoritative until a human approves the deterministic repair demo."}</p><div className="evidence-row"><span>Approval: {repairApproved ? "RECORDED" : "PENDING"}</span><span>SamePackProof: VERIFIED</span><span>Receipts: {repairExecuted ? "LINKED" : "NOT GENERATED"}</span></div></div>
          <div className="repair-actions"><p className={repairExecuted ? "verdict verified" : "verdict pending"}>{repairExecuted ? "FRESH VERIFICATION / VERIFIED" : "ORIGINAL VERDICT / REJECTED"}</p><button className="secondary" disabled={resetting} onClick={resetDemo}>{resetting ? "RESETTING" : "RESET DEMO"}</button><p className="reset-message" aria-live="polite">{resetStatus === "complete" ? "RESET COMPLETE · Back to the original rejected state" : resetStatus === "failed" ? "RESET FAILED · Original evidence remains unchanged" : ""}</p></div>
        </article>
      </section>
    </main>
  );
  return (
    <main className="shell">
      <p className="product-mark">BURHAN <span>PROOF-CARRYING WORK</span></p>
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
