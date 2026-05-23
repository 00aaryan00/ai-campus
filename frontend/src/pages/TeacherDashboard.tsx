import { useEffect, useState } from "react";
import MainLayout from "../layout/MainLayout";
import Charts from "../components/Charts";
import DayStatusCard, {
  getCurrentDayStatus,
} from "../components/DayStatusCard";
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

const timetable: Record<string, { time: string; subject: string; class: string; type: string; room: string }[]> = {
  Monday: [
    { time: "9:00 AM", subject: "Mathematics", class: "Class 10-A", type: "Theory", room: "229" },
    { time: "11:30 AM", subject: "AI Basics", class: "Class 9-B", type: "Lab", room: "116" }
  ],
  Tuesday: [
    { time: "10:00 AM", subject: "Computer Science", class: "Class 8-A", type: "Theory", room: "506" }
  ],
  Wednesday: [
    { time: "9:00 AM", subject: "Mathematics Revision", class: "Class 10-A", type: "Theory", room: "229" },
    { time: "2:00 PM", subject: "Project Review", class: "Class 10-B", type: "Lab", room: "213" }
  ],
  Thursday: [
    { time: "11:00 AM", subject: "AI Basics Lab", class: "Class 9-B", type: "Lab", room: "116" }
  ],
  Friday: [
    { time: "10:00 AM", subject: "Weekly Assessment", class: "Class 10-A", type: "Exam", room: "305" }
  ],
  Saturday: [
    { time: "10:00 AM", subject: "Doubt Session", class: "Class 9-B", type: "Theory", room: "120" }
  ],
};

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

export default function TeacherDashboard() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [data, setData] = useState<TeacherData | null>(null);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  
  const [examType, setExamType] = useState<"" | "common" | "adaptive">("");
  const [commonDifficulty, setCommonDifficulty] = useState<"" | "easy" | "medium" | "hard">("");
  const [generatedExamCode, setGeneratedExamCode] = useState<string | null>(null);
  const [examTitle, setExamTitle] = useState("");
  const [examSubject, setExamSubject] = useState("Computer Science");
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

  const day = getCurrentDayStatus();
  const [selectedDay, setSelectedDay] = useState(day.dayName);
  const schedule = day.isWorkingDay ? timetable[day.dayName] || [] : [];

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
      ? { common: generatedQuestionSets.common || [] }
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

    try {
      const response = await facultyAiApi.generateQuestions(token, {
        transcript: transcriptInput,
        mode: examType === "common" ? "same" : "adaptive",
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

      setGeneratedQuestionSets({
        common: normalizeGenerated(response.sets.common, commonDifficulty || "medium"),
        easy: normalizeGenerated(response.sets.easy, "easy"),
        medium: normalizeGenerated(response.sets.medium, "medium"),
        hard: normalizeGenerated(response.sets.hard, "hard"),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate questions";
      setAiError(message);
    } finally {
      setAiLoading(false);
    }
  };

  if (!data) {
    return (
      <MainLayout>
        <p className="text-slate-500 dark:text-slate-400">Loading...</p>
      </MainLayout>
    );
  }

  const displayName = data.name.toLowerCase().includes("dashboard") ? "Sarah Smith" : data.name;

  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white">
          Teacher Dashboard
        </h1>
 
        <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
          Welcome Teacher {displayName} 👋
        </p>
      </div>

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
              <h2 className="mt-2 text-4xl font-black text-slate-900 dark:text-white">{schedule.length}</h2>
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

            {(timetable[selectedDay] || []).length > 0 ? (
              <div className="relative border-l-2 border-blue-500/30 pl-6 space-y-8 ml-3">
                {(timetable[selectedDay] || []).map((item, index) => (
                  <div key={index} className="relative">
                    <div className="absolute -left-[35px] top-1 h-4 w-4 rounded-full border-4 border-white bg-blue-500 dark:border-[#0C1330]"></div>
                    <div className="text-sm font-bold text-blue-500 dark:text-blue-400 mb-2">{item.time}</div>
                    <div className={inner}>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{item.subject}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{item.class}</p>
                      <p className="text-sm font-semibold text-blue-500 mt-2">{item.type}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{item.room}</p>
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
                <option>Computer Science</option>
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
            description="Create and schedule exams, tests and assessments for students."
          />

          <div className={card}>
            <h2 className="mb-4 text-xl font-black text-accent-blue">
              Exam Details
            </h2>

            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              Backend-required fields: title, subject, duration (minutes), mode, instructions, and generated questions.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <input
                type="text"
                placeholder="Exam Title"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30 dark:border-blue-500/15 dark:bg-[#111B44] dark:text-white"
              />

              <select
                value={examSubject}
                onChange={(e) => setExamSubject(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30 dark:border-blue-500/15 dark:bg-[#111B44] dark:text-white"
              >
                <option>Mathematics</option>
                <option>AI Basics</option>
                <option>Computer Science</option>
              </select>

              <input
                type="number"
                min={1}
                value={examDuration}
                onChange={(e) => setExamDuration(Number(e.target.value))}
                placeholder="Duration in minutes"
                className="rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30 dark:border-blue-500/15 dark:bg-[#111B44] dark:text-white"
              />

              <div className="space-y-2">
                
                <select
                  value={examType}
                  onChange={(e) => setExamType(e.target.value as "" | "common" | "adaptive")}
                  className="w-full rounded-xl border border-indigo-300 bg-indigo-50/30 p-3 font-semibold text-indigo-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-indigo-500/30 dark:bg-indigo-950/20 dark:text-indigo-300"
                >
                  <option value="">Mode</option>
                  <option value="common">Common (same test for everyone)</option>
                  <option value="adaptive">Adaptive (based on previous performances)</option>
                </select>
              </div>

              {examType === "common" && (
                <select
                  value={commonDifficulty}
                  onChange={(e) => setCommonDifficulty(e.target.value as "" | "easy" | "medium" | "hard")}
                  className="rounded-xl border border-indigo-300 bg-indigo-50/30 p-3 font-semibold text-indigo-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-indigo-500/30 dark:bg-indigo-950/20 dark:text-indigo-300"
                >
                  <option value="">Select Difficulty Level</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-indigo-500/20 bg-indigo-50/50 p-6 dark:bg-indigo-950/20">
              <h3 className="mb-2 text-lg font-black text-indigo-600 dark:text-indigo-400">
                AI Question Generator ✨
              </h3>
              <div className="mb-4 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Provide a topic, paste your lecture notes, or upload a lecture transcript, and our Gemini AI will instantly generate the assessment.
                </p>
                <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-indigo-100 px-4 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:hover:bg-indigo-800/50">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                  Upload Transcript
                  <input type="file" accept=".txt,.pdf,.docx" className="hidden" />
                </label>
              </div>

              <textarea
                placeholder="E.g., Photosynthesis, Newton's Laws, or paste your lecture notes here..."
                rows={4}
                value={transcriptInput}
                onChange={(e) => setTranscriptInput(e.target.value)}
                className="w-full resize-none rounded-xl border border-slate-300 bg-white p-4 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-blue-500/15 dark:bg-[#111B44] dark:text-white"
              />
              <textarea
                placeholder="Exam instructions visible to students"
                rows={3}
                value={examInstructions}
                onChange={(e) => setExamInstructions(e.target.value)}
                className="mt-3 w-full resize-none rounded-xl border border-slate-300 bg-white p-4 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-blue-500/15 dark:bg-[#111B44] dark:text-white"
              />
              {aiError && <p className="mt-3 text-sm font-semibold text-rose-500">{aiError}</p>}
              <button
                onClick={handleGenerateQuestions}
                disabled={aiLoading}
                className="mt-4 rounded-xl bg-indigo-600 px-5 py-2 font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {aiLoading ? "Generating..." : "Generate Questions with AI"}
              </button>
            </div>

            <div className="mt-6 flex justify-end">
              <button 
                onClick={handleCreateExam}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:scale-105 hover:shadow-indigo-500/40"
              >
                Create Assessment
              </button>
            </div>
            {createError && <p className="mt-3 text-sm font-semibold text-rose-500">{createError}</p>}

            {generatedExamCode && (
              <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-50/50 p-6 text-center dark:border-emerald-500/20 dark:bg-emerald-900/20 animate-fade-in">
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">Assessment Created Successfully!</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Share this unique code with your students to grant them access:</p>
                <div className="mt-4 inline-block rounded-xl bg-white px-8 py-3 shadow-inner dark:bg-[#0C1330]">
                  <p className="text-3xl font-black tracking-widest text-slate-900 dark:text-white">{generatedExamCode}</p>
                </div>
              </div>
            )}

            {generatedQuestionSets && (
              <div className="mt-6 rounded-2xl border border-blue-500/20 bg-blue-50/50 p-6 dark:bg-blue-950/20">
                <h3 className="text-lg font-black text-blue-600 dark:text-blue-400">
                  Generated Question Sets
                </h3>
                {generatedQuestionSets.common && (
                  <div className="mt-4">
                    <p className="mb-2 font-semibold">Common Set ({generatedQuestionSets.common.length})</p>
                    <div className="space-y-3">
                      {generatedQuestionSets.common.map((q, i) => {
                        const questionKey = `common-${i}`;
                        const isEditing = editingQuestionKey === questionKey;
                        return (
                          <div key={questionKey} className={inner}>
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
                                <input
                                  value={q.questionText}
                                  onChange={(e) =>
                                    updateQuestion("common", i, (prev) => ({
                                      ...prev,
                                      questionText: e.target.value,
                                      source: "manual",
                                    }))
                                  }
                                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:border-blue-500/20 dark:bg-[#0C1330] dark:text-white"
                                />
                                <input
                                  value={q.options.join(" | ")}
                                  onChange={(e) =>
                                    updateQuestion("common", i, (prev) => ({
                                      ...prev,
                                      options: e.target.value
                                        .split("|")
                                        .map((item) => item.trim())
                                        .filter(Boolean),
                                      source: "manual",
                                    }))
                                  }
                                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:border-blue-500/20 dark:bg-[#0C1330] dark:text-white"
                                />
                                <div className="grid gap-2 md:grid-cols-3">
                                  <input
                                    value={q.correctAnswer}
                                    onChange={(e) =>
                                      updateQuestion("common", i, (prev) => ({
                                        ...prev,
                                        correctAnswer: e.target.value,
                                        source: "manual",
                                      }))
                                    }
                                    className="rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:border-blue-500/20 dark:bg-[#0C1330] dark:text-white"
                                  />
                                  <input
                                    type="number"
                                    min={1}
                                    value={q.marks}
                                    onChange={(e) =>
                                      updateQuestion("common", i, (prev) => ({
                                        ...prev,
                                        marks: Number(e.target.value) || 1,
                                        source: "manual",
                                      }))
                                    }
                                    className="rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:border-blue-500/20 dark:bg-[#0C1330] dark:text-white"
                                  />
                                  <select
                                    value={q.difficultyLevel}
                                    onChange={(e) =>
                                      updateQuestion("common", i, (prev) => ({
                                        ...prev,
                                        difficultyLevel: e.target.value as "easy" | "medium" | "hard",
                                        source: "manual",
                                      }))
                                    }
                                    className="rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:border-blue-500/20 dark:bg-[#0C1330] dark:text-white"
                                  >
                                    <option value="easy">easy</option>
                                    <option value="medium">medium</option>
                                    <option value="hard">hard</option>
                                  </select>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="font-semibold">{q.questionText}</p>
                                <p className="text-sm mt-1">Options: {q.options.join(" | ")}</p>
                                <p className="text-sm mt-1">
                                  Answer: {q.correctAnswer} | Marks: {q.marks} | Tag: {q.difficultyLevel} | Source: {q.source}
                                </p>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {(["easy", "medium", "hard"] as const).map((setName) =>
                  generatedQuestionSets[setName] ? (
                    <div className="mt-4" key={setName}>
                      <p className="mb-2 font-semibold capitalize">
                        {setName} Set ({generatedQuestionSets[setName]?.length || 0})
                      </p>
                      <div className="space-y-3">
                        {generatedQuestionSets[setName]?.map((q, i) => {
                          const questionKey = `${setName}-${i}`;
                          const isEditing = editingQuestionKey === questionKey;
                          return (
                            <div key={questionKey} className={inner}>
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
                                  <input
                                    value={q.questionText}
                                    onChange={(e) =>
                                      updateQuestion(setName, i, (prev) => ({
                                        ...prev,
                                        questionText: e.target.value,
                                        source: "manual",
                                      }))
                                    }
                                    className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:border-blue-500/20 dark:bg-[#0C1330] dark:text-white"
                                  />
                                  <input
                                    value={q.options.join(" | ")}
                                    onChange={(e) =>
                                      updateQuestion(setName, i, (prev) => ({
                                        ...prev,
                                        options: e.target.value
                                          .split("|")
                                          .map((item) => item.trim())
                                          .filter(Boolean),
                                        source: "manual",
                                      }))
                                    }
                                    className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:border-blue-500/20 dark:bg-[#0C1330] dark:text-white"
                                  />
                                  <div className="grid gap-2 md:grid-cols-3">
                                    <input
                                      value={q.correctAnswer}
                                      onChange={(e) =>
                                        updateQuestion(setName, i, (prev) => ({
                                          ...prev,
                                          correctAnswer: e.target.value,
                                          source: "manual",
                                        }))
                                      }
                                      className="rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:border-blue-500/20 dark:bg-[#0C1330] dark:text-white"
                                    />
                                    <input
                                      type="number"
                                      min={1}
                                      value={q.marks}
                                      onChange={(e) =>
                                        updateQuestion(setName, i, (prev) => ({
                                          ...prev,
                                          marks: Number(e.target.value) || 1,
                                          source: "manual",
                                        }))
                                      }
                                      className="rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:border-blue-500/20 dark:bg-[#0C1330] dark:text-white"
                                    />
                                    <select
                                      value={q.difficultyLevel}
                                      onChange={(e) =>
                                        updateQuestion(setName, i, (prev) => ({
                                          ...prev,
                                          difficultyLevel: e.target.value as "easy" | "medium" | "hard",
                                          source: "manual",
                                        }))
                                      }
                                      className="rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:border-blue-500/20 dark:bg-[#0C1330] dark:text-white"
                                    >
                                      <option value="easy">easy</option>
                                      <option value="medium">medium</option>
                                      <option value="hard">hard</option>
                                    </select>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <p className="font-semibold">{q.questionText}</p>
                                  <p className="text-sm mt-1">Options: {q.options.join(" | ")}</p>
                                  <p className="text-sm mt-1">
                                    Answer: {q.correctAnswer} | Marks: {q.marks} | Tag: {q.difficultyLevel} | Source: {q.source}
                                  </p>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null
                )}
              </div>
            )}
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
