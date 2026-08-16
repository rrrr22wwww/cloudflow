#!/usr/bin/env bash
# Runs the integration test suite against a disposable test database.
# Works on Linux, macOS and Windows (Git Bash / MINGW64).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

. "$ROOT/scripts/common.sh"

TEST_DB="${TEST_DB:-cloudflow_test}"

# --- 1. Environment ---------------------------------------------------------
if [ ! -f .env ]; then
  echo "Error: .env not found in $ROOT" >&2
  echo "Create it first:  cp .env.example .env" >&2
  echo "Then set DATABASE_PASSWORD and JWT_SECRET inside it." >&2
  exit 1
fi

load_env .env
require_env DATABASE_USER DATABASE_PASSWORD DATABASE_NAME
DATABASE_PORT="${DATABASE_PORT:-5432}"

# --- 2. Docker --------------------------------------------------------------
require_docker

# Reuse an already running PostgreSQL container when there is one, so a
# pre-existing setup is not duplicated and does not fight over the host port.
# Override with POSTGRES_CONTAINER in .env.
if CONTAINER="$(detect_postgres_container)"; then
  echo "==> Using running container '$CONTAINER'"
else
  echo "==> Starting PostgreSQL via docker-compose.dev.yml"
  docker compose -f docker-compose.dev.yml up -d
  CONTAINER="cloudflow-postgres"
fi

# --- 3. Wait for readiness --------------------------------------------------
# 'compose up -d' returns as soon as the container is created, not when
# PostgreSQL is ready to accept connections.
echo -n "==> Waiting for PostgreSQL to accept connections"
ready=0
for _ in $(seq 1 60); do
  if docker exec "$CONTAINER" pg_isready -U "$DATABASE_USER" -d "$DATABASE_NAME" >/dev/null 2>&1; then
    ready=1
    break
  fi
  echo -n "."
  sleep 1
done
echo
if [ "$ready" -ne 1 ]; then
  echo "Error: PostgreSQL did not become ready in 60s." >&2
  echo "Check the logs:  docker logs $CONTAINER" >&2
  exit 1
fi

# --- 4. Recreate the test database ------------------------------------------
# Integration tests must start from a clean, fully known state; leftovers
# from an interrupted previous run otherwise cause confusing failures.
# WITH (FORCE) (PostgreSQL 13+) also terminates stale connections.
echo "==> Recreating test database '$TEST_DB'"
docker exec "$CONTAINER" psql -U "$DATABASE_USER" -d "$DATABASE_NAME" \
  -c "DROP DATABASE IF EXISTS $TEST_DB WITH (FORCE)"
docker exec "$CONTAINER" psql -U "$DATABASE_USER" -d "$DATABASE_NAME" \
  -c "CREATE DATABASE $TEST_DB"

# --- 5. Run the tests -------------------------------------------------------
# -race needs a C toolchain. Plain Git for Windows has no gcc, so enable the
# race detector only when one is available instead of failing the run.
RACE=""
if command -v gcc >/dev/null 2>&1; then
  RACE="-race"
else
  echo "==> Note: gcc not found, running without the race detector"
fi

# URL-encode the password so that characters like @ / : # don't break the DSN.
ENC_PASSWORD="$(printf '%s' "$DATABASE_PASSWORD" | sed \
  -e 's/%/%25/g' -e 's/@/%40/g' -e 's|/|%2F|g' \
  -e 's/:/%3A/g' -e 's/#/%23/g' -e 's/?/%3F/g' -e 's/&/%26/g')"

export TEST_DATABASE_DSN="postgres://${DATABASE_USER}:${ENC_PASSWORD}@localhost:${DATABASE_PORT}/${TEST_DB}?sslmode=disable"

echo "==> Running integration tests"
cd apps
exec go test $RACE -tags=integration -v ./internal/integration/
