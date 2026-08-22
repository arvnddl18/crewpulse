---
title: RULES — Coding Standards & Architecture Rules
aliases: [Coding Rules, SOLID, DRY, KISS]
tags: [crewpulse, rules, typescript]
---

# RULES.md — Coding Standards & Architecture Rules

**Product:** CrewPulse  
**Related:** [[STACK]] · [[ARCHITECTURE]] · [[SUPABASE]] · [[SCHEMA]] · [[DESIGN]] · [[PRD]]

These rules are mandatory for human and AI-generated code. If a change fights these rules, change the design in docs first.

---

## 1. Naming Conventions (Files & Code)

### Files & folders

| Kind | Pattern | Example |
| --- | --- | --- |
| Route folders | `kebab-case` | `work-orders/` |
| Feature folders | `kebab-case` | `features/work-orders/` |
| React components | `PascalCase.tsx` | `PresenceBoard.tsx` |
| Hooks | `useCamelCase.ts` | `useHeartbeat.ts` |
| API route files | `kebab-case.ts` | `http/routes/work-orders.ts` |
| Zod schemas | `schema.ts` | `schema.ts` |
| Domain pure modules | `kebab-case.ts` | `work-order-status.ts` |
| DB access | `kebab-case.ts` | `apps/web/src/db/work-orders.ts` |
| CSS | tokens in `globals.css` only | |

Do not name files `helpers.ts`, `utils.ts`, or `misc.ts`. Name the capability: `format-work-order-number.ts`.

### Code

| Kind | Convention |
| --- | --- |
| Components, types, enums | `PascalCase` |
| Functions, variables | `camelCase` |
| Constants / env keys | `SCREAMING_SNAKE` for true constants |
| DB columns / Zod API fields | `snake_case` at the DB boundary; `camelCase` in TS domain. Map explicitly in db layer. |
| Booleans | `is`, `has`, `can` prefixes |
| Event handlers | `handleAssign`, `onStatusChange` |

**Work order in code:** `WorkOrder` not `Ticket`, `Job`, `Task`. Technician presence: `PresenceStatus` not `State`.

---

## 2. SOLID Principles Application

Apply SOLID at **module** level. Do not create a class hierarchy for CRUD.

### S — Single responsibility

- `status-machine.ts` only decides legal transitions.
- `http/routes/*.ts` only: parse → authorize → call service → map result.
- `PresenceBoard.tsx` does not contain assignment SQL.
- One domain concept per feature folder.

### O — Open/closed

- Add a new work-order status by extending the union + transition table, not by scattering `if (status === 'x')` across 12 components.
- UI reads `nextActions(status, role)` from domain.

### L — Liskov

- If a function accepts `StaffProfile`, a `TeamLeadProfile` must be safe. Do not pass technicians into staff-only helpers and “hope” RLS saves you.

### I — Interface segregation

- Board query type ≠ detail page type. Do not load `description` + all events for the kanban.
- Props: pass `onAssign(id)` not a 40-field god-object.

### D — Dependency inversion

- Domain does not import Supabase.
- UI does not import `createAdminClient` / secret-key clients.
- Features depend on Route Handlers + domain, not on SQL strings in components.

**Example (good):**

```ts
// domain/work-order-status.ts
export function canTransition(from: Status, to: Status, role: Role): boolean
```

**Example (bad):**

```ts
// PresenceBoard.tsx
if (job.status === 'assigned' && user.role !== 'technician') { /* ... */ }
```

---

## 3. DRY & KISS Guidelines

### DRY — extract at **4** uses

- **Do not** abstract on the second copy.
- **Do** extract when the same function/service/UI snippet is repeated **4 times** or more, or when a bug would have to be fixed in many places (status labels, status colors, error mapping).
- Shared at 1–3 uses: status machine, Zod work-order schema, `cn()`, action result type — these are **core**, not premature DRY.

**Extract these immediately (core, not wait-for-4):**

- Status labels + colors (must match [[DESIGN]])
- `canTransition`
- `ActionResult<T>`
- Supabase client constructors

**Do not extract:**

- One-off admin screens
- A “UniversalCard” that takes 20 props
- Generic `useFetch` wrapping TanStack Query

### KISS — shipping new functions

- Prefer a 40-line function that is obvious over a 6-class strategy pattern.
- MVP assignment is one RPC, not a job queue.
- No microservices, no event bus, no CQRS library.
- If a feature is Phase 2 in [[PRD]], do not leave a “flexible” unused extension point.
- Delete dead code. Do not comment it out.

**KISS test:** can you explain the change in one sentence that matches [[PRD]]? If not, it is too big.

---

## 4. Code Structure & Organization Rules

1. Follow [[ARCHITECTURE]] directory map. New top-level folders require an architecture doc update.
2. Colocate tests next to domain files: `work-order-status.test.ts`.
3. Max file size guideline: ~250 lines. Split by responsibility, not by “utils”.
4. No default exports except React page/route modules that the router requires.
5. Client components do not import admin / secret-key clients.
6. `packages/domain` does not import React, Next.js, or Supabase.
7. Keep HTTP handlers thin; business logic in `services/` + domain.
8. shadcn primitives live in `apps/web/src/shared/ui`. Feature composites stay in the feature.

---

## 5. Validation Strategy

| Layer | Tool | Rule |
| --- | --- | --- |
| Client forms | Zod | Same schema family as the API |
| TypeScript API | `schema.safeParse` | Never trust JSON body raw |
| RPC / SQL | constraints + checks | Status, role, FK |
| Env | Zod in `apps/web/src/lib/supabase/env.ts` | Fail boot if missing |

- `.strict()` on incoming API objects where extra keys should fail.
- User-facing messages are safe and specific (`site_address is required`). Internal codes stay in `code`.
- IDs: validate `uuid()`.
- Enums: Zod `z.enum` matching DB checks — one source exported from `domain/`.

Never validate *only* in the UI. Never validate *only* in RLS and skip Zod.

---

## 6. TypeScript Standards

- `strict: true`. `noUncheckedIndexedAccess` on.
- **No `any`.** `unknown` + narrow. `zod` infer for DTOs.
- Do not use `as` to silence errors except: `as const` and documented boundary maps.
- Prefer `type` for objects; `enum` only if you need a runtime object — otherwise string unions.
- Public functions have explicit return types on domain and db layers.
- Generate DB types: `Database['public']['Tables']['work_orders']['Row']`. Map to domain types in db layer.
- Exhaustive `switch` on status with `never` default.
- Avoid `!` non-null assertions; handle null.

```ts
function assertNever(x: never): never {
  throw new Error(`Unexpected: ${String(x)}`)
}
```

---

## 7. State Management Rules

| Kind of state | Where |
| --- | --- |
| Session / user | `@supabase/ssr` cookies + `GET /api/v1/me` |
| Work orders, lists | TanStack Query → Route Handlers + Realtime |
| Board filters | URL search params |
| Theme | `html[data-theme]` + profile + localStorage |
| Modal/sheet open | Local `useState` |
| Presence heartbeat | Client interval in one hook |

**Forbidden:** Redux, Zustand global store for server data, Context that wraps the entire app with work-order lists, duplicating RLS logic only on the client.

Optimistic updates must roll back on `ok: false`.

---

## 8. Error Handling & Security Practices

### Errors

- Return `{ ok, data } | { ok, code, message }` from the API. Do not leak raw Supabase errors.
- Map known codes to toasts. Unknown → “Something went wrong. Try again.”
- Log server errors with `code`, route, `user id` — not access tokens, not passwords.
- Empty, loading, error UI required on board and lists ([[DESIGN]]).

### Security

- Never expose `SUPABASE_SECRET_KEY` to the client (`NEXT_PUBLIC_*`).
- Never disable RLS “temporarily.”
- Middleware is not enough; RLS is required.
- Technician queries must not accept a `technicianId` from the client to “view as.”
- Sanitize displayed notes as text (React default). No `dangerouslySetInnerHTML`.
- Storage paths must include `org_id`. Signed URLs expire (≤ 60 minutes).
- CSRF: same-origin Route Handlers + `@supabase/ssr` cookies. Do not put the secret key in the browser.
- Dependencies: do not add a package for a 10-line helper.

### Authz checklist per route

1. Valid Supabase JWT  
2. Role allowed  
3. Zod input  
4. Domain rule (`canTransition`)  
5. DB/RPC (RLS still applies)  

Skip none.

---

## Definition of done (every change)

- [ ] In current [[PRD]] phase  
- [ ] UI matches [[DESIGN]] tokens and [[SKILLS]]  
- [ ] Folders match [[ARCHITECTURE]]  
- [ ] Schema/RLS updated if data changed ([[SCHEMA]])  
- [ ] No `any`, no new util dump  
- [ ] Illegal states unrepresentable in UI **and** domain  
- [ ] Loading / empty / error handled  
