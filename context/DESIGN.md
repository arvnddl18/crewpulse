---
title: DESIGN — Design System
aliases: [Design System, Brand, Tokens]
tags: [crewpulse, design, tokens, a11y]
---

# DESIGN.md — Design System

**Product:** CrewPulse  
**Art direction lock:** Night-shift operations console  
**Related:** [[PRD]] · [[STACK]] · [[ARCHITECTURE]] · [[SKILLS]] · [[RULES]]

> [!important] Anti-slop contract
> If a screen looks like a generic SaaS template, it is wrong. No purple gradients, no Inter/Roboto as the primary font, no giant rounded marketing cards, no 3D blobs, no rainbow badges, no emoji-as-icons.
>
> Frontend craft uses **[[SKILLS]]** (`npx skills add emilkowalski/skills`). Tokens in this file still win for color, type, and radius.

---

## 1. Brand Identity & Art Direction

### Name & voice

- **Name:** CrewPulse
- **Descriptor:** Technician Team Management & Monitoring System
- **Voice:** Direct, operational, calm. Short labels. Verbs on buttons (`Assign`, `Accept`, `En route`). No playful copy. No “Let’s get started on your journey.”

### Personality

| Trait | Meaning in UI |
| --- | --- |
| Command | Dense, scannable board. Data first. |
| Signal | Status is color + label + optional pulse — never color alone. |
| Utility | Industrial, not consumer. Closer to a dispatch desk than Dribbble. |
| Warmth | Light theme uses paper, not sterile white. Dark theme uses ink navy, not pure black. |

### Visual references (steal the *feeling*, not the pixels)

- Aviation / utility dispatch boards
- SCADA status walls
- Analog amber indicator lamps on dark metal
- Wayfinding signage (clear hierarchy, high contrast)

### Logo mark (when needed)

- Wordmark: **CrewPulse** in IBM Plex Sans Semibold.
- Mark: a simple **pulse notch** inside a rounded square (6px radius) — two vertical bars + one amber peak. Drawn in SVG. Do not generate a mascot.

### Do / don’t

| Do | Don’t |
| --- | --- |
| Dark board as the default authenticated chrome | Light purple sidebar dashboards |
| Amber as the *signal* color, used sparingly | Amber backgrounds on everything |
| Tabular numbers for IDs, times, counts | Mixing 4+ font families |
| 6–8px radii | `rounded-3xl` cards everywhere |
| One primary action per panel | Nested modals |

---

## 2. Color Palette & Semantic Tokens

All color in the app goes through CSS variables. Raw hex in components is forbidden except inside `globals.css` token definitions.

### Primitive palette

| Name | Hex | Use |
| --- | --- | --- |
| Ink 950 | `#070B14` | Darkest app chrome |
| Ink 900 | `#0B1220` | Dark background |
| Ink 800 | `#121A2A` | Dark surface |
| Ink 700 | `#1A2436` | Elevated dark surface / hover |
| Ink 600 | `#243049` | Borders on dark |
| Steel 400 | `#8B9BB4` | Secondary text on dark |
| Steel 300 | `#C5D0E0` | Primary text on dark (slightly cool) |
| Paper 50 | `#F4F1EA` | Light background (warm) |
| Paper 100 | `#E8E2D6` | Light muted surface |
| Paper 0 | `#FBF9F4` | Light elevated surface |
| Ink text | `#121820` | Primary text on light |
| Signal amber | `#F5A524` | Brand / primary action / live pulse |
| Amber dim | `#C4841D` | Primary hover |
| Teal live | `#2DD4BF` | “Available” / healthy live |
| Blue info | `#5B8DEF` | Informational / en route |
| Red alert | `#E5484D` | Critical / error / cancelled |
| Green done | `#3D9A6A` | Completed (muted, not neon) |
| Yellow hold | `#D4A017` | Paused / break |
| Critical | `#FF6B4A` | Critical priority (hotter than alert) |

### Semantic tokens

```css
:root {
  --bg: var(--paper-50);
  --bg-muted: var(--paper-100);
  --surface: var(--paper-0);
  --surface-hover: #EFEBE3;
  --text: var(--ink-text);
  --text-muted: #5C6778;
  --border: #D9D1C3;
  --primary: var(--signal-amber);
  --primary-fg: #1A1204;
  --ring: var(--signal-amber);
  --danger: var(--red-alert);
  --success: var(--green-done);
}

[data-theme="dark"] {
  --bg: var(--ink-900);
  --bg-muted: var(--ink-950);
  --surface: var(--ink-800);
  --surface-hover: var(--ink-700);
  --text: var(--steel-300);
  --text-muted: var(--steel-400);
  --border: var(--ink-600);
  --primary: var(--signal-amber);
  --primary-fg: #1A1204;
  --ring: var(--signal-amber);
}
```

### Status tokens (locked)

| Domain status | Token | Dark bg chip | Light bg chip | Label |
| --- | --- | --- | --- | --- |
| offline | `--status-offline` | `#2A3140` | `#E3DFD6` | Offline |
| available | `--status-available` | teal 20% on ink | teal 15% on paper | Available |
| on_break | `--status-break` | yellow hold | yellow hold | On break |
| en_route | `--status-enroute` | blue info | blue info | En route |
| on_site | `--status-onsite` | amber | amber | On site |
| in_progress | `--status-progress` | amber | amber | In progress |
| paused | `--status-paused` | yellow hold | yellow hold | Paused |
| completed | `--status-done` | green done | green done | Completed |
| cancelled | `--status-cancel` | red alert | red alert | Cancelled |
| critical priority | `--priority-critical` | `#FF6B4A` | `#FF6B4A` | Critical |

Chips: 1px border at 40% of the status color, 12px padding inline, 11px label, medium weight. Always include a 6px status dot **and** text.

---

## 3. Theme Variants (Light / Dark + Custom)

| Theme | Default for | Background feel |
| --- | --- | --- |
| **Dark** | Dispatcher board, admin | Ink navy control room — **default authenticated** |
| **Light** | Print-adjacent forms, user preference | Warm paper |
| **High contrast** | Accessibility toggle | Boosted border contrast, no amber-on-amber |

- Persist theme on `profiles.theme` + localStorage fallback.
- `class` or `data-theme` on `<html>`.
- No third “sunset purple” theme. No user-authored brand kits in MVP.
- Charts (Phase 2) use the same status tokens — never a default Chart.js rainbow.

**Custom (Phase 2+, optional):** org accent override limited to `--primary` only. Do not allow full palette replacement.

---

## 4. Typography Scale & Font Stack

### Families

```css
--font-sans: "IBM Plex Sans", "Segoe UI", sans-serif;
--font-mono: "IBM Plex Mono", "ui-monospace", monospace;
```

Load via Next.js (`next/font`): `IBM_Plex_Sans` (400, 500, 600) and `IBM_Plex_Mono` (400, 500).

**Never use:** Inter, Roboto, Poppins, Nunito, Arial as the design font.

### Scale (1.25 ratio, 14px base)

| Token | Size | Line | Weight | Use |
| --- | --- | --- | --- | --- |
| `display` | 32px | 40px | 600 | Rare. Page titles on empty marketing only. |
| `h1` | 24px | 32px | 600 | App page title |
| `h2` | 20px | 28px | 600 | Panel titles |
| `h3` | 16px | 24px | 600 | Card titles |
| `body` | 14px | 22px | 400 | Default UI |
| `body-sm` | 13px | 20px | 400 | Secondary |
| `caption` | 12px | 16px | 500 | Labels, chips, table headers (uppercase + 0.04em) |
| `mono` | 12–13px | 18px | 500 | `WO-2026-0001`, timestamps, coordinates |

Tabular lining figures on all numeric / ID text: `font-variant-numeric: tabular-nums`.

---

## 5. Spacing, Grid & Layout System

**Base unit:** 4px.

| Token | px |
| --- | --- |
| `space-1` | 4 |
| `space-2` | 8 |
| `space-3` | 12 |
| `space-4` | 16 |
| `space-5` | 20 |
| `space-6` | 24 |
| `space-8` | 32 |
| `space-10` | 40 |
| `space-12` | 48 |

### App shell (authenticated)

```text
┌──────── 64px ────────┬──────────────────────────────┐
│ Brand                │ Topbar: search, bell, user   │  56px
├──────────────────────┼──────────────────────────────┤
│ Nav                  │                              │
│  - Board             │  Page header  32px title     │
│  - Work orders       │  Filters                      │
│  - Teams             │  Content (min 0, scroll)      │
│  - Admin             │                              │
└──────────────────────┴──────────────────────────────┘
```

- Sidebar: 240px expanded / 64px collapsed. Ink-950 in dark.
- Content padding: 24px desktop, 16px mobile.
- Max content width for forms: 720px. Boards are full width.
- Dispatcher board: CSS grid, `repeat(auto-fill, minmax(260px, 1fr))`, gap 16px. Status columns on xl screens.

### Technician mobile

- No persistent sidebar. Bottom nav: **Jobs | Status | Account**.
- Primary job action is a sticky 48px-tall button.

### Grid

- 12-column on ≥1024px, 4-column tablet, 1-column phone.
- Gutter 16px.

---

## 6. Border Radius & Elevation

| Token | Value | Use |
| --- | --- | --- |
| `radius-sm` | 4px | Inputs, chips |
| `radius-md` | 6px | Buttons, cards, dialogs — **default** |
| `radius-lg` | 8px | Panels, sheets |
| `radius-full` | 999px | Avatars, status dots only |

Do not use 16px+ radii on cards.

**Elevation is border-first, shadow-second.**

| Level | Dark | Light |
| --- | --- | --- |
| 0 page | no shadow, `--bg` | no shadow |
| 1 card | 1px `--border` | 1px `--border` |
| 2 popover | 1px border + shadow-2 | shadow-2 |
| 3 modal | 1px border + shadow-3 | shadow-3 |

---

## 7. Shadows & Animations

### Shadows

```css
--shadow-2: 0 8px 24px rgba(7, 11, 20, 0.28);
--shadow-3: 0 16px 48px rgba(7, 11, 20, 0.40);
```

Light theme: use `rgba(18, 24, 32, 0.10)` instead. No colored glow shadows except a **2px amber pulse** on `.is-live` presence dots.

### Motion

| Token | Duration | Easing | Use |
| --- | --- | --- | --- |
| `fast` | 120ms | `cubic-bezier(0.2, 0, 0, 1)` | Hover, chips |
| `base` | 180ms | same | Panels, rows |
| `slow` | 280ms | same | Sheets, theme crossfade |

**Allowed:** opacity, transform (translateY 4px), background-color, border-color.  
**Forbidden:** bounce, elastic, rotate-on-hover logos, staggered 400ms card entrance on every page load, autoplaying loops except the 1.6s presence pulse.

Presence pulse:

```css
@keyframes pulse-live {
  0%, 100% { box-shadow: 0 0 0 0 rgba(245, 165, 36, 0.45); }
  70% { box-shadow: 0 0 0 6px rgba(245, 165, 36, 0); }
}
```

`prefers-reduced-motion: reduce` → disable pulse and all non-opacity transitions.

When implementing motion in `apps/web`, follow [[SKILLS]] (`emil-design-eng`, `animate`, `review-animations`) without violating the table above.

---

## 8. Accessibility Guidelines

- Target **WCAG 2.2 AA**.
- Contrast: body text ≥ 4.5:1. Amber on ink is for **accents and buttons with dark label**, not small body text.
- Status is never color-only (dot + label).
- All interactive targets ≥ 24px (desktop) / 44px (technician primary actions).
- Visible focus ring: 2px `--ring`, offset 2px. Do not `outline: none` without a replacement.
- Keyboard: board cards, dialogs, menus, status actions.
- Dialogs: focus trap, Escape closes, return focus to opener.
- Forms: label always visible (not placeholder-only). Errors announced with `aria-live="polite"`.
- Skip link to `#main`.
- Live board region: `aria-live="polite"` for status toasts, not for every card re-render.
- Images: empty alt for decorative; meaningful alt for job photos.

---

## 9. Component Style Rules

Build on shadcn primitives, then restyle to these rules. Do not ship default shadcn look (zinc + 8px radius + Inter).

### Buttons

| Variant | Style |
| --- | --- |
| `primary` | Amber fill, ink text, 6px radius, height 36px (desktop) / 44px (mobile primary) |
| `secondary` | Transparent, 1px border, text default |
| `ghost` | No border, hover `--surface-hover` |
| `danger` | Alert fill, white text |
| `success` | Used only for **Complete** |

One primary button per view. Icon + label on primary actions.

### Inputs

Height 36px, 4px radius, 1px border, 12px padding. Focus = amber ring. Error = red border + caption.

### Cards (technician / job)

Header: team color 3px left bar (not a thick rainbow). Body: title, WO ID (mono), status chip, two meta rows. Footer: one action.

### Tables

Sticky header, caption-styled column labels, row height 44px, hover surface. Numeric columns right-aligned, mono.

### Toasts

Bottom-right desktop, top mobile. 4s. Success / error / info using semantic colors. No stacked party of 6 toasts.

### Empty states

One sentence + one action. Illustration: simple line-grid SVG, not a 3D character.

### Loading

Skeleton using `--surface-hover` bars. No centered purple spinner. Technician actions use button `aria-busy`.

---

## 10. Product Tour & Interaction Patterns

**MVP has no product-tour library** (no Shepherd/Intro.js overlay). First-run is a single dismissible callout on the board:

> Status updates live. Assign from a technician card or from a work order.

### Core interaction patterns

| Pattern | Behavior |
| --- | --- |
| Assign | Right sheet (480px): technician list filtered by availability + skill. Confirm writes assignment + status `assigned`. |
| Status change | Technician: single primary button for the next happy-path status, overflow menu for pause/cancel. Dispatcher may cancel / reassign. |
| Filters | Always in the URL (`?team=&status=&priority=`). Shareable. |
| Optimistic UI | Status chip updates immediately; revert + toast on failure. |
| Conflict | If job was reassigned, technician sees a blocking dialog: “This job is no longer yours.” |
| Presence | Heartbeat every 30s while the app is open; `offline` after 90s without heartbeat. |
| Notifications | Bell dropdown, not a full page in MVP. Unread = amber dot. |
| Board tabs | Two tabs: **Technicians** (default) and **Work Orders**. Only the active tab’s content renders. Tab bar: `--border` underline on active, `body` weight. Persist in URL `?tab=technicians`. |
| Map markers | Clickable technician dots on the Davao North map. Popup card: avatar, name, team color bar, current WO title, status chip, last-ping age. Popup uses `radius-lg`, `shadow-2`. |
| Chat thread list | Left sidebar (280px desktop, full-width mobile sheet). Each row: avatar, name, last message preview, unread count badge (amber). Active thread highlighted `--surface-hover`. |
| Chat message pane | Messages left-aligned (others) / right-aligned (self). Bubble: `radius-md`, 1px `--border`, `body-sm`. Timestamp in `caption`. Input bar sticky bottom, 36px height, send button `primary`. |

### Page inventory (MVP)

1. `/login`
2. `/board` — dispatcher live board (home for admin/dispatcher/lead)
3. `/work-orders` — list + filters
4. `/work-orders/new`
5. `/work-orders/[id]`
6. `/teams`
7. `/technicians`
8. `/jobs` — technician my-jobs
9. `/jobs/[id]`
10. `/settings` — profile, theme

No onboarding carousel. No changelog modal.

Phase 4 (do not build in MVP): dispatcher map tab, job chat on `/work-orders/[id]` and `/jobs/[id]`, checklist on technician job detail, `/settings/checklists` for admin.

---

## Implementation checklist for every UI PR

- [ ] Uses semantic tokens, not raw hex
- [ ] IBM Plex only
- [ ] Radius ≤ 8px
- [ ] Status has text + dot
- [ ] Focus ring visible
- [ ] Loading / empty / error designed
- [ ] Matches dark default unless the screen is explicitly light
