import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import Charts from "../components/Charts";
import DayStatusCard, {
  getCurrentDayStatus,
} from "../components/DayStatusCard";
import AIInsights from "../components/AIInsights";
import Notifications from "../components/Notifications";
import ProgressCard from "../components/ProgressCard";
import { applyLeave, listenLeaveRequests } from "../services/leaveServices";
import type { LeaveRequest } from "../services/leaveServices";

type StudentData = {
  name: string;
  attendance: number;
  grade: string;
  chartData?: { name: string; value: number }[];
  rank: number;
  percentile: number;
  feedback: string;
  weakArea: string;
  leaderboardName: string;
  nearestCompetitor: string;
  competitorDelta: number;
  recommendedTopic: string;
  practiceLevel: string;
  practiceQuestions: number;
};

type TabType =
  | "dashboard"
  | "classes"
  | "attendance"
  | "leave"
  | "exams"
  | "performance"
  | "notifications";

const timetable: Record<string, { subject: string; teacher: string; room: string; time: string; type: string }[]> = {
  Monday: [
    { time: "10:00 AM", subject: "Computer Organization and Architecture", teacher: "John Doe", room: "229", type: "TH" },
    { time: "11:00 AM", subject: "Database Management Systems", teacher: "Sarah Smith", room: "506", type: "ETH" },
    { time: "12:00 PM", subject: "Applied Statistics", teacher: "Michael Johnson", room: "116", type: "ETH" },
    { time: "2:00 PM", subject: "Arithmetic Problem Solving Skills", teacher: "Emily Brown", room: "213", type: "TH" }
  ],
  Tuesday: [
    { time: "9:00 AM", subject: "Web Technologies", teacher: "David Lee", room: "305", type: "TH" },
    { time: "11:00 AM", subject: "Operating Systems", teacher: "Laura White", room: "402", type: "ETH" }
  ],
  Wednesday: [
    { time: "10:00 AM", subject: "Software Engineering", teacher: "Chris Green", room: "120", type: "TH" },
    { time: "2:00 PM", subject: "Database Management Systems", teacher: "Sarah Smith", room: "506", type: "ETH" }
  ],
  Thursday: [
    { time: "9:00 AM", subject: "Applied Statistics", teacher: "Michael Johnson", room: "116", type: "ETH" },
    { time: "11:00 AM", subject: "Computer Organization and Architecture", teacher: "John Doe", room: "229", type: "TH" }
  ],
  Friday: [
    { time: "10:00 AM", subject: "Arithmetic Problem Solving Skills", teacher: "Emily Brown", room: "213", type: "TH" }
  ],
  Saturday: [
    { time: "9:00 AM", subject: "Project Review", teacher: "Review Panel A", room: "310", type: "LAB" }
  ],
};

const examsToday = [
  { subject: "Mathematics Quiz", time: "2:00 PM", status: "Available" },
  { subject: "Physics MCQ Test", time: "4:00 PM", status: "Upcoming" },
];

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
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [data, setData] = useState<StudentData | null>(null);

  const [leaveReason, setLeaveReason] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [department, setDepartment] = useState("cse");
  const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([]);

  const dayStatus = getCurrentDayStatus();

  const [selectedDay, setSelectedDay] = useState(dayStatus.dayName);
  const [attendanceTab, setAttendanceTab] = useState<"theory" | "lab">("theory");

  const [enteredExamCode, setEnteredExamCode] = useState("");
  const [examJoinMessage, setExamJoinMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  const todaySchedule = dayStatus.isWorkingDay
    ? timetable[dayStatus.dayName] || []
    : [];
    
  const theoryAttendance = [
    { name: "Software Engineering", code: "CSE1005", percent: 79 },
    { name: "Database Management Systems", code: "CSE2007", percent: 82 },
    { name: "Introduction to Machine Learning", code: "CSE3008", percent: 87 },
    { name: "Computer Organization and Architecture", code: "ECE2002", percent: 83 },
    { name: "Applied Statistics", code: "MAT1011", percent: 91 },
    { name: "Arithmetic Problem Solving Skills", code: "STS2009", percent: 95 }
  ];

  const labAttendance = [
    { name: "Database Management Systems Lab", code: "CSE2007", percent: 100 },
    { name: "Introduction to Machine Learning Lab", code: "CSE3008", percent: 88 },
    { name: "Computer Organization and Architecture Lab", code: "ECE2002", percent: 100 }
  ];

  useEffect(() => {
    // Backend-first mode: avoid blocking dashboard render on Firestore profile docs.
    setData({
      name: "Aarav Sharma",
      attendance: 86,
      grade: "A",
      chartData: [
        { name: "Mon", value: 72 },
        { name: "Tue", value: 76 },
        { name: "Wed", value: 81 },
        { name: "Thu", value: 78 },
        { name: "Fri", value: 84 },
      ],
      rank: 12,
      percentile: 88,
      feedback: "Good consistency. Improve long-form answer accuracy.",
      weakArea: "Applied Statistics",
      leaderboardName: "Aarav Sharma",
      nearestCompetitor: "Riya Singh",
      competitorDelta: 4,
      recommendedTopic: "Probability Distributions",
      practiceLevel: "Medium",
      practiceQuestions: 15,
    });
  }, []);

  useEffect(() => {
    if (!data?.name) return;

    const unsubscribe = listenLeaveRequests((leaves) => {
      const filteredLeaves = leaves.filter(
        (leave) =>
          leave.studentName.toLowerCase().trim() ===
          data.name.toLowerCase().trim()
      );

      setMyLeaves(filteredLeaves);
    });

    return () => unsubscribe();
  }, [data]);

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

    if (!data) return;

    try {
      await applyLeave({
        studentName: data.name,
        role: "Student",
        department,
        reason: leaveReason,
        fromDate,
        toDate,
      });

      alert("Leave application submitted successfully!");
      setLeaveReason("");
      setFromDate("");
      setToDate("");
      setDepartment("cse");
    } catch {
      alert("Failed to submit leave request");
    }
  };

  const handleJoinExam = () => {
    if (!enteredExamCode.trim()) {
      setExamJoinMessage({ type: 'error', text: 'Please enter a valid exam code.' });
      return;
    }

    navigate(`/take-test?code=${enteredExamCode.trim().toUpperCase()}`);
  };

  if (!data) {
    return null;
  }

  const displayName = data.name.toLowerCase().includes("dashboard") ? "Aarav Sharma" : data.name;

  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white">
          Student Dashboard
        </h1>

        <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
          Welcome Student {displayName} 👋 | Class 10-A
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
              <p className="text-base font-semibold text-slate-500 dark:text-slate-400">
                Attendance 📈
              </p>
              <h2 className="mt-2 text-4xl font-black text-gold-600 dark:text-blue-400">
                {data.attendance}%
              </h2>
            </div>

            <div className={cardClass}>
              <p className="text-base font-semibold text-slate-500 dark:text-slate-400">
                Today Classes 📚
              </p>
              <h2 className="mt-2 text-4xl font-black text-slate-900 dark:text-white">
                {todaySchedule.length}
              </h2>
            </div>

            <div className={cardClass}>
              <p className="text-base font-semibold text-slate-500 dark:text-slate-400">
                Exams Today 📝
              </p>
              <h2 className="mt-2 text-4xl font-black text-slate-900 dark:text-white">
                {dayStatus.isWorkingDay ? examsToday.length : 0}
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

            {(timetable[selectedDay] || []).length > 0 ? (
              <div className="relative border-l-2 border-blue-500/30 pl-6 space-y-8 ml-3">
                {(timetable[selectedDay] || []).map((item, index) => (
                  <div key={index} className="relative">
                    <div className="absolute -left-[35px] top-1 h-4 w-4 rounded-full border-4 border-white bg-blue-500 dark:border-[#0C1330]"></div>
                    <div className="text-sm font-bold text-blue-500 dark:text-blue-400 mb-2">{item.time}</div>
                    <div className={innerCardClass}>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{item.subject}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{item.teacher}</p>
                      <p className="text-sm font-semibold text-blue-500 mt-2">{item.type}</p>
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

      {activeTab === "attendance" && (
        <>
          <SectionHeader
            title="Attendance Overview"
            description="Monitor your attendance percentage and maintain the required academic attendance level."
          />

          <div className={cardClass}>
            <div className="flex gap-4 mb-6">
              <button 
                onClick={() => setAttendanceTab("theory")}
                className={`flex-1 py-3 rounded-2xl font-bold transition-all ${attendanceTab === "theory" ? "bg-slate-700 text-white shadow-md dark:bg-blue-500/20 dark:text-blue-400" : "bg-slate-100 text-slate-500 dark:bg-[#111B44] dark:text-slate-400"}`}
              >Theory</button>
              <button 
                onClick={() => setAttendanceTab("lab")}
                className={`flex-1 py-3 rounded-2xl font-bold transition-all ${attendanceTab === "lab" ? "bg-slate-700 text-white shadow-md dark:bg-blue-500/20 dark:text-blue-400" : "bg-slate-100 text-slate-500 dark:bg-[#111B44] dark:text-slate-400"}`}
              >Lab</button>
            </div>
            
            <div className="space-y-4">
              {(attendanceTab === "theory" ? theoryAttendance : labAttendance).map((subj, idx) => (
                <div key={idx} className={innerCardClass}>
                  <h3 className="text-4xl font-black text-blue-500 dark:text-blue-400">{subj.percent}%</h3>
                  <p className="mt-3 text-lg font-bold text-slate-800 dark:text-white">{subj.name}</p>
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{subj.code}</p>
                </div>
              ))}
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
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className={`${inputClass} mb-4`}
                  required
                >
                  <option className="text-black" value="cse">
                    CSE
                  </option>
                  <option className="text-black" value="ece">
                    ECE
                  </option>
                  <option className="text-black" value="eee">
                    EEE
                  </option>
                  <option className="text-black" value="mech">
                    MECH
                  </option>
                </select>

                <div className="mb-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-300">
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
                    <label className="mb-2 block text-sm font-semibold text-slate-300">
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

                <button className={`mt-4 ${buttonClass}`}>
                  Submit Leave Request
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
                    <div key={leave.id} className={innerCardClass}>
                      <p>
                        <b>Department:</b> {leave.department?.toUpperCase()}
                      </p>
                      <p>
                        <b>From:</b> {leave.fromDate}
                      </p>
                      <p>
                        <b>To:</b> {leave.toDate}
                      </p>
                      <p>
                        <b>Reason:</b> {leave.reason}
                      </p>
                      <p>
                        <b>Status:</b>{" "}
                        <span
                          className={
                            leave.status === "Approved"
                              ? "font-bold text-accent-emerald"
                              : leave.status === "Rejected"
                              ? "font-bold text-accent-rose"
                              : "font-bold text-gold-600 dark:text-blue-400"
                          }
                        >
                          {leave.status}
                        </span>
                      </p>
                      {leave.status === "Approved" && (
                        <button className="mt-3 rounded-xl bg-indigo-500/10 px-4 py-2 font-semibold text-indigo-600 shadow-sm transition hover:bg-indigo-500/20 dark:text-indigo-400">
                          Download Leavepass
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 dark:text-slate-400">
                  No leave requests submitted yet 📭
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
                <p className={`mt-4 text-sm font-bold ${examJoinMessage.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {examJoinMessage.type === 'success' ? '✅ ' : '❌ '}{examJoinMessage.text}
                </p>
              )}
            </div>

            <h2 className="mb-4 text-xl font-black text-accent-blue">
              Scheduled Attempts
            </h2>

            {dayStatus.isWorkingDay ? (
              <div className="grid gap-4 md:grid-cols-2">
                {examsToday.map((exam, index) => (
                  <div key={index} className={innerCardClass}>
                    <h3 className="font-black text-slate-900 dark:text-white">
                      {exam.subject}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400">
                      {exam.time}
                    </p>

                    <button className={`mt-3 ${buttonClass}`}>
                      {exam.status === "Available" ? "Attempt Now" : "Upcoming"}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 dark:text-slate-400">
                No exams available on leave day.
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

          <div className={cardClass}>
            <Charts
              title1="Performance Trend"
              title2="Weekly Performance"
              data={data.chartData}
            />
          </div>

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

          <div className={`mt-8 ${cardClass}`}>
            <h2 className="mb-3 text-xl font-black text-gold-600 dark:text-blue-400">
              Leaderboard
            </h2>
            <p>
              <b>Student:</b> {data.leaderboardName}
            </p>
            <p>
              <b>Rank:</b> #{data.rank}
            </p>
            <p>
              <b>Competitor:</b> {data.nearestCompetitor} +
              {data.competitorDelta}
            </p>
          </div>

          <div className={`mt-8 ${cardClass}`}>
            <h2 className="mb-3 text-xl font-black text-gold-600 dark:text-blue-400">
              Adaptive Practice
            </h2>
            <p>
              <b>Topic:</b> {data.recommendedTopic}
            </p>
            <p>
              <b>Level:</b> {data.practiceLevel}
            </p>
            <p>
              <b>Questions:</b> {data.practiceQuestions}
            </p>

            <button className={`mt-4 ${buttonClass}`}>Start Practice</button>
          </div>
        </>
      )}

      {activeTab === "notifications" && (
        <>
          <SectionHeader
            title="Notifications"
            description="View your recent notices, announcements, and alerts."
          />
          <div className={cardClass}>
            <h2 className="mb-4 text-xl font-black text-gold-600 dark:text-blue-400">
              📢 Notice Board
            </h2>
            <div className="space-y-3">
              <div className={innerCardClass}>
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Mid-Semester Exam Timetable Released</p>
                  <span className="text-xs text-slate-400">2 hours ago</span>
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Check the exams tab for your subject-wise examination schedule. Prepare accordingly.</p>
              </div>
              <div className={innerCardClass}>
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Annual Tech Fest Registration Open</p>
                  <span className="text-xs text-slate-400">1 day ago</span>
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Register for hackathons, coding competitions, and project exhibitions before May 18.</p>
              </div>
              <div className={innerCardClass}>
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Sports Day — 1 June 2026</p>
                  <span className="text-xs text-slate-400">3 days ago</span>
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Annual inter-department sports event. Register with your class representative by May 25.</p>
              </div>
            </div>
          </div>
        </>
      )}
    </MainLayout>
  );
}
