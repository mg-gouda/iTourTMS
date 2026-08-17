#!/usr/bin/env bash
# Deploy main to the demo box (demo.itmseg.cloud).
#
# Build BEFORE swapping: a failed build then leaves the running container
# serving, so a broken commit cannot take the site down.
#
# Usage: scripts/deploy-demo.sh [--with-migration]
set -euo pipefail

HOST="${DEMO_HOST:-root@145.223.96.34}"
ROOT="/opt/itmseg-demo"
HEALTH="http://127.0.0.1:8002/login"
WITH_MIGRATION="${1:-}"

run() { ssh -o StrictHostKeyChecking=no "$HOST" "$@"; }

echo "==> Fetching main"
run "cd $ROOT/app && git fetch origin --prune && git reset --hard origin/main && git log --oneline -1"

if [ "$WITH_MIGRATION" = "--with-migration" ]; then
  echo "==> Backing up the database first"
  run "mkdir -p $ROOT/backups && cd $ROOT && \
       docker compose exec -T postgres pg_dump -U \"\$POSTGRES_USER\" \"\${POSTGRES_DB:-itour_tms}\" \
         > $ROOT/backups/pre-deploy-\$(date +%Y%m%d-%H%M%S).sql && \
       ls -lh $ROOT/backups | tail -3"

  # Production tracks migrations but its schema was pushed past them with
  # `db push`, so the repo's catch-up migration fails on tables that already
  # exist. Generate the real delta instead and apply it in a transaction.
  echo "==> Generating schema delta"
  run "cd $ROOT/app && npx prisma migrate diff \
        --from-url \"\$DATABASE_URL\" \
        --to-schema-datamodel prisma/schema.prisma \
        --script > /tmp/delta.sql && cat /tmp/delta.sql"

  echo "==> Review the delta above. Applying inside a transaction."
  run "cd $ROOT && (echo 'BEGIN;'; cat /tmp/delta.sql; echo 'COMMIT;') | \
       docker compose exec -T postgres psql -U \"\$POSTGRES_USER\" -d \"\${POSTGRES_DB:-itour_tms}\" -v ON_ERROR_STOP=1"

  run "cd $ROOT/app && npx prisma migrate resolve --applied 20260817120000_scope_account_tag_to_company || true"
fi

echo "==> Building (running container keeps serving)"
run "cd $ROOT && docker compose build app"

echo "==> Swapping app + reloading nginx (nginx.conf changed)"
run "cd $ROOT && docker compose up -d app && docker compose exec -T nginx nginx -s reload 2>/dev/null || docker compose restart nginx"

echo "==> Health check"
for i in $(seq 1 20); do
  code=$(run "curl -s -o /dev/null -w '%{http_code}' $HEALTH" || echo 000)
  echo "   attempt $i: HTTP $code"
  [ "$code" = "200" ] && { echo "==> Deploy OK"; exit 0; }
  sleep 5
done

echo "==> Health check never returned 200. Recent app logs:" >&2
run "cd $ROOT && docker compose logs --tail 60 app" >&2
exit 1
