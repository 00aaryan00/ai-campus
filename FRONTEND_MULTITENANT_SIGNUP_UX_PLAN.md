# Frontend Multi-Tenant Signup UX Plan

## Objective
Integrate the new backend multi-tenant auth/signup system into frontend with:
- clean and professional UI
- low-friction flow (guided questions first, then minimal form)
- role-aware onboarding (`student`, `faculty`, `hod`)
- tenant-aware routing and API usage

This document is **implementation-first** and maps directly to code structure.

---

## 1) Product UX Principles

1. Keep first screen simple: "Who are you?" + "Which institute?"
2. Ask only necessary fields for selected role and auth mode.
3. Prevent dead-end forms by validating step-by-step.
4. Use a guided flow (wizard) instead of one long signup page.
5. Show clear status states: loading, success, failure, retry.
6. Keep login/signup symmetric under tenant route: `/t/:tenantSlug/...`.

---

## 2) Route Architecture (Frontend)

Add tenant-aware pages:

- `/t/:tenantSlug/login`
- `/t/:tenantSlug/signup`
- `/t/:tenantSlug/signup/success`
- `/t/:tenantSlug/forgot-password` (future)

Keep existing app routes, but auth entry should begin from tenant path.

---

## 3) Signup Flow (Step-by-Step Wizard)

## Step 0: Tenant Resolve
- Read `tenantSlug` from URL.
- Call `GET /api/t/:tenantSlug/health`.
- If invalid tenant: show "Institution not found" page.
- If valid: continue and show tenant branding/title.

## Step 1: Role Selection (Question Screen)
Prompt: "Tell us about you"
- Options:
  - Student
  - Faculty
  - HOD

Store selected role in local wizard state.

## Step 2: Basic Identity
Collect:
- Full name
- Institute email
- Department (dropdown or free text)

## Step 3: Mode-Specific Questions
Depends on tenant auth mode (fetched from backend via public meta endpoint or inferred by response policy):

### If `email_domain`
- No extra student-only roster check field required by UI.
- For student: optional enrollment field only if your policy wants it.

### If `roster_based`
- Student: ask enrollment number (required).
- Faculty/HOD: no enrollment required by default.

## Step 4: Review + Submit
- Show summary card:
  - Role
  - Name
  - Email
  - Department
  - Enrollment (if present)
- Action button: `Request Account`

## Step 5: Result State
On success:
- Show neutral confirmation:
  "If your details match institutional records, credentials are sent to your email."
- Button: `Go to Login`

On failure:
- Contextual message + retry CTA.

---

## 4) Login Flow

Route: `/t/:tenantSlug/login`

Fields:
- Institute email
- Password

Behavior:
- POST `/api/t/:tenantSlug/auth/login`
- On success:
  - store JWT + user payload
  - route to role dashboard
- On 401:
  - generic invalid credentials message
- If disabled:
  - show admin-contact hint

---

## 5) UI Components to Build

## Auth Shell
- `TenantAuthLayout`
  - branding panel (left/top)
  - form panel
  - soft animated background

## Wizard Components
- `RoleCardSelector`
- `SignupStepper`
- `IdentityFormStep`
- `ModeSpecificStep`
- `ReviewSubmitStep`
- `SignupSuccessState`

## Shared
- `TenantBadge`
- `InlineValidationMessage`
- `AuthProgressBar`

---

## 6) State Model (Frontend)

Create `signupWizardState`:

- `tenantSlug`
- `tenantName`
- `role`
- `name`
- `email`
- `department`
- `enrollmentNumber`
- `authMode` (if exposed)
- `step`
- `isSubmitting`
- `errors`

Use React context or page-local reducer (`useReducer`) to keep transitions explicit.

---

## 7) API Contract Mapping

## Signup request
`POST /api/t/:tenantSlug/auth/signup-request`

Payload:
```json
{
  "role": "student",
  "name": "Aaryan",
  "email": "2023bcs001@rgipt.ac.in",
  "department": "CSE",
  "enrollmentNumber": "2023BCS001"
}
```

## Login
`POST /api/t/:tenantSlug/auth/login`
```json
{
  "email": "2023bcs001@rgipt.ac.in",
  "password": "..."
}
```

## Tenant verify
`GET /api/t/:tenantSlug/health`

---

## 8) Validation Rules (UI)

1. Email must be valid format.
2. Role required before progressing.
3. Name required (2+ chars).
4. Department required for faculty/HOD; optional/required per policy for student.
5. Enrollment required only when:
   - role is `student` and tenant mode is `roster_based`.
6. Prevent duplicate submit while request in progress.

---

## 9) Professional UX Details

1. Debounced inline validation (not aggressive).
2. Submit button states:
   - idle
   - loading
   - success
   - retry
3. Keyboard-friendly:
   - Enter to proceed
   - visible focus ring
4. Mobile-first spacing and sticky bottom CTA.
5. Keep copy concise and institutional tone.

---

## 10) Error Handling Strategy

1. Tenant not found/inactive -> dedicated full-page state.
2. Network error -> toast + inline retry.
3. 429 (rate limit) -> cooldown message.
4. Generic signup response should not leak account existence.

---

## 11) Dashboard Redirect Rules after Login

- `student` -> `/t/:tenantSlug/student`
- `faculty` -> `/t/:tenantSlug/faculty`
- `hod` -> `/t/:tenantSlug/hod`
- `institution_admin` -> `/t/:tenantSlug/admin`
- `super_admin` -> platform route (outside tenant flow)

---

## 12) Implementation Chunks (Frontend)

## Chunk A
- Tenant-aware auth routes
- `TenantAuthLayout`
- Tenant health resolve guard

## Chunk B
- Signup wizard steps + validations
- Role-first guided UX

## Chunk C
- API integration for signup-request/login
- auth context updates with tenant-aware token flow

## Chunk D
- polish, animations, accessibility, responsive QA

---

## 13) Non-Goals in this pass

- Email link password setup flow
- Forgot/reset password UX
- SSO

These can be added after core tenant signup/login stabilization.

---

## 14) Acceptance Checklist

1. User can open tenant signup from `/t/:tenantSlug/signup`.
2. User sees role-first onboarding.
3. Student roster flow enforces enrollment only where required.
4. Faculty/HOD flow skips student-only fields.
5. Signup request submits successfully to backend.
6. Login works tenant-scoped and redirects by role.
7. UI remains clean on desktop and mobile.

