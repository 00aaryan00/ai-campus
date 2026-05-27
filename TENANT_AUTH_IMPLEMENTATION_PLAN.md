# Tenant Auth & Onboarding Implementation Plan

## Goal
Implement tenant-aware signup/login without manual user entry, with two institution-configurable modes:

1. `email_domain`: user signs up with institute email, system verifies domain, creates account, send new password(not temporary )  to that mail (which will be used in future to login ).
2. `roster_based`: institution uploads roster CSV, user signup is allowed only if email/enrollment exists in roster, then account is created and temporary password is sent.
     where signup will ask enrollment and his registerd email given to institute(which will also be in that csv file.)
---

## Core Decisions

- `institutionId` is **not** email/domain itself.  
  It is DB ID of `Institution`.
- Domain/roster are only **verification mechanisms** to map a user into an institution.
- Tenant context comes from route: `/api/t/:tenantSlug/...`.
- All user creation is tenant-scoped using `req.tenant._id`.

---

## Data Model Changes

## `Institution`
- `authMode`: `"email_domain"` | `"roster_based"`
- `domains`: `string[]`
- `onboardingStatus`: optional (`active`, `paused`)

## `User`
- `institutionId` (already present)
- `role`: `institution_admin | hod | faculty | student | super_admin`
- `status`: `invited | active | disabled`
- `mustChangePassword`: `boolean` (true for temp-password flow)
- `lastLoginAt`

## `RosterEntry` (new model)
- `institutionId`
- `email` (lowercase)
- `enrollmentNumber` (nullable for faculty/hod)
- `name`
- `department`
- `role` (`student|faculty|hod`)
- `isActive`
- unique indexes:
  - `{ institutionId, email }`
  - `{ institutionId, enrollmentNumber }` with sparse where needed

## `PasswordResetToken` (recommended)
- `userId`, `tokenHash`, `expiresAt`, `usedAt`

---

## API Plan

## A) Institution Admin APIs

### 1. Upload roster
`POST /api/t/:tenantSlug/admin/roster/upload`
- auth: `institution_admin`
- file: CSV
- parse + validate rows
- upsert into `RosterEntry`
- return summary: inserted/updated/rejected rows

### 2. Set auth mode
`PATCH /api/t/:tenantSlug/admin/auth-mode`
- auth: `institution_admin`
- body: `{ authMode, domains? }`

### 3. View roster
`GET /api/t/:tenantSlug/admin/roster`
- filters by role/department/active

---

## B) Public Tenant Auth APIs

### 1. Signup request (no manual password)
`POST /api/t/:tenantSlug/auth/signup-request`
- body: `{ email, enrollmentNumber?, role? }`
- flow:
  - resolve tenant
  - if `email_domain`:
    - check email domain in institution domains
  - if `roster_based`:
    - verify roster entry exists for tenant
    - verify enrollmentNumber if required for student
  - if valid:
    - create user if not exists
    - generate temp password OR better: one-time setup link
    - send email
  - response always generic (avoid user enumeration)

### 2. Login   ---- > for now just login through only given password through mail , no change in pass 
`POST /api/t/:tenantSlug/auth/login`
- unchanged base flow, but:
  - check `status !== disabled`
  - if `mustChangePassword=true`, force password change workflow

### 3. First password change     //----> do not implement this now 
`POST /api/t/:tenantSlug/auth/change-temp-password`
- auth required
- old temp password + new password
- set `mustChangePassword=false`, `status=active`

---

## Security Requirements (must have)

1. Never trust `institutionId` from client body.
2. Rate-limit signup/login endpoints.
3. Generic messages for signup/login to prevent account discovery.
4. Hash passwords only (already done).
5. Prefer setup link token over plaintext temp password email.
6. Audit log every auth-critical event.
7. CSV validation hard limits (size, rows, mime, malformed inputs).
8. Block role escalation (`student` cannot self-register as `institution_admin` etc.).

---

## Email Flow Recommendation -----> also implement this later 

Instead of emailing generated password directly:

1. create one-time token (`PasswordResetToken`)
2. email link: `frontend/t/{tenantSlug}/set-password?token=...`
3. token expires in 15-30 minutes
4. user sets password once

This is more secure and real-world SaaS standard.

---

## Real-World SaaS Things You Might Be Missing

1. **User enumeration protection**  
Signup/login/reset responses should not reveal if email exists.

2. **Invite abuse protection**  
Per-IP and per-email throttles, plus captcha for signup-request.

3. **Audit trail**  
Store who changed auth mode, uploaded roster, invited users.

4. **Soft delete / disable users**  
Never hard-delete users tied to test/results.

5. **Row-level tenant isolation tests**  
Automated tests proving no cross-tenant reads/writes.

6. **Session invalidation**  
On password reset or role change, revoke old sessions/tokens.

7. **Email deliverability**  
SPF/DKIM/DMARC, bounce handling, retry queues.

8. **Data retention policy**  
Define how long logs, roster snapshots, and results are retained.

9. **PII/privacy compliance**  
Consent + deletion workflows (depending on geography/clients).

10. **Observability**  
Per-tenant metrics: signups, failures, invite sends, login errors.

---

## Suggested Build Order

1. Add `RosterEntry` model + indexes
2. Add admin roster upload + auth-mode APIs
3. Add `signup-request` flow for both modes
4. Add email sender abstraction + tokenized password setup
5. Add `mustChangePassword/status` enforcement on login
6. Add tests for tenant isolation + auth mode behavior

---

## Non-Goals (for now)

- SSO (SAML/OIDC)
- Billing/subscription enforcement
- Advanced RBAC custom policies

These can be Phase 2 after pilot validation.

