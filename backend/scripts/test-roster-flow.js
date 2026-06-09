/**
 * E2E integration test specifically targeting roster-based authentication
 * and admin operations for AI Campus.
 * Run: node scripts/test-roster-flow.js
 */
const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const BASE = process.env.TEST_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
const connectDB = require("../src/config/db");
const Institution = require("../src/models/Institution");
const RosterEntry = require("../src/models/RosterEntry");
const User = require("../src/models/User");

const results = [];
let passed = 0;
let failed = 0;

const ts = () => new Date().toISOString();
const uid = () => `roster-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

async function request(method, path, { token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  return { status: res.status, data };
}

function record(name, ok, details = {}) {
  results.push({ name, ok, ...details, at: ts() });
  if (ok) passed += 1;
  else failed += 1;
}

async function test(name, fn) {
  try {
    const outcome = await fn();
    record(name, true, outcome || {});
  } catch (err) {
    record(name, false, { error: err.message, expected: err.expected, actual: err.actual });
  }
}

function assertStatus(res, expected, label) {
  if (res.status !== expected) {
    const err = new Error(`${label}: expected HTTP ${expected}, got ${res.status}`);
    err.expected = expected;
    err.actual = res.status;
    err.response = res.data;
    throw err;
  }
}

function assertTruthy(value, label) {
  if (!value) throw new Error(`${label}: expected truthy value`);
}

function assertEquals(actual, expected, label) {
  if (actual !== expected) {
    const err = new Error(`${label}: expected ${expected}, got ${actual}`);
    err.expected = expected;
    err.actual = actual;
    throw err;
  }
}

async function main() {
  console.log(`\n=== AI Campus Backend — Roster-Based Auth E2E Test ===`);
  console.log(`Base URL: ${BASE}\n`);

  await connectDB();

  const runId = uid();
  const TENANT_SLUG = `tenant-${runId}`;
  
  // 1. Prepare Tenant via direct DB setup or mock login. We'll set authMode: "roster_based"
  let tenantId;
  await test("Create Institution in DB with roster_based authMode", async () => {
    const inst = await Institution.create({
      name: `Roster Institution ${runId}`,
      slug: TENANT_SLUG,
      status: "active",
      authMode: "roster_based",
      branding: { displayName: `Roster Inst` }
    });
    tenantId = inst._id;
    assertTruthy(tenantId, "Institution created");
    return { tenantId, slug: TENANT_SLUG };
  });

  // Let's create an institution admin to get token
  let adminToken;
  await test("Create Institution Admin User and Log In", async () => {
    const adminEmail = `admin.${runId}@mail.com`;
    const adminPassword = "AdminPassword123";
    await User.create({
      name: "Tenant Admin",
      email: adminEmail,
      password: adminPassword,
      role: "institution_admin",
      status: "active",
      institutionId: tenantId
    });

    const loginRes = await request("POST", `/api/t/${TENANT_SLUG}/auth/login`, {
      body: { email: adminEmail, password: adminPassword }
    });
    assertStatus(loginRes, 200, "Admin login");
    adminToken = loginRes.data?.token;
    assertTruthy(adminToken, "Admin Token acquired");
    return { adminEmail };
  });

  // 2. Upload Roster - Mixed upload
  await test("Admin uploads valid mixed roster (students & faculty)", async () => {
    const res = await request("POST", `/api/t/${TENANT_SLUG}/admin/roster/upload`, {
      token: adminToken,
      body: {
        uploadGroup: "mixed",
        rows: [
          {
            email: `student1.${runId}@mail.com`,
            name: "Student One",
            role: "student",
            department: "CSE",
            enrollmentNumber: `ENR-${runId}-1`
          },
          {
            email: `student2.${runId}@mail.com`,
            name: "Student Two",
            role: "student",
            department: "ECE",
            enrollmentNumber: `ENR-${runId}-2`
          },
          {
            email: `faculty1.${runId}@mail.com`,
            name: "Faculty One",
            role: "faculty",
            department: "CSE"
          }
        ]
      }
    });

    assertStatus(res, 200, "Roster upload success");
    assertEquals(res.data.summary.totalRows, 3, "totalRows count");
    assertEquals(res.data.summary.inserted, 3, "inserted count");
    assertEquals(res.data.summary.updated, 0, "updated count");
    assertEquals(res.data.summary.rejected, 0, "rejected count");
    return { summary: res.data.summary };
  });

  // 3. Upload roster with validations / errors
  await test("Admin uploads roster with duplicate email in same batch - should reject duplicate row", async () => {
    const res = await request("POST", `/api/t/${TENANT_SLUG}/admin/roster/upload`, {
      token: adminToken,
      body: {
        uploadGroup: "mixed",
        rows: [
          {
            email: `student3.${runId}@mail.com`,
            name: "Student Three",
            role: "student",
            department: "CSE",
            enrollmentNumber: `ENR-${runId}-3`
          },
          {
            email: `student3.${runId}@mail.com`, // duplicate email
            name: "Student Three Dup",
            role: "student",
            department: "CSE",
            enrollmentNumber: `ENR-${runId}-4`
          }
        ]
      }
    });

    assertStatus(res, 200, "Upload endpoint returns 200 with partial rejection");
    assertEquals(res.data.summary.inserted, 1, "inserted count");
    assertEquals(res.data.summary.rejected, 1, "rejected count");
    assertEquals(res.data.rejected[0].reason.includes("Duplicate email"), true, "reject reason matches");
    return { summary: res.data.summary, rejected: res.data.rejected };
  });

  await test("Admin uploads roster with duplicate enrollment number in same batch", async () => {
    const res = await request("POST", `/api/t/${TENANT_SLUG}/admin/roster/upload`, {
      token: adminToken,
      body: {
        uploadGroup: "mixed",
        rows: [
          {
            email: `student4.${runId}@mail.com`,
            name: "Student Four",
            role: "student",
            department: "CSE",
            enrollmentNumber: `ENR-${runId}-4`
          },
          {
            email: `student5.${runId}@mail.com`,
            name: "Student Five",
            role: "student",
            department: "ECE",
            enrollmentNumber: `ENR-${runId}-4` // duplicate enrollment number
          }
        ]
      }
    });

    assertStatus(res, 200, "Upload endpoint returns 200 with partial rejection");
    assertEquals(res.data.summary.inserted, 1, "inserted count");
    assertEquals(res.data.summary.rejected, 1, "rejected count");
    assertEquals(res.data.rejected[0].reason.includes("Duplicate enrollmentNumber"), true, "reject reason matches");
    return { summary: res.data.summary, rejected: res.data.rejected };
  });

  await test("Admin uploads student with missing enrollment number - should fail validation", async () => {
    const res = await request("POST", `/api/t/${TENANT_SLUG}/admin/roster/upload`, {
      token: adminToken,
      body: {
        uploadGroup: "mixed",
        rows: [
          {
            email: `student6.${runId}@mail.com`,
            name: "Student Six",
            role: "student",
            department: "CSE"
            // enrollmentNumber missing
          }
        ]
      }
    });

    assertStatus(res, 200, "Upload endpoint returns 200 with rejection");
    assertEquals(res.data.summary.inserted, 0, "inserted count");
    assertEquals(res.data.summary.rejected, 1, "rejected count");
    assertEquals(res.data.rejected[0].reason, "enrollmentNumber is required for student rows", "reject reason");
    return { summary: res.data.summary, rejected: res.data.rejected };
  });

  await test("Admin uploads student roster using group 'students' - should reject faculty rows", async () => {
    const res = await request("POST", `/api/t/${TENANT_SLUG}/admin/roster/upload`, {
      token: adminToken,
      body: {
        uploadGroup: "students",
        rows: [
          {
            email: `student7.${runId}@mail.com`,
            name: "Student Seven",
            role: "student",
            department: "CSE",
            enrollmentNumber: `ENR-${runId}-7`
          },
          {
            email: `faculty2.${runId}@mail.com`,
            name: "Faculty Two",
            role: "faculty",
            department: "CSE"
          }
        ]
      }
    });

    assertStatus(res, 200, "Upload endpoint returns 200");
    assertEquals(res.data.summary.inserted, 1, "inserted count");
    assertEquals(res.data.summary.rejected, 1, "rejected count");
    assertEquals(res.data.rejected[0].reason, "This upload accepts only student rows", "reject reason");
    return { summary: res.data.summary, rejected: res.data.rejected };
  });

  // 4. Update / Re-upload Roster entry
  await test("Admin updates existing roster entry name and department by uploading again", async () => {
    const res = await request("POST", `/api/t/${TENANT_SLUG}/admin/roster/upload`, {
      token: adminToken,
      body: {
        uploadGroup: "mixed",
        rows: [
          {
            email: `student1.${runId}@mail.com`, // already exists
            name: "Student One Updated Name",
            role: "student",
            department: "CSE-Updated",
            enrollmentNumber: `ENR-${runId}-1`
          }
        ]
      }
    });

    assertStatus(res, 200, "Re-upload success");
    assertEquals(res.data.summary.totalRows, 1, "totalRows count");
    assertEquals(res.data.summary.inserted, 0, "inserted count");
    assertEquals(res.data.summary.updated, 1, "updated count");
    
    // verify in database/list
    const listRes = await request("GET", `/api/t/${TENANT_SLUG}/admin/roster`, {
      token: adminToken
    });
    assertStatus(listRes, 200, "List roster");
    const entry = listRes.data.entries.find(e => e.email === `student1.${runId}@mail.com`);
    assertTruthy(entry, "Roster entry found");
    assertEquals(entry.name, "Student One Updated Name", "updated name");
    assertEquals(entry.department, "CSE-Updated", "updated department");
    return { entry };
  });

  // 5. Signup Requests in roster mode
  await test("Student signup with email NOT in roster - should fail", async () => {
    const res = await request("POST", `/api/t/${TENANT_SLUG}/auth/signup-request`, {
      body: {
        name: "Intruder",
        email: `not-in-roster.${runId}@mail.com`,
        role: "student",
        enrollmentNumber: `ENR-${runId}-99`
      }
    });

    assertStatus(res, 400, "Signup request");
    assertEquals(res.data.success, false, "success flag");
    assertEquals(res.data.message.includes("Email not found in the institution's roster"), true, "error message");
    return { response: res.data };
  });

  await test("Student signup with role mismatch (requested HOD, roster is Student) - should fail", async () => {
    const res = await request("POST", `/api/t/${TENANT_SLUG}/auth/signup-request`, {
      body: {
        name: "Student One",
        email: `student1.${runId}@mail.com`,
        role: "hod",
        enrollmentNumber: `ENR-${runId}-1`
      }
    });

    assertStatus(res, 400, "Signup request role mismatch");
    assertEquals(res.data.success, false, "success flag");
    assertEquals(res.data.message.includes("Role mismatch"), true, "error message");
    return { response: res.data };
  });

  await test("Student signup with enrollment mismatch - should fail", async () => {
    const res = await request("POST", `/api/t/${TENANT_SLUG}/auth/signup-request`, {
      body: {
        name: "Student One",
        email: `student1.${runId}@mail.com`,
        role: "student",
        enrollmentNumber: `ENR-${runId}-WRONG`
      }
    });

    assertStatus(res, 400, "Signup request enrollment mismatch");
    assertEquals(res.data.success, false, "success flag");
    assertEquals(res.data.message.includes("Enrollment number does not match roster records"), true, "error message");
    return { response: res.data };
  });

  let studentPassword;
  await test("Student signup with correct details - should succeed and return password", async () => {
    const res = await request("POST", `/api/t/${TENANT_SLUG}/auth/signup-request`, {
      body: {
        name: "Student One",
        email: `student1.${runId}@mail.com`,
        role: "student",
        enrollmentNumber: `ENR-${runId}-1`
      }
    });

    assertStatus(res, 200, "Signup success");
    assertEquals(res.data.success, true, "success flag");
    assertTruthy(res.data.devGeneratedPassword, "devGeneratedPassword");
    studentPassword = res.data.devGeneratedPassword;
    return { password: studentPassword };
  });

  await test("Log in as signed-up student", async () => {
    const res = await request("POST", `/api/t/${TENANT_SLUG}/auth/login`, {
      body: {
        email: `student1.${runId}@mail.com`,
        password: studentPassword
      }
    });

    assertStatus(res, 200, "Student login success");
    assertEquals(res.data.success, true, "success");
    assertTruthy(res.data.token, "token");
    assertEquals(res.data.user.role, "student", "role");
    assertEquals(res.data.user.enrollmentNumber, `ENR-${runId}-1`, "enrollment number matches");
    return { token: res.data.token };
  });

  // 6. Faculty signup flow
  let facultyPassword;
  await test("Faculty signup with correct details - should succeed without enrollment number requirement", async () => {
    const res = await request("POST", `/api/t/${TENANT_SLUG}/auth/signup-request`, {
      body: {
        name: "Faculty One",
        email: `faculty1.${runId}@mail.com`,
        role: "faculty"
      }
    });

    assertStatus(res, 200, "Faculty signup success");
    assertEquals(res.data.success, true, "success");
    assertTruthy(res.data.devGeneratedPassword, "password generated");
    facultyPassword = res.data.devGeneratedPassword;
    return {};
  });

  // 7. Update roster entries using Admin routes
  let targetEntryId;
  await test("Admin lists roster and finds entry ID", async () => {
    const res = await request("GET", `/api/t/${TENANT_SLUG}/admin/roster`, {
      token: adminToken
    });
    assertStatus(res, 200, "List roster success");
    const entry = res.data.entries.find(e => e.email === `student2.${runId}@mail.com`);
    assertTruthy(entry, "Found student2 entry");
    targetEntryId = entry._id;
    return { entryId: targetEntryId };
  });

  await test("Admin patches roster entry status and details", async () => {
    const res = await request("PATCH", `/api/t/${TENANT_SLUG}/admin/roster/${targetEntryId}`, {
      token: adminToken,
      body: {
        name: "Student Two Updated Directly",
        isActive: false
      }
    });

    assertStatus(res, 200, "Patch roster entry success");
    assertEquals(res.data.success, true, "success");
    assertEquals(res.data.entry.name, "Student Two Updated Directly", "patched name");
    assertEquals(res.data.entry.isActive, false, "patched isActive status");
    return {};
  });

  // 8. Sign up with an inactive roster entry - should fail
  await test("Student attempts signup with inactive roster entry - should fail", async () => {
    const res = await request("POST", `/api/t/${TENANT_SLUG}/auth/signup-request`, {
      body: {
        name: "Student Two Updated Directly",
        email: `student2.${runId}@mail.com`,
        role: "student",
        enrollmentNumber: `ENR-${runId}-2`
      }
    });

    assertStatus(res, 400, "Signup request for inactive entry");
    assertEquals(res.data.success, false, "success");
    assertEquals(res.data.message.includes("Email not found in the institution's roster"), true, "inactive counts as not found");
    return {};
  });

  // Summary
  console.log("\n--- Test Results ---\n");
  for (const r of results) {
    const icon = r.ok ? "PASS" : "FAIL";
    const extra = r.error ? ` — ${r.error}` : "";
    console.log(`[${icon}] ${r.name}${extra}`);
  }

  console.log(`\nTOTAL: ${passed} passed, ${failed} failed (${results.length} tests)\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
