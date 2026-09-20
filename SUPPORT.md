# Support

BURHAN is an early open-source project. Community support is best effort.

## Where to ask for help

Use GitHub Issues when you have:

- a reproducible bug;
- a documentation problem;
- a feature request;
- an interoperability proposal;
- a verification result that appears inconsistent with the documented trust model.

Before opening an issue, search existing issues and include:

- operating system and Node.js version;
- BURHAN commit or release;
- command executed;
- expected behavior;
- actual behavior;
- minimal reproducible input;
- relevant logs with secrets removed.

## Security reports

Do not use a public issue for suspected vulnerabilities. Follow [SECURITY.md](SECURITY.md).

## Provider-specific failures

When a live provider call fails, separate:

1. provider/API availability;
2. authentication/quota;
3. adapter behavior;
4. deterministic BURHAN verification.

BURHAN's deterministic test suite should remain runnable without external provider credentials.

## No warranty or SLA

The project is provided under the Apache License 2.0 without an uptime, response-time, or support SLA.
