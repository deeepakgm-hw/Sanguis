# Git Strategy

## Branches
- `main` — always deployable. Never commit directly.
- `dev` — integration branch. All feature branches merge here first.
- `feat/<area>-<short-desc>` — e.g. `feat/auth-google-oauth`, `feat/fe-dashboard-charts`
- `fix/<area>-<short-desc>` — bug fixes
- `hotfix/<desc>` — emergency fix directly off `main` during the demo window

## Commit convention (Conventional Commits)
```
feat(auth): add OAuth google login
fix(upload): reject files over 5MB before hitting cloudinary
chore(deps): bump express to 4.19.2
docs(readme): add docker quick start
refactor(user): extract pagination into shared util
```

## Folder ownership (assign at hour 0 to avoid merge collisions)
| Owner | Path |
|---|---|
| Backend Dev | `backend/src/controllers`, `backend/src/services`, `backend/src/routes` |
| Security Eng | `backend/src/middlewares/security`, `backend/src/models` (Audit/SecurityEvent) |
| Frontend Dev | `frontend/src/app`, `frontend/src/components` |
| AI Eng | `backend/src/services/ai*.ts`, any `/ai` routes |

## Merge strategy
- Feature branches → `dev` via PR, squash merge, one-line summary.
- `dev` → `main` only at demo checkpoints (hour 4, hour 6, final).
- Never rebase `main`. Never force-push a shared branch.

## Conflict avoidance
- One file, one owner where possible (see table above).
- Shared files (`app.ts`, `routes/index.ts`) — add new routes as new
  lines only, never reformat existing lines, to keep diffs mergeable.
- Pull + rebase your feature branch on `dev` every ~45 minutes.
