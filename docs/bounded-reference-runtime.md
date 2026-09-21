# Bounded candidate verification: payment reference profile

## Scope

`bounded_payment_reference_v1` migrates `packages/codex-runner/src/execution.ts` away from importing candidate modules into the verifier process. Candidate imports occur in a supervised subprocess using `runLocalCommand`. The static CLI profile and historical releases are unchanged.

This is a **reference service-contract check**, not generic external-repository orchestration, a port of every historical validator, or a hardened sandbox. The reference workspace still comes from BURHAN's payment example. The trusted host, filesystem, Node/Git installation and installed tsx loader are part of the trust boundary.

## Run sequence

1. Check the captured patch hash and size, approved contract hash and baseline manifest. Independently derive changed paths; candidate metadata cannot grant permission to edit tests or manifests.
2. Refuse changes to the real reference storage module as `REFERENCE_STORE_CHANGE_UNSUPPORTED`: service-only instrumentation must not silently approve an unverified storage implementation.
3. Create a separate reference workspace and verify its baseline matches the captured executor baseline before applying the patch.
4. Compile and reproduce the approved supported blueprint. Keep the compiler-pack hash independently and verify it before/after runtime probes.
5. Run positive and negative controls through the **same worker and parent comparison**. Cache only by the worker/config identity and probe inputs within the current process.
6. Execute the candidate in a bounded worker. Compare observations in the parent, not a worker-supplied verdict.
7. Require the workspace snapshot and pack identity to remain unchanged after each probe and at completion.
8. Write content-addressed parent-owned evidence outside the candidate workspace and bind its digest into the returned run seal.

The compiler's historical generated Vitest source and hash serialization remain unchanged. This profile **does not execute those generated files**: it executes a separately hashed fixed worker using validated supported blueprint parameters. The worker identity, runtime qualification and compiler-pack identity are distinct evidence fields. Ordinary original suites still run in CI.

## Measurements and protocol

The worker owns a frozen instrumented store with a private ledger. A candidate's replacement store module or `countCreated()` method is not accepted as the measurement source. For the declared input keys and amount, the parent requires the correct count and identity of created charges, complete requests and matching returned charges. The reference checks include twenty same-key concurrent calls, distinct-key independence and a sequential retry probe. Documentation checks require **all** approved terms.

The instrumented store tests the service's declared interaction contract; it does not establish the correctness of every candidate storage backend or execute the complete original Vitest regression suite against arbitrary storage implementations. Accordingly, the reference `src/payment-store.ts` must match the baseline. A change to that file is incomplete/unsupported, not accepted or mislabeled as a proven functional failure. Broader storage adapters need their own qualified runtime checks.

Each worker receives a unique random challenge through a private run request. The request is consumed and deleted before the subject is imported; failed request cleanup prevents import. Neither the challenge nor request filename remains in candidate argv. The parent accepts only one strict, challenge-bound observation frame. Duplicate JSON keys, extra frames/logs, invalid UTF-8, replayed output, an early zero exit and fabricated pass labels cannot complete that protocol.

Reporting captures required primitives before import and avoids candidate-controlled `toJSON`/stdout hooks. This blocks the tested ordinary in-process mutation cases; it is not protection against debuggers, native code, a compromised loader or a hostile process with the same host privileges. A challenge is a run-correlation mechanism, not cryptographic signer authentication.

## Limits and outcomes

Each probe has a deadline of at most 10 seconds, a combined stdout/stderr cap of 64 KiB and a parsed-frame limit of 32 KiB. The existing backend handles cancellation and ordinary-descendant cleanup. Missing, interrupted, ambiguous or cleanup-failed execution is `incomplete`. Complete measured contract failures are `rejected`; complete passing measurements are `verified` **only for this profile's declared checks**.

The reference snapshot is bounded to 2,048 files, 4,096 visited entries, depth 32, 1 MiB per file and 16 MiB total content. Links and special files are refused. Snapshot checks exclude root Git metadata, do not prevent transient modifications restored between inspections, and are not filesystem isolation. Raw local runner output can contain sensitive data and is not copied into shared evidence.

Extra subject stdout currently makes protocol output ambiguous and therefore incomplete. This conservative limitation is intentional; a future dedicated observation channel needs its own threat review and tests. Do not strip arbitrary candidate output until a result looks valid.

## Inspectable evidence

`ExecutionResult` includes `runtimeProfile`, `candidateImportedInParent: false`, `runtimeEvidenceHash`, a relative `runtimeEvidencePath`, `runtimeQualificationHash` and workspace/pack checks. A content-addressed JSON record lives beside, not inside, the verification workspace. It binds run identity, captured patch/baseline/pack, verdict and the safe per-check numeric observations. Existing conflicting files are not overwritten.

Raw candidate source, stdout/stderr, provider credentials and worker challenges are omitted. Relative paths and run IDs can still reveal project information; inspect before sharing. The evidence is local integrity data, not external attestation or proof of the maintainer's identity. Qualification hashes identify executed controls; they are not independent reviews.

## Compiler-pack validation

`verifyTrustedValidatorPack(path, expectedPackHash)` accepts an independently retained SHA-256 pin. It also checks manifest/file bindings, file sizes, unexpected entries and links. Updating a modified pack's adjacent checksum does not satisfy the retained pin. The one-argument API remains a consistency check for legacy callers, not approval identity.

## Reproduce and review

```bash
# No workspace dependencies are needed for the protocol/worker tests.
node --test packages/codex-runner/tests/reference-protocol.node.mjs

# Full checkout + locked development dependencies for integrations and matrices.
npm ci
npm test
npm run typecheck
npm run build
npm run ci:verification
npm run test:cli-package
node scripts/check-repository.mjs
```

The new regressions comprise **71 cases**: 44 dependency-free protocol/worker cases, 20 runtime orchestration cases, one unsupported-store-change regression and six compiler-pack cases. They include valid/invalid service behavior, hangs, early exits, forged output, object serialization mutation, post-run protected-file changes, baseline/patch mismatch and independently retained pack identity.

Read [PR #17](https://github.com/gjt21123/BURHAN/pull/17) for exact-commit results. The 44 dependency-free tests ran locally on Linux/Node 22; full repository and other-platform results come from GitHub-hosted CI. A passing fixture is not a live Codex/Claude experiment or an external adopter.

## Remaining Phase B work

[Issue #11](https://github.com/gjt21123/BURHAN/issues/11) remains open for generic repository/base/head/contract inputs, independently approved qualification bundles across the complete generic pipeline, portable capture/workspace construction and multiple independent runtime projects. Live adapters, reusable production CI integration and registry publication remain separate milestones.
