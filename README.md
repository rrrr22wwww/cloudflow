# CloudFlow

A cloud server marketplace: sellers list servers, buyers purchase access and receive SSH credentials. Built as a full-stack learning project with a **Go + GraphQL** backend and a **Next.js** frontend.

> **Why this project?** I wanted to go beyond CRUD and implement the parts that are usually hidden behind libraries: password hashing (Argon2id from `x/crypto`), JWT issuance and validation, revocable sessions, a two-factor email login flow, and role-based access control — all hand-written to understand how they actually work.

## Features
generated in beautiful mermaid
- **Authentication** — registration and login with Argon2id password hashing, JWT access tokens backed by a server-side session store (so logout actually revokes the token).
- **Email OTP 2FA** — optional second factor: `requestEmailLoginCode` verifies the password and emails a 6-digit code, `verifyEmailLoginCode` exchanges it for a JWT.
- **Role-based authorization** — `User`, `Seller`, `Moderator`, `Creator` roles enforced in resolvers; the auth middleware parses the GraphQL document to allow only whitelisted public mutations without a token.
- **Marketplace** — products with categories and tags, orders, purchases, buyer/seller reviews.
- **Server access delivery** — after purchase, the buyer can retrieve connection details (IP, SSH user, port) for the product.
- **Frontend** — Next.js 15 (App Router, React 19) with API routes acting as a BFF layer over the GraphQL API, Zustand for state, Tailwind for styling.

## Architecture

```
┌─────────────────┐     REST (BFF)      ┌──────────────────┐
│   Next.js 15    │ ──────────────────► │  Next API routes │
│   (React 19)    │                     │  /app/api/*      │
└─────────────────┘                     └────────┬─────────┘
                                                 │ GraphQL over HTTP
                                                 ▼
                                        ┌──────────────────┐
                                        │   Go API server  │
                                        │  Gin + gqlgen    │
                                        │                  │
                                        │  middleware:     │
                                        │  auth / logging  │
                                        │  / recovery      │
                                        └────────┬─────────┘
                                                 │ database/sql (pgx)
                                                 ▼
                                        ┌──────────────────┐
                                        │   PostgreSQL 16  │
                                        │ (goose migrations)│
                                        └──────────────────┘
```

**Backend layout** (`apps/`):

| Package | Responsibility |
|---|---|
| `cmd/server` | Entrypoint: config, logger, DB, routes |
| `graph` | GraphQL schema + generated code + resolvers (gqlgen) |
| `internal/services` | Business logic: auth, sessions, JWT, email OTP, RBAC |
| `internal/database` | SQL queries (plain `database/sql`, no ORM — intentionally) |
| `internal/middleware` | Gin middleware: authorization, slog logging, panic recovery |
| `internal/config` | Env-based configuration with `.env` file fallback |
| `security` | Argon2id hashing/verification (unit-tested) |

## Tech stack

**Backend:** Go 1.25, Gin, gqlgen (GraphQL), pgx, golang-jwt, `x/crypto/argon2`, slog
**Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS, Zustand, Recharts
**Infra:** PostgreSQL 16, Docker (multi-stage builds), Docker Compose, goose (migrations), GitHub Actions (unit + integration + docker jobs)

## Getting started

### One command (Docker)

```bash
git clone https://github.com/rrrr22wwww/cloudflow.git
cd cloudflow
cp .env.example .env   # set DATABASE_PASSWORD and JWT_SECRET
docker compose up --build
```

This starts PostgreSQL, applies migrations (a one-shot goose container), then brings up the API (`:8080`) and the frontend (`:3000`). See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for deploying the same setup to a VPS with HTTPS.

### Local development

Prerequisites: Go 1.25+, Docker, Bun (or Node 20+). **Run all `make` targets from the repository root**, not from `apps/`.

```bash
git clone https://github.com/rrrr22wwww/cloudflow.git
cd cloudflow

# 1. Configure environment
cp .env.example .env    # or: make env
# open .env and set DATABASE_PASSWORD and JWT_SECRET
# (generate a secret with: openssl rand -base64 48)

# 2. Start PostgreSQL
make db          # = docker compose -f docker-compose.dev.yml up -d

# 3. Apply migrations  (make migrate-psql if the Go module proxy is blocked)
make migrate

# 4. Run the API server (http://localhost:8080 — GraphQL playground at /)
make server

# 5. Run the frontend (http://localhost:3000)
make frontend
```

`GET /healthz` reports server + database status. The SMTP variables in `.env` are only needed for the email OTP flow — everything else works without them.

## API examples

Register and get a token:

```graphql
mutation {
  register(name: "alice", email: "alice@example.com", img_user: "", password: "s3cure-pass") {
    token
    user { id name email role }
  }
}
```

Authenticated request (add header `Authorization: Bearer <token>`):

```graphql
query {
  me { id name email balance }
  getProducts(name: null, id: null, seller_id: null) {
    id name price rating tags
  }
}
```

Email OTP login flow:

```graphql
mutation { requestEmailLoginCode(email: "alice@example.com", password: "s3cure-pass") {
  challenge_id email expires_in
}}

mutation { verifyEmailLoginCode(challenge_id: "<id>", code: "123456") {
  token
  user { id name }
}}
```

A short endpoint reference lives in [`apps/API_SHORT.md`](apps/API_SHORT.md).

## Testing

```bash
make test               # unit tests
make test-integration   # end-to-end auth flow against a real PostgreSQL
make lint               # go vet + eslint
```

`make test-integration` starts PostgreSQL, waits for it to accept connections, creates a disposable `cloudflow_test` database and runs the suite. It requires a running Docker daemon and a `.env` file (`make env` creates one from the template).

On Windows the scripts work in Git Bash; the race detector is enabled automatically only when a C toolchain (gcc) is present, since Go's `-race` requires cgo.

**Unit tests** cover the security package: hashing, verification, salt randomness, malformed-hash handling.

**Integration tests** (`apps/internal/integration`, build tag `integration`) run the real HTTP stack — Gin router, authorization middleware, gqlgen resolvers — against a real PostgreSQL with migrations applied automatically. They verify the full auth lifecycle: register → token works → login with correct/wrong password → protected query without token is rejected → logout actually revokes the token (the reason sessions exist on top of JWT) → session row is persisted in the database. CI runs them against a `postgres:16` service container on every push.

## Design decisions

- **Plain SQL instead of an ORM** — to practice writing queries, migrations and scanning rows by hand; the query layer is isolated in `internal/database`, so swapping it later is cheap.
- **Sessions in addition to JWT** — pure stateless JWT can't be revoked; every token is also checked against a session store, which makes logout real at the cost of one lookup.
- **Self-describing password hashes** — parameters are stored inside the hash string (`argon2id$m$t$p$salt$hash`), so Argon2id settings can be tuned without invalidating existing users.
- **BFF pattern on the frontend** — the browser talks only to Next.js API routes; the GraphQL endpoint and tokens never need to be exposed directly to the client bundle.
- **Login timing equalization** — when the email is unknown, the password is still verified against a decoy Argon2id hash, so "unknown email" and "wrong password" take the same time and return the same error; registered emails can't be enumerated by timing.
- **Schema owned by migrations only** — the data layer never creates or inspects tables at runtime; multi-step writes (purchase, product + tags, preview image) run in transactions with row locks where money is involved.

## License

MIT
