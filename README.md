# Broker CRM Prototype

Frontend-only broker CRM prototype for quick UX testing.

## Current Status
- Clickable demo only
- Fake data only
- No backend or real authentication yet
- Wrapped in GSD-style planning artifacts under `.planning/`

## Run Locally
```bash
npm install
npm run dev
```

## Prototype Scope
- Demo role switching
- Dashboard
- Search + client list
- Client detail panel
- Add/edit client modal
- Timestamped notes
- Masked SIN reveal demo
- Audit log page

## AI-Team Workflow
This project is now wrapped for the `get-shit-done` workflow.

Key planning files:
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/phases/01-clickable-crm-prototype/`

## Suggested Next GSD Steps
If you want to continue the project in the workflow style:
1. Map or refresh code understanding if needed
2. Discuss the next phase
3. Plan the next phase
4. Execute the next phase

Example command flow:
```text
/gsd:discuss-phase 2
/gsd:plan-phase 2
/gsd:execute-phase 2
```

## Important
- Use fake/demo data only
- Do not put real client records in this prototype
- Do not treat this build as production-ready security

## Budget / Scope Note
- This repository is a prototype/demo starting point.
- A real secure broker CRM with authentication, RBAC, encrypted sensitive fields, audit logging, and production deployment will require a larger budget and should be built in later phases.
- The current prototype is meant to validate UX and workflow before that investment.
