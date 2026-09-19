# Security Policy

BURHAN is security-sensitive software because it separates untrusted agent output from verification evidence. Security reports are welcome and should be handled carefully.

## Supported versions

Until the first stable release, security fixes target the current `master` branch and the most recent tagged release, when one exists.

| Version | Supported |
| --- | --- |
| `master` | Yes |
| latest release | Yes |
| older snapshots | Best effort only |

## Reporting a vulnerability

Please **do not open a public GitHub issue** for a vulnerability.

Preferred reporting path:

1. Open the repository's **Security** tab.
2. Choose **Report a vulnerability** / a private security advisory when available.
3. Include a minimal reproduction, affected component, expected impact, and any suggested mitigation.

If private reporting is unavailable, contact the maintainer through the GitHub profile associated with this repository and avoid publishing exploit details until a coordinated fix is available.

## Scope of interest

Examples include:

- escaping protected-path or workspace restrictions;
- tampering with sealed contracts, validator packs, evidence, or receipt chains;
- causing a false `VERIFIED` verdict;
- bypassing validator qualification;
- command or path injection;
- unsafe handling of untrusted repositories or generated files;
- leakage of credentials or provider data;
- privilege escalation in local execution;
- signature, hashing, or canonicalization weaknesses;
- supply-chain vulnerabilities in privileged verification paths.

## Important assurance boundary

BURHAN's current `local_trusted` mode is **not a hardened sandbox** and does not claim protection against:

- a compromised host;
- an administrator/root attacker;
- arbitrary malware containment;
- complete network isolation;
- kernel-level attacks;
- a mathematical proof of arbitrary program correctness.

A report that demonstrates a mismatch between a documented assurance claim and actual behavior is still valuable.

## Disclosure process

Maintainers aim to:

1. acknowledge a valid report;
2. reproduce and assess severity;
3. prepare a fix and regression test;
4. coordinate a release or advisory;
5. credit the reporter unless anonymity is requested.

Timelines depend on severity and maintainer availability. Please avoid public disclosure before a fix or coordinated disclosure date is agreed.

## Secrets

Never include real API keys, access tokens, private keys, customer data, or provider credentials in an issue, pull request, fixture, screenshot, or evidence bundle.
