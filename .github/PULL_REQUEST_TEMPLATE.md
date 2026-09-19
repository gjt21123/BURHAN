## Problem

What problem does this change solve?

## Change

Describe the smallest relevant behavior change.

## Trust-boundary impact

- [ ] No trust-boundary change
- [ ] Changes untrusted input handling
- [ ] Changes protected artifacts or workspace isolation
- [ ] Changes validator qualification
- [ ] Changes evidence/verdict generation
- [ ] Changes provider execution/adapters
- [ ] Changes security or release infrastructure

Explain any checked item:

## Evidence

List deterministic tests, fixtures, negative controls, or manual reproduction steps.

```text
npm test
npm run typecheck
npm run build
```

Add any relevant evaluation commands/results.

## Documentation

- [ ] Public behavior is documented
- [ ] Threat model updated if assurance changed
- [ ] Changelog updated for user-visible behavior
- [ ] No documentation change required

## Safety / hygiene

- [ ] No credentials, private keys, private reasoning, or raw sensitive provider streams are included
- [ ] New dependencies are necessary and reviewed
- [ ] Failure behavior remains explicit and fail-closed where required
- [ ] UI/README claims do not exceed the assurance actually provided
