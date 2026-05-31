export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const ACTIVE_TENANT_KEY = "activeTenantSlug";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
};

const getActiveTenantSlug = () => localStorage.getItem(ACTIVE_TENANT_KEY);

export const tenantSession = {
  setActiveTenantSlug: (tenantSlug: string) => localStorage.setItem(ACTIVE_TENANT_KEY, tenantSlug),
  getActiveTenantSlug,
  clearActiveTenantSlug: () => localStorage.removeItem(ACTIVE_TENANT_KEY),
};

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
  };
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || "GET",
    headers,
    body: isFormData ? (options.body as FormData) : (options.body ? JSON.stringify(options.body) : undefined),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error: any = new Error(payload?.message || "Request failed");
    error.status = response.status;
    throw error;
  }

  return payload as T;
};

const tenantPath = (tenantSlug: string | null | undefined, resource: string) => {
  const slug = tenantSlug || getActiveTenantSlug();
  if (!slug) {
    throw new Error("Tenant slug is required");
  }
  return `/t/${slug}${resource}`;
};

export type BackendRole = "student" | "faculty" | "hod" | "institution_admin";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: BackendRole;
  department?: string;
  semester?: string;
  enrollmentNumber?: string | null;
};

type AuthResponse = {
  success: boolean;
  message: string;
  token: string;
  user: AuthUser;
};

type SignupRequestResponse = {
  success: boolean;
  message: string;
  devGeneratedPassword?: string;
};

type TenantHealthResponse = {
  success: boolean;
  message: string;
  tenant: {
    id: string;
    name: string;
    slug: string;
    status: string;
    authMode: "email_domain" | "roster_based";
    domains: string[];
  };
};

export const authApi = {
  tenantHealth: (tenantSlug: string) =>
    request<TenantHealthResponse>(tenantPath(tenantSlug, "/health"), {
      method: "GET",
    }),

  signupRequest: (
    tenantSlug: string,
    payload: {
      role: "student" | "faculty" | "hod";
      name: string;
      email: string;
      department?: string;
      enrollmentNumber?: string;
    }
  ) => request<SignupRequestResponse>(tenantPath(tenantSlug, "/auth/signup-request"), { method: "POST", body: payload }),

  login: (tenantSlug: string, payload: { email: string; password: string }) =>
    request<AuthResponse>(tenantPath(tenantSlug, "/auth/login"), { method: "POST", body: payload }),

  me: (token: string, tenantSlug?: string) =>
    request<{ success: boolean; user: AuthUser }>(tenantPath(tenantSlug || null, "/auth/me"), {
      method: "GET",
      token,
    }),
};

type LobbyResponse = {
  success: boolean;
  message: string;
  test: {
    _id: string;
    title: string;
    subject: string;
    mode: string;
    duration: number;
    instructions: string;
    roomCode: string;
    assignedSet: string;
    questionCount: number;
    totalMarks: number;
  };
};

type StartTestResponse = {
  success: boolean;
  message: string;
  attempt: {
    _id: string;
    status: string;
    expiresAt: string;
    submittedAt: string | null;
  };
  test: {
    _id: string;
    title: string;
    subject: string;
    mode: string;
    duration: number;
    instructions: string;
    roomCode: string;
    assignedSet: string;
    totalMarks: number;
    questions: Array<{
      _id: string;
      questionText: string;
      options: string[];
      marks: number;
      type: string;
      difficultyLevel: string;
      topic: string;
    }>;
  };
};

type SubmitTestResponse = {
  success: boolean;
  message: string;
  result: {
    _id: string;
    score: number;
    totalMarks: number;
    accuracy: number;
    submittedAt: string;
  };
};

type MyResultsResponse = {
  success: boolean;
  count: number;
  results: Array<{
    _id: string;
    score: number;
    totalMarks: number;
    accuracy: number;
    submittedAt: string;
    testId?: { title?: string; subject?: string };
  }>;
};

export const testApi = {
  joinByCode: (token: string, roomCode: string, tenantSlug?: string) =>
    request<LobbyResponse>(tenantPath(tenantSlug || null, "/tests/join-by-code"), {
      method: "POST",
      token,
      body: { roomCode },
    }),

  startTest: (token: string, testId: string, roomCode: string, tenantSlug?: string) =>
    request<StartTestResponse>(tenantPath(tenantSlug || null, `/tests/${testId}/start`), {
      method: "POST",
      token,
      body: { roomCode },
    }),
};

export const resultApi = {
  submitTest: (
    token: string,
    payload: { testId: string; answers: Array<{ questionId: string; selectedAnswer: string }> },
    tenantSlug?: string
  ) =>
    request<SubmitTestResponse>(tenantPath(tenantSlug || null, "/results/submit"), {
      method: "POST",
      token,
      body: payload,
    }),

  myResults: (token: string, tenantSlug?: string) =>
    request<MyResultsResponse>(tenantPath(tenantSlug || null, "/results/my-results"), {
      method: "GET",
      token,
    }),
};

type AiGenerateResponse = {
  success: boolean;
  mode: "common" | "adaptive";
  sets: {
    common?: Array<{
      questionText: string;
      options: string[];
      correctAnswer: string;
      marks: number;
      difficultyLevel: string;
      topic: string;
      source: "ai";
    }>;
    easy?: Array<{
      questionText: string;
      options: string[];
      correctAnswer: string;
      marks: number;
      difficultyLevel: string;
      topic: string;
      source: "ai";
    }>;
    medium?: Array<{
      questionText: string;
      options: string[];
      correctAnswer: string;
      marks: number;
      difficultyLevel: string;
      topic: string;
      source: "ai";
    }>;
    hard?: Array<{
      questionText: string;
      options: string[];
      correctAnswer: string;
      marks: number;
      difficultyLevel: string;
      topic: string;
      source: "ai";
    }>;
  };
};

export const facultyAiApi = {
  generateQuestions: (
    token: string,
    payload: {
      transcript: string;
      mode: "same" | "adaptive";
      totalQuestions?: number;
      totalMarks?: number;
      difficulty?: string;
    },
    tenantSlug?: string
  ) =>
    request<AiGenerateResponse>(tenantPath(tenantSlug || null, "/tests/ai/generate"), {
      method: "POST",
      token,
      body: payload,
    }),
};

type CreateTestPayload = {
  title: string;
  subject: string;
  mode: "common" | "adaptive";
  duration: number;
  instructions?: string;
  sets: {
    common?: Array<{
      questionText: string;
      options: string[];
      correctAnswer: string;
      marks: number;
      difficultyLevel: string;
      topic: string;
      source: "ai" | "manual";
    }>;
    easy?: Array<{
      questionText: string;
      options: string[];
      correctAnswer: string;
      marks: number;
      difficultyLevel: string;
      topic: string;
      source: "ai" | "manual";
    }>;
    medium?: Array<{
      questionText: string;
      options: string[];
      correctAnswer: string;
      marks: number;
      difficultyLevel: string;
      topic: string;
      source: "ai" | "manual";
    }>;
    hard?: Array<{
      questionText: string;
      options: string[];
      correctAnswer: string;
      marks: number;
      difficultyLevel: string;
      topic: string;
      source: "ai" | "manual";
    }>;
  };
};

type CreateTestResponse = {
  success: boolean;
  message: string;
  test: {
    _id: string;
    title: string;
    roomCode: string;
    subject: string;
    mode: "common" | "adaptive";
    duration: number;
    status: "published" | "draft" | "closed";
  };
};

export const facultyTestApi = {
  createTest: (token: string, payload: CreateTestPayload, tenantSlug?: string) =>
    request<CreateTestResponse>(tenantPath(tenantSlug || null, "/tests/create"), {
      method: "POST",
      token,
      body: payload,
    }),
};

type PlatformLoginResponse = {
  success: boolean;
  message: string;
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: "super_admin";
  };
};

type PublicInstitution = {
  id: string;
  name: string;
  slug: string;
};

export const platformApi = {
  login: (payload: { email: string; password: string }) =>
    request<PlatformLoginResponse>("/platform/auth/login", {
      method: "POST",
      body: payload,
    }),

  me: (token: string) =>
    request<{
      success: boolean;
      user: {
        id: string;
        name: string;
        email: string;
        role: "super_admin";
      };
    }>("/platform/auth/me", {
      method: "GET",
      token,
    }),

  listInstitutions: () =>
    request<{
      success: boolean;
      institutions: PublicInstitution[];
    }>("/platform/institutions", {
      method: "GET",
    }),

  createInstitution: (
    token: string,
    payload: {
      name: string;
      slug: string;
      domains: string[];
      authMode: "email_domain" | "roster_based";
      adminName: string;
      adminEmail: string;
      adminPassword: string;
    }
  ) =>
    request<{
      success: boolean;
      message: string;
      institution: { id: string; name: string; slug: string };
      institutionAdmin: { email: string };
    }>("/platform/institutions", {
      method: "POST",
      token,
      body: payload,
    }),
};

export const tenantAdminApi = {
  uploadRosterCsv: (token: string, tenantSlug: string, csvContent: string) =>
    request<{
      success: boolean;
      summary: { totalRows: number; inserted: number; updated: number; rejected: number };
      rejected: Array<{ rowNumber: number; reason: string }>;
    }>(tenantPath(tenantSlug, "/admin/roster/upload"), {
      method: "POST",
      token,
      body: { csvContent },
    }),

  uploadRosterRows: (
    token: string,
    tenantSlug: string,
    rows: Array<{
      email: string;
      name: string;
      role: "student" | "faculty" | "hod";
      department?: string;
      enrollmentNumber?: string;
      isActive?: boolean;
    }>,
    uploadGroup: "mixed" | "students" | "staff" = "mixed"
  ) =>
    request<{
      success: boolean;
      summary: { totalRows: number; inserted: number; updated: number; rejected: number };
      rejected: Array<{ rowNumber: number; reason: string }>;
    }>(tenantPath(tenantSlug, "/admin/roster/upload"), {
      method: "POST",
      token,
      body: { rows, uploadGroup },
    }),

  listRoster: (
    token: string,
    tenantSlug: string,
    filters?: { role?: "student" | "faculty" | "hod"; department?: string; isActive?: boolean }
  ) =>
    request<{
      success: boolean;
      count: number;
      entries: Array<{
        _id: string;
        institutionId: string;
        email: string;
        enrollmentNumber?: string;
        name: string;
        department: string;
        role: "student" | "faculty" | "hod";
        isActive: boolean;
        createdAt: string;
      }>;
    }>(
      `${tenantPath(tenantSlug, "/admin/roster")}${
        filters
          ? `?${new URLSearchParams(
              Object.entries(filters)
                .filter(([, v]) => v !== undefined && v !== "")
                .map(([k, v]) => [k, String(v)])
            ).toString()}`
          : ""
      }`,
      {
        method: "GET",
        token,
      }
    ),

  updateRosterEntry: (
    token: string,
    tenantSlug: string,
    entryId: string,
    payload: {
      name?: string;
      role?: "student" | "faculty" | "hod";
      department?: string;
      enrollmentNumber?: string;
      isActive?: boolean;
    }
  ) =>
    request<{
      success: boolean;
      message: string;
    }>(tenantPath(tenantSlug, `/admin/roster/${entryId}`), {
      method: "PATCH",
      token,
      body: payload,
    }),

  listUsers: (
    token: string,
    tenantSlug: string,
    filters?: { role?: "student" | "faculty" | "hod"; status?: "invited" | "active" | "disabled"; department?: string }
  ) =>
    request<{
      success: boolean;
      count: number;
      users: Array<{
        _id: string;
        name: string;
        email: string;
        role: "student" | "faculty" | "hod";
        department?: string;
        enrollmentNumber?: string | null;
        status: "invited" | "active" | "disabled";
      }>;
    }>(
      `${tenantPath(tenantSlug, "/admin/users")}${
        filters
          ? `?${new URLSearchParams(
              Object.entries(filters)
                .filter(([, v]) => Boolean(v))
                .map(([k, v]) => [k, String(v)])
            ).toString()}`
          : ""
      }`,
      {
        method: "GET",
        token,
      }
    ),

  updateUser: (
    token: string,
    tenantSlug: string,
    userId: string,
    payload: {
      name?: string;
      role?: "student" | "faculty" | "hod";
      department?: string;
      enrollmentNumber?: string;
    }
  ) =>
    request<{
      success: boolean;
      message: string;
      user: {
        id: string;
        name: string;
        email: string;
        role: "student" | "faculty" | "hod";
        department?: string;
        enrollmentNumber?: string | null;
        status: "invited" | "active" | "disabled";
      };
    }>(tenantPath(tenantSlug, `/admin/users/${userId}`), {
      method: "PATCH",
      token,
      body: payload,
    }),

  setUserStatus: (
    token: string,
    tenantSlug: string,
    userId: string,
    status: "invited" | "active" | "disabled"
  ) =>
    request<{
      success: boolean;
      message: string;
      user: {
        id: string;
        status: "invited" | "active" | "disabled";
      };
    }>(tenantPath(tenantSlug, `/admin/users/${userId}/status`), {
      method: "PATCH",
      token,
      body: { status },
    }),
};

export type EventAudience = "hods" | "faculty" | "students" | "all";

export type EventItem = {
  _id: string;
  title: string;
  venue: string;
  date: string;
  description?: string;
  fileUrl?: string;
  targetAudience: EventAudience;
  tenantSlug: string;
  createdBy: string;
  createdAt: string;
};

export const eventApi = {
  getEvents: (token: string, tenantSlug: string) =>
    request<{ success: boolean; events: EventItem[] }>(tenantPath(tenantSlug, `/events`), {
      method: "GET",
      token,
    }),

  createEvent: (token: string, tenantSlug: string, formData: FormData) =>
    request<{ success: boolean; event: EventItem }>(tenantPath(tenantSlug, `/events`), {
      method: "POST",
      token,
      body: formData,
    }),

  deleteEvent: (token: string, tenantSlug: string, eventId: string) =>
    request<{ success: boolean; message: string }>(tenantPath(tenantSlug, `/events/${eventId}`), {
      method: "DELETE",
      token,
    }),
};

export type LeaveItem = {
  _id: string;
  studentId: string;
  studentName: string;
  department: string;
  semester?: string;
  reason: string;
  fromDate: string;
  toDate: string;
  status: "Pending" | "Approved" | "Rejected";
  fileUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export const leaveApi = {
  applyLeave: (token: string, tenantSlug: string, formData: FormData) =>
    request<{ success: boolean; message: string; leave: LeaveItem }>(tenantPath(tenantSlug, `/leaves/apply`), {
      method: "POST",
      token,
      body: formData,
    }),

  getMyLeaves: (token: string, tenantSlug: string) =>
    request<{ success: boolean; leaves: LeaveItem[] }>(tenantPath(tenantSlug, `/leaves/my-leaves`), {
      method: "GET",
      token,
    }),

  getDepartmentLeaves: (token: string, tenantSlug: string) =>
    request<{ success: boolean; leaves: LeaveItem[] }>(tenantPath(tenantSlug, `/leaves/department-leaves`), {
      method: "GET",
      token,
    }),

  getAllLeaves: (token: string, tenantSlug: string) =>
    request<{ success: boolean; leaves: LeaveItem[] }>(tenantPath(tenantSlug, `/leaves/all-leaves`), {
      method: "GET",
      token,
    }),

  updateLeaveStatus: (token: string, tenantSlug: string, leaveId: string, status: "Approved" | "Rejected") =>
    request<{ success: boolean; message: string; leave: LeaveItem }>(tenantPath(tenantSlug, `/leaves/${leaveId}/status`), {
      method: "PATCH",
      token,
      body: { status },
    }),
};

export type AttendanceTest = {
  _id: string;
  title: string;
  subject: string;
  department: string;
  roomCode: string;
  createdAt: string;
  attendanceSubmitted: boolean;
};

export type AttendanceStudent = {
  _id: string;
  name: string;
  email: string;
  department: string;
  role: string;
};

export type AttendanceSummaryItem = {
  _id: string;
  subject: string;
  totalTests: number;
  attendedTests: number;
  percentage: number;
};

export const attendanceApi = {
  getFacultyTests: (token: string, tenantSlug: string, date?: string) =>
    request<{ success: boolean; tests: AttendanceTest[] }>(
      tenantPath(tenantSlug, `/attendance/faculty/tests${date ? `?date=${date}` : ""}`),
      { method: "GET", token }
    ),

  getTestStudents: (token: string, tenantSlug: string, testId: string) =>
    request<{ success: boolean; submitted: boolean; students: AttendanceStudent[] }>(
      tenantPath(tenantSlug, `/attendance/faculty/test-students/${testId}`),
      { method: "GET", token }
    ),

  submitAttendance: (
    token: string,
    tenantSlug: string,
    testId: string,
    presentStudentIds: string[]
  ) =>
    request<{ success: boolean; message: string }>(
      tenantPath(tenantSlug, `/attendance/submit`),
      { method: "POST", token, body: { testId, presentStudentIds } }
    ),

  getStudentSummary: (token: string, tenantSlug: string) =>
    request<{ success: boolean; attendance: AttendanceSummaryItem[] }>(
      tenantPath(tenantSlug, `/attendance/student/summary`),
      { method: "GET", token }
    ),
};

export const dashboardApi = {
  getStudentStats: (token: string, tenantSlug: string) =>
    request<{ success: boolean; stats: any }>(
      tenantPath(tenantSlug, `/dashboard/student`),
      { method: "GET", token }
    ),

  getFacultyStats: (token: string, tenantSlug: string) =>
    request<{ success: boolean; stats: any }>(
      tenantPath(tenantSlug, `/dashboard/faculty`),
      { method: "GET", token }
    ),

  getPrincipalStats: (token: string, tenantSlug: string) =>
    request<{ success: boolean; stats: any }>(
      tenantPath(tenantSlug, `/dashboard/principal`),
      { method: "GET", token }
    ),
};

