# Requirements

## Milestone
`v0.1` Broker CRM clickable prototype wrapped in AI-team workflow.

## R-001 Prototype Login
- Provide a demo login/switch-user experience for:
  - Broker / Owner
  - Admin Assistant
  - Manager / Compliance

## R-002 Dashboard
- Show active client count.
- Show pending client count.
- Show recently updated files.
- Show a placeholder task/reminder area.

## R-003 Client List
- Show a searchable client table.
- Support status filtering.
- Show key fields needed for triage.

## R-004 Client Detail
- Show core client fields:
  - full name
  - DOB
  - masked SIN
  - address
  - email
  - phone
  - marital status
  - spouse name when relevant
  - file location
  - status

## R-005 Client Editing
- Support add client and edit client flows in the prototype.
- Keep interactions local/frontend only.

## R-006 Notes
- Support multiline timestamped notes.
- Associate notes to the selected client.

## R-007 Sensitive Data UX
- SIN must be masked by default.
- Full SIN reveal must only appear for authorized demo roles.
- Reveal actions must create a visible audit event in the prototype.

## R-008 Audit View
- Show a manager/compliance-friendly activity log.
- Restrict audit view for assistant role in the prototype.

## R-009 Demo Data Safety
- Use fake values only.
- No real client data, real SINs, or secrets.

## R-010 Workflow Enablement
- Add GSD-style planning artifacts so future work can continue through discuss → plan → execute rather than ad hoc edits.

## Out Of Scope For v0.1
- Real authentication
- Real database
- Real encryption
- Real backend/API
- CSV import/export
- File upload handling
- Production deployment
