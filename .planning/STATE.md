# State

## Current Milestone
- `v0.2` — Live with Supabase + Vercel

## Current Focus
Feature branch `feature/richer-records-and-user-mgmt` — built, committed, pushed. **NOT yet merged to develop/main.**
Awaiting QA testing on local dev before merge.

## What Exists (as of 2026-03-19)

### Deployed (main → crm-app-rho-lovat.vercel.app)
- Real Supabase auth (no localStorage)
- Row Level Security (RLS) with role-based access
- Clients: full_name, DOB, SIN (masked/reveal), address, email, phone, marital status, file location
- Timestamped notes per client
- Audit log (Broker/Owner + Manager/Compliance only)
- SIN stored in separate `client_sensitive` table, reveal is audited
- Dark navy + gold professional UI — "R Fernandez Services" branding
- 30-min idle session timeout
- Security headers via vercel.json
- QA branch (develop) with Vercel preview env

### On feature branch (needs QA before prod)
- **Option 2 — Richer client records:** mortgage_type, lender, property_address, loan_amount, rate_expiry_date, referral_source
- **Option 3 — User management:** forgot password flow, password reset via email link, "My Profile" view (change name + password), Team view (deactivate/reactivate members, send reset email)
- DB migration required: `supabase/migration-v2.sql`
- Dashboard now shows total mortgage book value

## Key Decisions
- Supabase (PostgreSQL + Auth + RLS) for all persistence — no localStorage
- Deployed on Vercel free tier via CLI (not GitHub integration — papspective@gmail.com not in Reyamski's Vercel team)
- Two Vercel projects: old `crm` (crm-beta-flame, dead) and current `crm-app` (crm-app-rho-lovat)
- SECURITY DEFINER RPCs for profile updates (bypasses RLS safely)
- Users created manually in Supabase dashboard (trigger copies metadata to profiles)

## Next Steps
1. Run `supabase/migration-v2.sql` in Supabase SQL Editor (required before testing feature branch)
2. Test feature branch locally: `npm run dev` on `feature/richer-records-and-user-mgmt`
3. QA: test all new fields, forgot password flow, team management
4. Merge: feature → develop (preview) → main (prod)
5. Deploy to prod: `npx vercel --prod --yes`

## Run Context
- Project path: `c:\Users\Reyam\Downloads\AI\crm-app`
- Local dev: `npm run dev` → http://localhost:5173/
- Prod URL: https://crm-app-rho-lovat.vercel.app
- Active branch: `feature/richer-records-and-user-mgmt`
