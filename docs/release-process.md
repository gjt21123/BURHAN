# Release Process

BURHAN uses evidence-first release management.

## Versioning

The repository uses semantic versioning where practical. Before 1.0, minor releases may include interface changes, but release notes must call them out explicitly.

The authoritative project version is the root `package.json`.

## Release checklist

1. Update `CHANGELOG.md`.
2. Confirm the root version is the intended release version.
3. Run portable checks from a clean checkout:
   ```bash
   npm ci
   npm test
   npm run typecheck
   npm run build
   ```
4. On Windows, run the full deterministic verification suite:
   ```powershell
   npm run ci:verification
   ```
5. Confirm no tracked files changed as a side effect of verification:
   ```bash
   git diff --exit-code
   ```
6. Review dependency/security workflow results.
7. Create a signed or GitHub-verified tag when possible using `v<version>`.
8. Publish release notes that separate:
   - deterministic behavior;
   - provider-backed/live behavior;
   - experimental behavior;
   - known limitations.
9. Verify the release tag passes the release-gate workflow.

## Release evidence

Release notes should identify the commit and the deterministic checks used. Do not claim that a provider-backed run occurred unless the corresponding evidence exists.

## Security releases

For a security fix:

- coordinate disclosure according to `SECURITY.md`;
- add a regression test when feasible;
- avoid publishing exploit-enabling detail before users can update;
- document affected versions and mitigation clearly.

## Rollback

If a release produces a false `VERIFIED` condition, evidence corruption, or a material trust-boundary regression, treat it as a priority defect. Publish a corrective release or mark the affected release as unsafe as soon as the impact is confirmed.
