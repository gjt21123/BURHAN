# Screenshot capture runbook

The listed captures have been generated from the local production app at `http://127.0.0.1:3100` using a 1440×900 desktop viewport and a 390×844 mobile viewport. This remains the manual recapture procedure if a replacement is needed. Hide browser chrome where practical and crop to the application viewport only.

| File | State and click sequence | Required label | Crop and caption |
| --- | --- | --- | --- |
| `01-hero.png` | Fresh page; no clicks. | `BURHAN / PROOF-CARRYING WORK` | Hero plus task field. Caption: “Agents should prove completion, not merely claim it.” |
| `02-qualified-validators.png` | Click `Compile Proof Contract`. | `Must become true`, `Must remain true`, `Must never happen` | Contract clause groups. Caption: “Validators are qualified against the sealed task contract.” |
| `03-live-codex.png` | From sealed view, show first replay card. | `LIVE CODEX RUN` | First card only. Caption: “Historical live Codex evidence.” |
| `04-rejected.png` | Same state. | `LIVE BURHAN VERIFICATION / REJECTED` | Verdict badge, agent claim, and empty patch. Caption: “BURHAN independently rejects the empty candidate.” |
| `05-counterexample.png` | Scroll to second card before approval. | `SANITIZED COUNTEREXAMPLE`, `APPROVE REPAIR` | Counterexample plus button. Caption: “Human approval gates one repair.” |
| `06-deterministic-repair.png` | Before approval, scroll to the repair card. | `DETERMINISTIC REPAIR DEMO`, `ORIGINAL VERDICT / REJECTED` | Repair card header. Caption: “This repair proof is deterministic, not live.” |
| `07-verified.png` | Remain after approval. | `FRESH VERIFICATION / VERIFIED` | Verdict badge and evidence row. Caption: “Fresh verification determines VERIFIED.” |
| `08-linked-receipts.png` | Remain after approval. | `SamePackProof: VERIFIED`, `Receipts: LINKED` | Evidence chips. Caption: “Same validator standard and linked local-artifact-integrity receipts.” |
| `09-mobile-overview.png` | Optional; repeat sealed view at 390×844. | `LIVE CODEX RUN` and `DETERMINISTIC REPAIR DEMO` | Vertical overview. Caption: “The proof flow remains readable on mobile.” |
| `10-reset-complete.png` | Click `RESET DEMO` after approval. | `RESET COMPLETE` | Repair card after reset. Caption: “The replay returns safely to the original rejected state.” |

Do not capture terminals, paths, environment values, credentials, raw JSONL, hidden validator source, private reasoning, or browser account information. After the final capture, click `RESET DEMO` and confirm `RESET COMPLETE` before closing the app.
