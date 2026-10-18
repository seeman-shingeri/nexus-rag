# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

The NEXUS team takes security, privacy, and unauthorized access vulnerabilities seriously.
If you discover a security vulnerability within NEXUS, please follow responsible disclosure:

1. **Do Not Open a Public Issue**: Do not discuss vulnerabilities or publish proof-of-concept exploits publicly on GitHub Issues.
2. **Contact Directly**: Email the project maintainers at `seemanshingeri@gmail.com` with the subject line `[SECURITY] NEXUS Vulnerability Report`.
3. **Include Details**:
   - Component affected (API, Authentication, RAG engine, Vision feed, Storage).
   - Step-by-step reproduction instructions.
   - Potential impact and threat vector.
   - Recommended remediation if known.

We will acknowledge receipt within 48 hours and work on a coordinated fix.

## Core Security Safeguards in NEXUS

- **Role-Based Access Control (RBAC)**: Enforced server-side on all endpoints.
- **Strict Evidence Isolation**: Snapshots and documents are access-controlled by user roles.
- **Zero Facial Recognition**: NEXUS does not employ biometric identification or personal trait profiling.
- **Prompt Injection Defense**: Document content retrieved via RAG is sanitized and isolated using delimited prompt blocks to prevent jailbreaks.
- **Deterministic Rule Enforcement**: Free-form LLM outputs are never permitted to actuate physical systems or trigger emergency actions autonomously.
