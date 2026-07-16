type QualificationResultProps = {
  status: "qualified" | "rejected" | "incomplete";
  positiveAccepted: number;
  positiveTotal: number;
  negativeRejected: number;
  negativeTotal: number;
  falseAccepts: number;
  falseRejects: number;
  discriminationScore: number;
  packHash: string | null;
};

export function QualificationResult({ status, positiveAccepted, positiveTotal, negativeRejected, negativeTotal, falseAccepts, falseRejects, discriminationScore, packHash }: QualificationResultProps) {
  return (
    <section className="card" aria-label="Validator qualification result">
      <p className="eyebrow">BURHAN / VALIDATOR QUALIFICATION</p>
      <h2>{status.toUpperCase()}</h2>
      <p>Positive controls: {positiveAccepted} / {positiveTotal}</p>
      <p>Negative controls: {negativeRejected} / {negativeTotal}</p>
      <p>False accepts: {falseAccepts}</p>
      <p>False rejects: {falseRejects}</p>
      <p>Discrimination score: {discriminationScore}%</p>
      <p>Pack hash: <code>{packHash ?? "Not sealed"}</code></p>
    </section>
  );
}
