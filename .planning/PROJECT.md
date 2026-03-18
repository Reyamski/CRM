# Broker CRM Prototype

## Vision
Build a secure broker CRM for managing highly sensitive client records with strong privacy controls, auditability, and role-based access.

## Current State
- This project currently contains a frontend-only clickable prototype built in React + TypeScript.
- The prototype is intentionally fake-data-only and exists to validate workflow, layout, and user experience before real backend/security work begins.
- The prototype already demonstrates:
  - Demo role switching
  - Dashboard and client list
  - Client detail view
  - Add/edit modal
  - Timestamped notes
  - Masked SIN behavior
  - Audit log screen

## Product Direction
The real product should evolve into a production-ready CRM for a broker business with:
- secure authentication
- RBAC
- encrypted sensitive fields
- audit logging
- soft delete and archive workflows
- search, filtering, pagination
- future support for reminders, uploads, and integrations

## Non-Negotiables
- Use fake/demo data only during prototype work.
- Never use real SIN or real client data.
- Never expose full sensitive fields by default.
- Favor secure defaults over convenience.
- Mark anything requiring legal/compliance approval before production.

## Prototype Scope
This repository is currently treated as a brownfield prototype project:
- preserve the current clickable demo
- improve UX and screen flow incrementally
- use `.planning/` as the AI-team operating system for future work
- avoid premature backend implementation until prototype feedback is captured

## Success For This Milestone
The current milestone succeeds if:
- the clickable CRM prototype is easy to demo
- key broker workflows are visible end-to-end
- privacy expectations are visible in the UI
- the project is now wrapped in a GSD-style planning structure for future phases
