---
title: HEADROOM — Cursor context compression
aliases: [Headroom, Token compression, Cursor MCP]
tags: [crewpulse, headroom, cursor, memory, obsidian]
---

# HEADROOM.md — Headroom in Cursor

**Product:** CrewPulse (developer tooling, not a Phase 1 app feature)  
**Status:** Wired for **every Cursor Agent chat** on this machine  
**Related:** [[OBSIDIAN-CURSOR]] · [[TEAM]] · [[Index]]  
**Upstream:** [headroomlabs-ai/headroom](https://github.com/headroomlabs-ai/headroom)

Headroom compresses tool outputs, logs, files, and RAG chunks before they fill the model context. Same answers, fewer tokens. It also keeps a local retrieve cache (CCR) so originals can be pulled back by hash.

This is **Cursor/Obsidian tooling**. It does not change CrewPulse tables, routes, or [[PRD]] scope.

---

## What is on this machine

| Piece | Where | Job |
| --- | --- | --- |
| CLI `0.35.0` | `C:\Users\arvnd\.local\bin\headroom.exe` | `uv tool install --python 3.13 "headroom-ai[all]"` |
| Project MCP | `.cursor/mcp.json` → server `headroom` | Agent tools in this repo (stdio + proxy URL) |
| Global MCP | `%USERPROFILE%\.cursor\mcp.json` → server `headroom` | Same tools in **every** Cursor workspace |
| Session rule | `.cursor/rules/headroom.mdc` (`alwaysApply`) | Agent must compress large tool output |
| Proxy | `http://127.0.0.1:8787` | BYOK HTTP compression + `--memory` store |
| Wrap helper | `scripts/headroom-wrap-cursor.ps1` | `headroom wrap cursor --memory` |
| This note | `context/HEADROOM.md` | Obsidian memory for the setup |

MCP tools (reload Cursor MCP once after install):

- `headroom_compress` — shrink large content; returns compressed text + hash
- `headroom_retrieve` — restore original by hash (optional `query` filter)
- `headroom_stats` — session savings

`headroom mcp install --agent cursor` is **not** supported in 0.35.0 (`No agents matched`). Cursor is configured by writing the MCP JSON files above.

---

## How every chat session uses it

1. **Agent chats (Composer / Agent)** — MCP is registered globally, so every new chat can call the three tools. The always-on rule tells the model to compress large Grep/Read/shell dumps instead of stuffing them into context.
2. **Cross-session memory (proxy)** — `headroom proxy --memory` stores facts per project under `.headroom/` (gitignored). This only sees traffic that actually hits the proxy (BYOK override). Cursor-hosted models do not.
3. **Past Cursor transcripts** — stored under `%USERPROFILE%\.cursor\projects\*\agent-transcripts\`. Official `headroom learn` scanners are `claude`, `codex`, `gemini`, `grok` only — **not Cursor**. Do not expect `headroom learn --agent cursor` to mine these files.
4. **BYOK OpenAI / Anthropic** — override the OpenAI base URL (below) **and** keep the proxy running. MCP still works without that override.

> [!warning] Cursor-hosted models bypass the proxy
> Settings → Models → Override OpenAI Base URL only affects **your** OpenAI-compatible key. Leave Cursor’s included models as-is unless you intend to route BYOK traffic through `http://127.0.0.1:8787/v1`.
>
> Do not run `headroom proxy --learn` as the default: live learning can write into `AGENTS.md`. Use `--memory` only, or `--learn` only when you want that write.

---

## Daily commands

```powershell
# Health
& "$env:USERPROFILE\.local\bin\headroom.exe" --version
& "$env:USERPROFILE\.local\bin\headroom.exe" doctor

# Local proxy with per-project memory (leave this terminal open)
& "$env:USERPROFILE\.local\bin\headroom.exe" proxy --port 8787 --memory --memory-project-root "C:\Users\arvnd\OneDrive\Desktop\CareerProject\TechnicianTeamManagementMonitoringSystem"

# Or wrap (starts proxy, prints Cursor BYOK URLs)
.\scripts\headroom-wrap-cursor.ps1
```

`~/.local/bin` may not be on PATH inside Cursor. Use the absolute `headroom.exe` path above.

### Cursor BYOK override (only if you use your own API key)

1. Start the proxy command above.
2. Cursor Settings → Models → OpenAI API Key → **Override OpenAI Base URL** → `http://127.0.0.1:8787/v1`.
3. Keep the proxy terminal running while you chat.

Undo: `headroom unwrap cursor` (if you used wrap) and clear the base-URL override.

---

## Obsidian memory

Canonical note: **this file** (`context/HEADROOM.md`).

Personal vault pointer: `Headroom.md` in `C:\Users\arvnd\OneDrive\Documents\Obsidian Vault` (linked from [[CrewPulse Hub]]).

Machine-specific Headroom DB: `.headroom/` at the repo root (gitignored).

---

## Verify

1. Cursor Settings → MCP: `headroom` is green (reload MCP / restart Cursor once after install).
2. In a new Agent chat, the tools `headroom_compress`, `headroom_retrieve`, `headroom_stats` exist.
3. With the proxy running: `headroom doctor` — proxy check should pass.
4. Confirmed 2026-08-18: doctor proxy **pass** at `http://127.0.0.1:8787` (v0.35.0). `headroom learn --agent auto` detected Claude Code / Codex / OpenCode — **not Cursor**.

#headroom #cursor #memory #obsidian #crewpulse
