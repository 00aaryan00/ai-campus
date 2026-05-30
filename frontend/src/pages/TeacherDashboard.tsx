import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import Charts from "../components/Charts";
import DayStatusCard, {
  getCurrentDayStatus,
} from "../components/DayStatusCard";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { API_BASE_URL } from "../services/api";
import AIInsights from "../components/AIInsights";
import Notifications from "../components/Notifications";
import ProgressCard from "../components/ProgressCard";
import { useAuth } from "../context/AuthContext";
import { facultyAiApi, facultyTestApi } from "../services/api";

type LeaveRequest = {
  id?: string;
  studentName: string;
  role: "Student" | "Teacher" | "Staff";
  department?: string;
  reason: string;
  fromDate: string;
  toDate: string;
  status: "Pending" | "Approved" | "Rejected";
};

type QuestionPayload = {
  questionText: string;
  options: string[];
  correctAnswer: string;
  marks: number;
  difficultyLevel: "easy" | "medium" | "hard";
  topic: string;
  source: "ai" | "manual";
};

type TeacherData = {
  name: string;
  classes: number;
  students: number;
  assignmentsGiven: number;
  averageScore: number;
  atRiskStudents: number;
  upcomingExam: string;
  chartData: { name: string; value: number }[];
};

type TabType =
  | "dashboard"
  | "classes"
  | "leaves"
  | "attendance"
  | "exams"
  | "performance"
  | "events"
  | "notifications";



const card =
  "card-hover rounded-3xl border border-slate-200/60 bg-white/90 p-6 text-slate-900 shadow-card backdrop-blur-xl transition dark:border-blue-500/10 dark:bg-[#0C1330] dark:text-white";

const inner =
  "card-hover mb-3 rounded-2xl border border-slate-200/40 bg-slate-50 p-4 text-slate-700 dark:border-blue-500/10 dark:bg-[#111B44] dark:text-white";

const btn =
  "rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 dark:from-blue-600 dark:to-blue-400 px-5 py-2 font-semibold text-slate-900 shadow-md shadow-gold-600/15 dark:shadow-blue-600/15 transition hover:scale-105 hover:shadow-gold-600/25 dark:hover:shadow-blue-600/25";

const SectionHeader = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <div className="card-hover mb-6 rounded-3xl border border-slate-200/60 bg-white/90 p-6 text-slate-900 shadow-card backdrop-blur-xl dark:border-blue-500/10 dark:bg-[#0C1330] dark:text-white">
    <h2 className="font-display text-2xl font-black text-slate-900 dark:text-white">
      {title}
    </h2>
    <p className="mt-2 text-slate-500 dark:text-slate-400">{description}</p>
  </div>
);

const AI_TAGS = [
  "Numericals",
  "Theory",
  "Calculative",
  "Conceptual",
  "Real-world Examples",
  "Analytical",
  "Code Snippets"
];

export default function TeacherDashboard() {
  const { token, user } = useAuth();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [data, setData] = useState<TeacherData | null>(null);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  
  const [examType, setExamType] = useState<"" | "common" | "adaptive">("");
  const [commonDifficulty, setCommonDifficulty] = useState<"" | "easy" | "medium" | "hard">("");
  const [commonQuestionCount, setCommonQuestionCount] = useState(15);
  const [commonTotalMarks, setCommonTotalMarks] = useState(30);
  const [adaptiveQuestionCount, setAdaptiveQuestionCount] = useState(10);
  const [adaptiveTotalMarks, setAdaptiveTotalMarks] = useState(20);
  const [generatedExamCode, setGeneratedExamCode] = useState<string | null>(null);
  const [examTitle, setExamTitle] = useState("");
  const [examSubject, setExamSubject] = useState("");
  const [recommendedSubjects, setRecommendedSubjects] = useState([
    "Mathematics",
    "AI Basics",
    "Operating Systems",
    "Physics",
    "Chemistry"
  ]);
  const [examDuration, setExamDuration] = useState(30);
  const [examInstructions, setExamInstructions] = useState("");
  const [createError, setCreateError] = useState("");
  const [transcriptInput, setTranscriptInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [generatedQuestionSets, setGeneratedQuestionSets] = useState<{
    common?: QuestionPayload[];
    easy?: QuestionPayload[];
    medium?: QuestionPayload[];
    hard?: QuestionPayload[];
  } | null>(null);
  const [editingQuestionKey, setEditingQuestionKey] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const day = getCurrentDayStatus();
  const [selectedDay, setSelectedDay] = useState(day.dayName);
  
  const [mySchedule, setMySchedule] = useState<any[]>([]);

  useEffect(() => {
    const loadSchedule = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/t/${tenantSlug}/timetable/my-schedule`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` }
        });
        const data = await response.json();
        if (data.success) {
          setMySchedule(data.schedule);
        }
      } catch (err) {
        console.error("Failed to fetch schedule", err);
      }
    };
    if (tenantSlug) loadSchedule();
  }, [tenantSlug]);

  // Derived filtered schedules based on the new backend structure
  const todaySchedule = mySchedule.filter(item => item.dayOfWeek === day.dayName);
  const selectedDaySchedule = mySchedule.filter(item => item.dayOfWeek === selectedDay);

  useEffect(() => {
    // Backend-first mode: avoid hard dependency on Firestore data for dashboard boot.
    setData({
      name: "Faculty",
      classes: 6,
      students: 120,
      assignmentsGiven: 18,
      averageScore: 78,
      atRiskStudents: 7,
      upcomingExam: "Weekly Assessment - Friday 10:00 AM",
      chartData: [
        { name: "Mon", value: 70 },
        { name: "Tue", value: 74 },
        { name: "Wed", value: 79 },
        { name: "Thu", value: 76 },
        { name: "Fri", value: 82 },
      ],
    });
    setLeaves([]);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<TabType>;
      setActiveTab(customEvent.detail);
    };

    window.addEventListener("facultyTabChange", handler);

    return () => {
      window.removeEventListener("facultyTabChange", handler);
    };
  }, []);

  const update = (id: string, status: "Approved" | "Rejected") => {
    setLeaves((previous) =>
      previous.map((leave) => (leave.id === id ? { ...leave, status } : leave))
    );
  };

  const updateQuestion = (
    setName: "common" | "easy" | "medium" | "hard",
    index: number,
    updater: (previous: QuestionPayload) => QuestionPayload
  ) => {
    setGeneratedQuestionSets((previous) => {
      if (!previous) return previous;
      const list = (previous[setName] || []).slice();
      const current = list[index];
      if (!current) return previous;
      list[index] = updater(current);
      return { ...previous, [setName]: list };
    });
  };

  const applySetTargets = (
    questions: QuestionPayload[],
    targetCount: number,
    totalMarks: number
  ) => {
    const safeCount = Math.max(1, targetCount);
    const safeTotal = Math.max(1, totalMarks);
    const trimmed = questions.slice(0, safeCount);
    const actualCount = Math.max(1, trimmed.length);
    const baseMarks = Math.floor(safeTotal / actualCount);
    const extra = safeTotal % actualCount;
    return trimmed.map((question, index) => ({
      ...question,
      marks: baseMarks + (index < extra ? 1 : 0),
    }));
  };

  const handleCreateExam = async () => {
    if (!token) {
      setCreateError("Please login again as faculty.");
      return;
    }

    if (!examTitle.trim()) {
      setCreateError("Exam title is required.");
      return;
    }

    if (!generatedQuestionSets) {
      setCreateError("Generate AI questions first.");
      return;
    }

    if (!examType) {
      setCreateError("Please select exam mode.");
      return;
    }

    const isCommonMode = examType === "common";
    const sets = isCommonMode
      ? {
          common: generatedQuestionSets.common || [],
        }
      : {
          easy: generatedQuestionSets.easy || [],
          medium: generatedQuestionSets.medium || [],
          hard: generatedQuestionSets.hard || [],
        };

    if (isCommonMode && (!sets.common || sets.common.length === 0)) {
      if (!commonDifficulty) {
        setCreateError("Please select difficulty level for common mode.");
        return;
      }
      setCreateError("Common mode requires generated common questions.");
      return;
    }

    if (
      !isCommonMode &&
      ((sets.easy || []).length === 0 || (sets.medium || []).length === 0 || (sets.hard || []).length === 0)
    ) {
      setCreateError("Adaptive mode requires easy, medium, and hard question sets.");
      return;
    }

    if (isCommonMode && (generatedQuestionSets.common || []).length < Math.max(1, commonQuestionCount)) {
      setCreateError(`Need at least ${commonQuestionCount} generated common questions.`);
      return;
    }

    if (
      !isCommonMode &&
      ((generatedQuestionSets.easy || []).length < Math.max(1, adaptiveQuestionCount) ||
        (generatedQuestionSets.medium || []).length < Math.max(1, adaptiveQuestionCount) ||
        (generatedQuestionSets.hard || []).length < Math.max(1, adaptiveQuestionCount))
    ) {
      setCreateError(`Need at least ${adaptiveQuestionCount} questions in each adaptive set.`);
      return;
    }

    setCreateError("");
    try {
      const response = await facultyTestApi.createTest(token, {
        title: examTitle.trim(),
        subject: examSubject,
        mode: isCommonMode ? "common" : "adaptive",
        duration: Number(examDuration),
        instructions: examInstructions.trim(),
        sets,
      });
      setGeneratedExamCode(response.test.roomCode);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create test";
      setCreateError(message);
    }
  };

  const handleGenerateQuestions = async () => {
    if (!token) {
      setAiError("Please login again as faculty.");
      return;
    }

    if (!examType) {
      setAiError("Please select exam mode first.");
      return;
    }

    if (!transcriptInput.trim()) {
      setAiError("Please add transcript/content first.");
      return;
    }

    setAiError("");
    setAiLoading(true);

    const enrichedTranscript = selectedTags.length > 0
      ? `${transcriptInput}\n\n[CRITICAL FOCUS: Ensure the generated questions strongly emphasize these aspects: ${selectedTags.join(", ")}]`
      : transcriptInput;

    try {
      const response = await facultyAiApi.generateQuestions(token, {
        transcript: enrichedTranscript,
        mode: examType === "common" ? "same" : "adaptive",
        totalQuestions: examType === "common" ? commonQuestionCount : adaptiveQuestionCount,
        totalMarks: examType === "common" ? commonTotalMarks : adaptiveTotalMarks,
        difficulty: examType === "common" ? commonDifficulty : undefined,
      });
      const normalizeGenerated = (
        questions:
          | Array<{
              questionText: string;
              options: string[];
              correctAnswer: string;
              marks: number;
              difficultyLevel?: string;
              topic?: string;
              source?: "ai" | "manual";
            }>
          | undefined,
        fallbackDifficulty: "easy" | "medium" | "hard"
      ): QuestionPayload[] =>
        (questions || []).map((question) => ({
          questionText: question.questionText,
          options: question.options,
          correctAnswer: question.correctAnswer,
          marks: question.marks,
          difficultyLevel:
            question.difficultyLevel === "easy" ||
            question.difficultyLevel === "medium" ||
            question.difficultyLevel === "hard"
              ? question.difficultyLevel
              : fallbackDifficulty,
          topic: question.topic || "",
          source: question.source || "ai",
        }));

      const generatedCommon = normalizeGenerated(
        response.sets.common,
        commonDifficulty || "medium"
      );
      const generatedEasy = normalizeGenerated(response.sets.easy, "easy");
      const generatedMedium = normalizeGenerated(response.sets.medium, "medium");
      const generatedHard = normalizeGenerated(response.sets.hard, "hard");

      setGeneratedQuestionSets({
        common:
          examType === "common"
            ? applySetTargets(generatedCommon, commonQuestionCount, commonTotalMarks)
            : generatedCommon,
        easy:
          examType === "adaptive"
            ? applySetTargets(generatedEasy, adaptiveQuestionCount, adaptiveTotalMarks)
            : generatedEasy,
        medium:
          examType === "adaptive"
            ? applySetTargets(generatedMedium, adaptiveQuestionCount, adaptiveTotalMarks)
            : generatedMedium,
        hard:
          examType === "adaptive"
            ? applySetTargets(generatedHard, adaptiveQuestionCount, adaptiveTotalMarks)
            : generatedHard,
      });
    } catch (error) {
      let message = error instanceof Error ? error.message : "Failed to generate questions";
      const lowerMsg = message.toLowerCase();
      
      if (lowerMsg.includes("rate limit") || lowerMsg.includes("429") || lowerMsg.includes("too many requests")) {
        message = "AI rate limit reached. Please wait a moment and try again.";
      } else if (lowerMsg.includes("token limit") || lowerMsg.includes("context length") || lowerMsg.includes("maximum context length")) {
        message = "The provided transcript is too large and exceeds the AI model's token limit. Please shorten the text and try again.";
      }

      setAiError(message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleTranscriptUpload = async (file: File | null) => {
    if (!file) return;
    const lower = file.name.toLowerCase();
    try {
      if (lower.endsWith(".txt")) {
        const content = await file.text();
        setTranscriptInput((prev) => (prev ? `${prev}\n\n${content}` : content));
        return;
      }
      setAiError("Only .txt upload is supported in this demo build. Please paste PDF/DOCX text.");
    } catch {
      setAiError("Failed to read uploaded file.");
    }
  };

  if (!data) {
    return (
      <MainLayout>
        <p className="text-slate-500 dark:text-slate-400">Loading...</p>
      </MainLayout>
    );
  }

  const displayName = user?.name?.trim() || data.name;
  const teacherMeta =
    user?.department?.trim()?.toUpperCase() || user?.email?.trim() || "Faculty";

  return (
    <MainLayout>
      {activeTab !== "exams" ? (
        <div className="mb-8">
          <h1 className="text-4xl font-black text-slate-900 dark:text-white">
            Teacher Dashboard
          </h1>
          <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
            Welcome Teacher {displayName} 👋 | {teacherMeta}
          </p>
        </div>
      ) : null}

      {activeTab === "dashboard" && (
        <>
          <SectionHeader
            title="Teacher Overview"
            description="Overview of today's classes, total students, pending leave requests and class performance insights."
          />

          <div className="grid gap-6 md:grid-cols-5">
            <DayStatusCard />

            <div className={card}>
              <p className="text-base font-semibold text-slate-500 dark:text-slate-400">
                Today Classes 📚
              </p>
              <h2 className="mt-2 text-4xl font-black text-slate-900 dark:text-white">{todaySchedule.length}</h2>
            </div>

            <div className={card}>
              <p className="text-base font-semibold text-slate-500 dark:text-slate-400">
                Students 👨‍🎓
              </p>
              <h2 className="mt-2 text-4xl font-black text-slate-900 dark:text-white">{data.students}</h2>
            </div>

            <div className={card}>
              <p className="text-base font-semibold text-slate-500 dark:text-slate-400">
                Pending Leaves ✈️
              </p>
              <h2 className="mt-2 text-4xl font-black text-gold-600 dark:text-blue-400">{leaves.length}</h2>
            </div>

            <div className={card}>
              <p className="text-base font-semibold text-slate-500 dark:text-slate-400">
                Avg Score 📈
              </p>
              <h2 className="mt-2 text-4xl font-black text-slate-900 dark:text-white">
                {data.averageScore}%
              </h2>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <ProgressCard label="Class Performance" value={data.averageScore} />
            <Notifications />
          </div>

          <AIInsights role="faculty" />
        </>
      )}

      {activeTab === "classes" && (
        <>
          <SectionHeader
            title="Class Schedule"
            description="Review today's teaching schedule, planned sessions and classroom responsibilities."
          />

          <div className={card}>
            <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
              {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-bold transition-all ${
                    selectedDay === day
                      ? "bg-blue-500 text-white shadow-md shadow-blue-500/25"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-[#111B44] dark:text-slate-400 dark:hover:bg-blue-500/10"
                  }`}
                >
                  {day.charAt(0)}
                </button>
              ))}
            </div>

            {selectedDaySchedule.length > 0 ? (
              <div className="relative border-l-2 border-blue-500/30 pl-6 space-y-8 ml-3">
                {selectedDaySchedule.map((item, index) => (
                  <div key={index} className="relative">
                    <div className="absolute -left-[35px] top-1 h-4 w-4 rounded-full border-4 border-white bg-blue-500 dark:border-[#0C1330]"></div>
                    <div className="text-sm font-bold text-blue-500 dark:text-blue-400 mb-2">{item.startTime} - {item.endTime}</div>
                    <div className="card-hover rounded-2xl border border-slate-200/40 bg-slate-50 p-4 text-slate-800 dark:border-blue-500/10 dark:bg-[#111B44] dark:text-slate-100">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{item.subject}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Class: {item.department} ({item.semester})</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Room No. {item.room}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 dark:text-slate-400 text-center py-10 font-medium">
                No classes scheduled for {selectedDay}.
              </p>
            )}
          </div>
        </>
      )}

      {activeTab === "leaves" && (
        <>
          <SectionHeader
            title="Student Leave Requests"
            description="Review pending student leave applications and take approval or rejection actions."
          />

          <div className={card}>
            <h2 className="mb-4 text-xl font-black text-accent-blue">
              Leave Requests
            </h2>

            {leaves.length ? (
              leaves.map((l) => (
                <div key={l.id} className={inner}>
                  <p>
                    <b>{l.studentName}</b>
                  </p>
                  <p>{l.fromDate} → {l.toDate}</p>
                  <p>{l.reason}</p>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => l.id && update(l.id, "Approved")}
                      className="rounded-xl bg-accent-emerald px-4 py-2 font-semibold text-navy-900 shadow-sm transition hover:brightness-110"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => l.id && update(l.id, "Rejected")}
                      className="rounded-xl bg-accent-rose px-4 py-2 font-semibold text-navy-900 shadow-sm transition hover:brightness-110"
                    >
                      Reject
                    </button>
                    <button className="rounded-xl bg-indigo-500/10 px-4 py-2 font-semibold text-indigo-600 shadow-sm transition hover:bg-indigo-500/20 dark:text-indigo-400">
                      Download Outpass
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-500 dark:text-slate-400">
                No pending leaves
              </p>
            )}
          </div>
        </>
      )}

      {activeTab === "attendance" && (
        <>
          <SectionHeader
            title="Attendance Management"
            description="Mark and manage student attendance for today's classes."
          />

          <div className={card}>
            <h2 className="mb-3 text-xl font-black text-gold-600 dark:text-blue-400">
              Mark Attendance
            </h2>

            <p className="mb-4 text-slate-500 dark:text-slate-400">
              Select a class and mark students as present or absent.
            </p>

            <div className="mb-4 grid gap-4 md:grid-cols-3">
              <select className="rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30 dark:border-blue-500/15 dark:bg-[#111B44] dark:text-white">
                <option>Select Class</option>
                <option>8</option>
                <option>9</option>
                <option>10</option>
                <option>11</option>
                <option>12</option>
              </select>

              <select className="rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30 dark:border-blue-500/15 dark:bg-[#111B44] dark:text-white">
                <option>Select Section</option>
                <option>A</option>
                <option>B</option>
                <option>C</option>
              </select>

              <select className="rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30 dark:border-blue-500/15 dark:bg-[#111B44] dark:text-white">
                <option>Select Subject</option>
                <option>Mathematics</option>
                <option>AI Basics</option>
                <option>Operating Systems</option>
              </select>

              <input
                type="date"
                className="rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30 dark:border-blue-500/15 dark:bg-[#111B44] dark:text-white"
              />
            </div>

            <div className="space-y-3">
              {["Aarav", "Meera", "Charan", "Diya", "Rahul"].map((student) => (
                <div
                  key={student}
                  className="flex items-center justify-between rounded-2xl border border-slate-200/50 bg-slate-50 p-4 dark:border-blue-500/10 dark:bg-[#111B44]"
                >
                  <p className="font-semibold">{student}</p>

                  <div className="flex gap-2">
                    <button className="rounded-xl bg-accent-emerald px-4 py-2 text-sm font-bold text-navy-900">
                      Present
                    </button>
                    <button className="rounded-xl bg-accent-rose px-4 py-2 text-sm font-bold text-navy-900">
                      Absent
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button className={`${btn} mt-5`}>Submit Attendance</button>
          </div>
        </>
      )}

      {activeTab === "exams" && (
        <>
          <SectionHeader
            title="Create Exam"
            description="Design, customize, and publish assessments using our AI question generator."
          />

          <div className="space-y-6">
            <aside className="h-fit rounded-3xl border border-slate-200/60 bg-white/90 p-6 text-slate-900 shadow-card backdrop-blur-xl dark:border-blue-500/10 dark:bg-[#0C1330] dark:text-white">
              <h2 className="mb-4 text-xl font-black text-accent-blue">Exam Setup</h2>
              <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                Fill details, generate questions, review quickly, then create assessment.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Exam Title</label>
                  <input
                    type="text"
                    aria-label="Exam title"
                    placeholder="Enter exam title..."
                    value={examTitle}
                    onChange={(e) => setExamTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30 dark:border-blue-500/15 dark:bg-[#111B44] dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Subject</label>
                  <input
                    type="text"
                    list="subject-suggestions"
                    aria-label="Exam subject"
                    placeholder="e.g. Operating Systems / Thermodynamics / Data Structures"
                    value={examSubject}
                    onChange={(e) => setExamSubject(e.target.value)}
                    onBlur={() => {
                      const trimmed = examSubject.trim();
                      if (trimmed && !recommendedSubjects.includes(trimmed)) {
                        setRecommendedSubjects((prev) => [...prev, trimmed]);
                        setExamSubject(trimmed);
                      }
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30 dark:border-blue-500/15 dark:bg-[#111B44] dark:text-white"
                  />
                  <datalist id="subject-suggestions">
                    {recommendedSubjects.map((sub) => (
                      <option key={sub} value={sub} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Total Time (minutes)</label>
                  <input
                    type="number"
                    min={1}
                    aria-label="Duration in minutes"
                    value={examDuration}
                    onChange={(e) => setExamDuration(Number(e.target.value))}
                    placeholder="e.g., 30"
                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30 dark:border-blue-500/15 dark:bg-[#111B44] dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Exam Mode</label>
                  <select
                    aria-label="Exam mode"
                    value={examType}
                    onChange={(e) => setExamType(e.target.value as "" | "common" | "adaptive")}
                    className="w-full rounded-xl border border-indigo-300 bg-indigo-50/30 p-3 font-semibold text-indigo-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-indigo-500/30 dark:bg-indigo-950/20 dark:text-indigo-300"
                  >
                    <option value="">Select Mode</option>
                    <option value="common">Common (same test for everyone)</option>
                    <option value="adaptive">Adaptive (based on previous performances)</option>
                  </select>
                </div>
                {examType === "common" && (
                  <div className="space-y-4 rounded-xl border border-indigo-500/20 bg-indigo-50/50 p-4 dark:bg-indigo-950/20">
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-indigo-800 dark:text-indigo-300">Difficulty Level</label>
                      <select
                        aria-label="Common mode difficulty"
                        value={commonDifficulty}
                        onChange={(e) => setCommonDifficulty(e.target.value as "" | "easy" | "medium" | "hard")}
                        className="w-full rounded-xl border border-indigo-300 bg-indigo-50/30 p-3 font-semibold text-indigo-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-indigo-500/30 dark:bg-indigo-950/20 dark:text-indigo-300"
                      >
                        <option value="">Select Difficulty</option>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-indigo-800 dark:text-indigo-300">Total Questions</label>
                        <input
                          type="number"
                          min={1}
                          aria-label="Total questions in common set"
                          value={commonQuestionCount}
                          onChange={(e) => setCommonQuestionCount(Math.max(1, Number(e.target.value) || 1))}
                          placeholder="e.g., 15"
                          className="w-full rounded-xl border border-indigo-300 bg-indigo-50/30 p-3 text-indigo-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-indigo-500/30 dark:bg-indigo-950/20 dark:text-indigo-300"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-indigo-800 dark:text-indigo-300">Total Marks</label>
                        <input
                          type="number"
                          min={1}
                          aria-label="Total marks in common set"
                          value={commonTotalMarks}
                          onChange={(e) => setCommonTotalMarks(Math.max(1, Number(e.target.value) || 1))}
                          placeholder="e.g., 30"
                          className="w-full rounded-xl border border-indigo-300 bg-indigo-50/30 p-3 text-indigo-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-indigo-500/30 dark:bg-indigo-950/20 dark:text-indigo-300"
                        />
                      </div>
                    </div>
                  </div>
                )}
                {examType === "adaptive" && (
                  <div className="space-y-4 rounded-xl border border-indigo-500/20 bg-indigo-50/50 p-4 dark:bg-indigo-950/20">
                    <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                      Apply targets for all sets (easy, medium, hard)
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-indigo-800 dark:text-indigo-300">Total Questions (per set)</label>
                        <input
                          type="number"
                          min={1}
                          aria-label="Total questions in each adaptive set"
                          value={adaptiveQuestionCount}
                          onChange={(e) => setAdaptiveQuestionCount(Math.max(1, Number(e.target.value) || 1))}
                          placeholder="e.g., 10"
                          className="w-full rounded-xl border border-indigo-300 bg-indigo-50/30 p-3 text-indigo-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-indigo-500/30 dark:bg-indigo-950/20 dark:text-indigo-300"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-indigo-800 dark:text-indigo-300">Total Marks (per set)</label>
                        <input
                          type="number"
                          min={1}
                          aria-label="Total marks in each adaptive set"
                          value={adaptiveTotalMarks}
                          onChange={(e) => setAdaptiveTotalMarks(Math.max(1, Number(e.target.value) || 1))}
                          placeholder="e.g., 20"
                          className="w-full rounded-xl border border-indigo-300 bg-indigo-50/30 p-3 text-indigo-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-indigo-500/30 dark:bg-indigo-950/20 dark:text-indigo-300"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

                <div className="mt-4 rounded-xl border border-indigo-500/20 bg-indigo-50/50 p-4 dark:bg-indigo-950/20">
                <h3 className="text-sm font-bold text-indigo-700 dark:text-indigo-300">AI Input</h3>
                <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg border border-indigo-300/40 bg-indigo-100/60 px-3 py-2 text-xs font-semibold text-indigo-800 transition dark:border-indigo-500/30 dark:bg-indigo-900/30 dark:text-indigo-300">
                  Upload Transcript (.txt)
                  <input
                    type="file"
                    accept=".txt,text/plain,.pdf,.docx"
                    className="hidden"
                    onChange={(e) => handleTranscriptUpload(e.target.files?.[0] || null)}
                  />
                </label>
                <textarea
                  aria-label="Lecture transcript or topic input"
                  placeholder="Paste topic / lecture notes..."
                  rows={5}
                  value={transcriptInput}
                  onChange={(e) => setTranscriptInput(e.target.value)}
                  className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-blue-500/15 dark:bg-[#111B44] dark:text-white"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {AI_TAGS.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => setSelectedTags(prev => isSelected ? prev.filter(t => t !== tag) : [...prev, tag])}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-500 text-white dark:border-indigo-400 dark:bg-indigo-400 dark:text-navy-900 shadow-md shadow-indigo-500/20"
                            : "border-indigo-200 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-900/20 dark:text-indigo-300 dark:hover:bg-indigo-800/40"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
                <textarea
                  aria-label="Exam instructions"
                  placeholder="Exam instructions for students"
                  rows={3}
                  value={examInstructions}
                  onChange={(e) => setExamInstructions(e.target.value)}
                  className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-blue-500/15 dark:bg-[#111B44] dark:text-white"
                />
                {aiError && <p className="mt-2 text-sm font-semibold text-rose-500">{aiError}</p>}
                <button
                  onClick={handleGenerateQuestions}
                  disabled={aiLoading}
                  className="mt-3 w-full rounded-xl bg-gradient-to-r from-navy-600 to-navy-800 hover:from-navy-700 hover:to-navy-900 px-5 py-2 font-bold text-white transition shadow-md disabled:opacity-60"
                >
                  {aiLoading ? "Generating..." : "Generate Questions with AI"}
                </button>
              </div>

              <button
                onClick={handleCreateExam}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 px-6 py-3 font-bold text-white shadow-lg shadow-gold-500/25 transition"
              >
                Create Assessment
              </button>
              {createError && <p className="mt-2 text-sm font-semibold text-rose-500">{createError}</p>}

              {generatedExamCode && (
                <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-50/50 p-4 text-center dark:border-emerald-500/20 dark:bg-emerald-900/20">
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Assessment Created</p>
                  <p className="mt-2 text-2xl font-black tracking-widest text-slate-900 dark:text-white">{generatedExamCode}</p>
                </div>
              )}
            </aside>

            <section className="rounded-3xl border border-slate-200/60 bg-white/90 p-6 text-slate-900 shadow-card backdrop-blur-xl dark:border-blue-500/10 dark:bg-[#0C1330] dark:text-white">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-black text-blue-600 dark:text-blue-400">Generated Question Sets</h3>
                {generatedQuestionSets ? (
                  <span className="rounded-full border border-blue-500/20 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                    Editable
                  </span>
                ) : null}
              </div>

              {!generatedQuestionSets ? (
                <p className="text-slate-500 dark:text-slate-400">
                  Generate questions to preview and edit them here.
                </p>
              ) : (
                <div className="max-h-[68vh] space-y-4 overflow-y-auto pr-1">
                  {generatedQuestionSets.common ? (
                    <details open className="rounded-xl border border-white/10 bg-slate-50/60 p-3 dark:bg-[#111B44]/60">
                      <summary className="cursor-pointer font-semibold">Common Set ({generatedQuestionSets.common.length})</summary>
                      <div className="mt-3 space-y-3">
                        {generatedQuestionSets.common.map((q, i) => {
                          const questionKey = `common-${i}`;
                          const isEditing = editingQuestionKey === questionKey;
                          return (
                            <div key={questionKey} className="mb-3 rounded-2xl border border-slate-200/40 bg-slate-50 p-4 text-slate-700 dark:border-blue-500/10 dark:bg-[#111B44] dark:text-white">
                              <div className="mb-2 flex items-center justify-between">
                                <p className="font-semibold">Q{i + 1}</p>
                                <button
                                  type="button"
                                  onClick={() => setEditingQuestionKey(isEditing ? null : questionKey)}
                                  className="rounded-lg bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-300"
                                >
                                  {isEditing ? "Done" : "Edit"}
                                </button>
                              </div>
                              {isEditing ? (
                                <div className="space-y-2">
                                  <input value={q.questionText} onChange={(e) => updateQuestion("common", i, (prev) => ({ ...prev, questionText: e.target.value, source: "manual" }))} className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:border-blue-500/20 dark:bg-[#0C1330] dark:text-white" />
                                  <input value={q.options.join(" | ")} onChange={(e) => updateQuestion("common", i, (prev) => ({ ...prev, options: e.target.value.split("|").map((item) => item.trim()).filter(Boolean), source: "manual" }))} className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:border-blue-500/20 dark:bg-[#0C1330] dark:text-white" />
                                  <div className="grid gap-2 md:grid-cols-3">
                                    <input value={q.correctAnswer} onChange={(e) => updateQuestion("common", i, (prev) => ({ ...prev, correctAnswer: e.target.value, source: "manual" }))} className="rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:border-blue-500/20 dark:bg-[#0C1330] dark:text-white" />
                                    <input type="number" min={1} value={q.marks} onChange={(e) => updateQuestion("common", i, (prev) => ({ ...prev, marks: Number(e.target.value) || 1, source: "manual" }))} className="rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:border-blue-500/20 dark:bg-[#0C1330] dark:text-white" />
                                    <select value={q.difficultyLevel} onChange={(e) => updateQuestion("common", i, (prev) => ({ ...prev, difficultyLevel: e.target.value as "easy" | "medium" | "hard", source: "manual" }))} className="rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:border-blue-500/20 dark:bg-[#0C1330] dark:text-white"><option value="easy">easy</option><option value="medium">medium</option><option value="hard">hard</option></select>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="font-semibold prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-pre:my-2">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{q.questionText}</ReactMarkdown>
                                  </div>
                                  <div className="text-sm mt-2 space-y-1">
                                    <p className="font-bold">Options:</p>
                                    <ul className="list-disc list-inside ml-2">
                                      {q.options.map((opt, oIdx) => (
                                        <li key={oIdx} className="prose prose-sm dark:prose-invert prose-p:inline prose-pre:inline">
                                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{opt}</ReactMarkdown>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  <p className="text-sm mt-1">Answer: {q.correctAnswer} | Marks: {q.marks} | Tag: {q.difficultyLevel} | Source: {q.source}</p>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  ) : null}

                  {(["easy", "medium", "hard"] as const).map((setName) =>
                    generatedQuestionSets[setName] ? (
                      <details key={setName} open className="rounded-xl border border-white/10 bg-slate-50/60 p-3 dark:bg-[#111B44]/60">
                        <summary className="cursor-pointer font-semibold capitalize">
                          {setName} Set ({generatedQuestionSets[setName]?.length || 0})
                        </summary>
                        <div className="mt-3 space-y-3">
                          {generatedQuestionSets[setName]?.map((q, i) => {
                            const questionKey = `${setName}-${i}`;
                            const isEditing = editingQuestionKey === questionKey;
                            return (
                              <div key={questionKey} className="mb-3 rounded-2xl border border-slate-200/40 bg-slate-50 p-4 text-slate-700 dark:border-blue-500/10 dark:bg-[#111B44] dark:text-white">
                                <div className="mb-2 flex items-center justify-between">
                                  <p className="font-semibold">Q{i + 1}</p>
                                  <button
                                    type="button"
                                    onClick={() => setEditingQuestionKey(isEditing ? null : questionKey)}
                                    className="rounded-lg bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-300"
                                  >
                                    {isEditing ? "Done" : "Edit"}
                                  </button>
                                </div>
                                {isEditing ? (
                                  <div className="space-y-2">
                                    <input value={q.questionText} onChange={(e) => updateQuestion(setName, i, (prev) => ({ ...prev, questionText: e.target.value, source: "manual" }))} className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:border-blue-500/20 dark:bg-[#0C1330] dark:text-white" />
                                    <input value={q.options.join(" | ")} onChange={(e) => updateQuestion(setName, i, (prev) => ({ ...prev, options: e.target.value.split("|").map((item) => item.trim()).filter(Boolean), source: "manual" }))} className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:border-blue-500/20 dark:bg-[#0C1330] dark:text-white" />
                                    <div className="grid gap-2 md:grid-cols-3">
                                      <input value={q.correctAnswer} onChange={(e) => updateQuestion(setName, i, (prev) => ({ ...prev, correctAnswer: e.target.value, source: "manual" }))} className="rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:border-blue-500/20 dark:bg-[#0C1330] dark:text-white" />
                                      <input type="number" min={1} value={q.marks} onChange={(e) => updateQuestion(setName, i, (prev) => ({ ...prev, marks: Number(e.target.value) || 1, source: "manual" }))} className="rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:border-blue-500/20 dark:bg-[#0C1330] dark:text-white" />
                                      <select value={q.difficultyLevel} onChange={(e) => updateQuestion(setName, i, (prev) => ({ ...prev, difficultyLevel: e.target.value as "easy" | "medium" | "hard", source: "manual" }))} className="rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:border-blue-500/20 dark:bg-[#0C1330] dark:text-white"><option value="easy">easy</option><option value="medium">medium</option><option value="hard">hard</option></select>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="font-semibold prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-pre:my-2">
                                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{q.questionText}</ReactMarkdown>
                                    </div>
                                    <div className="text-sm mt-2 space-y-1">
                                      <p className="font-bold">Options:</p>
                                      <ul className="list-disc list-inside ml-2">
                                        {q.options.map((opt, oIdx) => (
                                          <li key={oIdx} className="prose prose-sm dark:prose-invert prose-p:inline prose-pre:inline">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{opt}</ReactMarkdown>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                    <p className="text-sm mt-1">Answer: {q.correctAnswer} | Marks: {q.marks} | Tag: {q.difficultyLevel} | Source: {q.source}</p>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    ) : null
                  )}
                </div>
              )}
            </section>
          </div>
        </>
      )}

      {activeTab === "performance" && (
        <>
          <SectionHeader
            title="Class Performance"
            description="Track class activity, weekly trends, at-risk students and upcoming assessments."
          />

          <div className={card}>
            <Charts
              title1="Class Activity"
              title2="Weekly Trend"
              data={data.chartData}
            />
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className={card}>
              <h2 className="mb-2 text-xl font-black text-gold-600 dark:text-blue-400">
                At Risk Students
              </h2>
              <p className="text-3xl font-black text-slate-900 dark:text-white">
                {data.atRiskStudents}
              </p>
            </div>

            <div className={card}>
              <h2 className="mb-2 text-xl font-black text-accent-blue">
                Upcoming Exam
              </h2>
              <p className="text-lg font-medium text-slate-600 dark:text-slate-300">
                {data.upcomingExam}
              </p>
            </div>
          </div>
        </>
      )}

      {activeTab === "events" && (
        <>
          <SectionHeader
            title="Institutional Events"
            description="View upcoming events, notices and schedules published by the HOD and Principal."
          />

          <div className={card}>
            <h2 className="mb-4 text-xl font-black text-gold-600 dark:text-blue-400">
              📅 Upcoming Events
            </h2>
            <div className="space-y-3">
              <div className={inner}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-bold">Annual Tech Fest 2026</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">📍 Main Auditorium &middot; 🗓️ 20 May 2026 &middot; 🕐 10:00 AM</p>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Technical competitions, hackathons, and project exhibitions for all branches.</p>
                  </div>
                  <span className="rounded-lg bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">Active</span>
                </div>
              </div>
              <div className={inner}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-bold">Faculty Development Program</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">📍 Conference Hall B &middot; 🗓️ 25 May 2026 &middot; 🕐 2:00 PM</p>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Workshop on AI-integrated teaching methodologies and modern pedagogy.</p>
                  </div>
                  <span className="rounded-lg bg-gold-500/15 px-3 py-1 text-xs font-bold text-gold-600 dark:text-blue-400">Upcoming</span>
                </div>
              </div>
              <div className={inner}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-bold">Sports Day</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">📍 College Ground &middot; 🗓️ 1 June 2026 &middot; 🕐 8:00 AM</p>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Annual inter-department sports competition. All students are encouraged to participate.</p>
                  </div>
                  <span className="rounded-lg bg-gold-500/15 px-3 py-1 text-xs font-bold text-gold-600 dark:text-blue-400">Upcoming</span>
                </div>
              </div>
            </div>
          </div>

          <div className={`mt-6 ${card}`}>
            <h2 className="mb-4 text-xl font-black text-accent-blue">
              📎 Attached Documents
            </h2>
            <div className="space-y-3">
              <div className={`${inner} flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📄</span>
                  <div>
                    <p className="font-semibold">Tech_Fest_Schedule_2026.pdf</p>
                    <p className="text-xs text-slate-400">Uploaded by HOD CSE &middot; 2.4 MB</p>
                  </div>
                </div>
                <button className="rounded-lg bg-gold-500/15 px-4 py-2 text-sm font-bold text-gold-600 transition hover:bg-gold-500/25 dark:bg-blue-500/15 dark:text-blue-400 dark:hover:bg-blue-500/25">Download</button>
              </div>
              <div className={`${inner} flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📄</span>
                  <div>
                    <p className="font-semibold">FDP_Workshop_Notice.pdf</p>
                    <p className="text-xs text-slate-400">Uploaded by Principal &middot; 1.1 MB</p>
                  </div>
                </div>
                <button className="rounded-lg bg-gold-500/15 px-4 py-2 text-sm font-bold text-gold-600 transition hover:bg-gold-500/25 dark:bg-blue-500/15 dark:text-blue-400 dark:hover:bg-blue-500/25">Download</button>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === "notifications" && (
        <>
          <SectionHeader
            title="Notifications"
            description="View your recent notices, announcements, and alerts."
          />
          <div className={card}>
            <h2 className="mb-4 text-xl font-black text-gold-600 dark:text-blue-400">
              📢 Notice Board
            </h2>
            <div className="space-y-3">
              <div className={inner}>
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Mid-Semester Exam Schedule Released</p>
                  <span className="text-xs text-slate-400">2 hours ago</span>
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">The mid-semester examination timetable has been published by the HOD. Please prepare your classes accordingly.</p>
              </div>
              <div className={inner}>
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Faculty Meeting — Friday 3 PM</p>
                  <span className="text-xs text-slate-400">1 day ago</span>
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">All faculty members are requested to attend the meeting in Conference Hall B regarding curriculum revisions.</p>
              </div>
            </div>
          </div>
        </>
      )}
    </MainLayout>
  );
}
