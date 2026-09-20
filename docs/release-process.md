# Release process

The root `package.json` defines the project version. Before 1.0, interfaces may change; release notes must distinguish compatibility changes, deterministic behavior, live-provider evidence and limitations.

## Required evidence

From a clean checkout, run `npm ci`, `npm run ci:portable`, `node scripts/check-repository.mjs` and `node scripts/smoke-web.mjs`. On Windows also run `npm run ci:verification`. Verify tracked files are unchanged and no unexpected untracked output remains. Review dependency audit and CodeQL results. A successful scan is not a security certification.

## One-time 0.2.0 preview

`publish-preview.yml` is restricted to a successful CI **push run on this repository's master branch**. It checks out that exact commit, requires a successful CodeQL push run for the same SHA, and publishes only version 0.2.0 as a prerelease. It never consumes PR artifacts, installs packages with write credentials, overwrites an existing release, or replaces an existing tag.

The publisher attaches a source ZIP, `SHA256SUMS` and `validation.json` with the exact commit and CI/scan URLs. Its token has write permission only in the publisher job. This record is not a signed SLSA attestation. No npm package is published.

GitHub-token-created tags/releases do not recursively start the tag workflow. The bootstrap preview is gated by the already completed full CI plus the exact-commit CodeQL check, not by an invented second tag run.

## Subsequent releases

1. Update the root version, lockfile metadata and changelog consistently.
2. Complete the validation above and review the final PR.
3. Create a signed or verified tag where supported, matching `v<version>`.
4. Confirm the tag-triggered Release Gate or an explicitly selected manual release-gate run passes.
5. Publish reviewed notes and exact-commit evidence; mark experimental releases as previews.

The bootstrap workflow intentionally does not publish later versions automatically. Never force-update a released tag or overwrite an asset with different bytes. Correct defects through a new version and clear advisory notes.

## Security and rollback

Follow [SECURITY.md](../SECURITY.md). A false acceptance, evidence corruption or material trust-boundary regression is a priority defect. Add a regression, identify the affected version and mitigation, and publish a corrective version. Do not claim that checks unavailable due to repository configuration were executed successfully.
