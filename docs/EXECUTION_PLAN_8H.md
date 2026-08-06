# 8-Hour Execution Plan

Roles: Frontend Dev · Backend Dev · Security Eng · AI Eng · DB Eng · Presentation Lead

## 0–20 min — Problem Lock-in
- Everyone reads the problem statement together, out loud.
- Presentation Lead drafts one sentence: "We are building X for Y so that Z."
- Backend + DB Eng: decide the 3–5 core domain models (extend `User`/`AuditLog` pattern).
- Frontend Dev: sketch the 4–5 screens needed (reuse `dashboard`, `login`, `admin/security`).

## 20–45 min — Scaffolding customization
- DB Eng: create new Mongoose models under `backend/src/models/`.
- Backend Dev: create routes/controllers/validators for each model (copy `user.routes.ts` pattern).
- Frontend Dev: create page routes under `frontend/src/app/`, wire to `api.ts`.
- Security Eng: confirm `.env` secrets rotated, CORS allowlist updated, review which routes need `requireRole`.

## 45–90 min — Core CRUD + Auth working end-to-end
- Backend: all core CRUD endpoints return real data from MongoDB.
- Frontend: login → dashboard → at least one domain list page renders real data.
- Security: RBAC applied to every new route; rate limits tuned per endpoint sensitivity.

## 90–180 min — Feature build-out
- Backend + Frontend pair per feature, not per layer — ship one full vertical slice at a time.
- AI Eng: integrate the one AI feature that matters most (OCR / summarizer / anomaly detection);
  wire it as a `POST /api/v1/ai/<feature>` endpoint calling out to the provider service.
- Security Eng: add audit logging (`recordAudit`) to every mutating endpoint added this block.

## 180–300 min — Integration + secondary features
- Real-time features via Socket.IO (`notification.service.ts` pattern).
- File upload flows (already scaffolded — just point forms at `/files/upload`).
- Admin panel screens using `StatCard` / `ActivityFeed` widgets.

## 300–420 min — Hardening + polish
- Security Eng: run through `README.md` security checklist.
- Remove all `console.log`s of sensitive data; confirm error handler doesn't leak stacks.
- Frontend: empty states, loading skeletons, error toasts — no unhandled promise rejections
  visible to a judge clicking around.
- Test the exact demo flow 3 times, end to end, on the actual demo machine/network.

## 420–480 min — Presentation prep
- Presentation Lead: 3-minute pitch script + architecture diagram (see judge strategy doc).
- Everyone: know the answer to "how do you handle X security concern" for your own layer.
- Freeze `main`. Only hotfix if the demo is provably broken.
