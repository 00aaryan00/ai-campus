const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
};

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || "Request failed");
  }

  return payload as T;
};

export type BackendRole = "student" | "faculty" | "hod";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: BackendRole;
  department?: string;
};

type AuthResponse = {
  success: boolean;
  message: string;
  token: string;
  user: AuthUser;
};

export const authApi = {
  register: (payload: {
    name: string;
    email: string;
    password: string;
    role: BackendRole;
    department?: string;
  }) => request<AuthResponse>("/auth/register", { method: "POST", body: payload }),

  login: (payload: { email: string; password: string }) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: payload }),

  me: (token: string) =>
    request<{ success: boolean; user: AuthUser }>("/auth/me", {
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
  joinByCode: (token: string, roomCode: string) =>
    request<LobbyResponse>("/tests/join-by-code", {
      method: "POST",
      token,
      body: { roomCode },
    }),

  startTest: (token: string, testId: string, roomCode: string) =>
    request<StartTestResponse>(`/tests/${testId}/start`, {
      method: "POST",
      token,
      body: { roomCode },
    }),
};

export const resultApi = {
  submitTest: (
    token: string,
    payload: { testId: string; answers: Array<{ questionId: string; selectedAnswer: string }> }
  ) =>
    request<SubmitTestResponse>("/results/submit", {
      method: "POST",
      token,
      body: payload,
    }),

  myResults: (token: string) =>
    request<MyResultsResponse>("/results/my-results", {
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
    }
  ) =>
    request<AiGenerateResponse>("/tests/ai/generate", {
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
  createTest: (token: string, payload: CreateTestPayload) =>
    request<CreateTestResponse>("/tests/create", {
      method: "POST",
      token,
      body: payload,
    }),
};
