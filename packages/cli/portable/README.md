# BURHAN portable CLI — 0.3.0-preview.1

A dependency-free, offline CLI for **maintainer-pinned static contracts on committed Git snapshots**. It works without BURHAN's history, payment fixture, Next.js, API keys or npm runtime dependencies.

This is the first portable adoption increment, **not a port of the complete runtime verifier**. `PASSED` means the declared static file predicates and change policy passed. It does not prove tests passed, business logic is correct, or agent execution was safe. Historical BURHAN runtime receipts use a different format.

## Install the tested tarball

Requirements: Node.js 22 or 24 and a maintained Git installation. Registry publication is deliberately disabled until package ownership and release provenance are reviewed. Do not use an unrelated public `npx burhan` package.

Given a reviewed tarball from this repository's CLI-distribution CI artifact:

```bash
npm install --global --offline --ignore-scripts /absolute/path/burhan-cli-0.3.0-preview.1.tgz
burhan doctor
```

For source use, run `node packages/cli/portable/bin/burhan.mjs --help` from the BURHAN checkout. You do not need `npm ci` for this profile. The existing runtime reference suite is still `npm run eval:burhan` from a full checkout with its development dependencies.

## Approve before accepting an agent's patch

1. Create and edit a draft outside the candidate repository.
2. Review the exact predicates and allowed/forbidden paths.
3. Seal against a full baseline commit with explicit `--approve`.
4. Retain the printed `sealHash` in a maintainer-controlled location. Never obtain the expected pin from the candidate or its report.
5. Verify a full candidate commit ID, not a dirty working tree or mutable branch name.

```bash
burhan init --out /trusted/review/contract.json
burhan contract validate --contract /trusted/review/contract.json
burhan contract seal --repo /work/project --base BASE_FULL_SHA --contract /trusted/review/contract.json --out /trusted/review/seal.json --approve
burhan verify --repo /work/project --head HEAD_FULL_SHA --seal /trusted/review/seal.json --expect-seal RETAINED_SHA256 --out /trusted/review/report.json
```

The uppercase values are placeholders. On PowerShell use Windows paths and variables; commands and flags are identical. The parent output directory must already exist. Files are created exclusively and never overwritten.

## Contract example

```json
{
  "schemaVersion": 1,
  "profile": "static_git_snapshot_v1",
  "title": "Preserve tests and document the retry API",
  "allowedPaths": ["src/**", "docs/**"],
  "forbiddenPaths": ["tests/**", ".github/**", "package.json", "package-lock.json"],
  "requireChanges": true,
  "checks": [
    { "id": "DOC-001", "kind": "textIncludes", "path": "docs/api.md", "value": "Idempotency-Key" },
    { "id": "CONFIG-001", "kind": "jsonEquals", "path": "src/config.json", "pointer": "/retry/enabled", "value": true }
  ]
}
```

Only exact paths, `directory/**` and `**` are supported; forbidden patterns take precedence. Paths are case-sensitive and must be portable. All additions, deletions and mode/content changes are checked; renames are naturally evaluated as changes to old and new paths.

Fixed predicates are `exists`, `absent`, `textIncludes` (literal, not regex), `jsonEquals` (RFC 6901 pointer and a scalar value) and `sha256`. Unknown fields and validator kinds are rejected. JSON input rejects duplicate keys, invalid UTF-8, excessive depth and unsafe numeric equality. A literal's presence is only a literal-presence check, not semantic verification.

## Results and integrity

Commands emit JSON (except help/version). Exit codes: **0** = command succeeded/static predicates passed, **1** = a declared predicate/policy rejected the snapshot, **2** = incomplete/invalid input/unavailable evidence/resource failure. A successful `report` or `receipt verify` command can display an originally rejected report; its exit 0 concerns reading/integrity, not candidate acceptance.

```bash
burhan report --file /trusted/review/report.json --expect-report RETAINED_REPORT_SHA256
burhan receipt verify --file /trusted/review/report.json --expect-report RETAINED_REPORT_SHA256
```

`INTEGRITY_MATCH` verifies content against the independent pin. It is **not a signature, identity claim, external attestation or rerun**. A hash stored beside an attacker-controlled artifact is not a trusted pin.

Reports identify the base/head commits, approved seal, predicates, changed paths, failures and deterministic digest, without copying file contents, literal values or absolute local paths. Relative filenames can still be sensitive; review reports before sharing.

## Boundaries and preview limits

No candidate code, checkout, package lifecycle scripts, smudge filters or provider calls run during verification. Reads use local immutable Git objects with replacement refs disabled, a sanitized subprocess environment, no shell, no fetching, operation timeouts and output bounds. The local host, Git binary, repository metadata and installed verifier remain trusted.

This profile checks **committed blobs only**. Dirty and untracked files are intentionally outside its scope and are left untouched. The baseline must be an ancestor of the candidate; missing shallow history fails closed. Fetch required objects yourself before offline verification.

Limits: 10,000 files per snapshot, 4 MiB tree listing, 1 MiB per checked content blob, 16 MiB total checked content, 64 predicates and 256 KiB contract/seal JSON and 4 MiB reports. Each Git operation has a 15-second bound. Symlinks, submodules, reserved/nonportable paths and case collisions are refused as incomplete, not followed. Ten primitive positive/negative self-checks do not establish semantic adequacy of your contract.

## Build and contribute

From the BURHAN source checkout:

```bash
node --test packages/cli/portable/tests/*.test.mjs
npm run test:cli-package
```

The distribution test packs the real allowlisted package, installs it offline outside the monorepo and verifies three independently initialized fixture repositories with both positive and negative controls. These are automated fixtures, **not external users or adoption claims**. The tarball, checksum and validation summary are in `reports/cli-distribution/`.

Report problems through the BURHAN GitHub repository. Security reports follow the root `SECURITY.md`. Licensed under Apache-2.0; see the included LICENSE.
