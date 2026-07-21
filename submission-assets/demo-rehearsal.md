# Final demo rehearsal report

Date: local final handoff pass. Server stopped after rehearsal.

## Startup

- Actual production startup: `node node_modules/next/dist/bin/next start -p 3100` with working directory `apps/web`.
- Human-equivalent command: `npm run start --workspace @burhan/web -- -p 3100`.
- Local URL: `http://127.0.0.1:3100`.

## Observed results

| Demo action | Expected screen state | Observed result |
| --- | --- | --- |
| Load desktop page | Hero with BURHAN thesis and Compile action | HTTP 200; expected page content present. |
| Load mobile user-agent page | Same application remains available | HTTP 200. Visual mobile crop still requires the human capture pass. |
| Open sealed replay | Live evidence and original rejection | Covered by `npm run eval:submission-demo`: real live Architect/Executor evidence AVAILABLE and original verdict REJECTED. |
| View counterexample | Sanitized counterexample and approval gate | Covered by deterministic submission evaluation PASS. |
| Approve repair | Deterministic repair reaches VERIFIED | Covered by deterministic submission evaluation PASS. Browser-click automation was not installed, so this final visual click remains a recording-time manual check. |
| View proof details | SamePackProof and linked receipts visible | Covered by submission evaluation PASS. |
| Reset demo | Original rejected state restored | Production `POST /api/demo/reset` returned `RESET_COMPLETE`; deterministic submission evaluation reports reset PASS. |

## Mode labels

The release UI and submission evaluator retain the required labels: `LIVE CODEX RUN`, `LIVE BURHAN VERIFICATION`, and `DETERMINISTIC REPAIR DEMO`. The evaluator reports mode labels accurate: PASS.

## Recording risks

- No screen-capture/browser automation is installed locally; capture and the final approval-click visual check must be performed manually.
- No actual footage or narration audio exists yet. Do not claim a recorded video until those files exist.
- No provider command was run during rehearsal.
