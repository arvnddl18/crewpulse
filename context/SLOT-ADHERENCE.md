---
title: SLOT-ADHERENCE — Report from raw Excel
aliases: [Slot Adherence, All Status, 20260615]
tags: [crewpulse, reports, slot-adherence, excel]
---

# SLOT-ADHERENCE.md — Slot adherence report

**Product:** CrewPulse  
**Source file (canonical sample):** `C:\Users\arvnd\Downloads\20260615 all status.xlsx`  
**Snapshot date in filename:** 2026-06-15  
**Size:** 4.3 MB · **Ingest via:** [[MARKITDOWN]] + typed column map  
**Related:** [[PRD]] · [[SCHEMA]] · [[ARCHITECTURE]] · [[STACK]]

> [!warning] Do not copy this workbook into the repo
> It is a live ops dump (customer name, contact, address, account numbers). Keep it on disk. Docs here describe **shape and metrics only**.

---

## 1. What this file is

CRM/BSS **all-status** export for field work orders in **Mindanao / South Mindanao 1 / Davao North**. CrewPulse must accept this upload and show a **slot adherence** report (appointed AM/PM slot vs outcome / aging).

Contractor in this dump: almost all **NG KHAI** (4365 of 4714). Source column: `CRM/BSS`.

---

## 2. Workbook map

| Tab | Role | Shape (inspected) |
| --- | --- | --- |
| **Sheet2** | **Fact table — ingest this** | 4714 rows × 201 columns |
| **Sheet3** | Pivot report (preview of the UI) | Count of WOs: delay reason × skillset × SLA bucket. Filters: status, facility, cabinet |
| Sheet4 | Tiny slice (3 rows) with readable slot text | Same 201-col schema |
| Sheet5 | Tiny slice (2 rows) | Same schema |

Sheet3 pivot (this snapshot) is **Install-only** in the column labels: delay reasons down, SLA buckets across (`0-2 Days` … `Above 30 Days`), Install Total **149**, Grand Total **149**. Page filters: `status = (Multiple Items)`, `facilityname = (All)`, `cabinetid = (All)`.

CrewPulse should **rebuild Sheet3 from Sheet2**, not scrape the pivot.

---

## 3. Slot field (the report hinge)

`appointmentdate` is **not** a timestamp. It is a slot label:

```text
YYYY-MM-DD AM Slot
YYYY-MM-DD PM Slot
```

Examples from the file: `2026-06-13 PM Slot`, `2026-06-15 AM Slot`.

| Sheet2 | Count |
| --- | --- |
| Has a slot string | 4368 |
| Blank | 346 |

Parse to:

| Field | From |
| --- | --- |
| `slot_date` | date part |
| `slot_period` | `AM` \| `PM` |
| `slot_raw` | original string |

**Slot adherence (locked definition for v1):**

Only rows with `status = Completed` are scored pass/fail. Other statuses are shown as open / delayed / cancelled — they are **not** missed-slot.

Work-done clock is **`completiondate`** (not `lastupdatedate`). Slot clock is **`appointmentdate`**. Timezone: **Asia/Manila**.

A Completed row **passes** when `appointmentdate` parses and `completiondate` falls on `slot_date` as follows:

| Appointed slot | Pass window (same `slot_date`) |
| --- | --- |
| `AM` | `00:00` through `12:59` inclusive (`completiondate` local time `< 13:00`) |
| `PM` | `00:00` through `23:59` (any time that calendar day) |

**Fails** when: not Completed; missing/unparseable slot; missing `completiondate`; different calendar day; or AM slot completed at `13:00` or later the same day.

Reference dump: `C:\Users\arvnd\Downloads\20260609 all status (1).xlsx`.

This dump’s `completiondate` range: 2026-06-01 09:49 → 2026-06-14 18:49 (1746 completed). `createdate` / `ordercreatedate`: 2026-03-19 → 2026-06-15.

---

## 4. SLA aging (already in the file)

Column `SLA` is a calculated aging bucket from `createdate` (Excel `TODAY() - createdate`):

| Bucket | Rule |
| --- | --- |
| `0-2 Days` | 0 ≤ days < 2 |
| `2-4 Days` | 2 ≤ days < 4 |
| `4-7 Days` | 4 ≤ days < 7 |
| `7-15 Days` | 7 ≤ days < 15 |
| `16-30 Days` | 15 ≤ days < 30 |
| `Above 30 Days` | ≥ 30 |

Recompute on ingest with **upload date** (or `as_of` from the filename `20260615`), not Excel `TODAY()`, so historical dumps stay stable.

**This snapshot (Sheet2 × SLA):**

| Status | 0-2 | 2-4 | 4-7 | 7-15 | 16-30 | >30 | Total |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Cancelled | 79 | 444 | 609 | 832 | 121 | 10 | 2095 |
| Completed | 87 | 189 | 357 | 965 | 147 | 1 | 1746 |
| Delayed | 85 | 285 | 27 | 41 | 48 | 22 | 508 |
| Pending | 137 | 64 | 67 | 49 | 13 | 4 | 335 |
| Open | 9 | 6 | 7 | 0 | 1 | 2 | 26 |
| Ongoing | 0 | 0 | 2 | 2 | 0 | 0 | 4 |
| **All** | 397 | 988 | 1069 | 1889 | 330 | 39 | **4714** |

---

## 5. Status / ops dimensions (Sheet2)

| Field | Values in this dump |
| --- | --- |
| `status` | Cancelled 2095, Completed 1746, Delayed 508, Pending 335, Open 26, Ongoing 4 |
| `substatus` | blank 2430, WithoutVisit 1698, ForVisit 344, ForReschedule 235, OnHold 4, WithVisit 3 |
| `skillset` | Repair 3552, Install 1145, Migration 16, Dedicated Migration 1 |
| `queue` | Regular 4390, VIP 324 |
| `orderactiontype` | blank 3552, PR 1077, PV 63, CH 22 |
| `workordertype` | blank 3728, Consumer 986 |
| `team` | 63 names (technician-as-team) |
| `delayreason` | 40 codes; top: blank, `GNETPR-AFFECTED BY OUTAGE`, `CANT LOCATE SUBSCRIBER`, `(X) CRES - RESKED WITH PREFERRED DATE` |
| `region` / `area` / `territory` | MINDANAO / SOUTH MINDANAO 1 / DAVAO NORTH |

`team` in this export is the **technician display name**, not a CrewPulse team id. Map by name on ingest; unmatched → `unmapped`.

---

## 6. Columns to persist (not all 201)

Keep these for the report. Drop plant/CPE/PII unless a later phase needs drill-down.

**Identity:** `workordernumber`, `workorderid`, `bssorderid`, `source`  
**Slot / time:** `appointmentid`, `appointmentdate`, `ordercreatedate`, `createdate`, `completiondate`, `lastupdatedate`, `SLA`  
**Work:** `workordertype`, `orderactiontype`, `skillset`, `queue`, `status`, `substatus`  
**People:** `team`, `contractorname`, `userid`  
**Delay:** `delaycode`, `delayreason`, `delaynotes`, `cancellationreason`  
**Geo (coarse):** `region`, `area`, `territory`, `facilityname`, `zone`, `sitename`  
**Optional later:** `latitude`, `longitude`

**Never store from this dump in v1:** `customername`, `customercontact`, `customeraddress`, `accountnumber`, `ppoeusername`, `sipusername`, `nameofsignatory`, serials, IMEI, SIM.

---

## 7. UI the system should show after upload

1. Upload CRM/BSS `.xlsx` (this template).
2. Confirm parse: row count, as-of date, unmapped teams.
3. **Slot adherence** board:
   - % completed in slot (definition in §3)
   - Missed slot (completed other day/period)
   - Still open / delayed / pending / cancelled
4. Break down by `skillset`, `team`, `queue`, `slot_date`, `delayreason`.
5. Aging heatmap matching Sheet3 (delay reason × SLA bucket), filterable by status.

Page: `/reports/slot-adherence` (staff only). Phase: **2 Must** — see [[PRD]].

---

## 8. Ingest API (planned)

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/v1/reports/uploads` | multipart Excel → parse in memory → replace org snapshot (no raw file stored) |
| GET | `/v1/reports/uploads/:id` | status, row counts, errors |
| GET | `/v1/reports/slot-adherence` | aggregates for the latest (or chosen) upload |
| GET | `/v1/reports/slot-adherence/rows` | drill-down (no PII columns) |

Parser: prefer Sheet2 by header set (`workordernumber` + `appointmentdate` + `SLA`). If headers are mangled, run [[MARKITDOWN]] and match aliases.

#slot-adherence #excel #reports #crewpulse
