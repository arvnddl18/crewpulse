---
title: Connect Obsidian and Cursor
aliases: [Obsidian setup, Cursor vault]
tags: [crewpulse, obsidian, cursor]
---

# Connect Obsidian ↔ Cursor

Your personal vault is:

`C:\Users\arvnd\OneDrive\Documents\Obsidian Vault`

Canonical product docs live in this folder (`context/`) inside the CrewPulse repo. Cursor and Obsidian should both see them.

---

## Method A — Recommended: two folders in one Cursor workspace

A workspace file is at the repo root:

`TechnicianTeamManagementMonitoringSystem.code-workspace`

It mounts:

1. The **app repo** (code + `context/` docs)
2. Your **Obsidian vault**

**In Cursor:** File → Open Workspace from File… → select that `.code-workspace` file.

Then `@`-mention notes from either folder. Ask the agent to read `context/PRD.md` before coding.

**In Obsidian:** File → Open vault → choose this `context` folder **or** keep your personal vault and follow Method B.

---

## Method B — Open `context/` as an Obsidian vault

1. Open Obsidian.
2. **Open folder as vault**.
3. Select:

`C:\Users\arvnd\OneDrive\Desktop\CareerProject\TechnicianTeamManagementMonitoringSystem\context`

Graph view will show [[PRD]], [[DESIGN]], [[ARCHITECTURE]], [[SCHEMA]], [[RULES]].

Keep your personal vault for everything else. Switch vaults with the vault switcher at the bottom left.

---

## Method C — Junction (same files in the personal vault)

This makes `context/` appear inside the personal vault without duplicating files.

In **PowerShell** (not as admin unless it fails):

```powershell
$target = "C:\Users\arvnd\OneDrive\Desktop\CareerProject\TechnicianTeamManagementMonitoringSystem\context"
$link   = "C:\Users\arvnd\OneDrive\Documents\Obsidian Vault\Projects\CrewPulse"

New-Item -ItemType Directory -Force -Path (Split-Path $link) | Out-Null
if (Test-Path $link) { Write-Host "Link path already exists: $link" }
else { cmd /c mklink /J "$link" "$target" }
```

Then in the personal vault, open [[CrewPulse Hub]].

> [!warning] OneDrive
> If OneDrive fights the junction (sync loop or empty folder), delete the junction and use Method A + B instead.

---

## Method D — MCP (agent tools while Obsidian is running)

Use this when you want Cursor’s agent to search/update the vault through Obsidian’s API.

1. In Obsidian: **Settings → Community plugins → Turn on community plugins**.
2. Browse and install **Local REST API** (coddingtonbear). Enable it.
3. Open **Settings → Local REST API**.
4. Enable **Non-encrypted (HTTP) server** (port `27123`) — easiest on Windows; avoids the self-signed cert.
5. Copy the API key.
6. Copy `context/obsidian-mcp.example.json` into the repo’s `.cursor/mcp.json` and paste the key.
7. Keep **Obsidian open** while using Cursor. Restart Cursor (or reload MCP).
8. In Cursor Settings → MCP, confirm `obsidian` is green.

Without the API key, skip MCP. Methods A–C already give the agent file access.

---

## Headroom (every Cursor Agent chat)

Headroom compresses large tool output in Agent chats. Canonical note: [[HEADROOM]].

- Project MCP: repo `.cursor/mcp.json` (server `headroom`)
- Global MCP: `%USERPROFILE%\.cursor\mcp.json` (same server, all workspaces)
- Always-on rule: `.cursor/rules/headroom.mdc`
- Personal vault pointer: `Headroom.md` next to [[CrewPulse Hub]]

Reload Cursor MCP after install. Cursor-hosted models do not go through the local proxy; MCP tools still work. `headroom mcp install --agent cursor` is not available in CLI 0.35.0 — MCP JSON is written by hand. See [[HEADROOM]] for BYOK base-URL override.

---

## Daily workflow

1. Change scope in [[PRD]] (Obsidian or Cursor — same files).
2. Implement in Cursor with rules that always load these docs.
3. Link meeting notes in the personal vault to `[[PRD]]` / `[[CrewPulse Hub]]`.
4. Keep [[HEADROOM]] in the vault so Agent chats keep using compress / retrieve.
