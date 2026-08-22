# CrewPulse — Phase 1 demo logins

Run migrations on Supabase, then:

```powershell
npm run seed:demo
npm run dev
```

**Password (all demo users):** `CrewPulseDemo1!`

| Role | Email |
| --- | --- |
| Admin | admin@crewpulse.demo |
| Dispatcher | dispatch1@crewpulse.demo |
| Team lead | lead1@crewpulse.demo |
| Technician (en route job) | tech3@crewpulse.demo |

## Demo script

1. Log in as `dispatch1@crewpulse.demo` → `/board`
2. Create a work order at `/work-orders/new` or assign a queued job from the board
3. Log in as `tech1@crewpulse.demo` → `/jobs` → Accept → En route → Arrive → Complete with note
4. Dispatcher board and notifications update without refresh (Realtime)

**Phase 1 pages:** `/board`, `/work-orders`, `/teams`, `/technicians`, `/settings`, `/jobs` (technician).

**Phase 1.5:** optional completion photo (JPEG/PNG/WebP, ≤ 5 MB). Playwright:

```powershell
npm run test
npm run test:e2e
```

Phase 4 (checklist, job chat, foreground GPS) is implemented — see `context/PRD.md` §10.
