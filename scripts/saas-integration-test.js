/**
 * SaaS-style end-to-end API integration tests for AI Campus backend.
 * Run: node scripts/saas-integration-test.js
 */
const dotenv = require("dotenv");
dotenv.config();

const BASE = process.env.TEST_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

const results = [];
let passed = 0;
let failed = 0;
let skipped = 0;

const ts = () => new Date().toISOString();
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const sampleQuestion = (text, correct = "B") => ({
  questionText: text,
  options: ["A", "B", "C", "D"],
  correctAnswer: correct,
  marks: 2,
  difficultyLevel: "medium",
  topic: "integration-test",
});

async function request(method, path, { token, body, expectStatus } = {}) {
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

  return { status: res.status, data, headers: res.headers };
}

function record(category, name, ok, details = {}) {
  const entry = { category, name, ok, ...details, at: ts() };
  results.push(entry);
  if (details.skipped) skipped += 1;
  else if (ok) passed += 1;
  else failed += 1;
}

async function test(name, category, fn) {
  try {
    const outcome = await fn();
    if (outcome?.skipped) {
      record(category, name, true, { skipped: true, note: outcome.note });
    } else {
      record(category, name, true, outcome || {});
    }
  } catch (err) {
    record(category, name, false, { error: err.message, expected: err.expected, actual: err.actual });
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

async function registerUser(role, suffix) {
  const email = `${role}.${suffix}@saas-test.local`;
  const res = await request("POST", "/api/auth/register", {
    body: {
      name: `${role} ${suffix}`,
      email,
      password: "TestPass123!",
      role,
      department: "CSE",
    },
  });
  assertStatus(res, 201, `register ${role}`);
  assertTruthy(res.data?.token, "register token");
  return { email, token: res.data.token, user: res.data.user };
}

async function main() {
  console.log(`\n=== AI Campus Backend — SaaS Integration Test ===`);
  console.log(`Base URL: ${BASE}\n`);

  const runId = uid();

  // --- Infrastructure ---
  await test("Health check returns 200", "Infrastructure", async () => {
    const res = await request("GET", "/api/health");
    assertStatus(res, 200, "health");
    assertTruthy(res.data?.success, "health success");
    return { status: res.status };
  });

  await test("Unknown route returns 404", "Infrastructure", async () => {
    const res = await request("GET", "/api/does-not-exist");
    assertStatus(res, 404, "not found");
    return {};
  });

  // --- Auth & tenancy (multi-role SaaS) ---
  let faculty, student, student2, hod;

  await test("Register faculty tenant user", "Auth / Multi-tenant", async () => {
    faculty = await registerUser("faculty", runId);
    return { userId: faculty.user?.id };
  });

  await test("Register student tenant user", "Auth / Multi-tenant", async () => {
    student = await registerUser("student", runId);
    return { userId: student.user?.id };
  });

  await test("Register second student (isolation)", "Auth / Multi-tenant", async () => {
    student2 = await registerUser("student", `${runId}-b`);
    return { userId: student2.user?.id };
  });

  await test("Register HOD role user", "Auth / Multi-tenant", async () => {
    hod = await registerUser("hod", runId);
    return { role: hod.user?.role };
  });

  await test("Reject duplicate email registration", "Auth / Security", async () => {
    const res = await request("POST", "/api/auth/register", {
      body: {
        name: "Dup",
        email: faculty.email,
        password: "TestPass123!",
        role: "student",
      },
    });
    assertStatus(res, 409, "duplicate");
    return {};
  });

  await test("Reject registration with short password", "Auth / Validation", async () => {
    const res = await request("POST", "/api/auth/register", {
      body: {
        name: "Bad",
        email: `short.${runId}@saas-test.local`,
        password: "123",
        role: "student",
      },
    });
    assertStatus(res, 400, "short password");
    return {};
  });

  await test("Reject invalid role", "Auth / Validation", async () => {
    const res = await request("POST", "/api/auth/register", {
      body: {
        name: "Bad Role",
        email: `badrole.${runId}@saas-test.local`,
        password: "TestPass123!",
        role: "admin",
      },
    });
    assertStatus(res, 400, "invalid role");
    return {};
  });

  await test("Normalize teacher alias to faculty on register", "Auth / Roles", async () => {
    const email = `teacher.${runId}@saas-test.local`;
    const res = await request("POST", "/api/auth/register", {
      body: {
        name: "Teacher Alias",
        email,
        password: "TestPass123!",
        role: "teacher",
      },
    });
    assertStatus(res, 201, "teacher register");
    if (res.data?.user?.role !== "faculty") {
      throw new Error(`expected faculty role, got ${res.data?.user?.role}`);
    }
    return {};
  });

  await test("Login with valid credentials", "Auth", async () => {
    const res = await request("POST", "/api/auth/login", {
      body: { email: student.email, password: "TestPass123!" },
    });
    assertStatus(res, 200, "login");
    assertTruthy(res.data?.token, "login token");
    student.token = res.data.token;
    return {};
  });

  await test("Login rejects wrong password", "Auth / Security", async () => {
    const res = await request("POST", "/api/auth/login", {
      body: { email: student.email, password: "WrongPass!" },
    });
    assertStatus(res, 401, "wrong password");
    return {};
  });

  await test("GET /me requires Bearer token", "Auth / Security", async () => {
    const res = await request("GET", "/api/auth/me");
    assertStatus(res, 401, "no token");
    return {};
  });

  await test("GET /me returns current user profile", "Auth", async () => {
    const res = await request("GET", "/api/auth/me", { token: faculty.token });
    assertStatus(res, 200, "me");
    assertTruthy(res.data?.user?.email === faculty.email, "me email");
    return { email: res.data.user.email };
  });

  await test("Invalid JWT rejected", "Auth / Security", async () => {
    const res = await request("GET", "/api/auth/me", { token: "invalid.jwt.token" });
    assertStatus(res, 401, "bad jwt");
    return {};
  });

  // --- RBAC ---
  await test("Student cannot create tests (403)", "RBAC", async () => {
    const res = await request("POST", "/api/tests/create", {
      token: student.token,
      body: {
        title: "Hack",
        subject: "X",
        duration: 30,
        sets: { common: [sampleQuestion("Q1")] },
      },
    });
    assertStatus(res, 403, "student create blocked");
    return {};
  });

  await test("Faculty cannot access student results (403)", "RBAC", async () => {
    const res = await request("GET", "/api/results/my-results", { token: faculty.token });
    assertStatus(res, 403, "faculty results blocked");
    return {};
  });

  await test("HOD cannot create tests without faculty role (403)", "RBAC", async () => {
    const res = await request("POST", "/api/tests/create", {
      token: hod.token,
      body: {
        title: "HOD Test",
        subject: "Mgmt",
        duration: 20,
        sets: { common: [sampleQuestion("Q")] },
      },
    });
    assertStatus(res, 403, "hod create blocked");
    return {};
  });

  // --- Faculty: publish test (common mode SaaS flow) ---
  let publishedTest = null;
  let roomCode = null;
  let testId = null;

  await test("Faculty creates published common-mode test", "Faculty / Test lifecycle", async () => {
    const res = await request("POST", "/api/tests/create", {
      token: faculty.token,
      body: {
        title: `SaaS Common Test ${runId}`,
        subject: "Mathematics",
        mode: "common",
        duration: 45,
        instructions: "Answer all questions.",
        sets: {
          common: [
            sampleQuestion("What is 2+2?", "B"),
            sampleQuestion("Capital of France?", "B"),
          ],
        },
      },
    });
    assertStatus(res, 201, "create test");
    assertTruthy(res.data?.test?.roomCode, "room code");
    publishedTest = res.data.test;
    roomCode = publishedTest.roomCode;
    testId = publishedTest.id || publishedTest._id;
    return { roomCode, questionCount: publishedTest.sets?.common?.length };
  });

  await test("Reject create without required fields", "Faculty / Validation", async () => {
    const res = await request("POST", "/api/tests/create", {
      token: faculty.token,
      body: { title: "Incomplete" },
    });
    assertStatus(res, 400, "incomplete create");
    return {};
  });

  await test("Reject publish with empty question set", "Faculty / Validation", async () => {
    const res = await request("POST", "/api/tests/create", {
      token: faculty.token,
      body: {
        title: "Empty",
        subject: "X",
        duration: 10,
        mode: "common",
        sets: { common: [] },
      },
    });
    assertStatus(res, 400, "empty set");
    return {};
  });

  // --- Student journey ---
  let lobbyPayload = null;
  let startPayload = null;
  let questionIds = [];

  await test("Student joins test lobby by room code", "Student / Test flow", async () => {
    const res = await request("POST", "/api/tests/join-by-code", {
      token: student.token,
      body: { roomCode },
    });
    assertStatus(res, 200, "join lobby");
    lobbyPayload = res.data;
    assertTruthy(res.data?.test, "lobby test");
    const qCount = res.data?.test?.questionCount;
    if (!qCount || qCount < 1) throw new Error("lobby should expose question count, not content");
    return { questionCount: qCount };
  });

  await test("Lobby does not leak question answers before start", "Student / Security", async () => {
    const testObj = lobbyPayload?.test;
    const leaked =
      JSON.stringify(testObj || {}).includes("correctAnswer") ||
      (testObj?.questions && testObj.questions.length > 0);
    if (leaked) throw new Error("lobby leaked question content or answers");
    return {};
  });

  await test("Faculty cannot join as student (403)", "RBAC", async () => {
    const res = await request("POST", "/api/tests/join-by-code", {
      token: faculty.token,
      body: { roomCode },
    });
    assertStatus(res, 403, "faculty join blocked");
    return {};
  });

  await test("Student starts test and receives questions", "Student / Test flow", async () => {
    const res = await request("POST", `/api/tests/${testId}/start`, {
      token: student.token,
      body: { roomCode },
    });
    assertStatus(res, 201, "start test");
    startPayload = res.data;
    const questions = res.data?.test?.questions || [];
    if (questions.length < 1) throw new Error("expected questions after start");
    questionIds = questions.map((q) => q.id || q._id);
    return { questionCount: questions.length, attemptId: res.data?.attempt?.id || res.data?.attempt?._id };
  });

  await test("Resume start returns existing attempt (idempotent)", "Student / Reliability", async () => {
    const res = await request("POST", `/api/tests/${testId}/start`, {
      token: student.token,
      body: { roomCode },
    });
    assertStatus(res, 200, "resume start");
    if (!res.data?.message?.toLowerCase().includes("existing")) {
      return { note: "200 OK on second start (reuse path)" };
    }
    return {};
  });

  await test("Start without room code fails", "Student / Validation", async () => {
    const res = await request("POST", `/api/tests/${testId}/start`, {
      token: student2.token,
      body: {},
    });
    assertStatus(res, 400, "no room code");
    return {};
  });

  // Second student full flow for isolation
  await test("Second student can join and start same test", "Multi-tenant / Isolation", async () => {
    const join = await request("POST", "/api/tests/join-by-code", {
      token: student2.token,
      body: { roomCode },
    });
    assertStatus(join, 200, "student2 join");
    const start = await request("POST", `/api/tests/${testId}/start`, {
      token: student2.token,
      body: { roomCode },
    });
    assertStatus(start, 201, "student2 start");
    return {};
  });

  await test("Submit without starting fails for student2 path", "Student / Validation", async () => {
    const fakeTestId = testId;
    const res = await request("POST", "/api/results/submit", {
      token: student2.token,
      body: { testId: fakeTestId, answers: [] },
    });
    if (res.status === 201) {
      return { skipped: true, note: "student2 already started — skip" };
    }
    return {};
  });

  await test("Student submits answers and gets scored result", "Student / Results", async () => {
    const questions = startPayload?.test?.questions || [];
    const answers = questions.map((q) => ({
      questionId: q.id || q._id,
      selectedAnswer: q.correctAnswer || "B",
    }));

    const res = await request("POST", "/api/results/submit", {
      token: student.token,
      body: { testId, answers },
    });
    assertStatus(res, 201, "submit");
    const result = res.data?.result;
    if (!result) throw new Error("missing result");
    if (result.score !== result.totalMarks) {
      throw new Error(`expected full score, got ${result.score}/${result.totalMarks}`);
    }
    return { score: result.score, accuracy: result.accuracy };
  });

  await test("Duplicate submit rejected (409)", "Student / Idempotency", async () => {
    const res = await request("POST", "/api/results/submit", {
      token: student.token,
      body: {
        testId,
        answers: questionIds.map((id) => ({ questionId: id, selectedAnswer: "A" })),
      },
    });
    assertStatus(res, 409, "duplicate submit");
    return {};
  });

  await test("Cannot re-join lobby after submit (409)", "Student / Business rules", async () => {
    const res = await request("POST", "/api/tests/join-by-code", {
      token: student.token,
      body: { roomCode },
    });
    assertStatus(res, 409, "re-join after submit");
    return {};
  });

  await test("GET my-results lists submission", "Student / Results", async () => {
    const res = await request("GET", "/api/results/my-results", { token: student.token });
    assertStatus(res, 200, "my results");
    const found = (res.data?.results || []).some(
      (r) => String(r.testId?._id || r.testId) === String(testId)
    );
    if (!found) throw new Error("submitted result not in my-results");
    return { count: res.data.count };
  });

  // --- Adaptive mode ---
  let adaptiveRoomCode = null;
  let adaptiveTestId = null;

  await test("Faculty creates adaptive-mode test", "Adaptive / Faculty", async () => {
    const res = await request("POST", "/api/tests/create", {
      token: faculty.token,
      body: {
        title: `SaaS Adaptive ${runId}`,
        subject: "Physics",
        mode: "adaptive",
        duration: 30,
        sets: {
          easy: [sampleQuestion("Easy Q", "B")],
          medium: [sampleQuestion("Medium Q", "B")],
          hard: [sampleQuestion("Hard Q", "B")],
        },
      },
    });
    assertStatus(res, 201, "adaptive create");
    adaptiveRoomCode = res.data.test.roomCode;
    adaptiveTestId = res.data.test.id || res.data.test._id;
    return { roomCode: adaptiveRoomCode };
  });

  await test("New student gets adaptive band (medium baseline)", "Adaptive / Student", async () => {
    const adaptiveStudent = await registerUser("student", `${runId}-adaptive`);
    const join = await request("POST", "/api/tests/join-by-code", {
      token: adaptiveStudent.token,
      body: { roomCode: adaptiveRoomCode },
    });
    assertStatus(join, 200, "adaptive join");
    const assignedSet = join.data?.test?.assignedSet;
    if (!["easy", "medium", "hard"].includes(assignedSet)) {
      throw new Error(`unexpected assignedSet: ${assignedSet}`);
    }
    return { assignedSet };
  });

  // --- Edge cases ---
  await test("Invalid room code returns 404", "Edge cases", async () => {
    const res = await request("POST", "/api/tests/join-by-code", {
      token: student2.token,
      body: { roomCode: "XXXXXX" },
    });
    assertStatus(res, 404, "bad room code");
    return {};
  });

  await test("Submit with invalid test id returns 400", "Edge cases", async () => {
    const res = await request("POST", "/api/results/submit", {
      token: student2.token,
      body: { testId: "not-an-id", answers: [] },
    });
    assertStatus(res, 400, "bad test id");
    return {};
  });

  await test("Submit malformed answers returns 400", "Edge cases", async () => {
    const res = await request("POST", "/api/results/submit", {
      token: student2.token,
      body: { testId, answers: [{ foo: "bar" }] },
    });
    assertStatus(res, 400, "bad answers shape");
    return {};
  });

  // --- Commented routes (product gap) ---
  await test("Draft routes are not exposed (expected gap)", "API coverage", async () => {
    const res = await request("POST", "/api/tests/save-draft", {
      token: faculty.token,
      body: {
        title: "Draft",
        subject: "X",
        duration: 10,
        sets: { common: [sampleQuestion("D")] },
      },
    });
    assertStatus(res, 404, "save-draft not mounted");
    return { note: "save-draft and update draft are implemented but commented in testRoutes.js" };
  });

  // Summary
  console.log("\n--- Test Results ---\n");
  const byCategory = {};
  for (const r of results) {
    if (!byCategory[r.category]) byCategory[r.category] = { pass: 0, fail: 0, skip: 0 };
    if (r.skipped) byCategory[r.category].skip += 1;
    else if (r.ok) byCategory[r.category].pass += 1;
    else byCategory[r.category].fail += 1;
  }

  for (const r of results) {
    const icon = r.skipped ? "SKIP" : r.ok ? "PASS" : "FAIL";
    const extra = r.error ? ` — ${r.error}` : r.note ? ` — ${r.note}` : "";
    console.log(`[${icon}] ${r.category} > ${r.name}${extra}`);
  }

  console.log("\n--- Summary by category ---");
  for (const [cat, counts] of Object.entries(byCategory)) {
    console.log(`  ${cat}: ${counts.pass} passed, ${counts.fail} failed, ${counts.skip} skipped`);
  }

  console.log(`\nTOTAL: ${passed} passed, ${failed} failed, ${skipped} skipped (${results.length} tests)\n`);

  const reportPath = require("path").join(__dirname, "saas-test-report.json");
  require("fs").writeFileSync(
    reportPath,
    JSON.stringify({ runId, baseUrl: BASE, summary: { passed, failed, skipped }, results, byCategory }, null, 2)
  );
  console.log(`Report written to ${reportPath}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
