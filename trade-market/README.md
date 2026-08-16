# CloudFlow — frontend (trade-market)

Next.js 15 (App Router) frontend for the CloudFlow marketplace. See the [root README](../README.md) for the full project overview and setup.

## Run

```bash
bun install
bun dev          # http://localhost:3000
```

The API routes proxy requests to the Go backend. Set the backend URL if it differs from the default:

```bash
CLOUDFLOW_API_URL=http://localhost:8080
```

## Structure

- `app/` — pages (marketplace, listing, portfolio, profile, admin) and API routes (BFF layer)
- `components/` — UI components (listing views, admin panel, shared `ui/` primitives)
- `lib/` — GraphQL client (`cloudflow-api.ts`), session storage, Zustand store
- `hooks/` — shared React hooks
