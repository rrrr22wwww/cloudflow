#!/usr/bin/env bash
# Shared helpers for the development scripts.

# load_env <file>
#
# Reads KEY=VALUE pairs and exports them WITHOUT evaluating the file as
# shell code. Sourcing a .env directly (`set -a; . .env`) is unsafe: a
# perfectly valid value such as
#
#     SMTP_FROM=CloudFlow <no-reply@example.com>
#
# makes bash treat "<" and ">" as redirection operators and abort with a
# syntax error. Values containing $, `, |, &, (, ) or * are similarly
# expanded or mangled. Docker Compose and the Go config parser read such
# files literally, so the file itself is fine — only `source` is wrong.
#
# CRLF line endings written by Windows editors are tolerated.
load_env() {
  local file="$1" line key value
  if [ ! -f "$file" ]; then
    return 1
  fi

  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"

    # trim leading whitespace
    line="${line#"${line%%[![:space:]]*}"}"

    # skip blanks and comments
    case "$line" in
      '' | '#'*) continue ;;
    esac

    # skip anything that is not an assignment
    case "$line" in
      *=*) ;;
      *) continue ;;
    esac

    key="${line%%=*}"
    value="${line#*=}"

    key="${key#export }"
    # trim trailing whitespace from the key
    key="${key%"${key##*[![:space:]]}"}"

    # trim surrounding whitespace from the value, then one layer of quotes
    value="${value#"${value%%[![:space:]]*}"}"
    value="${value%"${value##*[![:space:]]}"}"
    case "$value" in
      \"*\") value="${value#\"}"; value="${value%\"}" ;;
      \'*\') value="${value#\'}"; value="${value%\'}" ;;
    esac

    export "$key=$value"
  done < "$file"
}

# require_env <NAME>...
# Fails with a clear message if any of the named variables is empty.
require_env() {
  local name missing=()
  for name in "$@"; do
    if [ -z "${!name:-}" ]; then
      missing+=("$name")
    fi
  done
  if [ ${#missing[@]} -gt 0 ]; then
    echo "Error: missing or empty in .env: ${missing[*]}" >&2
    exit 1
  fi
}

# detect_postgres_container
# Echoes the name of a running PostgreSQL container. Honours
# POSTGRES_CONTAINER from .env, then falls back to known names.
# Returns 1 if nothing suitable is running.
detect_postgres_container() {
  local candidate
  if [ -n "${POSTGRES_CONTAINER:-}" ]; then
    if docker ps --format '{{.Names}}' | grep -qx "$POSTGRES_CONTAINER"; then
      echo "$POSTGRES_CONTAINER"
      return 0
    fi
    echo "Error: container '$POSTGRES_CONTAINER' (from POSTGRES_CONTAINER) is not running." >&2
    echo "Running containers:" >&2
    docker ps --format '  {{.Names}}  {{.Image}}  {{.Ports}}' >&2
    return 1
  fi
  for candidate in cloudflow-postgres postgres-db; do
    if docker ps --format '{{.Names}}' | grep -qx "$candidate"; then
      echo "$candidate"
      return 0
    fi
  done
  return 1
}

# require_docker
require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "Error: docker is not installed or not on PATH." >&2
    exit 1
  fi
  if ! docker info >/dev/null 2>&1; then
    echo "Error: the Docker daemon is not reachable." >&2
    echo "Start Docker Desktop (or the docker service) and run this again." >&2
    exit 1
  fi
}
