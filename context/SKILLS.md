---
title: SKILLS — Frontend design skills
aliases: [Emil skills, Design skills, emilkowalski]
tags: [crewpulse, skills, design, frontend]
---

# SKILLS.md — Emil Kowalski frontend skills

**Product:** CrewPulse  
**Applies to:** Next.js UI only (`apps/web`)  
**Related:** [[DESIGN]] · [[STACK]] · [[PRD]]

> [!important] Install command (locked)
> From the **repo root**:
>
> ```bash
> npx skills add emilkowalski/skills
> ```
>
> Cursor target:
>
> ```bash
> npx skills add emilkowalski/skills -a cursor -y
> ```

Source: [emilkowalski/skills](https://github.com/emilkowalski/skills)

These skills teach the agent **taste**: motion, component feel, and the small details that stop UI from looking generated. They do **not** replace [[DESIGN]] tokens (IBM Plex, ink navy, amber, 6px radius).

---

## 1. When to use them

| Work | Use |
| --- | --- |
| Building or restyling React UI | `emil-design-eng` |
| Dialog, sheet, toast, board card motion | `animate`, `improve-animations`, `review-animations` |
| Naming / choosing motion | `animation-vocabulary` |
| “This feels dead” pass | `find-animation-opportunities` |
| Picking a primitive (dialog vs drawer) | `pick-ui-library` |
| Toast behavior | `ask-sonner` (Sonner patterns; restyle to CrewPulse tokens) |
| Quick UI spike | `prototype` |
| Apple-like density | `apple-design` — **adapt**, do not copy iOS chrome onto the dispatch board |

Always also follow [[DESIGN]]. If a skill suggests Inter, large squircle cards, or bounce, **ignore that part**. CrewPulse tokens win.

---

## 2. Priority when rules clash

1. [[PRD]] scope  
2. [[DESIGN]] brand, color, type, radius, accessibility  
3. **emilkowalski/skills** for craft, timing, and interaction feel  
4. Default shadcn look — never ship it

---

## 3. Skills in the pack

Install the whole repo (not one skill). Expected names:

- `emil-design-eng`
- `review-animations`
- `animation-vocabulary`
- `apple-design`
- `improve-animations`
- `find-animation-opportunities`
- `pick-ui-library`
- `prototype`
- `animate`
- `ask-sonner`

They land under `.agents/skills/` in this repo (installed 2026-08-18):

```text
.agents/skills/emil-design-eng
.agents/skills/animate
.agents/skills/animation-vocabulary
.agents/skills/apple-design
.agents/skills/ask-sonner
.agents/skills/find-animation-opportunities
.agents/skills/improve-animations
.agents/skills/pick-ui-library
.agents/skills/prototype
.agents/skills/review-animations
```

---

## 4. Agent rule

When editing `apps/web/**/*.{tsx,css}`:

1. Read [[DESIGN]]
2. Apply Emil design-eng + animation skills
3. Keep operational density (dispatch board, not a marketing landing page)
4. `prefers-reduced-motion` still disables non-essential motion ([[DESIGN]] §7)

Do not use these skills on SQL migrations or `packages/domain`.

---

## 5. Re-install

If Cursor does not see the skills:

```bash
npx skills add emilkowalski/skills -a cursor -y
```

Confirm with `npx skills ls -a cursor`.

#skills #design #frontend #crewpulse
