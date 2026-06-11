import { useEffect, useState, useRef } from "react";
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
import { TrendingUp, Users, BookOpen, Clock, FileText, CheckCircle, XCircle } from "lucide-react";
import { facultyAiApi, facultyTestApi, eventApi, attendanceApi, dashboardApi, facultyLeaveApi, type EventItem, type FacultyLeaveItem } from "../services/api";
import { useAuth } from "../context/AuthContext";
import type { AttendanceTest, AttendanceStudent } from "../services/api";

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
  classes: number;
  students: number;
  assignmentsGiven: number;
  averageScore: number;
  atRiskStudents: number;
  upcomingExam: string;
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
  const [events, setEvents] = useState<EventItem[]>([]);
  const [lastViewedTime, setLastViewedTime] = useState<number>(Date.now());
  const lastViewedTimeRef = useRef(lastViewedTime);

  // Sync ref with state
  useEffect(() => {
    lastViewedTimeRef.current = lastViewedTime;
  }, [lastViewedTime]);

  useEffect(() => {
    if (activeTab === "notifications") {
      setLastViewedTime(Date.now());
      window.dispatchEvent(new CustomEvent("updateUnreadCount", { detail: 0 }));
    }
  }, [activeTab]);
  
  const [examType, setExamType] = useState<"" | "common" | "adaptive">("");
  const [commonDifficulty, setCommonDifficulty] = useState<"" | "easy" | "medium" | "hard">("");
  const [commonQuestionCount, setCommonQuestionCount] = useState(15);
  const [commonTotalMarks, setCommonTotalMarks] = useState(30);
  const [adaptiveQuestionCount, setAdaptiveQuestionCount] = useState(10);
  const [adaptiveTotalMarks, setAdaptiveTotalMarks] = useState(20);
  const [generatedExamCode, setGeneratedExamCode] = useState<string | null>(null);
  const [examTab, setExamTab] = useState<"create" | "manage">("create");
  const [myExams, setMyExams] = useState<any[]>([]);
  const [examPage, setExamPage] = useState(1);
  const [examTotalPages, setExamTotalPages] = useState(1);
  const [examTitle, setExamTitle] = useState("");
  const [examSubject, setExamSubject] = useState("");
  const [examSemester, setExamSemester] = useState("");
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

  // Attendance State
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceTests, setAttendanceTests] = useState<AttendanceTest[]>([]);
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);
  const [attendanceStudents, setAttendanceStudents] = useState<AttendanceStudent[]>([]);
  const [presentStudentIds, setPresentStudentIds] = useState<Set<string>>(new Set());
  const [isAttendanceSubmitted, setIsAttendanceSubmitted] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Faculty Leaves State
  const [myLeaves, setMyLeaves] = useState<FacultyLeaveItem[]>([]);
  const [facultyLeaveReason, setFacultyLeaveReason] = useState("");
  const [facultyFromDate, setFacultyFromDate] = useState("");
  const [facultyToDate, setFacultyToDate] = useState("");
  const [facultyLeaveFile, setFacultyLeaveFile] = useState<File | null>(null);
  const [isSubmittingFacultyLeave, setIsSubmittingFacultyLeave] = useState(false);

  // Wake up AI service eagerly
  useEffect(() => {
    if (examTab === "create" && token && tenantSlug) {
      // Ping via backend
      facultyAiApi.pingAI(token, tenantSlug).catch(() => {});
      // Ping directly from browser (mimics manual visit to guarantee Render wakes up)
      fetch("https://ai-campus-wxla.onrender.com/", { mode: "no-cors" }).catch(() => {});
    }
  }, [examTab, token, tenantSlug]);

  useEffect(() => {
    if (activeTab === "attendance" && tenantSlug && token) {
      const fetchTests = async () => {
        try {
          const res = await attendanceApi.getFacultyTests(token, tenantSlug, attendanceDate);
          if (res.success) setAttendanceTests(res.tests);
        } catch (err) {
          console.error("Failed to fetch tests for attendance", err);
        }
      };
      fetchTests();
      setExpandedTestId(null);
    }
  }, [activeTab, attendanceDate, tenantSlug, token]);

  const handleExpandTest = async (testId: string) => {
    if (expandedTestId === testId) {
      setExpandedTestId(null);
      return;
    }
    setExpandedTestId(testId);
    setLoadingAttendance(true);
    try {
      if (!token || !tenantSlug) return;
      const res = await attendanceApi.getTestStudents(token, tenantSlug, testId);
      if (res.success) {
        setAttendanceStudents(res.students);
        setPresentStudentIds(new Set(res.students.map(s => s._id)));
        setIsAttendanceSubmitted(res.submitted);
      }
    } catch (err) {
      console.error("Failed to fetch test students", err);
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleToggleStudent = (studentId: string) => {
    if (isAttendanceSubmitted) return; // cannot edit if already submitted
    setPresentStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const handleSubmitAttendance = async () => {
    if (!expandedTestId || !tenantSlug || !token) return;
    try {
      const res = await attendanceApi.submitAttendance(
        token,
        tenantSlug,
        expandedTestId,
        Array.from(presentStudentIds)
      );
      if (res.success) {
        setIsAttendanceSubmitted(true);
        alert("Attendance submitted successfully!");
        setAttendanceTests(prev =>
          prev.map(t => (t._id === expandedTestId ? { ...t, attendanceSubmitted: true } : t))
        );
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to submit attendance");
    }
  };

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
    
    const fetchEvents = async () => {
      if (!tenantSlug || !token) return;
      try {
        const res = await eventApi.getEvents(token, tenantSlug);
        if (res.success) {
          setEvents(res.events);

          const newCount = res.events.filter((e: any) => {
            const itemTime = new Date(e.createdAt || e.date).getTime();
            return itemTime > lastViewedTimeRef.current;
          }).length;

          if (newCount > 0) {
            window.dispatchEvent(new CustomEvent("updateUnreadCount", { detail: newCount }));
          }
        }
      } catch (err) {
        console.error("Failed to fetch events", err);
      }
    };

    if (tenantSlug) {
      loadSchedule();
      fetchEvents();
      const interval = setInterval(fetchEvents, 60000);
      return () => clearInterval(interval);
    }
  }, [tenantSlug, token]);

  // Derived filtered schedules based on the new backend structure
  const todaySchedule = mySchedule.filter(item => item.dayOfWeek === day.dayName);
  const selectedDaySchedule = mySchedule.filter(item => item.dayOfWeek === selectedDay);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (tenantSlug && token) {
          const res = await dashboardApi.getFacultyStats(token, tenantSlug);
          if (res.success) {
            setData(res.stats);
          }
        }
      } catch (err) {
        console.error("Failed to fetch dashboard stats", err);
      }
    };
    fetchDashboardStats();

    const fetchMyLeaves = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (tenantSlug && token) {
          const res = await facultyLeaveApi.getMyLeaves(token, tenantSlug);
          if (res.success) setMyLeaves(res.leaves);
        }
      } catch (err) {
        console.error("Failed to fetch my leaves", err);
      }
    };
    fetchMyLeaves();
  }, [tenantSlug]);

  useEffect(() => {
    if (activeTab === "exams" && examTab === "manage") {
      const fetchExams = async () => {
        const token = localStorage.getItem("authToken");
        if (token) {
          try {
            const res = await facultyTestApi.getTests(token, tenantSlug, examPage, 6);
            if (res.success) {
              setMyExams(res.tests);
              setExamTotalPages(res.totalPages || 1);
            }
          } catch (err) {
            console.error("Failed to fetch exams", err);
          }
        }
      };
      fetchExams();
    }
  }, [activeTab, examTab, examPage, tenantSlug]);



  const handleDeleteExam = async (testId: string) => {
    if (!window.confirm("Are you sure you want to delete this test? All questions and attempts will be permanently deleted!")) return;
    const token = localStorage.getItem("authToken");
    if (!token) return;
    try {
      const res = await facultyTestApi.deleteTest(token, testId, tenantSlug);
      if (res.success) {
        setMyExams((prev) => prev.filter((exam) => exam._id !== testId));
      }
    } catch (err) {
      alert("Failed to delete test.");
    }
  };

  const handlePublishTest = async (testId: string) => {
    if (!window.confirm("Are you sure you want to publish this test? Students will be able to join using the room code.")) return;
    const token = localStorage.getItem("authToken");
    if (!token) return;
    try {
      const res = await facultyTestApi.publishTest(token, testId, tenantSlug);
      if (res.success) {
        setMyExams((prev) => prev.map((exam) => exam._id === testId ? { ...exam, status: "published", roomCode: res.test.roomCode } : exam));
        alert(`Test published successfully! Room Code: ${res.test.roomCode}`);
      }
    } catch (err) {
      alert("Failed to publish test.");
    }
  };

  const handleToggleRoomAccess = async (testId: string, currentStatus: boolean) => {
    const action = currentStatus ? "close" : "open";
    const token = localStorage.getItem("authToken");
    if (!token) return;
    try {
      const res = await facultyTestApi.toggleRoomAccess(token, testId, action, tenantSlug);
      if (res.success) {
        setMyExams((prev) => prev.map((exam) => exam._id === testId ? { ...exam, roomCodeExpiresAt: res.test.roomCodeExpiresAt } : exam));
      }
    } catch (err) {
      alert("Failed to toggle room access.");
    }
  };

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



  const handleApplyFacultyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !tenantSlug) return;
    if (!facultyLeaveReason || !facultyFromDate || !facultyToDate) {
      alert("Please fill all required fields.");
      return;
    }

    setIsSubmittingFacultyLeave(true);
    try {
      const formData = new FormData();
      formData.append("reason", facultyLeaveReason);
      formData.append("fromDate", facultyFromDate);
      formData.append("toDate", facultyToDate);
      if (facultyLeaveFile) {
        formData.append("file", facultyLeaveFile);
      }

      await facultyLeaveApi.applyLeave(token, tenantSlug, formData);
      alert("Leave application submitted successfully!");
      setFacultyLeaveReason("");
      setFacultyFromDate("");
      setFacultyToDate("");
      setFacultyLeaveFile(null);
      
      const res = await facultyLeaveApi.getMyLeaves(token, tenantSlug);
      if (res.success) setMyLeaves(res.leaves);
    } catch {
      alert("Failed to submit leave request");
    } finally {
      setIsSubmittingFacultyLeave(false);
    }
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

  const getExamPayload = () => {
    if (!token) return { error: "Please login again as faculty." };
    if (!examTitle.trim()) return { error: "Exam title is required." };
    if (!generatedQuestionSets) return { error: "Generate AI questions first." };
    if (!examType) return { error: "Please select exam mode." };

    const isCommonMode = examType === "common";
    const sets = isCommonMode
      ? { common: generatedQuestionSets.common || [] }
      : {
          easy: generatedQuestionSets.easy || [],
          medium: generatedQuestionSets.medium || [],
          hard: generatedQuestionSets.hard || [],
        };

    if (isCommonMode && (!sets.common || sets.common.length === 0)) {
      if (!commonDifficulty) return { error: "Please select difficulty level for common mode." };
      return { error: "Common mode requires generated common questions." };
    }

    if (!isCommonMode && ((sets.easy || []).length === 0 || (sets.medium || []).length === 0 || (sets.hard || []).length === 0)) {
      return { error: "Adaptive mode requires easy, medium, and hard question sets." };
    }

    if (isCommonMode && (generatedQuestionSets.common || []).length < Math.max(1, commonQuestionCount)) {
      return { error: `Need at least ${commonQuestionCount} generated common questions.` };
    }

    if (!isCommonMode && ((generatedQuestionSets.easy || []).length < Math.max(1, adaptiveQuestionCount) || (generatedQuestionSets.medium || []).length < Math.max(1, adaptiveQuestionCount) || (generatedQuestionSets.hard || []).length < Math.max(1, adaptiveQuestionCount))) {
      return { error: `Need at least ${adaptiveQuestionCount} questions in each adaptive set.` };
    }

    return {
      payload: {
        title: examTitle.trim(),
        subject: examSubject,
        mode: isCommonMode ? "common" : "adaptive" as "common" | "adaptive",
        duration: Number(examDuration),
        semester: examSemester,
        instructions: examInstructions.trim(),
        sets,
      }
    };
  };

  const handleCreateExam = async () => {
    const data = getExamPayload();
    if (data.error) {
      setCreateError(data.error);
      return;
    }
    setCreateError("");
    try {
      const response = await facultyTestApi.createTest(token!, data.payload!);
      setGeneratedExamCode(response.test.roomCode);
      alert(`Exam Created & Published successfully!\nRoom Code: ${response.test.roomCode}\nThis room will automatically close for entry in ${data.payload!.duration} minutes.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create test";
      setCreateError(message);
    }
  };

  const handleSaveDraft = async () => {
    const data = getExamPayload();
    if (data.error) {
      setCreateError(data.error);
      return;
    }
    setCreateError("");
    try {
      await facultyTestApi.saveDraftTest(token!, data.payload!);
      alert("Draft saved successfully!");
      setExamTab("manage");
      setExamPage(1);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save draft";
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
              <h2 className="mt-2 text-4xl font-black text-gold-600 dark:text-blue-400">{myLeaves.filter(l => l.status === "Pending").length}</h2>
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
      {activeTab === "attendance" && (
        <>
          <SectionHeader
            title="Attendance Tracking"
            description="Manage and submit daily attendance based on completed tests."
          />

          <div className={card}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-black text-blue-600 dark:text-blue-400">
                Attendance by Tests
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-500">Date Filter:</span>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white p-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-blue-500/15 dark:bg-[#111B44] dark:text-white"
                />
              </div>
            </div>

            {attendanceTests.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 p-4 text-center">
                No tests found for this date. Try changing the date filter.
              </p>
            ) : (
              <div className="max-h-[460px] overflow-y-auto pr-1 space-y-3">
                {[...attendanceTests].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()).map((test) => (
                  <div key={test._id} className="rounded-2xl border border-slate-200/60 bg-slate-50/50 p-4 dark:border-blue-500/10 dark:bg-blue-900/10">
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => handleExpandTest(test._id)}>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          {test.title}
                          {!test.attendanceSubmitted && (
                            <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600 dark:bg-red-500/20 dark:text-red-400">
                              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                              LIVE
                            </span>
                          )}
                          {test.attendanceSubmitted && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                              Submitted
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-slate-500">{test.subject} • {test.department.toUpperCase()}</p>
                      </div>
                      <button className="text-sm font-bold text-blue-500 hover:text-blue-600">
                        {expandedTestId === test._id ? "Collapse" : "View List"}
                      </button>
                    </div>

                    {expandedTestId === test._id && (
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-blue-500/10">
                        {loadingAttendance ? (
                          <p className="text-sm text-slate-500">Loading student list...</p>
                        ) : attendanceStudents.length === 0 ? (
                          <p className="text-sm text-slate-500 italic">No students have submitted this test yet.</p>
                        ) : (
                          <>
                            <p className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-400">
                              {isAttendanceSubmitted ? "Submitted Attendance List (Read-only)" : "Live Test Attempts (Uncheck to mark absent)"}
                            </p>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                              {attendanceStudents.map((student) => {
                                const isPresent = presentStudentIds.has(student._id);
                                return (
                                  <div key={student._id} className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm dark:bg-[#0C1330]">
                                    <div>
                                      <p className={`font-semibold ${isPresent ? "text-slate-900 dark:text-white" : "text-slate-400 line-through"}`}>
                                        {student.name}
                                      </p>
                                      <p className="text-xs text-slate-500">{student.email}</p>
                                    </div>
                                    {!isAttendanceSubmitted && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleToggleStudent(student._id); }}
                                        className={`rounded-lg px-3 py-1 text-xs font-bold transition ${isPresent ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20"}`}
                                      >
                                        {isPresent ? "Remove" : "Restore"}
                                      </button>
                                    )}
                                    {isAttendanceSubmitted && (
                                      <span className={`text-xs font-bold ${isPresent ? "text-emerald-500" : "text-red-500"}`}>
                                        {isPresent ? "Present" : "Absent"}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            
                            {!isAttendanceSubmitted && attendanceStudents.length > 0 && (
                              <div className="mt-4 flex justify-end">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleSubmitAttendance(); }}
                                  className={btn}
                                >
                                  Submit All Attendance
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
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
            title="My Leave Application"
            description="Apply for leave and track the approval status of your submitted leave requests."
          />

          <div className="grid gap-6 lg:grid-cols-2 mt-6">
            <div className={card}>
              <h2 className="mb-4 text-xl font-black text-accent-blue">
                Apply Leave
              </h2>

              <form onSubmit={handleApplyFacultyLeave}>
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Supporting Document (Medical Cert. etc) - Optional
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setFacultyLeaveFile(e.target.files ? e.target.files[0] : null)}
                    className="w-full text-slate-700 dark:text-slate-300 file:mr-4 file:rounded-full file:border-0 file:bg-blue-500/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-600 hover:file:bg-blue-500/20"
                  />
                </div>

                <div className="mb-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      From
                    </label>
                    <input
                      type="date"
                      value={facultyFromDate}
                      onChange={(e) => setFacultyFromDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-blue-500/15 dark:bg-[#111B44] dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      To
                    </label>
                    <input
                      type="date"
                      value={facultyToDate}
                      onChange={(e) => setFacultyToDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-blue-500/15 dark:bg-[#111B44] dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Reason for Leave
                  </label>
                  <textarea
                    value={facultyLeaveReason}
                    onChange={(e) => setFacultyLeaveReason(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-blue-500/15 dark:bg-[#111B44] dark:text-white"
                    placeholder="Please specify the reason..."
                    required
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingFacultyLeave}
                  className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-70"
                >
                  {isSubmittingFacultyLeave ? "Submitting..." : "Submit Leave Application"}
                </button>
              </form>
            </div>

            <div className={card}>
              <h2 className="mb-4 text-xl font-black text-gold-600 dark:text-blue-400">
                My Leave Requests
              </h2>

              {myLeaves.length > 0 ? (
                <div className="max-h-[520px] overflow-y-auto pr-1 space-y-3">
                  {[...myLeaves].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()).map((leave) => (
                    <div key={leave._id} className={inner}>
                      <div className="flex items-center justify-between">
                        <p><b>From:</b> {new Date(leave.fromDate).toLocaleDateString()}</p>
                        <p className="text-xs text-slate-400">
                          Updated: {new Date(leave.updatedAt || leave.createdAt || 0).toLocaleString()}
                        </p>
                      </div>
                      <p><b>To:</b> {new Date(leave.toDate).toLocaleDateString()}</p>
                      <p className="whitespace-pre-wrap"><b>Reason:</b> {leave.reason}</p>
                      
                      {leave.fileUrl && (
                        <div className="mt-2">
                          <a href={leave.fileUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-blue-500 hover:underline">
                            📄 View Attachment
                          </a>
                        </div>
                      )}

                      <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-blue-500/10">
                        <p className="font-semibold">
                          Status:{" "}
                          <span
                            className={
                              leave.status === "Approved"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : leave.status === "Rejected"
                                ? "text-red-600 dark:text-red-400"
                                : "text-amber-600 dark:text-amber-400"
                            }
                          >
                            {leave.status}
                          </span>
                        </p>
                        {leave.status === "Approved" && (
                          <button className="text-sm font-bold text-blue-500 hover:text-blue-600 dark:hover:text-blue-400">
                            Download Leavepass
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 dark:text-slate-400">
                  You haven't submitted any leave requests yet.
                </p>
              )}
            </div>
          </div>
        </>
      )}


      {activeTab === "exams" && (
        <>
          <SectionHeader
            title={examTab === "create" ? "Create Exam" : "Manage My Exams"}
            description={examTab === "create" ? "Design, customize, and publish assessments using our AI question generator." : "View and manage your created exams, track statuses, and view room codes."}
          />

          <div className="mb-6 flex w-fit rounded-xl bg-slate-100 p-1.5 dark:bg-[#0F172A] shadow-inner">
            <button
              onClick={() => { setExamTab("create"); setExamPage(1); }}
              className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-bold transition-all ${
                examTab === "create"
                  ? "bg-white text-indigo-600 shadow-sm dark:bg-[#1E293B] dark:text-indigo-400"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-[#1E293B]/50"
              }`}
            >
              ✨ Create New Exam
            </button>
            <button
              onClick={() => { setExamTab("manage"); setExamPage(1); }}
              className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-bold transition-all ${
                examTab === "manage"
                  ? "bg-white text-indigo-600 shadow-sm dark:bg-[#1E293B] dark:text-indigo-400"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-[#1E293B]/50"
              }`}
            >
              📚 Manage My Exams
            </button>
          </div>

          {examTab === "create" && (
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
                  <p className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                    <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                      <b>Tip:</b> Keep the subject name spelling exact and identical across same sub exams so that attendance and analytics accurately group together!
                    </span>
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Semester</label>
                  <select
                    aria-label="Exam semester"
                    value={examSemester}
                    onChange={(e) => setExamSemester(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white p-3 font-semibold text-slate-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30 dark:border-blue-500/15 dark:bg-[#111B44] dark:text-white"
                  >
                    <option value="">Select Semester (Optional)</option>
                    <option value="1">Semester 1</option>
                    <option value="2">Semester 2</option>
                    <option value="3">Semester 3</option>
                    <option value="4">Semester 4</option>
                    <option value="5">Semester 5</option>
                    <option value="6">Semester 6</option>
                    <option value="7">Semester 7</option>
                    <option value="8">Semester 8</option>
                  </select>
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

              <div className="mt-4 flex gap-4 w-full">
                <button
                  onClick={handleSaveDraft}
                  className="flex-1 items-center justify-center rounded-xl border-2 border-gold-500 hover:bg-gold-50 dark:border-gold-500/50 dark:hover:bg-gold-500/10 px-6 py-3 font-bold text-gold-600 dark:text-gold-400 transition"
                >
                  Save as Draft
                </button>
                <button
                  onClick={handleCreateExam}
                  className="flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 px-6 py-3 font-bold text-white shadow-lg shadow-gold-500/25 transition"
                >
                  Publish Assessment
                </button>
              </div>
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
          )}

          {examTab === "manage" && (
            <div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {myExams.length > 0 ? (
                  myExams.map((exam) => (
                    <div key={exam._id} className={card}>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate" title={exam.title}>{exam.title}</h3>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${exam.status === 'published' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                          {exam.status}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-4">{exam.subject}</p>
                      
                      <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300 mb-4">
                        <div className="flex justify-between">
                          <span className="font-semibold">Mode:</span>
                          <span className="capitalize">{exam.mode}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold">Duration:</span>
                          <span>{exam.duration} mins</span>
                        </div>
                        {exam.status === "published" && (
                          <>
                            <div className="flex justify-between items-center mt-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                              <span className="font-semibold">Room Code:</span>
                              <div className="flex items-center gap-3">
                                <span className="font-mono font-bold bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">{exam.roomCode}</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center mt-2">
                              <span className="font-semibold text-xs">Room Access:</span>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${(!exam.roomCodeExpiresAt || new Date(exam.roomCodeExpiresAt) > new Date()) ? 'text-emerald-500' : 'text-slate-400'}`}>
                                  {(!exam.roomCodeExpiresAt || new Date(exam.roomCodeExpiresAt) > new Date()) ? 'Open' : 'Closed'}
                                </span>
                                <button
                                  onClick={() => handleToggleRoomAccess(exam._id, (!exam.roomCodeExpiresAt || new Date(exam.roomCodeExpiresAt) > new Date()))}
                                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${(!exam.roomCodeExpiresAt || new Date(exam.roomCodeExpiresAt) > new Date()) ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                >
                                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${(!exam.roomCodeExpiresAt || new Date(exam.roomCodeExpiresAt) > new Date()) ? 'translate-x-4.5' : 'translate-x-1'}`} />
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                        {exam.status === "draft" && (
                          <button
                            onClick={() => handlePublishTest(exam._id)}
                            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10 transition"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                            Publish
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteExam(exam._id)}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12 text-slate-500 dark:text-slate-400">
                    <p>You haven't created any exams yet.</p>
                  </div>
                )}
              </div>
              
              {examTotalPages > 1 && (
                <div className="mt-8 flex justify-center gap-2">
                  <button
                    disabled={examPage === 1}
                    onClick={() => setExamPage(p => Math.max(1, p - 1))}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-[#111B44] dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Previous
                  </button>
                  <span className="flex items-center px-3 text-sm font-semibold text-slate-600 dark:text-slate-400">
                    Page {examPage} of {examTotalPages}
                  </span>
                  <button
                    disabled={examPage === examTotalPages}
                    onClick={() => setExamPage(p => Math.min(examTotalPages, p + 1))}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-[#111B44] dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === "performance" && (
        <>
          <SectionHeader
            title="Class Performance"
            description="Track class activity, weekly trends, at-risk students and upcoming assessments."
          />

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
            title="Institutional Updates"
            description="View upcoming events, notices and schedules published by the HOD and Principal."
          />
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className={card}>
              <h2 className="mb-4 text-xl font-black text-accent-blue">
                📢 Notifications
              </h2>
              <div className="space-y-3">
                {events.filter(e => e.type === 'notification').length === 0 ? (
                  <p className="text-slate-500">No recent notifications.</p>
                ) : (
                  [...events].filter(e => e.type === 'notification').sort((a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime()).map((evt) => (
                    <div key={evt._id} className={inner}>
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-slate-900 dark:text-white">{evt.title}</p>
                        <span className="text-xs text-slate-400">
                          🗓️ {new Date(evt.createdAt || evt.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <span className="inline-block rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                          {evt.targetAudience === 'all' ? 'Global' : evt.targetAudience.toUpperCase()}
                        </span>
                      </div>
                      {evt.description && (
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{evt.description}</p>
                      )}
                      {evt.fileUrl && (
                        <a href={evt.fileUrl.startsWith('http') ? evt.fileUrl : `${API_BASE_URL}${evt.fileUrl}`} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-blue-500 hover:underline">
                          📎 View Attachment
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className={card}>
              <h2 className="mb-4 text-xl font-black text-accent-blue">
                📅 Events
              </h2>
              <div className="space-y-3">
                {events.filter(e => e.type === 'event' || !e.type).length === 0 ? (
                  <p className="text-slate-500">No upcoming events.</p>
                ) : (
                  [...events].filter(e => e.type === 'event' || !e.type).sort((a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime()).map((evt) => (
                    <div key={evt._id} className={inner}>
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-slate-900 dark:text-white">{evt.title}</p>
                        <span className="text-xs text-slate-400">
                          📍 {evt.venue} &middot; 🗓️ {new Date(evt.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <span className="inline-block rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                          {evt.targetAudience === 'all' ? 'Global' : evt.targetAudience.toUpperCase()}
                        </span>
                      </div>
                      {evt.description && (
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{evt.description}</p>
                      )}
                      {evt.fileUrl && (
                        <a href={evt.fileUrl.startsWith('http') ? evt.fileUrl : `${API_BASE_URL}${evt.fileUrl}`} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-blue-500 hover:underline">
                          📎 View Attachment
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}


    </MainLayout>
  );
}
