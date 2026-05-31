import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams} from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import Charts from "../components/Charts";
import DayStatusCard, {
  getCurrentDayStatus,
} from "../components/DayStatusCard";
import AIInsights from "../components/AIInsights";
import Notifications from "../components/Notifications";
import ProgressCard from "../components/ProgressCard";
import { leaveApi, type LeaveItem } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { TrendingUp, BookOpen, FileText, MailX, CheckCircle, XCircle } from "lucide-react";
import { resultApi, API_BASE_URL, eventApi, attendanceApi, dashboardApi, type EventItem, type AttendanceSummaryItem } from "../services/api";
import StudentSemesterModal from "../components/StudentSemesterModal";

type StudentData = {
  attendance: number;
  grade: string;
  feedback: string;
  weakArea: string;
};

type TabType =
  | "dashboard"
  | "classes"
  | "attendance"
  | "leave"
  | "exams"
  | "performance"
  | "notifications";



const cardClass =
  "card-hover rounded-3xl border border-slate-200/60 bg-white/90 p-6 text-slate-900 shadow-card backdrop-blur-xl transition dark:border-blue-500/10 dark:bg-[#0C1330] dark:text-white";

const innerCardClass =
  "card-hover rounded-2xl border border-slate-200/40 bg-slate-50 p-4 text-slate-800 dark:border-blue-500/10 dark:bg-[#111B44] dark:text-slate-100";

const buttonClass =
  "rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 dark:from-blue-600 dark:to-blue-400 px-5 py-2 font-semibold text-navy-900 shadow-md shadow-gold-600/15 dark:shadow-blue-600/15 transition hover:scale-105 hover:shadow-gold-600/25 dark:hover:shadow-blue-600/25";

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 placeholder:text-slate-400 backdrop-blur-xl focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30 dark:border-white/10 dark:bg-[#111B44] dark:text-white dark:placeholder:text-slate-500";

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

export default function StudentDashboard() {
  const navigate = useNavigate();
  
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [lastViewedTime, setLastViewedTime] = useState<number>(Date.now());
  const lastViewedTimeRef = useRef(lastViewedTime);
  const [isSemesterModalOpen, setIsSemesterModalOpen] = useState(false);

  // Sync ref with state
  useEffect(() => {
    const fetchLeaves = async () => {
      try {
        const token = localStorage.getItem("authToken") || "";
        if (tenantSlug && token && user?.role === "student") {
          const res = await leaveApi.getMyLeaves(token, tenantSlug);
          if (res.success) {
            setMyLeaves(res.leaves);
          }
        }
      } catch (err) {
        console.error("Failed to fetch leaves", err);
      }
    };
    fetchLeaves();
  }, [tenantSlug, user?.id]);
  
  useEffect(() => {
    lastViewedTimeRef.current = lastViewedTime;
  }, [lastViewedTime]);

  useEffect(() => {
    if (activeTab === "notifications") {
      setLastViewedTime(Date.now());
      window.dispatchEvent(new CustomEvent("updateUnreadCount", { detail: 0 }));
    }
  }, [activeTab]);
  const [data, setData] = useState<StudentData | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);

  const [leaveReason, setLeaveReason] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [department, setDepartment] = useState("cse");
  const [myLeaves, setMyLeaves] = useState<LeaveItem[]>([]);
  const [leaveFile, setLeaveFile] = useState<File | null>(null);
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  const dayStatus = getCurrentDayStatus();

  const [selectedDay, setSelectedDay] = useState(dayStatus.dayName);
  const [attendanceSummaries, setAttendanceSummaries] = useState<AttendanceSummaryItem[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  const [enteredExamCode, setEnteredExamCode] = useState("");
  const [examJoinMessage, setExamJoinMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [recentAttempts, setRecentAttempts] = useState<
    Array<{
      _id: string;
      score: number;
      totalMarks: number;
      accuracy: number;
      assignedSet?: string;
      submittedAt: string;
      testId?: { title?: string; subject?: string };
    }>
  >([]);

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
  const todaySchedule = mySchedule.filter(item => item.dayOfWeek === dayStatus.dayName);
  const selectedDaySchedule = mySchedule.filter(item => item.dayOfWeek === selectedDay);
    
  useEffect(() => {
    if (activeTab === "attendance" && tenantSlug) {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const fetchAttendance = async () => {
        setLoadingAttendance(true);
        try {
          const res = await attendanceApi.getStudentSummary(token, tenantSlug);
          if (res.success) {
            setAttendanceSummaries(res.attendance);
          }
        } catch (err) {
          console.error("Failed to fetch student attendance summary", err);
        } finally {
          setLoadingAttendance(false);
        }
      };
      fetchAttendance();
    }
  }, [activeTab, tenantSlug]);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (tenantSlug && token) {
          const res = await dashboardApi.getStudentStats(token, tenantSlug);
          if (res.success) {
            setData(res.stats);
          }
        }
      } catch (err) {
        console.error("Failed to fetch dashboard stats", err);
      }
    };
    fetchDashboardStats();
  }, [tenantSlug]);

  useEffect(() => {
    const loadRecentAttempts = async () => {
      if (!user?.id) return;
      try {
        const authToken = localStorage.getItem("authToken");
        if (!authToken) return;
        const response = await resultApi.myResults(authToken, tenantSlug);
        setRecentAttempts(response.results || []);
      } catch {
        setRecentAttempts([]);
      }
    };
    loadRecentAttempts();

    const fetchEvents = async () => {
      try {
        const token = localStorage.getItem("authToken") || "";
        if (tenantSlug && token) {
          const res = await eventApi.getEvents(token, tenantSlug);
          if (res.success) {
            setEvents(res.events);
            
            // Calculate unread items
            const newCount = res.events.filter((e: any) => {
              const itemTime = new Date(e.createdAt || e.date).getTime();
              return itemTime > lastViewedTimeRef.current;
            }).length;

            if (newCount > 0) {
              window.dispatchEvent(new CustomEvent("updateUnreadCount", { detail: newCount }));
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch events", err);
      }
    };
    
    fetchEvents();
    const interval = setInterval(fetchEvents, 60000); // Poll every 60 seconds

    return () => clearInterval(interval);
  }, [tenantSlug, user?.id]);



  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<TabType>;
      setActiveTab(customEvent.detail);
    };

    window.addEventListener("studentTabChange", handler);

    return () => {
      window.removeEventListener("studentTabChange", handler);
    };
  }, []);

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !tenantSlug) return;
    setIsSubmittingLeave(true);

    try {
      const token = localStorage.getItem("authToken") || "";
      const formData = new FormData();
      formData.append("reason", leaveReason);
      formData.append("fromDate", fromDate);
      formData.append("toDate", toDate);
      if (leaveFile) {
        formData.append("file", leaveFile);
      }

      await leaveApi.applyLeave(token, tenantSlug, formData);

      alert("Leave application submitted successfully!");
      setLeaveReason("");
      setFromDate("");
      setToDate("");
      setLeaveFile(null);
      
      // Refresh leaves
      const res = await leaveApi.getMyLeaves(token, tenantSlug);
      if (res.success) setMyLeaves(res.leaves);
      
    } catch {
      alert("Failed to submit leave request");
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  const handleJoinExam = () => {
    if (!enteredExamCode.trim()) {
      setExamJoinMessage({ type: 'error', text: 'Please enter a valid exam code.' });
      return;
    }

    navigate(`/t/${tenantSlug}/take-test?code=${enteredExamCode.trim().toUpperCase()}`);
  };

  if (!data) {
    return null;
  }

  const displayName = user?.name?.trim() || data.name;
  const metaParts = [];
  if (user?.enrollmentNumber) metaParts.push(user.enrollmentNumber.trim());
  if (user?.department) metaParts.push(user.department.trim().toUpperCase());
  if (user?.semester) {
    const semMatch = user.semester.match(/\d+/);
    const semNum = semMatch ? semMatch[0] : user.semester;
    metaParts.push(`Semester ${semNum}`);
  }

  const studentMeta = metaParts.length > 0 
    ? metaParts.join(" | ") 
    : (user?.email?.trim() || "Student");

  return (
    <MainLayout>
      <StudentSemesterModal 
        isOpen={isSemesterModalOpen} 
        onClose={() => setIsSemesterModalOpen(false)} 
      />
      <div className="mb-8">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white">
          Student Dashboard
        </h1>

        <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
          Welcome Student {displayName} 👋 | {studentMeta}
          {user?.semester && (
            <button 
              onClick={() => setIsSemesterModalOpen(true)}
              className="ml-3 text-sm text-gold-500 hover:text-gold-600 underline font-medium transition"
            >
              Change Semester
            </button>
          )}
        </p>
      </div>

      {activeTab === "dashboard" && (
        <>
          <SectionHeader
            title="Dashboard Overview"
            description="Quick overview of your attendance, classes, exams, leave requests and AI-powered academic insights."
          />

          <div className="grid gap-6 md:grid-cols-5">
            <DayStatusCard />

            <div className={cardClass}>
              <p className="flex items-center gap-2 text-base font-semibold text-slate-500 dark:text-slate-400">
                Attendance <TrendingUp size={18} className="text-emerald-500" />
              </p>
              <h2 className="mt-2 text-4xl font-black text-slate-900 dark:text-white">
                {data.attendance}%
              </h2>
            </div>

            <div className={cardClass}>
              <p className="flex items-center gap-2 text-base font-semibold text-slate-500 dark:text-slate-400">
                Today Classes <BookOpen size={18} className="text-blue-500" />
              </p>
              <h2 className="mt-2 text-4xl font-black text-slate-900 dark:text-white">
                {todaySchedule.length}
              </h2>
            </div>

            <div className={cardClass}>
              <p className="flex items-center gap-2 text-base font-semibold text-slate-500 dark:text-slate-400">
                Exams Today <FileText size={18} className="text-purple-500" />
              </p>
              <h2 className="mt-2 text-4xl font-black text-slate-900 dark:text-white">
                {dayStatus.isWorkingDay ? recentAttempts.length : 0}
              </h2>
            </div>

            <div className={cardClass}>
              <p className="text-base font-semibold text-slate-500 dark:text-slate-400">
                Leave Requests ✈️
              </p>
              <h2 className="mt-2 text-4xl font-black text-slate-900 dark:text-white">
                {myLeaves.length}
              </h2>
            </div>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <ProgressCard label="Attendance Progress" value={data.attendance} />
            <Notifications />
          </div>

          <AIInsights role="student" />
        </>
      )}

      {activeTab === "classes" && (
        <>
          <SectionHeader
            title="Classes & Timetable"
            description="View your daily timetable, scheduled classes, lab sessions and academic activities."
          />

          <div className={cardClass}>
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
                    <div className={innerCardClass}>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{item.subject}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{item.facultyId?.name || "Faculty"} ({item.facultyId?.email})</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Room No. {item.room}</p>
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

      {activeTab === "attendance" && (
        <>
          <SectionHeader
            title="Attendance Overview"
            description="Monitor your attendance percentage and maintain the required academic attendance level."
          />

          <div className={cardClass}>
            <div className="space-y-4">
              {loadingAttendance ? (
                <p className="text-slate-500 p-4 text-center">Loading attendance data...</p>
              ) : attendanceSummaries.length === 0 ? (
                <p className="text-slate-500 p-4 text-center">No attendance records found.</p>
              ) : (
                attendanceSummaries.map((subj) => (
                  <div key={subj._id} className={`${innerCardClass} flex items-center justify-between`}>
                    <div>
                      <p className="text-lg font-bold text-slate-800 dark:text-white">{subj.subject}</p>
                      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                        Tests Attended: {subj.attendedTests} / {subj.totalTests}
                      </p>
                    </div>
                    <h3 className={`text-3xl font-black ${subj.percentage >= 75 ? "text-emerald-500 dark:text-emerald-400" : subj.percentage >= 60 ? "text-gold-500" : "text-red-500 dark:text-red-400"}`}>
                      {subj.percentage}%
                    </h3>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === "leave" && (
        <>
          <SectionHeader
            title="Leave Application"
            description="Apply for leave and track the approval status of your submitted leave requests."
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <div className={cardClass}>
              <h2 className="mb-4 text-xl font-black text-accent-blue">
                Apply Leave
              </h2>

              <form onSubmit={handleLeaveSubmit}>
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Supporting Document (Medical Cert. etc) - Optional
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setLeaveFile(e.target.files ? e.target.files[0] : null)}
                    className="w-full text-slate-700 dark:text-slate-300 file:mr-4 file:rounded-full file:border-0 file:bg-gold-500/20 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-gold-600 dark:file:text-gold-500 hover:file:bg-gold-500/30"
                  />
                </div>

                <div className="mb-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      From
                    </label>

                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      To
                    </label>

                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                </div>

                <textarea
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="Enter your leave reason..."
                  className={`${inputClass} h-32 resize-none p-4`}
                  required
                />

                <button 
                  type="submit" 
                  disabled={isSubmittingLeave}
                  className={`mt-4 ${buttonClass} disabled:opacity-50`}
                >
                  {isSubmittingLeave ? "Submitting..." : "Submit Leave Request"}
                </button>
              </form>
            </div>

            <div className={cardClass}>
              <h2 className="mb-4 text-xl font-black text-gold-600 dark:text-blue-400">
                My Leave Requests
              </h2>

              {myLeaves.length > 0 ? (
                <div className="space-y-3">
                  {myLeaves.map((leave) => (
                    <div key={leave._id} className={innerCardClass}>
                      <div className="flex items-center justify-between">
                        <p><b>From:</b> {new Date(leave.fromDate).toLocaleDateString()}</p>
                        <p className="text-xs text-slate-400">
                          Updated: {new Date(leave.updatedAt).toLocaleString()}
                        </p>
                      </div>
                      <p><b>To:</b> {new Date(leave.toDate).toLocaleDateString()}</p>
                      <p><b>Reason:</b> {leave.reason}</p>
                      {leave.fileUrl && (
                        <p>
                          <b>Document:</b> <a href={leave.fileUrl} target="_blank" rel="noreferrer" className="text-blue-400 underline ml-1">View Attachment</a>
                        </p>
                      )}
                      <p className="mt-2">
                        <b>Status:</b>{" "}
                        <span
                          className={
                            leave.status === "Approved"
                              ? "font-bold text-emerald-500"
                              : leave.status === "Rejected"
                              ? "font-bold text-rose-500"
                              : "font-bold text-gold-500"
                          }
                        >
                          {leave.status}
                        </span>
                      </p>
                      {leave.status === "Approved" && (
                        <button className="mt-3 rounded-xl bg-emerald-500/10 px-4 py-2 font-semibold text-emerald-500 shadow-sm transition hover:bg-emerald-500/20">
                          Download Leavepass
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <MailX size={18} /> No leave requests submitted yet
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === "exams" && (
        <>
          <SectionHeader
            title="Exams & Attempts"
            description="Check available tests, upcoming exams and your daily exam attempt status."
          />

          <div className={cardClass}>
            <div className="mb-8 rounded-2xl border border-indigo-500/20 bg-indigo-50/50 p-6 dark:bg-indigo-950/20">
              <h2 className="mb-2 text-xl font-black text-indigo-600 dark:text-indigo-400">
                Join Exam via Code
              </h2>
              <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
                Enter the unique code provided by your teacher to access the assessment.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="text" 
                  placeholder="e.g. A9B2C3" 
                  value={enteredExamCode}
                  onChange={(e) => setEnteredExamCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className={`${inputClass} sm:max-w-xs font-bold tracking-widest uppercase`}
                />
                <button 
                  onClick={handleJoinExam}
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 font-bold text-white shadow-md shadow-indigo-500/25 transition hover:scale-105 hover:shadow-indigo-500/40"
                >
                  Access Exam
                </button>
              </div>

              {examJoinMessage && (
                <div className={`mt-4 flex items-center gap-2 text-sm font-bold ${examJoinMessage.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {examJoinMessage.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />} {examJoinMessage.text}
                </div>
              )}
            </div>

            <h2 className="mb-4 text-xl font-black text-accent-blue">
              Last Attempted Exams
            </h2>

            {recentAttempts.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {recentAttempts.slice(0, 6).map((attempt) => (
                  <div key={attempt._id} className={innerCardClass}>
                    <h3 className="font-black text-slate-900 dark:text-white">
                      {attempt.testId?.title || "Exam"}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400">
                      {new Date(attempt.submittedAt).toLocaleString()}
                    </p>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      Score: <b>{attempt.score}</b> / {attempt.totalMarks} | Accuracy:{" "}
                      <b>{Math.round(attempt.accuracy)}%</b>
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Set Type: <b className="uppercase">{attempt.assignedSet || "-"}</b>
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 dark:text-slate-400">
                No attempts found yet.
              </p>
            )}
          </div>
        </>
      )}

      {activeTab === "performance" && (
        <>
          <SectionHeader
            title="Performance Insights"
            description="Analyze your progress, feedback, weak areas, leaderboard rank and adaptive practice suggestions."
          />

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className={cardClass}>
              <h2 className="mb-2 text-xl font-black text-gold-600 dark:text-blue-400">
                Recent Feedback
              </h2>
              <p className="text-slate-600 dark:text-slate-300">
                {data.feedback}
              </p>
            </div>

            <div className={cardClass}>
              <h2 className="mb-2 text-xl font-black text-accent-blue">
                Weak Area
              </h2>
              <p className="text-slate-600 dark:text-slate-300">
                {data.weakArea}
              </p>
            </div>
          </div>
        </>
      )}

      {activeTab === "events" && (
        <>
          <SectionHeader
            title="Updates"
            description="View your recent notices, announcements, and upcoming events."
          />
          <div className="grid gap-6 md:grid-cols-2">
            <div className={cardClass}>
              <h2 className="mb-4 text-xl font-black text-gold-600 dark:text-blue-400">
                📢 Notice Board
              </h2>
              <div className="space-y-3">
                {events.filter(e => e.type === 'notification').length === 0 ? (
                  <p className="text-slate-500">No recent notifications.</p>
                ) : (
                  events.filter(e => e.type === 'notification').map((evt) => (
                    <div key={evt._id} className={innerCardClass}>
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">{evt.title}</p>
                        <span className="text-xs text-slate-400">
                          🗓️ {new Date(evt.createdAt || evt.date).toLocaleDateString()}
                          {evt.targetAudience !== 'all' && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-slate-200 dark:bg-slate-700 px-2.5 py-0.5 text-xs font-medium text-slate-800 dark:text-slate-200">
                              Dept: {evt.targetAudience.toUpperCase()}
                            </span>
                          )}
                        </span>
                      </div>
                      {evt.description && (
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{evt.description}</p>
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

            <div className={cardClass}>
              <h2 className="mb-4 text-xl font-black text-gold-600 dark:text-blue-400">
                📅 Upcoming Events
              </h2>
              <div className="space-y-3">
                {events.filter(e => e.type === 'event' || !e.type).length === 0 ? (
                  <p className="text-slate-500">No events scheduled.</p>
                ) : (
                  events.filter(e => e.type === 'event' || !e.type).map((evt) => (
                    <div key={evt._id} className={innerCardClass}>
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">{evt.title}</p>
                        <span className="text-xs text-slate-400">
                          📍 {evt.venue} &middot; 🗓️ {new Date(evt.date).toLocaleDateString()}
                          {evt.targetAudience !== 'all' && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-slate-200 dark:bg-slate-700 px-2.5 py-0.5 text-xs font-medium text-slate-800 dark:text-slate-200">
                              Dept: {evt.targetAudience.toUpperCase()}
                            </span>
                          )}
                        </span>
                      </div>
                      {evt.description && (
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{evt.description}</p>
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
