<!-- Mirror of /opt/itmseg-demo/CLAUDE.md on the demo box (demo.itmseg.cloud).
     That file is what Claude Code actually loads when working there; this copy
     exists so the runbook is version-controlled and survives the box. Kept in
     sync by hand — update both, or neither. -->

# iTourTMS — production host instructions

This box serves the **live demo**: https://demo.itmseg.cloud

It also runs **itour-reservation** (ResLite) and **fulvago**. Touch only the
`itmseg-demo-*` containers.

## Standing instruction: finish every change end to end

**This is not optional and it has no "code only" exemption.** Anything that
touches this project — application code, a Prisma migration, a Dockerfile, a
compose file, an nginx vhost, an env var, a cron entry, a one-line typo fix —
is carried all the way through:

> **verify → commit → push → deploy → verify live**

Work is not done when it compiles, when the diff looks right, or when the
migration applied. It is done when the change is on `origin/main` **and**
running on https://demo.itmseg.cloud **and** you have re-checked it there.

### Definition of done — every box, every time

- [ ] **Verify** — the change does what it claims, checked locally first.
- [ ] **Commit** — in `/opt/itmseg-demo/app`, with a message saying *why*.
- [ ] **Push** — `git push origin main`, and confirm `origin/main` moved.
      A commit that exists only on this box is **not** delivered.
- [ ] **Deploy** — `docker compose build app` **then** `up -d app`; build
      before swapping so a failed build leaves the live container serving.
- [ ] **Verify live** — hit the real URL and confirm the new behaviour. A 200
      on `/login` proves the box is up, not that your change shipped.

### Do not stop halfway

A partial deploy is worse than no deploy. Two failure modes have actually
happened here, both from stopping early:

- **Migration applied, app never rebuilt** (2026-08-18). The database was
  moved ahead of code that was still the old image, leaving the schema and
  the running app out of step. If a change has a migration *and* a code half,
  **both** ship, in the same session.
- **Commit never pushed** (`fd5b701`). It lived only on this box for two
  months and was nearly lost to `git reset --hard origin/main`; it survives
  as `archive/server-fd5b701`. If a push is blocked, say so loudly and point
  a branch at the commit so the next deploy cannot orphan it.

If you genuinely cannot finish a step — no credential, a blocked command, an
ambiguous call that is the user's to make — **stop and say exactly which box
is unticked and why.** Never report a change as done with a step outstanding,
and never let a blocked step silently end the task.

### Where changes are made

Changes are made in the repo and arrive here by deploy — do **not** edit files
under `/opt/itmseg-demo/app` directly *except* to commit and push them. That
checkout is reset to `origin/main` on every deploy, so uncommitted local edits
are lost.

Config that lives outside the repo still counts as a change and still has to
be mirrored into it. The host nginx vhost
(`/etc/nginx/conf.d/itmseg-demo.conf`) is mirrored at
`docker/nginx-demo-host.conf`; edit the host file, `nginx -t`, reload, **and**
commit the mirror. Note this box has **no nginx compose service** — nginx is
the host's systemd nginx, so reload it with `systemctl reload nginx`.

## Layout

| Thing | Path |
|---|---|
| Compose project | `/opt/itmseg-demo` (`docker-compose.yml`) |
| App checkout | `/opt/itmseg-demo/app` (tracks `origin/main`) |
| Env | `/opt/itmseg-demo/app/.env` |
| Uploads (bind mount) | `/opt/itmseg-demo/uploads` |
| Backups | `/opt/itmseg-demo/backups` |
| Containers | `itmseg-demo-app-1`, `-postgres-1`, `-pgbouncer-1`, `-redis-1` |
| App port | `127.0.0.1:8002`, behind nginx |

## Deploy

```bash
cd /opt/itmseg-demo/app && git fetch origin --prune && git reset --hard origin/main
cd /opt/itmseg-demo && docker compose build app    # running container keeps serving
docker compose up -d app
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8002/login   # expect 200
docker logs --tail 30 itmseg-demo-app-1            # expect no MODULE_NOT_FOUND
```

Build **before** swapping: a failed build then leaves the live container running.
If a deploy breaks the site, restore service first and fix forward second.

## Database rule

This database tracks migrations in `_prisma_migrations`, but its schema was
pushed past them with `db push`. **Never run the repo's catch-up migration
here** — it fails on tables that already exist. To apply a schema change:

```bash
# 1. back up first
docker exec itmseg-demo-postgres-1 pg_dump -U itour -d itour_tms --clean --if-exists \
  | gzip > /opt/itmseg-demo/backups/itour_tms-$(date +%Y%m%d-%H%M%S).sql.gz

# 2. compute the real delta against the new schema
docker run --rm --network itmseg-demo_itmseg_net -v /opt/itmseg-demo/app:/app -w /app \
  --env-file /opt/itmseg-demo/app/.env node:22-alpine \
  node node_modules/prisma/build/index.js migrate diff \
  --from-config-datasource --to-schema ./prisma/schema.prisma --script > /tmp/delta.sql

# 3. apply it as one transaction, then align the history
#    (wrap /tmp/delta.sql in BEGIN; ... COMMIT; before running psql -f)
#    then: prisma migrate resolve --applied <migration_name>
```

## Known risk

`app/.git/config` embeds a GitHub personal access token in the remote URL.
Rotate it and switch to a deploy key.
