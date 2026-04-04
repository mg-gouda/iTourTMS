# Contributing

Thank you for your interest in iTourTMS.

## Important Notice

This is **proprietary software**. Contributions are accepted only from authorized team members and approved collaborators.

## Development Setup

See the [Getting Started](https://github.com/mg-gouda/iTourTMS/wiki/Getting-Started) wiki page for full setup instructions.

```bash
pnpm install
pnpm docker:up
pnpm db:push && pnpm db:seed
pnpm license:generate
pnpm dev
```

## Branch Strategy

- `main` — Production-ready code
- Feature branches — `feat/description` for new features
- Fix branches — `fix/description` for bug fixes

## Commit Messages

Follow conventional commits:

```
feat: add new feature
fix: resolve bug
chore: maintenance task
docs: documentation update
refactor: code restructuring
```

## Code Standards

- **TypeScript** strict mode — zero type errors required
- **Prisma** — use `decimal.js` for financial math, never floating point
- **tRPC** — use appropriate procedure level (`moduleProcedure`, `permissionProcedure`, etc.)
- **UI** — shadcn/ui components, Tailwind CSS, `sonner` for toasts
- **Tables** — `@tanstack/react-table` with `id` + `accessorFn` (not dot-notation `accessorKey`)
- **Forms** — `react-hook-form` + `zod` resolver

## Testing

```bash
pnpm test:run       # Unit tests (vitest)
pnpm test:e2e       # E2E tests (Playwright)
pnpm lint           # ESLint
```

## Pull Requests

1. Create a feature/fix branch from `main`
2. Make your changes with clear commit messages
3. Ensure `pnpm build` passes with zero TypeScript errors
4. Open a PR with a description of changes and testing done
