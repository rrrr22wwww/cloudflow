# Deployment

The whole stack is containerized, so the simplest production-like deployment is `docker compose` on any Linux VPS. Two options below.

## Option A — VPS with Docker Compose (recommended)

Works on any $4–6/mo VPS (Hetzner CX22, DigitalOcean, Timeweb, etc.) with Ubuntu 22.04+.

```bash
# 1. Install Docker
curl -fsSL https://get.docker.com | sh

# 2. Get the code
git clone https://github.com/rrrr22wwww/cloudflow.git
cd cloudflow

# 3. Configure secrets
cp .env.example .env
nano .env    # set DATABASE_PASSWORD, JWT_SECRET (openssl rand -base64 48), LOG_TYPE=prod

# 4. Run
docker compose up --build -d
```

What happens on `up`:

1. `postgres` starts and passes its healthcheck;
2. `migrate` (one-shot container with the goose CLI baked in) applies everything from `lib/migration/postgres` and exits;
3. `api` starts only after migrations complete successfully (`service_completed_successfully`);
4. `frontend` starts and talks to the API over the internal network (`CLOUDFLOW_API_URL=http://api:8080`).

Frontend: `http://<server-ip>:3000`, API + GraphQL playground: `http://<server-ip>:8080`.

### HTTPS / domain

Put a reverse proxy in front. The lowest-effort option is [Caddy](https://caddyserver.com) — it obtains TLS certificates automatically:

```
# /etc/caddy/Caddyfile
cloudflow.example.com {
    reverse_proxy localhost:3000
}
api.cloudflow.example.com {
    reverse_proxy localhost:8080
}
```

After adding a proxy, remove the `ports:` mappings for `api`/`frontend` from the compose file (or bind them to `127.0.0.1:`) so containers aren't exposed directly.

### Updating

```bash
git pull && docker compose up --build -d
```

Migrations run automatically on every deploy; goose skips already-applied ones.

## Option B — free-tier PaaS

For a zero-cost demo link in the README:

- **Database:** [Neon](https://neon.tech) or [Supabase](https://supabase.com) free Postgres. Set `DATABASE_SSLMODE=require`.
- **API:** [Railway](https://railway.app) or [Render](https://render.com) — point at the repo, set the Dockerfile path to `apps/Dockerfile`, target `server`, and add env vars from `.env.example`. Run migrations once from your machine: `make migrate` with the cloud DSN in `.env`.
- **Frontend:** [Vercel](https://vercel.com) — set the root directory to `trade-market` and `CLOUDFLOW_API_URL` to the API URL.

## Production checklist

- [ ] `JWT_SECRET` is long and random (`openssl rand -base64 48`), never committed
- [ ] `LOG_TYPE=prod` (JSON logs, warn level)
- [ ] `DATABASE_SSLMODE=require` when the database is not on the same host
- [ ] GraphQL playground and introspection disabled for a real production launch (currently left on for demo purposes)
- [ ] Containers behind a TLS-terminating reverse proxy, ports not exposed publicly
- [ ] Database backups (`pg_dump` cron or the provider's automatic backups)

## Troubleshooting

**`The "DATABASE_USER" variable is not set`** — Docker Compose reads `.env` from the repository root and no such file exists yet. Run `make env` (or `cp .env.example .env`) and fill in `DATABASE_PASSWORD` and `JWT_SECRET`.

**`open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified`** (Windows) — the Docker daemon isn't running. Start Docker Desktop and wait until its status shows "Engine running".

**`No rule to make target ...`** — `make` is being run from a subdirectory. All targets live in the root `Makefile`; run them from the repository root.

**`-race requires cgo` / `gcc: command not found`** (Windows) — Go's race detector needs a C toolchain. The scripts detect this and run without `-race`; to enable it, install MSYS2/mingw-w64 gcc.

**Tests fail with `database "cloudflow_test" does not exist`** — PostgreSQL was still starting when the database was created. `scripts/test-integration.sh` waits for `pg_isready` before proceeding; if you invoke `go test` manually, wait for the container to become healthy first (`docker compose ps`).

**Reusing an existing PostgreSQL container** — if you already run Postgres in Docker under a different name or host port (for example `postgres-db` on `5404`), don't start a second one. Point `.env` at it instead:

```
DATABASE_PORT=5404          # the HOST port the container publishes
POSTGRES_CONTAINER=postgres-db
```

`scripts/test-integration.sh` reuses a running container when it finds one and only falls back to `docker-compose.dev.yml` otherwise. Avoid `make db` in this situation: it would try to bind the same host port and fail with a port conflict.

**`syntax error near unexpected token` when running a script** — an older version of the scripts loaded `.env` with `source`, which makes bash interpret characters like `<`, `>`, `|` and `$` inside values. The scripts now parse `.env` line by line without evaluating it (`scripts/common.sh`), so any value is safe. Quoting values that contain such characters is still good practice.

**`TLS handshake timeout` on `sum.golang.org` / `proxy.golang.org`** — Go can't reach the module proxy or checksum database (common on networks where those hosts are blocked). Point Go at a reachable mirror:

```bash
go env -w GOPROXY=https://goproxy.io,direct
go env -w GOSUMDB=sum.golang.google.cn
go env GOPROXY GOSUMDB          # verify
```

This is needed for building the project at all, not just for migrations. If no mirror is reachable, `make migrate-psql` applies the migrations through psql inside the running container with no downloads whatsoever; it records versions in goose's own `goose_db_version` table, so switching back to goose later works seamlessly.

As a last resort `go env -w GOSUMDB=off` skips checksum-database verification — modules listed in `go.sum` are still hash-checked, but new ones are not, so prefer a mirror.

**Integration tests fail with `type "user_role" already exists`** — the `cloudflow_test` database survived an interrupted earlier run with migrations already applied. Current versions handle this twice over: `scripts/test-integration.sh` drops and recreates the test database on every run (`DROP DATABASE ... WITH (FORCE)`), and the in-test migrator records applied versions in `goose_db_version`, skipping them on reruns. Update the scripts and rerun.
