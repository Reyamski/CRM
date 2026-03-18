# Claude Project Instructions — CRM (Broker CRM Prototype)

## Project Overview

A broker CRM for managing sensitive client records. Currently a frontend-only clickable prototype (Phase 01 complete). Future phases add backend, RBAC, encrypted fields, and audit logging.

- **Repo:** https://github.com/Reyamski/CRM
- **Local path:** `c:\Users\Reyam\Downloads\AI\crm-app`
- **Stack:** React 19 + TypeScript + Vite + Tailwind CSS v4 (frontend-only for now)
- **Dev server:** `npm run dev` → http://localhost:5173/
- **GSD version:** 1.22.4

## Session Start Protocol

At the start of every session:
1. Read `.planning/PROJECT.md` and `.planning/STATE.md`
2. Check `C:/Users/Reyam/inbox/*.md` for pending agent tasks
3. Load `C:/Users/Reyam/.claude/projects/c--Users-Reyam-Downloads-AI-crm/memory/MEMORY.md`

## AI Agent System

- Inbox: `C:/Users/Reyam/inbox/*.md`
- Write agent tasks directly to inbox — do not relay or summarize
- Run agents with: `claude --dangerously-skip-permissions`
- Agents available: developer, qa, data-engineer, architect, graphic-artist

## GSD Workflow

Phase execution order:
```
/gsd:discuss-phase N
/gsd:plan-phase N
/gsd:execute-phase N
```

Current next phase: **Phase 02 - Prototype Refinement**

## Memory & Handover Protocol

At the end of every session OR before any context reset:
1. Update `.planning/STATE.md` — current focus, decisions made, what changed
2. Update `MEMORY.md` index and relevant memory files in `C:/Users/Reyam/.claude/projects/c--Users-Reyam-Downloads-AI-crm/memory/`
3. Write a `HANDOVER.md` in project root if handing off to another agent or ending work mid-phase

Memory types to maintain:
- `project_crm.md` — current phase, status, key decisions
- Add new files for significant new context (user preferences, architectural decisions)

## Non-Negotiables

- Use fake/demo data only during prototype phases
- Never use real SIN numbers or real client data
- Sensitive fields always masked by default
- Canada-origin context (not Philippines)
- No real auth/backend until Phase 03+

## Security Rules

- No hardcoded secrets — use `.env` only
- Never expose full SIN in UI by default
- RBAC rules must be enforced server-side when backend exists (not just frontend)
- Audit log must be persistent (not in-memory) when backend is added

## Preferences

- No emojis unless asked
- Terse responses — no trailing summaries
- Always give 3 options when answering questions
- No unnecessary questions — just do it
