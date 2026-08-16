#!/usr/bin/env bash
# Applies database migrations.
#
# Usage:
#   scripts/migrate.sh [up|down|status|reset]          # via goose (default)
#   scripts/migrate.sh up --psql                       # offline fallback
#
# The default path uses goose, which downloads the tool from the Go module
# proxy on first run. Where proxy.golang.org / sum.golang.org are
# unreachable, pass --psql: migrations are then applied through psql inside
# the running PostgreSQL container, with no downloads at all. The fallback
# writes to goose's own goose_db_version table, so a later `goose up` sees
# the same state and does not re-apply anything.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

. "$ROOT/scripts/common.sh"

MIGRATIONS_DIR="lib/migration/postgres"
GOOSE_VERSION="${GOOSE_VERSION:-v3.27.3}"

COMMAND="up"
MODE="goose"
for arg in "$@"; do
  case "$arg" in
    --psql) MODE="psql" ;;
    -*) echo "Unknown option: $arg" >&2; exit 1 ;;
    *) COMMAND="$arg" ;;
  esac
done

if [ ! -f .env ]; then
  echo "Error: .env not found in $ROOT" >&2
  echo "Create it first:  cp .env.example .env" >&2
  exit 1
fi

load_env .env
require_env DATABASE_USER DATABASE_PASSWORD DATABASE_NAME
DATABASE_HOST="${DATABASE_HOST:-localhost}"
DATABASE_PORT="${DATABASE_PORT:-5432}"
DATABASE_SSLMODE="${DATABASE_SSLMODE:-disable}"

# ---------------------------------------------------------------- goose ----
run_goose() {
  local dsn="host=${DATABASE_HOST} port=${DATABASE_PORT} user=${DATABASE_USER} password=${DATABASE_PASSWORD} dbname=${DATABASE_NAME} sslmode=${DATABASE_SSLMODE}"

  echo "==> goose $COMMAND on ${DATABASE_NAME}@${DATABASE_HOST}:${DATABASE_PORT}"
  if ! go run "github.com/pressly/goose/v3/cmd/goose@${GOOSE_VERSION}" \
       -dir "$MIGRATIONS_DIR" postgres "$dsn" "$COMMAND"; then
    echo >&2
    echo "goose failed. If the cause is an unreachable Go module proxy" >&2
    echo "(TLS handshake timeout on proxy.golang.org / sum.golang.org), either" >&2
    echo "configure a reachable proxy:" >&2
    echo "    go env -w GOPROXY=https://goproxy.io,direct" >&2
    echo "    go env -w GOSUMDB=sum.golang.google.cn" >&2
    echo "or apply the migrations without any download:" >&2
    echo "    ./scripts/migrate.sh $COMMAND --psql" >&2
    exit 1
  fi
}

# ----------------------------------------------------------------- psql ----
psql_query() {
  docker exec -i -e PGPASSWORD="$DATABASE_PASSWORD" -e PGCLIENTENCODING=UTF8 \
    "$CONTAINER" psql -U "$DATABASE_USER" -d "$DATABASE_NAME" -tAc "$1"
}

ensure_version_table() {
  # Same schema goose creates, so both paths share one source of truth.
  psql_query "CREATE TABLE IF NOT EXISTS goose_db_version (
      id SERIAL PRIMARY KEY,
      version_id BIGINT NOT NULL,
      is_applied BOOLEAN NOT NULL,
      tstamp TIMESTAMP NULL DEFAULT NOW()
    )" >/dev/null

  if [ "$(psql_query "SELECT COUNT(*) FROM goose_db_version")" = "0" ]; then
    psql_query "INSERT INTO goose_db_version (version_id, is_applied) VALUES (0, true)" >/dev/null
  fi
}

run_psql_migrations() {
  require_docker
  CONTAINER="$(detect_postgres_container)" || {
    echo "Error: no running PostgreSQL container found." >&2
    echo "Start one (make db) or set POSTGRES_CONTAINER in .env." >&2
    exit 1
  }
  echo "==> Applying migrations through psql in container '$CONTAINER'"

  ensure_version_table

  local applied=0 skipped=0 file version version_id
  for file in "$MIGRATIONS_DIR"/*.sql; do
    version="$(basename "$file" .sql)"
    version_id="${version%%_*}"

    if [ "$(psql_query "SELECT COUNT(*) FROM goose_db_version WHERE version_id = ${version_id} AND is_applied")" != "0" ]; then
      echo "    skip    $version (already applied)"
      skipped=$((skipped + 1))
      continue
    fi

    if ! awk '
        /^--[[:space:]]*\+goose[[:space:]]+Up/   { inup = 1; next }
        /^--[[:space:]]*\+goose[[:space:]]+Down/ { inup = 0; next }
        inup { print }
      ' "$file" | docker exec -i -e PGPASSWORD="$DATABASE_PASSWORD" -e PGCLIENTENCODING=UTF8 \
        "$CONTAINER" psql -U "$DATABASE_USER" -d "$DATABASE_NAME" \
        -v ON_ERROR_STOP=1 --single-transaction -q -f - ; then
      echo "Error: migration $version failed; nothing from it was committed." >&2
      exit 1
    fi

    psql_query "INSERT INTO goose_db_version (version_id, is_applied) VALUES (${version_id}, true)" >/dev/null
    echo "    OK      $version"
    applied=$((applied + 1))
  done

  echo "==> Done: $applied applied, $skipped already present"
}

show_psql_status() {
  require_docker
  CONTAINER="$(detect_postgres_container)" || exit 1
  ensure_version_table
  echo "==> Applied migrations (goose_db_version):"
  docker exec -i -e PGPASSWORD="$DATABASE_PASSWORD" "$CONTAINER" \
    psql -U "$DATABASE_USER" -d "$DATABASE_NAME" \
    -c "SELECT version_id, is_applied, tstamp FROM goose_db_version ORDER BY version_id"
}

# ------------------------------------------------------------------ main ---
if [ "$MODE" = "psql" ]; then
  case "$COMMAND" in
    up) run_psql_migrations ;;
    status) show_psql_status ;;
    *)
      echo "Error: --psql supports only 'up' and 'status'." >&2
      exit 1
      ;;
  esac
else
  run_goose
fi
