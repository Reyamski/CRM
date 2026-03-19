# HANDOVER — CRM App

**Last updated:** 2026-03-19
**Handed off by:** Claude (Sonnet 4.6)

---

## Project

- **Name:** R Fernandez Services — Client Management Portal
- **Repo:** https://github.com/Reyamski/CRM
- **Local path:** `c:\Users\Reyam\Downloads\AI\crm-app`
- **Live (prod):** https://crm-app-rho-lovat.vercel.app
- **Stack:** React 19 + TypeScript + Vite + Tailwind CSS v4 + Supabase + Vercel

---

## Current Status

Production is live and being used by the broker team. Real client data is being entered (10+ active clients as of today).

### Branches
- `main` → production (auto-deploys to Vercel on push)
- `develop` → QA/preview
- `feature/richer-records-and-user-mgmt` → built, NOT yet merged — needs local QA first

---

## What's Live (main)

- Real Supabase auth + RLS + RBAC (3 roles: Broker/Owner, Admin Assistant, Manager/Compliance)
- Client records: name, DOB, SIN (masked, reveal audited), address, email, phone, marital status, spouse, file location
- Timestamped notes per client
- Audit log (role-restricted)
- Duplicate client detection
- 30-min idle session timeout
- Professional dark navy + gold UI — "R Fernandez Services" branding
- Security headers via vercel.json (CSP, HSTS, X-Frame-Options)
- GitHub Actions keep-alive ping every 30 mins (pings both REST + auth endpoints)

### Users
- broker@crm.local / Broker@2026! → Rose Fernandez (Broker / Owner)
- assistant@crm.local / Assistant@2026! → Admin Assistant
- manager@crm.local / Manager@2026! → Manager / Compliance

---

## What's on Feature Branch (not merged)

`feature/richer-records-and-user-mgmt` contains:
- **Option 2:** Additional broker fields — mortgage_type, lender, property_address, loan_amount, rate_expiry_date, referral_source
- **Option 3:** Password reset flow, My Profile (change name/password), Team management (deactivate/reactivate users)
- DB migration: `supabase/migration-v2.sql` — must run in Supabase SQL Editor BEFORE testing

**Do NOT merge to main until:**
1. Run migration-v2.sql in Supabase
2. Test locally (`npm run dev`)
3. Test on develop branch
4. Confirm with user

---

## Known Issues / Recent Fixes

- Supabase JS v2 auth lock bug: stale sessions cause `signInWithPassword` and `signOut` to hang indefinitely. Fixed by directly clearing `sb-owllakjxcihfjrwcwnbh-auth-token` from localStorage before auth operations.
- Duplicate detection was matching null/empty email+phone as duplicates. Fixed.
- Keep-alive was only pinging REST endpoint, not auth. Both now pinged.

---

## Important Rules

- **Always test locally before pushing to main** — `npm run dev` at localhost:5173
- **Never push directly to main for features** — use develop branch → PR → merge
- Hotfixes may go to main directly but must be tested locally first
- Run DB migrations in Supabase SQL Editor before testing new schema changes
- Never hardcode secrets — all in `.env`

---

## Run Locally

```bash
cd "c:\Users\Reyam\Downloads\AI\crm-app"
npm install
npm run dev
```

Open: http://localhost:5173

`.env` file needs:
```
VITE_SUPABASE_URL=https://owllakjxcihfjrwcwnbh.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

---

## Supabase

- Project: **CRMBroker** (AWS us-west-2)
- Size: ~25 MB / 500 MB free tier
- Free tier pauses after 7 days inactivity (keep-alive prevents this)
- Schema: `supabase/schema.sql`
- Security hardening: `supabase/security-fixes.sql`

---

## Next Suggested Work

1. Merge `feature/richer-records-and-user-mgmt` after QA
2. Mobile responsiveness polish
3. Password reset + user management (already built on feature branch)
