import { useEffect, useState } from "react";
import MainLayout from "../layout/MainLayout";
import Charts from "../components/Charts";
import DayStatusCard from "../components/DayStatusCard";
import AIInsights from "../components/AIInsights";
import Notifications from "../components/Notifications";
import ProgressCard from "../components/ProgressCard";
import {
  listenLeaveRequests,
  updateLeaveStatus,
} from "../services/leaveServices";
import type { LeaveRequest } from "../services/leaveServices";

type HODData = {
  name: string;
  departments: number;
  faculty: number;
  reports: number;
  averageScore: number;
  attendanceRate: number;
  studentsAtRisk: number;
  bestDepartment: string;
  chartData: { name: string; value: number }[];
};

type TabType = "dashboard" | "leaves" | "timetable" | "performance" | "events" | "notifications";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const hodTimetable: Record<string, { time: string; subject: string; teacher: string; room: string; type: string; class: string }[]> = {
  Monday: [
    { time: "9:00 AM", subject: "AI Principles", teacher: "Dr. Smith", room: "229", type: "Lecture", class: "CSE-A" },
    { time: "11:00 AM", subject: "Data Structures", teacher: "Prof. Johnson", room: "506", type: "Lab", class: "CSE-B" },
    { time: "2:00 PM", subject: "Operating Systems", teacher: "Dr. Lee", room: "116", type: "Lecture", class: "CSE-C" }
  ],
  Tuesday: [
    { time: "10:00 AM", subject: "Computer Networks", teacher: "Dr. Brown", room: "213", type: "Lecture", class: "CSE-A" },
    { time: "12:00 PM", subject: "Database Systems", teacher: "Prof. White", room: "305", type: "Lab", class: "CSE-B" }
  ],
  Wednesday: [
    { time: "9:00 AM", subject: "Machine Learning", teacher: "Dr. Green", room: "402", type: "Lecture", class: "CSE-C" },
    { time: "1:00 PM", subject: "Cloud Computing", teacher: "Prof. Black", room: "120", type: "Lecture", class: "CSE-A" }
  ],
  Thursday: [
    { time: "11:00 AM", subject: "Software Engineering", teacher: "Dr. Gray", room: "229", type: "Lab", class: "CSE-B" }
  ],
  Friday: [
    { time: "10:00 AM", subject: "Cyber Security", teacher: "Prof. Adams", room: "506", type: "Lecture", class: "CSE-C" }
  ],
  Saturday: [
    { time: "9:00 AM", subject: "Project Review", teacher: "Dr. Smith", room: "116", type: "Review", class: "All" }
  ]
};

const card =
  "card-hover rounded-3xl border border-slate-200/60 bg-white/90 p-6 text-slate-900 shadow-card backdrop-blur-xl transition dark:border-blue-500/10 dark:bg-[#0C1330] dark:text-white";

const inner =
  "card-hover rounded-2xl border border-slate-200/40 bg-slate-50 p-4 text-slate-700 dark:border-blue-500/10 dark:bg-[#111B44] dark:text-white";

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

export default function HODDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [data, setData] = useState<HODData | null>(null);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [selectedDay, setSelectedDay] = useState(
    days[new Date().getDay() === 0 ? 0 : new Date().getDay() - 1]
  );

  const selectedBranch = localStorage.getItem("hodBranch") || "cse";
  const schedule = hodTimetable[selectedDay] || [];

  useEffect(() => {
    setData({
      name: "Dr. Sharma",
      departments: 1,
      faculty: 24,
      reports: 18,
      averageScore: 79,
      attendanceRate: 84,
      studentsAtRisk: 9,
      bestDepartment: selectedBranch.toUpperCase(),
      chartData: [
        { name: "Mon", value: 72 },
        { name: "Tue", value: 75 },
        { name: "Wed", value: 80 },
        { name: "Thu", value: 77 },
        { name: "Fri", value: 83 },
      ],
    });

    const unsubscribe = listenLeaveRequests((items) => {
      setLeaves(
        items.filter(
          (leave) =>
            leave.status === "Pending" &&
            leave.department?.toLowerCase() === selectedBranch
        )
      );
    });

    return () => unsubscribe();
  }, [selectedBranch]);

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<TabType>;
      setActiveTab(customEvent.detail);
    };

    window.addEventListener("hodTabChange", handler);

    return () => {
      window.removeEventListener("hodTabChange", handler);
    };
  }, []);

  const update = async (id: string, status: "Approved" | "Rejected") => {
    try {
      await updateLeaveStatus(id, status);
    } catch {
      alert("Failed to update leave status");
    }
  };

  if (!data) {
    return (
      <MainLayout>
        <p className="text-slate-500 dark:text-slate-400">Loading...</p>
      </MainLayout>
    );
  }

  const displayName = data.name.toLowerCase().includes("dashboard") ? "Dr. Sharma" : data.name;

  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white">
          {selectedBranch.toUpperCase()} HOD Dashboard
        </h1>

        <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
          Welcome HOD {displayName} 👋
        </p>
      </div>

      {activeTab === "dashboard" && (
        <>
          <SectionHeader
            title={`${selectedBranch.toUpperCase()} HOD Overview`}
            description="Monitor department-level academics, faculty activity, reports and attendance performance."
          />

          <div className="grid gap-6 md:grid-cols-5">
            <DayStatusCard />

            <div className={card}>
              <p className="text-base font-semibold text-slate-500 dark:text-slate-400">
                Departments 🏢
              </p>
              <h2 className="mt-2 text-4xl font-black text-slate-900 dark:text-white">
                {data.departments}
              </h2>
            </div>

            <div className={card}>
              <p className="text-base font-semibold text-slate-500 dark:text-slate-400">
                Faculty 👨‍🏫
              </p>
              <h2 className="mt-2 text-4xl font-black text-slate-900 dark:text-white">
                {data.faculty}
              </h2>
            </div>

            <div className={card}>
              <p className="text-base font-semibold text-slate-500 dark:text-slate-400">
                Reports 📊
              </p>
              <h2 className="mt-2 text-4xl font-black text-gold-600 dark:text-blue-400">
                {data.reports}
              </h2>
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
            <ProgressCard
              label={`${selectedBranch.toUpperCase()} Attendance Rate`}
              value={data.attendanceRate}
            />
            <Notifications department={selectedBranch} />
          </div>

          <AIInsights role="hod" department={selectedBranch} />
        </>
      )}

      {activeTab === "leaves" && (
        <>
          <SectionHeader
            title={`${selectedBranch.toUpperCase()} Leave Monitoring`}
            description="Review pending leave requests for this department and take approval or rejection actions."
          />

          <div className={card}>
            <h2 className="mb-4 text-xl font-black text-gold-600 dark:text-blue-400">
              Pending Leave Requests
            </h2>

            {leaves.length > 0 ? (
              <div className="space-y-3">
                {leaves.map((leave) => (
                  <div key={leave.id} className={inner}>
                    <p>
                      <b>Name:</b> {leave.studentName}
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

                    <div className="mt-3 flex gap-3">
                      <button
                        onClick={() => leave.id && update(leave.id, "Approved")}
                        className="rounded-xl bg-accent-emerald px-4 py-2 font-semibold text-navy-900 shadow-sm transition hover:brightness-110"
                      >
                        Approve
                      </button>

                      <button
                        onClick={() => leave.id && update(leave.id, "Rejected")}
                        className="rounded-xl bg-accent-rose px-4 py-2 font-semibold text-navy-900 shadow-sm transition hover:brightness-110"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 dark:text-slate-400">
                No pending leave requests for {selectedBranch.toUpperCase()} 📭
              </p>
            )}
          </div>
        </>
      )}

      {activeTab === "timetable" && (
        <>
          <SectionHeader
            title={`${selectedBranch.toUpperCase()} Department Timetable`}
            description="View department schedules, labs, sessions and planned academic activities."
          />

          {/* Day Selector */}
          <div className="mb-6 flex gap-3 overflow-x-auto pb-2">
            {days.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`whitespace-nowrap rounded-xl px-5 py-2.5 font-bold shadow-sm transition ${
                  selectedDay === day
                    ? "bg-gradient-to-r from-gold-600 to-gold-400 dark:from-blue-600 dark:to-blue-400 text-navy-900 shadow-md"
                    : "bg-white text-slate-600 hover:bg-gold-50 dark:bg-[#111B44] dark:text-slate-300 dark:hover:bg-[#1A2352]"
                }`}
              >
                {day}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {schedule.length > 0 ? (
              schedule.map((item, index) => (
                <div key={index} className="card-hover flex flex-col md:flex-row md:items-center justify-between rounded-2xl border border-slate-200/60 bg-white/90 p-5 shadow-sm transition dark:border-blue-500/10 dark:bg-[#0C1330] dark:text-white">
                  <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                    <div className="flex h-12 w-32 items-center justify-center rounded-xl bg-gold-50 text-gold-700 dark:bg-[#6366f1]/10 dark:text-[#6366f1] font-bold shadow-inner">
                      {item.time}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-800 dark:text-white">
                        {item.subject} <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">({item.type})</span>
                      </h3>
                      <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                        {item.teacher} • Class: {item.class}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 md:mt-0 flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-2 font-bold text-slate-600 dark:bg-[#111B44] dark:text-slate-300 border border-slate-200 dark:border-blue-500/10">
                    <span>🚪</span> Room {item.room}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-500 dark:text-slate-400 p-6 bg-white/50 rounded-2xl dark:bg-[#0C1330]/50 border border-slate-200/50 dark:border-blue-500/10 text-center font-semibold">
                No classes scheduled for {selectedDay}.
              </p>
            )}
          </div>
        </>
      )}

      {activeTab === "performance" && (
        <>
          <SectionHeader
            title={`${selectedBranch.toUpperCase()} Department Performance`}
            description="Analyze department performance, attendance rate, risk indicators and top-performing areas."
          />

          <div className={card}>
            <Charts
              title1={`${selectedBranch.toUpperCase()} Performance`}
              title2="Department Trend"
              data={data.chartData}
            />
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <div className={card}>
              <h2 className="mb-2 text-xl font-black text-gold-600 dark:text-blue-400">
                Attendance Rate
              </h2>
              <p className="text-3xl font-black text-slate-900 dark:text-white">
                {data.attendanceRate}%
              </p>
            </div>

            <div className={card}>
              <h2 className="mb-2 text-xl font-black text-red-500 dark:text-red-400">
                Students At Risk
              </h2>
              <p className="text-3xl font-black text-slate-900 dark:text-white">
                {data.studentsAtRisk}
              </p>
            </div>

            <div className={card}>
              <h2 className="mb-2 text-xl font-black text-accent-blue">
                Best Department
              </h2>
              <p className="text-3xl font-black text-gold-600 dark:text-blue-400">
                {data.bestDepartment}
              </p>
            </div>
          </div>
        </>
      )}

      {activeTab === "events" && (
        <>
          <SectionHeader
            title="Event Schedule Manager"
            description="Create and manage institutional events, upload notices and schedule documents."
          />

          <div className={card}>
            <h2 className="mb-4 text-xl font-black text-gold-600 dark:text-blue-400">
              📅 Create New Event
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <input
                type="text"
                placeholder="Event Title"
                className="rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30 dark:border-blue-500/15 dark:bg-[#111B44] dark:text-white"
              />
              <input
                type="text"
                placeholder="Venue (e.g. Auditorium, Hall B)"
                className="rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30 dark:border-blue-500/15 dark:bg-[#111B44] dark:text-white"
              />
              <input
                type="date"
                className="rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30 dark:border-blue-500/15 dark:bg-[#111B44] dark:text-white"
              />
            </div>

            <textarea
              placeholder="Event description or additional instructions..."
              rows={3}
              className="mt-4 w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30 dark:border-blue-500/15 dark:bg-[#111B44] dark:text-white"
            />

            <div className="mt-4">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 transition hover:border-gold-500 dark:border-blue-500/20 dark:bg-[#111B44] dark:hover:border-blue-400">
                <span className="text-2xl">📎</span>
                <div>
                  <p className="font-semibold text-slate-700 dark:text-white">Upload Notice / Schedule</p>
                  <p className="text-sm text-slate-400">PDF, DOCX, JPG, PNG (Max 10MB)</p>
                </div>
                <input type="file" className="hidden" accept=".pdf,.docx,.jpg,.jpeg,.png" />
              </label>
            </div>

            <button className={`${btn} mt-5`}>Publish Event</button>
          </div>

          <div className={`mt-6 ${card}`}>
            <h2 className="mb-4 text-xl font-black text-accent-blue">
              📋 Upcoming Events
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
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">The mid-semester examination timetable for all branches has been published. Please review and inform your students.</p>
              </div>
              <div className={inner}>
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Faculty Meeting — Friday 3 PM</p>
                  <span className="text-xs text-slate-400">1 day ago</span>
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">All HODs and faculty are requested to attend the meeting in Conference Hall B regarding curriculum revisions.</p>
              </div>
              <div className={inner}>
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Lab Equipment Maintenance</p>
                  <span className="text-xs text-slate-400">3 days ago</span>
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Scheduled maintenance for all CSE labs on Saturday. Labs will be unavailable from 9 AM to 5 PM.</p>
              </div>
            </div>
          </div>
        </>
      )}
    </MainLayout>
  );
}
