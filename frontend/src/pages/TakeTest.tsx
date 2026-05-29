import studentImage from "../assets/student.png";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";

import MainLayout from "../layout/MainLayout";
import { useAuth } from "../context/AuthContext";
import { resultApi, testApi } from "../services/api";

type LobbyTest = {
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

type ActiveQuestion = {
  _id: string;
  questionText: string;
  options: string[];
  marks: number;
};

const buildDraftKey = (testId: string) => `test-draft-${testId}`;

export default function TakeTest() {
  const { token, user } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const initialCode = useMemo(
    () => (params.get("code") || "").trim().toUpperCase(),
    [params]
  );

  const [roomCode, setRoomCode] = useState(initialCode);
  const [lobby, setLobby] = useState<LobbyTest | null>(null);
  const [questions, setQuestions] = useState<ActiveQuestion[]>([]);
  const [testId, setTestId] = useState<string>("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [visitedQuestions, setVisitedQuestions] = useState<string[]>([]);
  const [reviewedQuestions, setReviewedQuestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [summary, setSummary] = useState<{
    score: number;
    totalMarks: number;
    accuracy: number;
  } | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [timeLeftMs, setTimeLeftMs] = useState<number>(0);
  const [hasResumedAttempt, setHasResumedAttempt] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  // Refs/guards
  const latestAnswersRef = useRef<Record<string, string>>({});
  const submittingRef = useRef(false); // blocks duplicate submits (manual or auto)
  const mountedRef = useRef(false);
  const intervalIdRef = useRef<number | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (intervalIdRef.current !== null) {
        window.clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
  }, []);

  const joinExam = async () => {
    if (!token) {
      setError("Please login again.");
      return;
    }
    if (!roomCode) {
      setError("Please enter a valid exam code.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await testApi.joinByCode(token, roomCode);

      setLobby({
        _id: response.test._id,
        title: response.test.title,
        subject: response.test.subject,
        mode: response.test.mode,
        duration: response.test.duration,
        instructions: response.test.instructions,
        roomCode: response.test.roomCode,
        assignedSet: response.test.assignedSet,
        questionCount: response.test.questionCount,
        totalMarks: response.test.totalMarks,
      });

      setMessage(response.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join exam");
    } finally {
      setLoading(false);
    }
  };

  const startExam = async () => {
    if (!token || !lobby) return;

    setLoading(true);
    setError("");

    try {
      const response = await testApi.startTest(token, lobby._id, lobby.roomCode);

      setTestId(response.test._id);
      setExpiresAt(response.attempt.expiresAt);

      setHasResumedAttempt(
        response.message?.toLowerCase?.().includes("existing attempt") ?? false
      );

      const qs: ActiveQuestion[] = response.test.questions.map((q: any) => ({
        _id: q._id,
        questionText: q.questionText,
        options: q.options,
        marks: q.marks,
      }));
      setQuestions(qs);

      try {
        const storedDraft = localStorage.getItem(buildDraftKey(response.test._id));
        const parsed = storedDraft ? (JSON.parse(storedDraft) as Record<string, string>) : {};
        setAnswers(parsed);
        latestAnswersRef.current = parsed;
      } catch {
        setAnswers({});
        latestAnswersRef.current = {};
      }

      setSummary(null);
      setMessage(response.message || "");
      setCurrentQuestion(0);
      setVisitedQuestions(qs.length > 0 ? [qs[0]._id] : []);
      setReviewedQuestions([]);

      submittingRef.current = false;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start exam");
    } finally {
      setLoading(false);
    }
  };

  const hardResetStateAfterSubmit = useCallback(
    (msg?: string) => {
      try {
        if (testId) localStorage.removeItem(buildDraftKey(testId));
      } catch {}
      setQuestions([]);
      setLobby(null);
      setTestId("");
      setExpiresAt(null);
      setTimeLeftMs(0);
      setHasResumedAttempt(false);
      setRoomCode("");
      if (msg) setMessage(msg);
    },
    [testId]
  );

  const submitExam = useCallback(async () => {
    if (!token || !testId || questions.length === 0) return;
    if (submittingRef.current) return;

    submittingRef.current = true;
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        testId,
        answers: questions.map((q) => ({
          questionId: q._id,
          selectedAnswer: answers[q._id] || "",
        })),
      };

      console.log("SUBMIT STARTED");
      console.log("TOKEN:", token);
      console.log("PAYLOAD:", payload);

      const response = await resultApi.submitTest(token, payload);
      console.log("SUBMIT RESPONSE:", response);

      // Clean up local drafts safely
      hardResetStateAfterSubmit(response.message || "Submitted.");

      if (response.result) {
        setSummary({
          score: response.result.score,
          totalMarks: response.result.totalMarks,
          accuracy: response.result.accuracy,
        });
      } else {
        // Fallback in case result isn't fully formed
        navigate("/student/dashboard");
      }
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e instanceof Error ? e.message : "Failed to submit exam");
      submittingRef.current = false;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [answers, questions, testId, token, hardResetStateAfterSubmit, navigate]);

  useEffect(() => {
    if (initialCode) setRoomCode(initialCode);
  }, [initialCode]);

  // Persist answers draft
  useEffect(() => {
    if (!testId || questions.length === 0) return;
    latestAnswersRef.current = answers;
    try {
      localStorage.setItem(buildDraftKey(testId), JSON.stringify(answers));
    } catch {}
  }, [answers, questions.length, testId]);

  // Timer & Robust Auto-Submit Loop
  useEffect(() => {
    if (intervalIdRef.current !== null) {
      window.clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }

    if (!expiresAt || questions.length === 0) {
      setTimeLeftMs(0);
      return;
    }

    const updateLeft = () => {
      const remaining = new Date(expiresAt).getTime() - Date.now();
      const clamped = Math.max(remaining, 0);
      setTimeLeftMs(clamped);
      return clamped;
    };

    const firstRemaining = updateLeft();

    if (firstRemaining <= 0) {
      if (!submittingRef.current) {
        setMessage("Time is up. Auto-submitting your test...");
        console.log("AUTO SUBMIT TRIGGERED");
        void submitExam();
      }
      return;
    }

    const id = window.setInterval(() => {
      const remaining = updateLeft();
      if (remaining <= 0) {
        window.clearInterval(id);
        intervalIdRef.current = null;
        if (!submittingRef.current) {
          setMessage("Time is up. Auto-submitting your test...");
          void submitExam();
        }
      }
    }, 1000);

    intervalIdRef.current = id;

    return () => {
      if (intervalIdRef.current !== null) {
        window.clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
  }, [expiresAt, questions.length, submitExam]);

  const timerText = useMemo(() => {
    const totalSeconds = Math.floor(timeLeftMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return hours > 0 ? `${hours}:${minutes}:${seconds}` : `${minutes}:${seconds}`;
  }, [timeLeftMs]);

  const currentQuestionData = questions[currentQuestion];

  // Counts
  const notVisitedCount = questions.length - visitedQuestions.length;

  const answeredCount = Object.keys(answers).filter(
    (id) => answers[id] && !reviewedQuestions.includes(id)
  ).length;

  const notAnsweredCount = visitedQuestions.filter(
    (id) => !answers[id] && !reviewedQuestions.includes(id)
  ).length;

  const reviewedCount = reviewedQuestions.filter((id) => !answers[id]).length;

  const answeredAndReviewedCount = reviewedQuestions.filter((id) => answers[id]).length;

  const goToIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= questions.length) return;
      const target = questions[index];
      setCurrentQuestion(index);
      if (!visitedQuestions.includes(target._id)) {
        setVisitedQuestions((prev) => [...prev, target._id]);
      }
    },
    [questions, visitedQuestions]
  );

  // Keyboard Navigation
  useEffect(() => {
    if (questions.length === 0) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      if (e.key === "ArrowRight") {
        goToIndex(Math.min(currentQuestion + 1, questions.length - 1));
      } else if (e.key === "ArrowLeft") {
        goToIndex(Math.max(currentQuestion - 1, 0));
      } else if (/^[1-9]$/.test(e.key)) {
        const n = parseInt(e.key, 10) - 1;
        if (n < questions.length) goToIndex(n);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [questions.length, currentQuestion, goToIndex]);

  const handleLogout = () => {
    try {
      if (testId) localStorage.removeItem(buildDraftKey(testId));
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
    } catch {}
    navigate("/login");
  };

  // 1) ACTIVE TEST VIEW
  if (questions.length > 0 && currentQuestionData) {
    return (
      <div className="min-h-screen w-full bg-[#160028] text-white">
        <div className="grid grid-rows-[auto_1fr] min-h-screen">
          {/* HEADER */}
          <div className="px-6 py-4 border-b border-purple-700 bg-[#1b0730]">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-16 h-16 rounded bg-white overflow-hidden border border-gray-300 shrink-0">
                  <img
                    src={studentImage}
                    alt="student"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="leading-6 truncate">
                  <p className="text-xl font-bold truncate">
                    Candidate: <span className="text-pink-400">{user?.name || "Student"}</span>
                  </p>
                  <p className="text-sm text-gray-300 truncate">
                    {user?.email || "student@gmail.com"}
                  </p>
                  <p className="text-sm text-gray-300 truncate">
                    Exam: <span className="text-pink-400">{lobby?.title}</span> • Subject:{" "}
                    <span className="text-pink-400">{lobby?.subject}</span>
                  </p>
                </div>
              </div>

              {/* Timer metrics display */}
              <div className="text-center">
                <p className="text-xs uppercase tracking-wider text-gray-300">Time Left</p>
                <p className="text-2xl font-extrabold text-fuchsia-400 tabular-nums">
                  {timerText}
                </p>
                {hasResumedAttempt && (
                  <p className="text-[11px] text-amber-300 mt-1">Resumed attempt</p>
                )}
                {!!message && (
                  <p className="text-[11px] text-emerald-300 mt-1 truncate max-w-[260px]">
                    {message}
                  </p>
                )}
                {!!error && (
                  <p className="text-[11px] text-rose-300 mt-1 truncate max-w-[260px]">
                    {error}
                  </p>
                )}
              </div>

              <div className="flex items-center">
                <button
                  onClick={handleLogout}
                  className="bg-[#2b103d] px-5 py-2 rounded-xl font-semibold text-orange-300 hover:bg-[#3a1452] transition"
                >
                  🚪 Logout
                </button>
              </div>
            </div>
          </div>

          {/* MAIN CONTENT WORKSPACE */}
          <div className="grid md:grid-cols-[1fr_minmax(300px,360px)] gap-6 h-full px-6 py-5">
            {/* LEFT QUESTION WRAPPER */}
            <div className="min-h-0">
              <div className="bg-[#22092f] border border-purple-700 rounded-2xl p-6 h-full">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h2 className="text-2xl md:text-3xl font-bold">
                    Question {currentQuestion + 1} of {questions.length}
                  </h2>
                  <span className="text-yellow-300 font-semibold">
                    Marks: {currentQuestionData.marks}
                  </span>
                </div>

                <p className="text-lg md:text-xl leading-8 text-gray-200 mb-6">
                  {currentQuestionData.questionText}
                </p>

                <div className="space-y-4">
                  {currentQuestionData.options.map((option) => (
                    <label
                      key={option}
                      className="flex items-center gap-4 border border-purple-700 p-4 rounded-xl cursor-pointer hover:bg-purple-900"
                    >
                      <input
                        type="radio"
                        name={currentQuestionData._id}
                        className="accent-fuchsia-500 w-5 h-5"
                        checked={answers[currentQuestionData._id] === option}
                        onChange={() =>
                          setAnswers((prev) => ({
                            ...prev,
                            [currentQuestionData._id]: option,
                          }))
                        }
                      />
                      <span className="text-lg">{option}</span>
                    </label>
                  ))}
                </div>

                {/* Question Toolbar Controls */}
                <div className="flex flex-wrap gap-3 mt-8 items-center">
                  <button
                    onClick={() => goToIndex(currentQuestion - 1)}
                    disabled={currentQuestion === 0}
                    className="bg-slate-600 disabled:opacity-50 px-5 py-3 rounded-xl font-bold text-base"
                  >
                    ← Prev
                  </button>

                  <button
                    onClick={() => {
                      if (answers[currentQuestionData._id]) {
                        setReviewedQuestions((prev) =>
                          prev.filter((id) => id !== currentQuestionData._id)
                        );
                      }
                      if (currentQuestion < questions.length - 1) {
                        const nextQuestion = questions[currentQuestion + 1];
                        setCurrentQuestion((i) => i + 1);
                        if (!visitedQuestions.includes(nextQuestion._id)) {
                          setVisitedQuestions((prev) => [...prev, nextQuestion._id]);
                        }
                      }
                    }}
                    className="bg-green-600 px-5 py-3 rounded-xl font-bold text-base"
                  >
                    Save & Next
                  </button>

                  <button
                    onClick={() =>
                      setAnswers((prev) => ({
                        ...prev,
                        [currentQuestionData._id]: "",
                      }))
                    }
                    className="bg-red-500 px-5 py-3 rounded-xl font-bold text-base"
                  >
                    Clear
                  </button>

                  <button
                    onClick={() => {
                      if (!reviewedQuestions.includes(currentQuestionData._id)) {
                        setReviewedQuestions((prev) => [...prev, currentQuestionData._id]);
                      }
                      if (currentQuestion < questions.length - 1) {
                        const nextQuestion = questions[currentQuestion + 1];
                        setCurrentQuestion((i) => i + 1);
                        if (!visitedQuestions.includes(nextQuestion._id)) {
                          setVisitedQuestions((prev) => [...prev, nextQuestion._id]);
                        }
                      }
                    }}
                    className="bg-orange-500 px-5 py-3 rounded-xl font-bold text-base text-white"
                  >
                    Save & Mark For Review
                  </button>

                  <button
                    onClick={() => {
                      if (!reviewedQuestions.includes(currentQuestionData._id)) {
                        setReviewedQuestions((prev) => [...prev, currentQuestionData._id]);
                      }
                      if (currentQuestion < questions.length - 1) {
                        const nextQuestion = questions[currentQuestion + 1];
                        setCurrentQuestion((i) => i + 1);
                        if (!visitedQuestions.includes(nextQuestion._id)) {
                          setVisitedQuestions((prev) => [...prev, nextQuestion._id]);
                        }
                      }
                    }}
                    className="bg-blue-600 px-5 py-3 rounded-xl font-bold text-base text-white"
                  >
                    Mark For Review & Next
                  </button>

                  <button
                    onClick={() => goToIndex(currentQuestion + 1)}
                    disabled={currentQuestion === questions.length - 1}
                    className="bg-slate-600 disabled:opacity-50 px-5 py-3 rounded-xl font-bold text-base"
                  >
                    Next →
                  </button>

                  <div className="grow" />

                  <button
                    onClick={() => {
                      void submitExam();
                    }}
                    disabled={submittingRef.current || loading}
                    className="bg-fuchsia-600 disabled:opacity-50 px-5 py-3 rounded-xl font-bold text-base"
                  >
                    {submittingRef.current ? "Submitting..." : "Submit Test"}
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT STATUS SIDEBAR */}
            <aside className="min-h-0">
              <div className="bg-[#22092f] border border-purple-700 rounded-2xl h-full flex flex-col">
                <div className="p-5 border-b border-purple-700">
                  <h3 className="text-2xl font-bold text-fuchsia-400">Questions</h3>
                </div>

                <div className="p-5 space-y-4 border-b border-purple-700">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-200 rounded text-black flex items-center justify-center font-bold text-xl">
                      {notVisitedCount}
                    </div>
                    <span className="text-lg font-bold">Not Visited</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-500 rounded text-white flex items-center justify-center font-bold text-xl">
                      {notAnsweredCount}
                    </div>
                    <span className="text-lg font-bold">Not Answered</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-500 rounded text-white flex items-center justify-center font-bold text-xl">
                      {answeredCount}
                    </div>
                    <span className="text-lg font-bold">Answered</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-600 rounded-full text-white flex items-center justify-center font-bold text-xl">
                      {reviewedCount}
                    </div>
                    <span className="text-lg font-bold">Marked For Review</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-full text-white flex items-center justify-center font-bold text-xl border-2 border-cyan-300"
                      style={{ background: "linear-gradient(135deg,#22c55e 0%,#8b5cf6 100%)" }}
                    >
                      {answeredAndReviewedCount}
                    </div>
                    <span className="text-sm font-bold leading-5">
                      Answered & Marked For Review (considered for evaluation)
                    </span>
                  </div>
                </div>

                {/* Grid Numbers Area */}
                <div className="p-5 overflow-y-auto flex-1 min-h-0">
                  <div className="grid grid-cols-4 gap-3">
                    {questions.map((question, index) => {
                      const isReviewed = reviewedQuestions.includes(question._id);
                      const isAnswered = !!answers[question._id];
                      const isVisited = visitedQuestions.includes(question._id);

                      const base =
                        "h-12 rounded-xl text-lg font-bold transition-all flex items-center justify-center";

                      let classes = "bg-gray-200 text-black";
                      let style: React.CSSProperties = {};

                      if (isReviewed && isAnswered) {
                        classes = "text-white border-2 border-cyan-300";
                        style = {
                          background: "linear-gradient(135deg,#22c55e 0%,#8b5cf6 100%)",
                        };
                      } else if (isReviewed) {
                        classes = "bg-purple-600 text-white";
                      } else if (isAnswered) {
                        classes = "bg-green-500 text-white";
                      } else if (isVisited) {
                        classes = "bg-red-500 text-white";
                      }

                      const isActive = currentQuestion === index;
                      if (isActive) {
                        classes += " ring-2 ring-offset-2 ring-fuchsia-400 ring-offset-[#22092f]";
                      }

                      return (
                        <button
                          key={question._id}
                          onClick={() => goToIndex(index)}
                          className={`${base} ${classes}`}
                          style={style}
                          title={`Question ${index + 1}`}
                          aria-current={isActive ? "true" : "false"}
                        >
                          {index + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  // 2) LOBBY ENTRY VIEW
  if (!lobby && questions.length === 0 && !summary) {
    return (
      <MainLayout>
        <div className="max-w-5xl mx-auto px-4">
          <div className="glass p-8 rounded-3xl mt-10">
            <h1 className="text-5xl font-bold text-white mb-10">Exams & Attempts</h1>

            {error && <p className="text-rose-500 font-semibold mb-4">{error}</p>}
            {message && <p className="text-emerald-500 font-semibold mb-4">{message}</p>}

            <div className="rounded-3xl border border-purple-800 bg-[#22092f] p-10">
              <h2 className="text-3xl font-bold text-fuchsia-400 mb-4">Join Exam via Code</h2>
              <p className="text-gray-300 mb-8">
                Enter the unique code provided by your teacher.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="E.G. A9B2C3"
                  className="flex-1 p-5 rounded-2xl bg-[#2d1240] border border-purple-700 text-white outline-none"
                />
                <button
                  onClick={joinExam}
                  disabled={loading}
                  className="bg-gradient-to-r from-purple-500 to-fuchsia-500 px-10 py-4 rounded-2xl font-bold text-white disabled:opacity-70"
                >
                  {loading ? "Joining..." : "Access Exam"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (lobby && questions.length === 0 && !summary) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto mt-10 px-4">
          <div className="glass p-8 rounded-3xl">
            <div className="space-y-4 text-lg">
              <p>
                <span className="font-bold">Subject:</span> {lobby.subject}
              </p>
              <p>
                <span className="font-bold">Mode:</span> {lobby.mode}
              </p>
              <p>
                <span className="font-bold">Questions:</span> {lobby.questionCount}
              </p>
              <p>
                <span className="font-bold">Total Marks:</span> {lobby.totalMarks}
              </p>
              <p>
                <span className="font-bold">Duration:</span> {lobby.duration} minutes
              </p>

              <div className="bg-[#22092f] p-5 rounded-2xl border border-purple-700">
                <span className="font-bold">Instructions:</span>{" "}
                {lobby.instructions || "No instructions provided."}
              </div>
            </div>

            <button
              onClick={startExam}
              disabled={loading}
              className="mt-8 bg-gradient-to-r from-purple-500 to-fuchsia-500 px-10 py-4 rounded-2xl font-bold text-white disabled:opacity-70"
            >
              {loading ? "Starting..." : "Start Test"}
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  // 3) SUMMARY SCORE VIEW
  if (summary) {
    return (
      <MainLayout>
        <div className="max-w-3xl mx-auto mt-10 px-4">
          <div className="glass p-10 rounded-3xl text-center">
            <h1 className="text-5xl font-bold text-fuchsia-400 mb-10">Exam Completed</h1>

            <div className="space-y-6 text-2xl">
              <p>
                Score :
                <span className="text-green-400 ml-3">{summary.score}</span>
              </p>

              <p>
                Total Marks :
                <span className="text-yellow-400 ml-3">{summary.totalMarks}</span>
              </p>

              <p>
                Accuracy :
                <span className="text-pink-400 ml-3">{summary.accuracy}%</span>
              </p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return null;
}