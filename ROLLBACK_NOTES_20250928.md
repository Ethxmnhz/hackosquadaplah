# Rollback Notes (2025-09-28)

## Objective
Revert post-minimal security hardening changes while preserving the original "minimal critical security" migration (authoritative admin check + rate-limited plan grant). This rollback removes newer RPC abstractions and returns the system to direct table interaction for:

- Grant audit listing (no longer via `admin_list_grants` RPC; now direct `admin_grant_audit` select in UI)
- Challenge moderation (approve/reject now direct `UPDATE challenges` instead of SECURITY DEFINER RPCs)
- Certificate grant function reverted to pre-rate-limit (no `rate_limited` flag)

## What Was Removed
- Function: `admin_list_grants(int,int)`
- Function: `admin_approve_challenge(uuid,text)`
- Function: `admin_reject_challenge(uuid,text)`
- Policy (if present): `admin_update_challenges` on `public.challenges`
- Rate limiting logic inside `admin_grant_certificate`

## What Was Kept
- `is_admin()` authoritative role check function
- Rate-limited `admin_grant_plan` introduced in minimal critical security migration
- Existing audit table `admin_grant_audit` (if present)

## Affected Frontend Files
- `billing-admin/src/pages/Grants.tsx`: now queries `admin_grant_audit` directly and ignores `rate_limited` field (no longer present for certificate grants)
- `project-final/src/pages/admin/AdminDashboard.tsx`: challenge approve/reject uses direct table `update` calls again

## Behavioral Changes After Rollback
| Feature | Before Rollback | After Rollback |
|---------|------------------|----------------|
| Plan Grant | Rate limited (kept) | Rate limited |
| Certificate Grant | Rate limited + flag | No rate limit flag (grants always attempt) |
| Listing Grants | Via `admin_list_grants` RPC filtering allowed roles | Direct table select (relies on existing RLS / none) |
| Challenge Approve/Reject | SECURE via RPC role gate | Direct table update (depends entirely on RLS) |
| Challenge Policy | Optional admin update policy existed | Policy dropped (unless another migration re-adds) |

## Risk / Security Regression
- Loss of role enforcement encapsulation for moderation: ensure RLS still restricts unauthorized updates to `challenges`.
- Loss of certificate grant rate limiting may re-open potential abuse vector if audit spam risk was material.
- Direct audit table select may expose sensitive columns if RLS not hardened.

## Recommended If Re-Rolling Forward Later
1. Re-introduce moderation RPCs first, then reapply RLS tightening.
2. Re-add `admin_list_grants` before adding deny-all on `admin_grant_audit`.
3. Re-add certificate rate limiting if abuse observed.

## How to Apply This Rollback
Deploy migration file:
`20250928190000_rollback_post_minimal_security.sql`

## Verification Checklist
- [ ] Functions `admin_list_grants`, `admin_approve_challenge`, `admin_reject_challenge` no longer appear in `pg_proc`.
- [ ] `admin_grant_certificate` signature returns 4 columns (no `rate_limited`).
- [ ] Grants UI loads audit rows directly.
- [ ] Approve / Reject buttons function (assuming existing RLS allows current admin user).

## Manual psql Commands (Optional)
```
\df+ public.admin_grant_certificate
select * from public.admin_grant_certificate('user@example.com','00000000-0000-0000-0000-000000000000');
```

## Rollback Applied At
2025-09-28 19:00:00

---
If you need a forward re-hardening bundle later, we can regenerate a consolidated migration with the prior improvements.
