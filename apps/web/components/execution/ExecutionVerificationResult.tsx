type ExecutionVerificationResultProps = {
  mode: "LIVE CODEX" | "CODEX FIXTURE";
  architectStatus: string;
  qualificationStatus: string;
  events: string[];
  agentClaim: string;
  verdict: "VERIFIED" | "REJECTED" | "INCOMPLETE";
};

export function ExecutionVerificationResult({ mode, architectStatus, qualificationStatus, events, agentClaim, verdict }: ExecutionVerificationResultProps) {
  return <section className="card" aria-label="Codex execution verification"><p className="eyebrow">BURHAN / {mode}</p><h2>{verdict}</h2><p>Architect: {architectStatus}</p><p>Qualification: {qualificationStatus}</p><p>Agent claim: {agentClaim}</p><p>Execution assurance: <code>LOCAL_TRUSTED</code></p><ul>{events.map((event) => <li key={event}>{event}</li>)}</ul></section>;
}
