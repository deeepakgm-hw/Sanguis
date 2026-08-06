# Sanguis — Blood Donor Matching Platform

Real-time blood donor matching platform that connects verified hospitals with eligible donors.
Backend (Node/Express/TS/MongoDB/Redis) ships with production-grade auth, RBAC, audit logging,
and OWASP Top 10 protection out of the box — letting you focus on domain features from minute one.

## Quick start (local, no Docker)

```bash
# Backend
cd backend
cp .env.example .env      # edit secrets — JWT_ACCESS_SECRET/JWT_REFRESH_SECRET must be 32+ chars
npm install
npm run dev                # http://localhost:5000
npm run seed                # creates admin@hackathon.local / ChangeMe123!@#

# Frontend
cd ../frontend
npm install
npm run dev                # http://localhost:3000
```

Requires local MongoDB and Redis running (or point `.env` at hosted instances / Atlas + Upstash).

## Quick start (Docker)

```bash
cp backend/.env.example backend/.env   # edit secrets
docker compose up --build
# App available at http://localhost (via Nginx)
```

## What's already built

- JWT auth: short-lived access token (memory only, header-based) + httpOnly refresh cookie
  with rotation and reuse/theft detection.
- RBAC (`requireRole`) and per-resource ownership checks (`requireOwnership`) to prevent IDOR.
- Argon2id password hashing, account lockout after 5 failed logins, rate limiting via Redis.
- OWASP Top 10 middleware: Helmet/CSP/HSTS, CORS allowlist, NoSQL sanitize, XSS sanitize, HPP,
  CSRF double-submit cookie, Zod input validation on every route.
- Secure file upload: magic-number verification (not just extension/mimetype), Cloudinary
  streaming (no local disk writes).
- Audit log + security event log models, admin-only endpoints to view them.
- Consistent `ApiResponse` / `ApiError` contract, global error handler, structured logging (pino).
- Socket.IO with JWT-authenticated handshake and per-user rooms.
- Next.js 14 App Router frontend: Tailwind + shadcn-style tokens, axios client with automatic
  silent token refresh, Zustand auth store, login/register/dashboard pages.
- Docker multi-stage builds for backend + frontend, Nginx reverse proxy with rate limiting.

## What you customize per problem statement (the remaining 20%)

1. Add domain models (e.g. `Report`, `Order`, `Alert`) following the `User`/`AuditLog` pattern.
2. Add routes/controllers/validators following the `user.routes.ts` CRUD + pagination pattern.
3. Swap/extend the dashboard page with domain-specific widgets and charts.
4. Wire any AI/OCR/maps integration you need into `backend/src/services/`.

## Security checklist before a demo/judge review

- [ ] Rotate all secrets in `.env` away from the example placeholders.
- [ ] Confirm `NODE_ENV=production` disables verbose error messages (see `errorHandler.ts`).
- [ ] Confirm CORS allowlist in `cors.ts` only includes your real deployed frontend origin.
- [ ] Run `npm run seed` once, then immediately change the admin password.
