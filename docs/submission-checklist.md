# Final submission checklist

## Human-supplied values

- [ ] `REPOSITORY_URL`
- [ ] `DEMO_URL`
- [ ] `VIDEO_URL`
- [ ] `DEVPOST_SUBMISSION_URL`
- [ ] `CODEX_FEEDBACK_SESSION_ID` if required

Do not invent any placeholder value.

## Repository and release

- [ ] Confirm repository visibility and license status.
- [ ] Confirm README, architecture, Devpost copy, video package, screenshots, and attribution are present.
- [ ] Run the complete deterministic validation matrix from README.
- [ ] Confirm `git diff --check` passes.
- [ ] Create and verify tag `submission-v1`.
- [ ] Confirm `git status --short` has no output after tagging.

## Evidence and honesty

- [ ] State that live Codex Architect and Executor evidence is historical and real.
- [ ] State that BURHAN independently issued the original `REJECTED` verdict.
- [ ] State `REPAIR_CONTEXT_UNAVAILABLE` for the original live same-thread repair limitation.
- [ ] State that the visible repair is a **DETERMINISTIC REPAIR DEMO**, not live Codex repair.
- [ ] State that GPT-5.6 live Platform API inference is not claimed because quota was unavailable.
- [ ] Describe local signatures only as **local artifact integrity**.

## Video and screenshots

- [ ] Record below three minutes using [demo-script.md](demo-script.md).
- [ ] Validate captions against [video-captions.srt](video-captions.srt).
- [ ] Capture all eight images from [screenshots.md](screenshots.md).
- [ ] Confirm `LIVE CODEX RUN`, `LIVE BURHAN VERIFICATION`, and `DETERMINISTIC REPAIR DEMO` are visibly distinct.

## Security and links

- [ ] Run the final secret/artifact audit.
- [ ] Confirm no API key, token, `.env`, private key, raw JSONL/stderr, protected path, hidden validator source, or private reasoning is included.
- [ ] Confirm every repository, demo, video, Devpost, and attribution link in a private browser window.
- [ ] Submit only after human review; this checklist does not submit Devpost automatically.
