import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

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
  const { token } = useAuth();
  const [params] = useSearchParams();

  const initialCode = useMemo(() => (params.get("code") || "").trim().toUpperCase(), [params]);

  const [roomCode, setRoomCode] = useState(initialCode);
  const [lobby, setLobby] = useState<LobbyTest | null>(null);
  const [questions, setQuestions] = useState<ActiveQuestion[]>([]);
  const [testId, setTestId] = useState<string>("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [summary, setSummary] = useState<{ score: number; totalMarks: number; accuracy: number } | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [timeLeftMs, setTimeLeftMs] = useState<number>(0);
  const [hasResumedAttempt, setHasResumedAttempt] = useState(false);
  const latestAnswersRef = useRef<Record<string, string>>({});
  const autoSubmittingRef = useRef(false);

  const joinExam = async () => {
    if (!token) {
      setError("Please login again.");
      return;
    }
    if (!roomCode) {
      setError("Enter room code.");
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
      setHasResumedAttempt(response.message.toLowerCase().includes("existing attempt"));
      setQuestions(
        response.test.questions.map((q) => ({
          _id: q._id,
          questionText: q.questionText,
          options: q.options,
          marks: q.marks,
        }))
      );
      const storedDraft = localStorage.getItem(buildDraftKey(response.test._id));
      setAnswers(storedDraft ? (JSON.parse(storedDraft) as Record<string, string>) : {});
      setSummary(null);
      setMessage(response.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start exam");
    } finally {
      setLoading(false);
    }
  };

  const submitExam = async () => {
    if (!token || !testId || questions.length === 0) return;

    setLoading(true);
    setError("");

    try {
      const response = await resultApi.submitTest(token, {
        testId,
        answers: questions.map((q) => ({
          questionId: q._id,
          selectedAnswer: latestAnswersRef.current[q._id] || "",
        })),
      });

      setSummary({
        score: response.result.score,
        totalMarks: response.result.totalMarks,
        accuracy: response.result.accuracy,
      });
      localStorage.removeItem(buildDraftKey(testId));
      setQuestions([]);
      setLobby(null);
      setTestId("");
      setExpiresAt(null);
      setTimeLeftMs(0);
      setHasResumedAttempt(false);
      setRoomCode("");
      setMessage(response.message);
      autoSubmittingRef.current = false;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit exam");
      autoSubmittingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode) {
      setRoomCode(initialCode);
    }
  }, [initialCode]);

  useEffect(() => {
    if (!testId || questions.length === 0) return;
    latestAnswersRef.current = answers;
    localStorage.setItem(buildDraftKey(testId), JSON.stringify(answers));
  }, [answers, questions.length, testId]);

  useEffect(() => {
    if (!expiresAt || questions.length === 0) return;

    const updateLeft = () => {
      const remaining = new Date(expiresAt).getTime() - Date.now();
      setTimeLeftMs(Math.max(remaining, 0));
      return remaining;
    };

    const firstRemaining = updateLeft();
    if (firstRemaining <= 0) {
      if (autoSubmittingRef.current) return;
      autoSubmittingRef.current = true;
      submitExam();
      return;
    }

    const intervalId = window.setInterval(() => {
      const remaining = updateLeft();
      if (remaining <= 0) {
        window.clearInterval(intervalId);
        setMessage("Time is up. Auto-submitting your test...");
        if (autoSubmittingRef.current) return;
        autoSubmittingRef.current = true;
        submitExam();
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [expiresAt, questions.length]);

  const timerText = useMemo(() => {
    const totalSeconds = Math.floor(timeLeftMs / 1000);
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [timeLeftMs]);

  return (
    <MainLayout>
      <h1 className="text-3xl text-yellow-400 font-bold">Take Test</h1>

      <div className="glass p-6 mt-6 space-y-4">
        {error && <p className="text-rose-500 font-semibold">{error}</p>}
        {message && <p className="text-emerald-500 font-semibold">{message}</p>}

        {!lobby && questions.length === 0 && (
          <div className="space-y-3">
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Enter room code"
              className="w-full p-3 rounded bg-gray-800 border border-white/10"
            />
            <button onClick={joinExam} disabled={loading} className="bg-yellow-400 text-black px-6 py-2 rounded font-semibold">
              {loading ? "Joining..." : "Join Exam"}
            </button>
          </div>
        )}

        {lobby && questions.length === 0 && (
          <div className="space-y-2">
            <p className="font-semibold">{lobby.title}</p>
            <p>Subject: {lobby.subject}</p>
            <p>Mode: {lobby.mode}</p>
            <p>Assigned Set: {lobby.assignedSet}</p>
            <p>Questions: {lobby.questionCount}</p>
            <p>Total Marks: {lobby.totalMarks}</p>
            <p>Duration: {lobby.duration} minutes</p>
            <p>Room Code: {lobby.roomCode}</p>
            <p className="rounded border border-white/10 bg-gray-900/30 p-3 mt-2">
              <span className="font-semibold">Instructions:</span>{" "}
              {lobby.instructions || "No instructions provided."}
            </p>
            <button onClick={startExam} disabled={loading} className="mt-2 bg-yellow-400 text-black px-6 py-2 rounded font-semibold">
              {loading ? "Starting..." : "Start Test"}
            </button>
          </div>
        )}

        {questions.length > 0 && (
          <div className="space-y-5">
            <div className="rounded border border-amber-500/40 p-3 bg-amber-500/10">
              <p className="font-semibold text-amber-300">Time Left: {timerText}</p>
              {hasResumedAttempt && (
                <p className="text-sm text-slate-300 mt-1">
                  Resumed your previous in-progress attempt.
                </p>
              )}
            </div>
            {questions.map((question, idx) => (
              <div key={question._id} className="rounded border border-white/10 p-4 bg-gray-900/30">
                <p className="mb-3 font-semibold">Q{idx + 1}. {question.questionText}</p>
                <p className="mb-3 text-sm text-yellow-300">Marks: {question.marks}</p>
                <div className="space-y-2">
                  {question.options.map((option) => (
                    <label key={option} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={question._id}
                        checked={answers[question._id] === option}
                        onChange={() =>
                          setAnswers((prev) => ({
                            ...prev,
                            [question._id]: option,
                          }))
                        }
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <button onClick={submitExam} disabled={loading} className="bg-yellow-400 text-black px-6 py-2 rounded font-semibold">
              {loading ? "Submitting..." : "Submit Test"}
            </button>
          </div>
        )}

        {summary && (
          <div className="rounded border border-emerald-500/40 p-4 bg-emerald-500/10">
            <h2 className="text-xl font-bold text-emerald-400">Test Submitted</h2>
            <p>Score: {summary.score} / {summary.totalMarks}</p>
            <p>Accuracy: {summary.accuracy}%</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}



hhh