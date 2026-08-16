# Roadmap

## Done
- [x] Argon2id password hashing with self-describing hash format (`argon2id$m$t$p$salt$hash`)
- [x] JWT access tokens + server-side session store (revocable on logout)
- [x] Email OTP as a second login factor (`requestEmailLoginCode` / `verifyEmailLoginCode`)
- [x] Role-based authorization (`User`, `Seller`, `Moderator`, `Creator`)
- [x] GraphQL API for products, orders, reviews, categories, server access credentials
- [x] Next.js frontend with API routes proxying the GraphQL backend
- [x] End-to-end integration tests for the auth flow (real HTTP stack + real PostgreSQL, run in CI)
- [x] Multi-stage Dockerfiles (API, migrations runner, frontend) + full docker-compose stack
- [x] Data-layer cleanup: no runtime DDL, ctx-first signatures, transactional multi-step writes, sentinel errors (`database.ErrNotFound`, `services.ErrInvalidCredentials`)
- [x] Login timing equalization against user enumeration

## In progress / planned

### Auth
- [ ] Refresh tokens: short-lived access JWT (~15 min) + long-lived refresh token stored in `user_sessions`
- [ ] Google OAuth2 login (`/auth/google` → consent → callback → issue JWT); REST endpoints, since OAuth is a redirect flow
- [ ] TOTP 2FA (QR code enrollment, `enable2FA` / `confirm2FA` mutations) as an alternative to email OTP
- [ ] Rate limiting on login to protect against brute force
- [ ] Audit log for successful/failed login attempts

### Infrastructure
- [ ] Secrets via a KMS (e.g. Infisical) instead of env files in production
- [ ] Disable GraphQL introspection and playground in production builds
- [ ] Deploy a public demo (see docs/DEPLOYMENT.md) and link it here

### Product
- [ ] Payments integration for balance top-up (currently a stub mutation)
- [ ] Product search with full-text index
- [ ] Seller dashboard with sales analytics
