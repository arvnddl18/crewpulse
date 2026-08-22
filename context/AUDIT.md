---
title: AUDIT — PPE & Equipment Audit Feature
aliases: [Audit, PPE Audit, Equipment Inspection, Audit Module]
tags: [crewpulse, audit, ppe, equipment, phase4]
---

# AUDIT.md — PPE & Equipment Audit

**Product:** CrewPulse  
**Phase:** 4e (implement after Phase 4a safety checklist)  
**Related:** [[PRD]] · [[SCHEMA]] · [[ARCHITECTURE]] · [[STACK]] · [[RULES]]

---

## 1. What this feature is

The **Audit Module** provides a supervisor-triggered inspection workflow where technicians declare the PPE, tools, and equipment they are carrying during operations. It validates that field workers are using the correct and required items during operational hours.

This is **not** the same as the Phase 4a pre-deploy safety checklist (which is a hard gate before `en_route`). The audit is:
- **Standalone** — triggered independently of work order transitions
- **Supervisor-initiated** — admin or dispatcher opens a session; technician responds
- **Evidence-based** — technicians can attach photos for each item
- **Flaggable** — supervisors can mark items as non-compliant with a comment

---

## 2. Roles & permissions

| Role | Can trigger audit | Can submit audit | Can review & flag |
| --- | --- | --- | --- |
| Admin | Yes (all techs) | No | Yes |
| Dispatcher | Yes (all techs in org) | No | Yes |
| Team Lead | Yes (own team only) | No | Yes (own team only) |
| Technician | No | Yes (own sessions only) | No |

---

## 3. Audit workflow

```
Supervisor triggers session
  → notification sent to technician(s)
  → session status: pending
Technician opens /audit/submit
  → declares each item Present / Missing
  → uploads photo for required-photo items
  → submits
  → session status: submitted
Supervisor reviews on /audit
  → can flag individual items with a comment
  → flagged session → in-app notification to technician
  → resolved by supervisor: status → resolved
```

---

## 4. Equipment catalog

Admin manages the catalog at `/settings/equipment`. Items are categorized and can be linked to skill templates.

### Default categories & items (broadband field ops)

| Category | Item | Required for field | Requires photo |
| --- | --- | --- | --- |
| PPE | Hard hat | Yes | No |
| PPE | Safety vest (high-visibility) | Yes | No |
| PPE | Safety glasses / goggles | Yes | Yes (for fiber work) |
| PPE | Work gloves | Yes | No |
| PPE | Safety boots | Yes | No |
| Tools | Fusion splicer | No | No |
| Tools | OTDR (Optical Time-Domain Reflectometer) | No | No |
| Tools | Optical power meter | No | No |
| Tools | Patch cord / fiber pigtails | No | No |
| Tools | Cable ties, tape, markers | No | No |
| Tools | Crimping tool | No | No |
| Equipment | Ladder (fiberglass, non-conductive) | No | Yes |
| Equipment | Cable reel stand | No | No |
| Equipment | Hand truck / cart | No | No |
| Equipment | Tool bag / vest | No | No |

Items marked `required_for_field = true` can optionally be wired to the Phase 4a checklist gate to require declaration before `en_route`.

---

## 5. Database tables (Phase 4e)

> Do **not** create these tables until Phase 4e implementation. Spec only.

### audit_equipment_items

Admin-managed catalog. One row per declared item type.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| org_id | uuid not null FK | |
| name | text not null | e.g. "Hard hat" |
| category | text not null | `ppe` \| `tools` \| `equipment` |
| required_for_field | boolean not null default false | can gate Phase 4a checklist |
| requires_photo | boolean not null default false | technician must attach photo |
| sort_order | int not null default 0 | |
| is_active | boolean not null default true | |
| unique (org_id, name) | | |

### audit_sessions

One row per triggered audit session (can target one technician or many).

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| org_id | uuid not null FK | |
| triggered_by | uuid not null FK profiles | dispatcher / admin |
| session_type | text not null | `individual` \| `broadcast` |
| target_profile_id | uuid FK profiles | set for `individual`; null for `broadcast` |
| deadline_at | timestamptz not null | default now() + 30 min |
| note | text | optional context for the technician |
| created_at | timestamptz | |

### audit_session_items

The set of equipment items that were active at the time the session was created (snapshot so catalog changes don't affect open sessions).

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| session_id | uuid not null FK audit_sessions | |
| equipment_item_id | uuid not null FK audit_equipment_items | |
| unique (session_id, equipment_item_id) | | |

### audit_submissions

One row per technician per session.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| org_id | uuid not null FK | |
| session_id | uuid not null FK audit_sessions | |
| technician_id | uuid not null FK profiles | |
| status | text not null | `pending` \| `submitted` \| `flagged` \| `overdue` \| `resolved` |
| submitted_at | timestamptz | |
| reviewed_by | uuid FK profiles | |
| reviewed_at | timestamptz | |
| unique (session_id, technician_id) | | |

### audit_submission_items

One row per equipment item per submission.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| org_id | uuid not null FK | |
| submission_id | uuid not null FK audit_submissions | |
| equipment_item_id | uuid not null FK audit_equipment_items | |
| declared_status | text not null | `present` \| `missing` |
| attachment_id | uuid FK attachments | photo if provided (reuses Phase 1.5 table) |
| flag_comment | text | supervisor flag comment |
| flagged_by | uuid FK profiles | |
| flagged_at | timestamptz | |
| unique (submission_id, equipment_item_id) | | |

---

## 6. RLS policies

- `audit_equipment_items`: select same org; insert/update/delete admin only.
- `audit_sessions`: select staff same org; insert dispatcher/admin/team_lead; technician select where `target_profile_id = auth.uid()` OR broadcast sessions for their org.
- `audit_session_items`: select if parent session is selectable.
- `audit_submissions`: select staff same org, technician self only; insert via RPC.
- `audit_submission_items`: select if parent submission is selectable; insert/update technician self (own submission only).

---

## 7. API routes (Phase 4e)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/v1/audit/equipment` | List equipment catalog (staff + technician) |
| POST | `/v1/audit/equipment` | Add item (admin) |
| PATCH | `/v1/audit/equipment/:id` | Update item (admin) |
| GET | `/v1/audit/sessions` | List sessions (staff: all; tech: own) |
| POST | `/v1/audit/sessions` | Trigger new session (dispatcher/admin/lead) |
| GET | `/v1/audit/sessions/:id` | Session detail + submissions |
| GET | `/v1/audit/submissions/:id` | Submission detail + items |
| POST | `/v1/audit/submissions/:id/submit` | Technician submit with item declarations |
| POST | `/v1/audit/submissions/:id/flag` | Supervisor flag items |
| POST | `/v1/audit/submissions/:id/resolve` | Supervisor resolve flagged submission |

---

## 8. UI pages

### `/audit` (staff — desktop)

- Table of recent audit sessions: date triggered, triggered by, target tech(s), deadline, # submitted / pending / flagged.
- Filter by team, status, date range.
- "Trigger audit" button opens a modal: pick individual tech or broadcast; set deadline; add note.
- Click a session → `/audit/sessions/:id` — line-item submission details per technician.
- Flag individual items inline with a comment.

### `/audit/submit` (technician — mobile-first)

- Shows the technician's open (pending) audit session.
- List of items from the session snapshot.
- Toggle Present / Missing per item.
- Camera button for photo items (links to existing attachment upload flow).
- Submit button disabled until all `required_for_field` items are declared.
- After submit: status badge "Submitted — awaiting review".

---

## 9. Notifications

| Trigger | Recipient | Message |
| --- | --- | --- |
| Session triggered (individual) | Target technician | "Audit requested — submit by HH:MM" |
| Session triggered (broadcast) | All active techs in org | "Team audit requested — submit by HH:MM" |
| Submission flagged | Technician | "Your audit has flagged items — see /audit/submit" |
| Submission resolved | Technician | "Your audit has been resolved by [supervisor]" |
| Overdue (cron at deadline) | Dispatcher / supervisor | "[Tech name] audit overdue" |

---

## 10. Seed data (Phase 4e)

Add to `scripts/seed-demo.ts`:
- One equipment catalog with the default PPE + tools items above.
- One individual audit session targeting tech1 (submitted, all items present).
- One broadcast session (pending — not yet submitted by all techs).
- One flagged submission on tech2 (safety glasses missing, flag: "Must carry at all times for fiber work").

---

#audit #ppe #equipment #phase4 #crewpulse
