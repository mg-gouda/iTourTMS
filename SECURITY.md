# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | Yes       |

## Reporting a Vulnerability

If you discover a security vulnerability in iTourTMS, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please contact the project maintainers directly with:

1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Suggested fix (if any)

## Security Measures

iTourTMS implements the following security measures:

- **Authentication:** Auth.js v5 with bcrypt password hashing (12 salt rounds)
- **Authorization:** Role-based access control (RBAC) with permission codes
- **License gating:** All API calls blocked when license expires
- **HTTP headers:** HSTS, X-Frame-Options DENY, CSP, referrer policy
- **Input validation:** Zod schemas on all tRPC mutations
- **HTML sanitization:** isomorphic-dompurify for user content
- **Multi-tenancy:** All data scoped by companyId, no cross-tenant access
- **Secrets:** License keys and API keys stored as bcrypt hashes only
- **Connection pooling:** PgBouncer prevents connection exhaustion

## Dependencies

We monitor dependencies for known vulnerabilities. If you notice a vulnerable dependency, please report it.
