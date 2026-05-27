# AI Campus SaaS Multi-Tenant Blueprint

## 1. Purpose
This document is the implementation blueprint for evolving the current AI Campus codebase into a true multi-tenant SaaS platform where multiple institutions can safely use the system in isolation.

This is a **build-and-review guide** (not just ideas). We will implement in phases and review each phase before moving to the next.

---

## 2. Core Decisions (Locked)

### 2.1 Role naming
- Backend canonical role names:
  - `super_admin`  // for saas product
  - `institution_admin` (platform-safe name)
  - `hod`
  - `faculty`
  - `student`
- Frontend display mapping:
  - `institution_admin` -> **"Principal/Admin"**

### 2.2 Tenant resolution strategy
We will use path-based tenant resolution first (simplest and robust):
- Route pattern: `/t/:tenantSlug/...`
- Tenant middleware resolves `tenantSlug` -> institution
- Middleware attaches `req.tenant`

### 2.3 Isolation rule
Every domain entity carrying business data must be tenant-scoped by `institutionId`.

---

## 3. Target Hierarchy and Authority

### 3.1 Super Admin (platform owner)
Can:
- create institutions
- manage subscription plans
- view platform-wide analytics/health

### 3.2 Institution Admin (Principal/Admin)
Can:
- manage institution settings
- create/manage HODs and faculty
- manage student onboarding and verification
- view institution analytics

### 3.3 HOD
Can:
- manage department-level oversight
- view department analytics
- handle department operational controls

### 3.4 Faculty
Can:
- create and manage tests
- view class analytics
- manage class-specific workflows

### 3.5 Student
Can:
- join tests
- submit attempts
- view own results only

**Important:** RBAC is enforced in backend middleware/controllers. Frontend hiding buttons is not security.

---

## 4. Data Model Direction

## 4.1 New `Institution` model
Fields (initial):
- `_id`
- `name`
- `slug` (unique)
- `status` (`active`, `inactive`, `suspended`)
- `domains` (array of allowed email domains)
- `authMode` (`email_domain` | `roster_based`)
- `branding` (name, logo, theme)
- timestamps

### 4.2 Add `institutionId` everywhere (minimum)
- `User`
- `Test`
- `Question`
- `TestAttempt`
- `Result`
- analytics tables/facts
- any future leave/attendance objects

### 4.3 Optional but recommended early: `Membership`
Use when same user can belong to multiple institutions.
For phase-1 MVP we can keep direct `institutionId` on `User` and add `Membership` later.     --------> not for now 

---

## 5. Auth Architecture

### 5.1 JWT payload (tenant-aware)
```json
{
  "userId": "...",
  "institutionId": "...",
  "role": "faculty"
}
```

### 5.2 Token checks
On protected routes:
1. Validate JWT
2. Resolve tenant from `/t/:tenantSlug`
3. Ensure token `institutionId` == resolved tenant `_id`
4. Apply role checks

### 5.3 Signup modes per institution
`Institution.authMode` controls signup logic:

1. `email_domain`
- user enters institution email
- backend checks domain against institution domains
- send OTP/passcode to email
- activate account after verification

2. `roster_based`
- institution admin uploads student roster CSV
- student signup requires:
  - enrollment number
  - email
- backend verifies both against roster
- then sends OTP/passcode and activates

---

## 6. API and Routing Direction

## 6.1 Tenant route envelope
All tenant APIs should be under:
- `/api/t/:tenantSlug/...`

Example:
- `/api/t/rgipt/auth/login`
- `/api/t/rgipt/tests/create`
- `/api/t/rgipt/results/submit`

### 6.2 Frontend route envelope
All app routes should include tenant slug:
- `/t/:tenantSlug/login`
- `/t/:tenantSlug/student/dashboard`
- `/t/:tenantSlug/faculty/dashboard`

### 6.3 Query policy
Every DB read/write must include `institutionId` predicate or assignment.

---

## 7. Security and Isolation Rules

1. No cross-tenant read/write allowed.
2. No cross-department access unless role permits.
3. Room-code based test joining must still check:
   - tenant match
   - department policy
4. Result reads must be scoped by tenant and role.
5. Audit critical operations:
   - login
   - test publish/create
   - role changes
   - student approval

---

## 8. Health and Operational Endpoints

Add:
- `/health` -> app + db basic status
- `/health/redis` -> queue infrastructure health
- `/health/worker` -> worker heartbeat/check
- optional `/health/ai-service` -> upstream AI service reachability

These endpoints are essential for institution pilot testing.

---// something may already implemented

## 9. Phased Implementation Plan

### Phase 1: Multi-tenant foundation (must do first)
- Add `Institution` model
- Add `institutionId` in core models
- Build tenant middleware (`/t/:tenantSlug` -> `req.tenant`)
- Backfill existing records with default institution

### Phase 2: Tenant-aware auth and RBAC
- Update JWT payload
- Update auth middleware for tenant checks
- Add `institution_admin` role and role guards

### Phase 3: Tenant-aware APIs and routing
- Move APIs under `/api/t/:tenantSlug`
- Update frontend route structure to `/t/:tenantSlug/...`
- Update API client base path generation

### Phase 4: Signup modes and onboarding
- Institution admin creates institution settings
- Domain-based signup + OTP
- Roster upload + enrollment/email verification + OTP

### Phase 5: Ops hardening and test readiness
- health endpoints
- test fixtures/seeds for multiple institutions
- cross-tenant security tests
- role access tests

---

## 10. Code Review Learning Guide (How to review each phase)
For every PR/phase, review in this order:

1. **Schema diff**
- Did `institutionId` get added where needed?
- Are indexes present?

2. **Middleware path**
- Is tenant resolved exactly once?
- Is `req.tenant` mandatory for protected tenant APIs?

3. **Auth + role guards**
- Is JWT payload tenant-aware?
- Are role checks enforced server-side?

4. **Controller query scoping**
- Do all queries include `institutionId`?
- Any missing predicate = isolation bug.

5. **Negative tests**
- Can user from institution A access institution B resources?
- Must fail with 403/404.

6. **Frontend tenant context**
- Is tenant slug propagated in navigation and API calls?

---

## 11. Immediate Next Step
Next action after this document:
- Start **Phase 1** only.
- Implement institution model + tenant middleware + core schema additions.
- Review before touching auth/UI routing.

---
## 12. Non-goals for first pilot
- Full billing automation
- Deep white-label customization
- Multi-region deployment complexity

Keep pilot scope strict so institutions can test safely and quickly.
