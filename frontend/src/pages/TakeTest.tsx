import studentImage from "../assets/student.png";
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

const buildDraftKey = (testId: string) =>
  `test-draft-${testId}`;

export default function TakeTest() {

  const { token, user } = useAuth();

  const [params] = useSearchParams();

  const initialCode = useMemo(
    () =>
      (params.get("code") || "")
        .trim()
        .toUpperCase(),
    [params]
  );

  const [roomCode, setRoomCode] =
    useState(initialCode);

  const [lobby, setLobby] =
    useState<LobbyTest | null>(null);

  const [questions, setQuestions] =
    useState<ActiveQuestion[]>([]);

  const [testId, setTestId] =
    useState<string>("");

  const [answers, setAnswers] =
    useState<Record<string, string>>({});

  const [visitedQuestions, setVisitedQuestions] =
    useState<string[]>([]);

  const [reviewedQuestions, setReviewedQuestions] =
    useState<string[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState<string>("");

  const [error, setError] =
    useState<string>("");

  const [summary, setSummary] =
    useState<{
      score: number;
      totalMarks: number;
      accuracy: number;
    } | null>(null);

  const [expiresAt, setExpiresAt] =
    useState<string | null>(null);

  const [timeLeftMs, setTimeLeftMs] =
    useState<number>(0);

  const [hasResumedAttempt, setHasResumedAttempt] =
    useState(false);

  const [currentQuestion, setCurrentQuestion] =
    useState(0);

  const latestAnswersRef =
    useRef<Record<string, string>>({});

  const autoSubmittingRef =
    useRef(false);

  const joinExam = async () => {

    if (!token) {
      setError("Please login again.");
      return;
    }

    if (!roomCode) {
      setError(
        "Please enter a valid exam code."
      );
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {

      const response =
        await testApi.joinByCode(
          token,
          roomCode
        );

      setLobby({
        _id: response.test._id,
        title: response.test.title,
        subject: response.test.subject,
        mode: response.test.mode,
        duration: response.test.duration,
        instructions:
          response.test.instructions,
        roomCode: response.test.roomCode,
        assignedSet:
          response.test.assignedSet,
        questionCount:
          response.test.questionCount,
        totalMarks:
          response.test.totalMarks,
      });

      setMessage(response.message);

    } catch (e) {

      setError(
        e instanceof Error
          ? e.message
          : "Failed to join exam"
      );

    } finally {

      setLoading(false);

    }
  };

  const startExam = async () => {

    if (!token || !lobby) return;

    setLoading(true);
    setError("");

    try {

      const response =
        await testApi.startTest(
          token,
          lobby._id,
          lobby.roomCode
        );

      setTestId(response.test._id);

      setExpiresAt(
        response.attempt.expiresAt
      );

      setHasResumedAttempt(
        response.message
          .toLowerCase()
          .includes("existing attempt")
      );

      setQuestions(
        response.test.questions.map(
          (q) => ({
            _id: q._id,
            questionText:
              q.questionText,
            options: q.options,
            marks: q.marks,
          })
        )
      );

      const storedDraft =
        localStorage.getItem(
          buildDraftKey(
            response.test._id
          )
        );

      setAnswers(
        storedDraft
          ? (
              JSON.parse(
                storedDraft
              ) as Record<
                string,
                string
              >
            )
          : {}
      );

      setSummary(null);

      setMessage(response.message);

      setCurrentQuestion(0);

      if (
        response.test.questions.length >
        0
      ) {
        setVisitedQuestions([
          response.test.questions[0]._id,
        ]);
      }

    } catch (e) {

      setError(
        e instanceof Error
          ? e.message
          : "Failed to start exam"
      );

    } finally {

      setLoading(false);

    }
  };

  const submitExam = async () => {

    if (
      !token ||
      !testId ||
      questions.length === 0
    )
      return;

    setLoading(true);

    setError("");

    try {

      const response =
        await resultApi.submitTest(
          token,
          {
            testId,
            answers:
              questions.map((q) => ({
                questionId: q._id,
                selectedAnswer:
                  latestAnswersRef.current[
                    q._id
                  ] || "",
              })),
          }
        );

      setSummary({
        score:
          response.result.score,
        totalMarks:
          response.result.totalMarks,
        accuracy:
          response.result.accuracy,
      });

      localStorage.removeItem(
        buildDraftKey(testId)
      );

      setQuestions([]);

      setLobby(null);

      setTestId("");

      setExpiresAt(null);

      setTimeLeftMs(0);

      setHasResumedAttempt(false);

      setRoomCode("");

      setMessage(response.message);

      autoSubmittingRef.current =
        false;

    } catch (e) {

      setError(
        e instanceof Error
          ? e.message
          : "Failed to submit exam"
      );

      autoSubmittingRef.current =
        false;

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

    if (
      !testId ||
      questions.length === 0
    )
      return;

    latestAnswersRef.current =
      answers;

    localStorage.setItem(
      buildDraftKey(testId),
      JSON.stringify(answers)
    );

  }, [answers, questions.length, testId]);

  useEffect(() => {

    if (
      !expiresAt ||
      questions.length === 0
    )
      return;

    const updateLeft = () => {

      const remaining =
        new Date(
          expiresAt
        ).getTime() - Date.now();

      setTimeLeftMs(
        Math.max(remaining, 0)
      );

      return remaining;
    };

    const firstRemaining =
      updateLeft();

    if (firstRemaining <= 0) {

      if (
        autoSubmittingRef.current
      )
        return;

      autoSubmittingRef.current =
        true;

      submitExam();

      return;
    }

    const intervalId =
      window.setInterval(() => {

        const remaining =
          updateLeft();

        if (remaining <= 0) {

          window.clearInterval(
            intervalId
          );

          setMessage(
            "Time is up. Auto-submitting your test..."
          );

          if (
            autoSubmittingRef.current
          )
            return;

          autoSubmittingRef.current =
            true;

          submitExam();
        }

      }, 1000);

    return () =>
      window.clearInterval(
        intervalId
      );

  }, [expiresAt, questions.length]);

  const timerText = useMemo(() => {

    const totalSeconds =
      Math.floor(
        timeLeftMs / 1000
      );

    const minutes = Math.floor(
      totalSeconds / 60
    )
      .toString()
      .padStart(2, "0");

    const seconds = (
      totalSeconds % 60
    )
      .toString()
      .padStart(2, "0");

    return `${minutes}:${seconds}`;

  }, [timeLeftMs]);

  const currentQuestionData =
    questions[currentQuestion];

  const notVisitedCount =
    questions.length -
    visitedQuestions.length;

  const answeredCount =
    Object.keys(answers).filter(
      (id) =>
        answers[id] &&
        !reviewedQuestions.includes(id)
    ).length;

  const reviewedCount =
    reviewedQuestions.filter(
      (id) => !answers[id]
    ).length;

  const answeredAndReviewedCount =
    reviewedQuestions.filter(
      (id) => answers[id]
    ).length;

  const notAnsweredCount =
    visitedQuestions.filter(
      (id) =>
        !answers[id] &&
        !reviewedQuestions.includes(id)
    ).length;

  return (

    questions.length > 0 ? (

      <div className="min-h-screen bg-[#160028] text-white px-8 py-6">

        <div className="flex justify-end mb-6">

          {/* <button className="bg-[#2b103d] px-6 py-3 rounded-2xl font-bold text-orange-300">
            🚪 Logout
          </button> */}
            
         <button
  onClick={() => {

    localStorage.clear();

    window.location.href = "/login";

  }}
  className="
    bg-[#2b103d]
    px-6
    py-3
    rounded-2xl
    font-bold
    text-orange-300
    hover:bg-[#3a1452]
    transition-all
  "
>
  🚪 Logout
</button>
 
        </div>

        <div className="flex gap-6">

          {/* LEFT */}

          <div className="w-[75%]">

            {/* CANDIDATE */}

            <div className="bg-[#22092f] border border-purple-700 rounded-2xl p-5 mb-5">

              <div className="flex items-center gap-5">

                <div className="w-24 h-24 rounded-md overflow-hidden bg-white border border-gray-300">

                  <img
                    src={studentImage}
                    alt="student"
                    className="w-full h-full object-cover"
                  />

                </div>

                <div>

                  <p className="text-3xl font-bold text-white">

                    Candidate Name :

                    <span className="text-pink-400 ml-2">
                      {user?.name || "Student"}
                    </span>

                  </p>

                  <p className="text-3xl font-bold text-white">

                    Email Address :

                    <span className="text-pink-400 ml-2">
                      {user?.email || "student@gmail.com"}
                    </span>

                  </p>

                  <p className="text-2xl font-bold text-white">

                    Exam Name :

                    <span className="text-pink-400 ml-2">
                      {lobby?.title}
                    </span>

                  </p>

                  <p className="text-2xl font-bold text-white">

                    Subject Name :

                    <span className="text-pink-400 ml-2">
                      {lobby?.subject}
                    </span>

                  </p>

                </div>

              </div>

            </div>

            {/* TIMER */}

            <div className="bg-[#22092f] border border-purple-700 rounded-2xl p-5 mb-5">

              <p className="text-3xl font-bold text-fuchsia-400">
                Time Left: {timerText}
              </p>

            </div>

            {/* QUESTION */}

            <div className="bg-[#22092f] border border-purple-700 rounded-2xl p-8">

              <h2 className="text-5xl font-bold mb-10 text-white">

                Question {currentQuestion + 1}

              </h2>

              <p className="text-2xl leading-10 mb-10 text-gray-200">

                {currentQuestionData.questionText}

              </p>

              <p className="text-yellow-300 mb-6 text-xl">

                Marks: {currentQuestionData.marks}

              </p>

              <div className="space-y-5">

                {currentQuestionData.options.map(
                  (option) => (

                    <label
                      key={option}
                      className="
                        flex
                        items-center
                        gap-4
                        border
                        border-purple-700
                        p-6
                        rounded-2xl
                        cursor-pointer
                        hover:bg-purple-900
                      "
                    >

                      <input
                        type="radio"
                        name={
                          currentQuestionData._id
                        }
                        checked={
                          answers[
                            currentQuestionData._id
                          ] === option
                        }
                        onChange={() =>
                          setAnswers((prev) => ({
                            ...prev,
                            [currentQuestionData._id]:
                              option,
                          }))
                        }
                      />

                      <span className="text-2xl">
                        {option}
                      </span>

                    </label>
                  )
                )}

              </div>

              {/* BUTTONS */}

              <div className="flex flex-wrap gap-4 mt-10">

                <button
                  onClick={() => {

                    if (
                      answers[
                        currentQuestionData._id
                      ]
                    ) {

                      setReviewedQuestions(
                        (prev) =>
                          prev.filter(
                            (id) =>
                              id !==
                              currentQuestionData._id
                          )
                      );
                    }

                    if (
                      currentQuestion <
                      questions.length - 1
                    ) {

                      const nextQuestion =
                        questions[
                          currentQuestion + 1
                        ];

                      setCurrentQuestion(
                        currentQuestion + 1
                      );

                      if (
                        !visitedQuestions.includes(
                          nextQuestion._id
                        )
                      ) {

                        setVisitedQuestions(
                          (prev) => [
                            ...prev,
                            nextQuestion._id,
                          ]
                        );
                      }
                    }
                  }}
                  className="bg-green-600 px-8 py-4 rounded-xl font-bold text-xl"
                >
                  Save & Next
                </button>

                <button
                  onClick={() =>
                    setAnswers((prev) => ({
                      ...prev,
                      [currentQuestionData._id]:
                        "",
                    }))
                  }
                  className="bg-red-500 px-8 py-4 rounded-xl font-bold text-xl"
                >
                  Clear
                </button>

                <button
                  onClick={() => {

                    if (
                      !reviewedQuestions.includes(
                        currentQuestionData._id
                      )
                    ) {

                      setReviewedQuestions(
                        (prev) => [
                          ...prev,
                          currentQuestionData._id,
                        ]
                      );
                    }

                    if (
                      currentQuestion <
                      questions.length - 1
                    ) {

                      const nextQuestion =
                        questions[
                          currentQuestion + 1
                        ];

                      setCurrentQuestion(
                        currentQuestion + 1
                      );

                      if (
                        !visitedQuestions.includes(
                          nextQuestion._id
                        )
                      ) {

                        setVisitedQuestions(
                          (prev) => [
                            ...prev,
                            nextQuestion._id,
                          ]
                        );
                      }
                    }
                  }}
                  className="bg-orange-500 px-8 py-4 rounded-xl font-bold text-xl text-white"
                >
                  Save & Mark For Review
                </button>

                <button
                  onClick={() => {

                    if (
                      !reviewedQuestions.includes(
                        currentQuestionData._id
                      )
                    ) {

                      setReviewedQuestions(
                        (prev) => [
                          ...prev,
                          currentQuestionData._id,
                        ]
                      );
                    }

                    if (
                      currentQuestion <
                      questions.length - 1
                    ) {

                      const nextQuestion =
                        questions[
                          currentQuestion + 1
                        ];

                      setCurrentQuestion(
                        currentQuestion + 1
                      );

                      if (
                        !visitedQuestions.includes(
                          nextQuestion._id
                        )
                      ) {

                        setVisitedQuestions(
                          (prev) => [
                            ...prev,
                            nextQuestion._id,
                          ]
                        );
                      }
                    }

                  }}
                  className="bg-blue-600 px-8 py-4 rounded-xl font-bold text-xl text-white"
                >
                  Mark For Review & Next
                </button>

                <button
                  onClick={submitExam}
                  className="bg-fuchsia-600 px-8 py-4 rounded-xl font-bold text-xl"
                >
                  Submit Test
                </button>

              </div>

            </div>

          </div>

          {/* RIGHT */}

          <div className="w-[25%]">

            <div className="bg-[#22092f] border border-purple-700 rounded-2xl p-5 sticky top-5">

              <h3 className="text-4xl font-bold mb-8 text-fuchsia-400">
                Questions
              </h3>

              <div className="space-y-6 mb-10">

                <div className="flex items-center gap-5">

                  <div className="w-16 h-16 bg-gray-200 rounded text-black flex items-center justify-center font-bold text-3xl">
                    {notVisitedCount}
                  </div>

                  <span className="text-3xl font-bold">
                    Not Visited
                  </span>

                </div>

                <div className="flex items-center gap-5">

                <div className="w-16 h-16 bg-red-500 rounded text-white flex items-center justify-center font-bold text-3xl">
                    {notAnsweredCount}
                  </div>

                  <span className="text-3xl font-bold">
                    Not Answered
                  </span>

                </div>

                <div className="flex items-center gap-5">

               <div className="w-16 h-16 bg-green-500 rounded text-white flex items-center justify-center font-bold text-3xl">                {answeredCount}
                </div>
                  <span className="text-3xl font-bold">
                    Answered
                  </span>

                </div>

                <div className="flex items-center gap-5">

                  <div className="w-16 h-16 bg-purple-600 rounded-full text-white flex items-center justify-center font-bold text-3xl">
                    {reviewedCount}
                  </div>

                  <span className="text-3xl font-bold">
                    Marked For Review
                  </span>

                </div>

                <div className="flex items-center gap-5">

                  <div
                    className="
                      w-16
                      h-16
                      rounded-full
                      text-white
                      flex
                      items-center
                      justify-center
                      font-bold
                      text-3xl
                      border-2
                      border-cyan-300
                    "
                    style={{
                      background:
                        "linear-gradient(135deg,#22c55e 0%,#8b5cf6 100%)",
                    }}
                  >
                    {answeredAndReviewedCount}
                  </div>

                  <span className="text-2xl font-bold leading-10">

                    Answered & Marked
                    <br />
                    For Review
                    <br />
                    (will be considered
                    <br />
                    for evaluation)

                  </span>

                </div>

              </div>

              {/* QUESTION BOXES */}

              <div className="grid grid-cols-4 gap-4">

                {questions.map(
                  (question, index) => {

                    return (

                      <button
                        key={question._id}
                        onClick={() => {

                          setCurrentQuestion(index);

                          if (
                            !visitedQuestions.includes(
                              question._id
                            )
                          ) {

                            setVisitedQuestions(
                              (prev) => [
                                ...prev,
                                question._id,
                              ]
                            );
                          }
                        }}
                        className={`
                          h-20
                          rounded-2xl
                          text-3xl
                          font-bold
                          transition-all

                          ${
                            reviewedQuestions.includes(
                              question._id
                            ) &&
                            answers[question._id]

                              ? `
                                text-white
                                border-2
                                border-cyan-300
                              `

                              : reviewedQuestions.includes(
                                  question._id
                                )

                              ? `
                                bg-purple-600
                                text-white
                              `

                              : answers[question._id]

                              ? `
                                bg-green-500
                                text-white
                              `

                              : visitedQuestions.includes(
                                  question._id
                                )

                              ? `
                                bg-orange-500
                                text-white
                              `

                              : `
                                bg-gray-200
                                text-black
                              `
                          }
                        `}
                        style={
                          reviewedQuestions.includes(
                            question._id
                          ) &&
                          answers[question._id]

                            ? {
                                background:
                                  "linear-gradient(135deg,#22c55e 0%,#8b5cf6 100%)",
                              }

                            : {}
                        }
                      >
                        {index + 1}
                      </button>
                    );
                  }
                )}

              </div>

            </div>

          </div>

        </div>

      </div>

    ) : (

      <MainLayout>

        <div className="max-w-5xl mx-auto">

          {!lobby &&
            questions.length === 0 && (

              <div className="glass p-8 rounded-3xl mt-10">

                <h1 className="text-5xl font-bold text-white mb-10">
                  Exams & Attempts
                </h1>

                {error && (
                  <p className="text-rose-500 font-semibold mb-4">
                    {error}
                  </p>
                )}

                {message && (
                  <p className="text-emerald-500 font-semibold mb-4">
                    {message}
                  </p>
                )}

                <div className="rounded-3xl border border-purple-800 bg-[#22092f] p-10">

                  <h2 className="text-3xl font-bold text-fuchsia-400 mb-4">
                    Join Exam via Code
                  </h2>

                  <p className="text-gray-300 mb-8">
                    Enter the unique code provided by your teacher.
                  </p>

                  <div className="flex gap-4">

                    <input
                      type="text"
                      value={roomCode}
                      onChange={(e) =>
                        setRoomCode(
                          e.target.value.toUpperCase()
                        )
                      }
                      placeholder="E.G. A9B2C3"
                      className="flex-1 p-5 rounded-2xl bg-[#2d1240] border border-purple-700 text-white outline-none"
                    />

                    <button
                      onClick={joinExam}
                      disabled={loading}
                      className="bg-gradient-to-r from-purple-500 to-fuchsia-500 px-10 py-4 rounded-2xl font-bold text-white"
                    >
                      {loading
                        ? "Joining..."
                        : "Access Exam"}
                    </button>

                  </div>

                </div>

              </div>
            )}

          {lobby &&
            questions.length === 0 &&
            !summary && (

              <div className="max-w-4xl mx-auto mt-10">

                <div className="glass p-8 rounded-3xl">

                  <div className="space-y-4 text-lg">

                    <p>
                      <span className="font-bold">
                        Subject:
                      </span>{" "}
                      {lobby.subject}
                    </p>

                    <p>
                      <span className="font-bold">
                        Mode:
                      </span>{" "}
                      {lobby.mode}
                    </p>

                    <p>
                      <span className="font-bold">
                        Questions:
                      </span>{" "}
                      {lobby.questionCount}
                    </p>

                    <p>
                      <span className="font-bold">
                        Total Marks:
                      </span>{" "}
                      {lobby.totalMarks}
                    </p>

                    <p>
                      <span className="font-bold">
                        Duration:
                      </span>{" "}
                      {lobby.duration} minutes
                    </p>

                    <div className="bg-[#22092f] p-5 rounded-2xl border border-purple-700">

                      <span className="font-bold">
                        Instructions:
                      </span>{" "}
                      {lobby.instructions ||
                        "No instructions provided."}

                    </div>

                  </div>

                  <button
                    onClick={startExam}
                    disabled={loading}
                    className="mt-8 bg-gradient-to-r from-purple-500 to-fuchsia-500 px-10 py-4 rounded-2xl font-bold text-white"
                  >
                    {loading
                      ? "Starting..."
                      : "Start Test"}
                  </button>

                </div>

              </div>
            )}

          {summary && (

            <div className="max-w-3xl mx-auto mt-10">

              <div className="glass p-10 rounded-3xl text-center">

                <h1 className="text-5xl font-bold text-fuchsia-400 mb-10">
                  Exam Completed
                </h1>

                <div className="space-y-6 text-2xl">

                  <p>
                    Score :
                    <span className="text-green-400 ml-3">
                      {summary.score}
                    </span>
                  </p>

                  <p>
                    Total Marks :
                    <span className="text-yellow-400 ml-3">
                      {summary.totalMarks}
                    </span>
                  </p>

                  <p>
                    Accuracy :
                    <span className="text-pink-400 ml-3">
                      {summary.accuracy}%
                    </span>
                  </p>

                </div>

              </div>

            </div>
          )}

        </div>

      </MainLayout>

    )

  );
}








