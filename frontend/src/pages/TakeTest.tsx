import studentImage from "../assets/student.png";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

import MainLayout from "../layout/MainLayout";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { resultApi, testApi } from "../services/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Moon, Sun, LogOut, AlertTriangle, Trophy } from "lucide-react";

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
  const { theme, toggleTheme } = useTheme();
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

  // Security / Proctoring State
  const [violationCount, setViolationCount] = useState(0);
  const [showViolationOverlay, setShowViolationOverlay] = useState(false);
  const [violationMessage, setViolationMessage] = useState("");
  const MAX_VIOLATIONS = 3;

  // Refs/guards
  const violationCountRef = useRef(0);
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
      try {
        await document.documentElement.requestFullscreen();
      } catch (err) {
        console.warn("Fullscreen request failed", err);
      }

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

  const handleViolation = useCallback((reason: string) => {
    if (submittingRef.current || questions.length === 0 || !testId) return;
    
    violationCountRef.current += 1;
    const currentCount = violationCountRef.current;
    
    setViolationCount(currentCount);
    setViolationMessage(reason);
    
    if (currentCount >= MAX_VIOLATIONS) {
      setMessage(`Security violation limit exceeded (${MAX_VIOLATIONS}/${MAX_VIOLATIONS}). Auto-submitting test.`);
      setShowViolationOverlay(false);
      void submitExam();
    } else {
      setShowViolationOverlay(true);
    }
  }, [questions.length, testId, submitExam, MAX_VIOLATIONS]);

  // Security / Proctoring Effects
  useEffect(() => {
    if (questions.length === 0 || !testId || submittingRef.current) return;

    // Prevent default actions for copy, paste, context menu
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleCopyPaste = (e: ClipboardEvent) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent devtools, copy/paste shortcuts
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i")) ||
        (e.ctrlKey && (e.key === "c" || e.key === "C" || e.key === "v" || e.key === "V" || e.key === "p" || e.key === "P")) ||
        e.key === "Meta" ||
        e.key === "PrintScreen"
      ) {
        e.preventDefault();
      }
    };
    
    // Prevent accidental reload
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    // Tracking visibility and fullscreen
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation("Tab switched or minimized.");
      }
    };

    const handleWindowBlur = () => {
      handleViolation("Lost window focus.");
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        handleViolation("Exited fullscreen mode.");
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopyPaste);
    document.addEventListener("cut", handleCopyPaste);
    document.addEventListener("paste", handleCopyPaste);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopyPaste);
      document.removeEventListener("cut", handleCopyPaste);
      document.removeEventListener("paste", handleCopyPaste);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [questions.length, testId, handleViolation]);

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
      <div className="min-h-screen w-full bg-slate-50 dark:bg-[#160028] text-slate-900 dark:text-white select-none transition-colors duration-300">
        
        {/* Security Violation Overlay */}
        {showViolationOverlay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6 backdrop-blur-sm">
            <div className="max-w-md rounded-3xl border border-red-500/50 bg-red-950 p-8 text-center shadow-2xl shadow-red-900/50">
              <h2 className="mb-4 text-3xl font-black text-red-500">Security Violation</h2>
              <p className="mb-6 text-lg font-medium text-red-200">
                {violationMessage}
              </p>
              <div className="mb-8 flex justify-center gap-2">
                {[...Array(MAX_VIOLATIONS)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-3 w-12 rounded-full ${
                      i < violationCount ? "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]" : "bg-red-900/50"
                    }`}
                  />
                ))}
              </div>
              <p className="mb-8 font-bold text-red-300">
                Warning {violationCount} of {MAX_VIOLATIONS}. If you reach {MAX_VIOLATIONS} violations, your test will be automatically submitted and flagged.
              </p>
              <button
                onClick={() => {
                  setShowViolationOverlay(false);
                  document.documentElement.requestFullscreen().catch(() => {});
                }}
                className="w-full rounded-xl bg-red-600 px-6 py-4 font-bold text-white shadow-[0_4px_20px_rgba(220,38,38,0.4)] transition hover:bg-red-500 hover:shadow-[0_4px_25px_rgba(220,38,38,0.6)]"
              >
                I Understand, Return to Test
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-rows-[auto_1fr] min-h-screen">
          {/* HEADER */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-purple-700 bg-white dark:bg-[#1b0730] transition-colors duration-300">
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
                  <p className="text-xl font-bold truncate text-slate-900 dark:text-white">
                    Candidate: <span className="text-purple-600 dark:text-pink-400">{user?.name || "Student"}</span>
                  </p>
                  <p className="text-sm text-slate-500 dark:text-gray-300 truncate">
                    {user?.email || "student@gmail.com"}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-gray-300 truncate">
                    Exam: <span className="text-purple-600 dark:text-pink-400">{lobby?.title}</span> • Subject:{" "}
                    <span className="text-purple-600 dark:text-pink-400">{lobby?.subject}</span>
                  </p>
                </div>
              </div>

              {/* Timer metrics display */}
              <div className="text-center">
                <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-gray-300">Time Left</p>
                <p className="text-2xl font-extrabold text-purple-600 dark:text-fuchsia-400 tabular-nums">
                  {timerText}
                </p>
                {hasResumedAttempt && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-300 mt-1">Resumed attempt</p>
                )}
                {!!message && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-300 mt-1 truncate max-w-[260px]">
                    {message}
                  </p>
                )}
                {!!error && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-300 mt-1 truncate max-w-[260px]">
                    {error}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={toggleTheme}
                  title="Toggle Theme"
                  className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 transition"
                >
                  {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 bg-orange-50 px-5 py-2 rounded-xl font-semibold text-orange-600 hover:bg-orange-100 dark:bg-[#2b103d] dark:text-orange-300 dark:hover:bg-[#3a1452] transition"
                >
                  <LogOut size={18} /> Logout
                </button>
              </div>
            </div>
          </div>

          {/* MAIN CONTENT WORKSPACE */}
          <div className="grid md:grid-cols-[1fr_minmax(300px,360px)] gap-6 h-full px-6 py-5">
            {/* LEFT QUESTION WRAPPER */}
            <div className="min-h-0">
              <div className="bg-white dark:bg-[#22092f] border border-slate-200 dark:border-purple-700 rounded-2xl p-6 h-full shadow-sm transition-colors duration-300">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h2 className="text-2xl md:text-3xl font-bold">
                    Question {currentQuestion + 1} of {questions.length}
                  </h2>
                  <span className="text-amber-600 dark:text-yellow-300 font-semibold">
                    Marks: {currentQuestionData.marks}
                  </span>
                </div>

                <div className="prose dark:prose-invert prose-lg md:prose-xl max-w-none text-slate-800 dark:text-gray-200 mb-6 font-medium leading-8 transition-colors duration-300">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentQuestionData.questionText}</ReactMarkdown>
                </div>

                <div className="space-y-4">
                  {currentQuestionData.options.map((option) => (
                    <label
                      key={option}
                      className="flex items-center gap-4 border border-slate-200 dark:border-purple-700 p-4 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-purple-900 transition-colors duration-300"
                    >
                      <input
                        type="radio"
                        name={currentQuestionData._id}
                        className="accent-purple-600 dark:accent-fuchsia-500 w-5 h-5"
                        checked={answers[currentQuestionData._id] === option}
                        onChange={() =>
                          setAnswers((prev) => ({
                            ...prev,
                            [currentQuestionData._id]: option,
                          }))
                        }
                      />
                      <span className="text-lg prose dark:prose-invert prose-p:my-0 prose-pre:my-0 max-w-none text-slate-700 dark:text-gray-200">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{option}</ReactMarkdown>
                      </span>
                    </label>
                  ))}
                </div>

                {/* Question Toolbar Controls */}
                <div className="flex flex-wrap gap-3 mt-8 items-center">
                  <button
                    onClick={() => goToIndex(currentQuestion - 1)}
                    disabled={currentQuestion === 0}
                    className="bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-white disabled:opacity-50 px-5 py-3 rounded-xl font-bold text-base transition-colors duration-300"
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
                    className="bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-white disabled:opacity-50 px-5 py-3 rounded-xl font-bold text-base transition-colors duration-300"
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
            <aside className="h-[400px] md:h-full flex flex-col min-h-0">
              <div className="bg-white dark:bg-[#22092f] border border-slate-200 dark:border-purple-700 rounded-2xl h-full flex flex-col shadow-sm transition-colors duration-300">
                <div className="p-5 border-b border-slate-200 dark:border-purple-700">
                  <h3 className="text-2xl font-bold text-purple-600 dark:text-fuchsia-400">Questions</h3>
                </div>

                <div className="p-5 space-y-4 border-b border-slate-200 dark:border-purple-700">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-gray-200 rounded text-slate-700 dark:text-black flex items-center justify-center font-bold text-xl">
                      {notVisitedCount}
                    </div>
                    <span className="text-lg font-bold text-slate-800 dark:text-white">Not Visited</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-500 rounded text-white flex items-center justify-center font-bold text-xl">
                      {notAnsweredCount}
                    </div>
                    <span className="text-lg font-bold text-slate-800 dark:text-white">Not Answered</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-500 rounded text-white flex items-center justify-center font-bold text-xl">
                      {answeredCount}
                    </div>
                    <span className="text-lg font-bold text-slate-800 dark:text-white">Answered</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-600 rounded-full text-white flex items-center justify-center font-bold text-xl">
                      {reviewedCount}
                    </div>
                    <span className="text-lg font-bold text-slate-800 dark:text-white">Marked For Review</span>
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

                      let classes = "bg-slate-100 text-slate-700 dark:bg-gray-200 dark:text-black";
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
                        classes += " ring-2 ring-offset-2 ring-fuchsia-400 ring-offset-white dark:ring-offset-[#22092f]";
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
        <div className="max-w-4xl mx-auto px-4 mt-12 mb-20">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
              Exam Portal
            </h1>
            <p className="text-slate-500 dark:text-gray-400 mt-3 text-lg">Securely join your assigned test sessions.</p>
            {error && <p className="text-rose-600 dark:text-rose-400 font-medium mt-4 bg-rose-50 dark:bg-rose-900/20 py-2 px-4 rounded-xl inline-block">{error}</p>}
            {message && <p className="text-emerald-600 dark:text-emerald-400 font-medium mt-4 bg-emerald-50 dark:bg-emerald-900/20 py-2 px-4 rounded-xl inline-block">{message}</p>}
          </div>

          <div className="relative rounded-3xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-[#1c0b2b]/90 backdrop-blur-xl p-8 md:p-12 shadow-sm transition-colors duration-300">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-3">Join Exam via Code</h2>
            <p className="text-slate-600 dark:text-gray-300 mb-8 text-base">
              Enter the unique access code provided by your instructor to begin.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="E.G. A9B2C3"
                className="flex-1 p-4 text-lg font-mono tracking-widest rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300"
              />
              <button
                onClick={joinExam}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-500 px-8 py-4 rounded-xl font-medium text-white shadow-sm transition-all disabled:opacity-70 disabled:grayscale"
              >
                {loading ? "Verifying..." : "Access Exam"}
              </button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (lobby && questions.length === 0 && !summary) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto mt-12 px-4 mb-20">
          <div className="relative bg-white/90 dark:bg-[#1c0b2b]/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-8 md:p-10 rounded-3xl shadow-sm transition-colors duration-300">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-6 border-b border-slate-200 dark:border-white/10 pb-5">
              {lobby.title}
            </h1>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 text-base mb-8">
              <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-xl border border-slate-100 dark:border-white/5 transition-colors duration-300">
                <p className="text-xs md:text-sm text-slate-500 dark:text-gray-400 uppercase tracking-wider font-semibold mb-1">Subject</p>
                <p className="font-semibold text-slate-900 dark:text-white truncate" title={lobby.subject}>{lobby.subject}</p>
              </div>
              <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-xl border border-slate-100 dark:border-white/5 transition-colors duration-300">
                <p className="text-xs md:text-sm text-slate-500 dark:text-gray-400 uppercase tracking-wider font-semibold mb-1">Mode</p>
                <p className="font-semibold text-slate-900 dark:text-white capitalize">{lobby.mode}</p>
              </div>
              <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-xl border border-slate-100 dark:border-white/5 transition-colors duration-300">
                <p className="text-xs md:text-sm text-slate-500 dark:text-gray-400 uppercase tracking-wider font-semibold mb-1">Questions</p>
                <p className="font-semibold text-purple-600 dark:text-fuchsia-400">{lobby.questionCount}</p>
              </div>
              <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-xl border border-slate-100 dark:border-white/5 transition-colors duration-300">
                <p className="text-xs md:text-sm text-slate-500 dark:text-gray-400 uppercase tracking-wider font-semibold mb-1">Duration</p>
                <p className="font-semibold text-blue-600 dark:text-blue-400">{lobby.duration} min</p>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/10 p-5 rounded-xl border border-amber-200 dark:border-amber-500/20 mb-8 transition-colors duration-300">
              <span className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-400 mb-2">
                <AlertTriangle size={20} /> Instructions
              </span>
              <p className="text-amber-900 dark:text-amber-200/80 leading-relaxed text-sm">
                {lobby.instructions || "Please read all questions carefully before answering. Do not refresh the page during the exam."}
              </p>
            </div>

            <button
              onClick={startExam}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 py-4 rounded-xl font-semibold text-white text-lg shadow-sm transition-all disabled:opacity-70 disabled:grayscale"
            >
              {loading ? "Preparing Environment..." : "Start Test"}
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
        <div className="max-w-3xl mx-auto mt-12 px-4 mb-20">
          <div className="relative bg-white/90 dark:bg-[#1c0b2b]/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-10 md:p-12 rounded-3xl shadow-sm text-center transition-colors duration-300">
            
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 dark:text-green-400">
              <Trophy size={40} />
            </div>

            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-8 tracking-tight">
              Exam Completed
            </h1>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
              <div className="bg-slate-50 dark:bg-black/20 p-6 rounded-2xl border border-slate-200 dark:border-white/5 transition-colors duration-300">
                <p className="text-sm text-slate-500 dark:text-gray-400 font-medium mb-1">Score</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{summary.score}</p>
              </div>

              <div className="bg-slate-50 dark:bg-black/20 p-6 rounded-2xl border border-slate-200 dark:border-white/5 transition-colors duration-300">
                <p className="text-sm text-slate-500 dark:text-gray-400 font-medium mb-1">Total</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{summary.totalMarks}</p>
              </div>

              <div className="bg-slate-50 dark:bg-black/20 p-6 rounded-2xl border border-slate-200 dark:border-white/5 transition-colors duration-300">
                <p className="text-sm text-slate-500 dark:text-gray-400 font-medium mb-1">Accuracy</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{summary.accuracy}%</p>
              </div>
            </div>

            <button
              onClick={() => navigate("/student/dashboard")}
              className="mt-10 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/20 px-8 py-3 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-white/20 transition-colors shadow-sm"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return null;
}