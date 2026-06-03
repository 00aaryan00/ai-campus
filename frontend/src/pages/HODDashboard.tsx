import { useEffect, useState } from "react";
import MainLayout from "../layout/MainLayout";
import Charts from "../components/Charts";
import DayStatusCard from "../components/DayStatusCard";
import AIInsights from "../components/AIInsights";
import Notifications from "../components/Notifications";
import ProgressCard from "../components/ProgressCard";
import { leaveApi, facultyLeaveApi, type LeaveItem, type FacultyLeaveItem } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { BarChart3, TrendingUp, MailX, Users, Building } from "lucide-react";
import { useParams } from "react-router-dom";
import { eventApi, API_BASE_URL, dashboardApi } from "../services/api";
import type { EventItem } from "../services/api";

type HODData = {
  totalStudents: number;
  faculty: number;
  departments: number;
  healthIndex: number;
  criticalAlerts: number;
  topDepartment: string;
};

type TabType = "dashboard" | "leaves" | "timetable" | "performance" | "events" | "notifications";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];



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
  const { user } = useAuth();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [data, setData] = useState<HODData | null>(null);
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [showOnlyUnresponded, setShowOnlyUnresponded] = useState(false);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventTitle, setEventTitle] = useState("");
  const [eventVenue, setEventVenue] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [eventType, setEventType] = useState<"event" | "notification">("event");
  const [facultyLeaves, setFacultyLeaves] = useState<FacultyLeaveItem[]>([]);
  const [leaveTab, setLeaveTab] = useState<"student" | "faculty">("student");
  const [eventFile, setEventFile] = useState<File | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [selectedDay, setSelectedDay] = useState(
    days[new Date().getDay() === 0 ? 0 : new Date().getDay() - 1]
  );

  const selectedBranch = localStorage.getItem("hodBranch") || "cse";
  const [mySchedule, setMySchedule] = useState<any[]>([]);

  const schedule = mySchedule.filter(item => item.dayOfWeek === selectedDay);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!tenantSlug || !token) return;

        // Fetch Dashboard Stats
        const statsRes = await dashboardApi.getPrincipalStats(token, tenantSlug);
        if (statsRes.success) {
          setData(statsRes.stats);
        }

        // Fetch Schedule
        const scheduleRes = await fetch(`${API_BASE_URL}/t/${tenantSlug}/timetable/my-schedule`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const scheduleData = await scheduleRes.json();
        if (scheduleData.success) {
          setMySchedule(scheduleData.schedule);
        }

      } catch (err) {
        console.error("Failed to fetch HOD data", err);
      }
    };
    fetchAllData();

    const fetchLeaves = async () => {
      try {
        const token = localStorage.getItem("authToken") || "";
        if (tenantSlug && token && user?.role === "hod") {
          const res = await leaveApi.getDepartmentLeaves(token, tenantSlug);
          if (res.success) {
            setLeaves(res.leaves);
          }
          const facultyRes = await facultyLeaveApi.getDepartmentLeaves(token, tenantSlug);
          if (facultyRes.success) {
            setFacultyLeaves(facultyRes.leaves);
          }
        }
      } catch (err) {
        console.error("Failed to fetch department leaves", err);
      }
    };
    fetchLeaves();

    const fetchEvents = async () => {
      try {
        const token = localStorage.getItem("authToken") || "";
        if (tenantSlug && token) {
          const res = await eventApi.getEvents(token, tenantSlug);
          if (res.success) setEvents(res.events);
        }
      } catch (err) {
        console.error("Failed to fetch events", err);
      }
    };
    fetchEvents();
  }, [tenantSlug, user?.id]);

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

  const handlePublishEvent = async () => {
    if (!eventTitle) return alert("Please fill the title.");
    if (eventType === 'event' && (!eventVenue || !eventDate)) return alert("Please fill venue and date for events.");
    try {
      setIsPublishing(true);
      const token = localStorage.getItem("authToken") || "";
      if (!token || !tenantSlug) return;
      
      const formData = new FormData();
      formData.append("title", eventTitle);
      formData.append("venue", eventVenue);
      formData.append("date", eventDate || new Date().toISOString());
      formData.append("description", eventDesc);
      formData.append("type", eventType);
      if (eventFile) {
        formData.append("file", eventFile);
      }

      const res = await eventApi.createEvent(token, tenantSlug, formData);
      if (res.success) {
        setEvents((prev) => [...prev, res.event]);
        setEventTitle("");
        setEventVenue("");
        setEventDate("");
        setEventDesc("");
        setEventFile(null);
        alert(`${eventType === 'event' ? 'Event' : 'Notification'} published successfully!`);
      }
    } catch (err) {
      console.error(err);
      alert(`Failed to publish ${eventType}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDeleteEvent = async (eventId: string, type?: string) => {
    if (!confirm(`Are you sure you want to delete this ${type === 'notification' ? 'notification' : 'event'}?`)) return;
    try {
      const token = localStorage.getItem("authToken") || "";
      if (!token || !tenantSlug) return;
      
      const res = await eventApi.deleteEvent(token, tenantSlug, eventId);
      if (res.success) {
        setEvents((prev) => prev.filter(e => e._id !== eventId));
      }
    } catch (err) {
      console.error(err);
      alert(`Failed to delete ${type === 'notification' ? 'notification' : 'event'}`);
    }
  };

  const update = async (id: string, status: "Approved" | "Rejected") => {
    try {
      const token = localStorage.getItem("authToken") || "";
      if (tenantSlug && token) {
        await leaveApi.updateLeaveStatus(token, tenantSlug, id, status);
        const res = await leaveApi.getDepartmentLeaves(token, tenantSlug);
        if (res.success) setLeaves(res.leaves);
      }
    } catch {
      alert("Failed to update leave status");
    }
  };

  const updateFacultyLeave = async (id: string, status: "Approved" | "Rejected") => {
    try {
      const token = localStorage.getItem("authToken") || "";
      if (tenantSlug && token) {
        await facultyLeaveApi.updateLeaveStatus(token, tenantSlug, id, status);
        const res = await facultyLeaveApi.getDepartmentLeaves(token, tenantSlug);
        if (res.success) setFacultyLeaves(res.leaves);
      }
    } catch {
      alert("Failed to update faculty leave status");
    }
  };

  if (!data) {
    return (
      <MainLayout>
        <p className="text-slate-500 dark:text-slate-400">Loading...</p>
      </MainLayout>
    );
  }

  const displayName = user?.name?.trim() || "HOD";
  const hodMeta = user?.department?.trim()?.toUpperCase() || user?.email?.trim() || "HOD";

  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white">
          {selectedBranch.toUpperCase()} HOD Dashboard
        </h1>

        <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
          Welcome HOD {displayName} | {hodMeta}
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
            <p className="flex items-center gap-2 text-base font-semibold text-slate-500 dark:text-slate-400">
              Critical Alerts <MailX size={18} className="text-rose-500" />
            </p>
            <h2 className="mt-2 text-4xl font-black text-slate-900 dark:text-white">
              {data?.criticalAlerts || 0}
            </h2>
          </div>

            <div className={card}>
              <p className="flex items-center gap-2 text-base font-semibold text-slate-500 dark:text-slate-400">
                Faculty <Users size={18} />
              </p>
              <h2 className="mt-2 text-4xl font-black text-slate-900 dark:text-white">
              {data?.faculty || 0}
            </h2>
            </div>

            <div className={card}>
              <p className="flex items-center gap-2 text-base font-semibold text-slate-500 dark:text-slate-400">
                Reports <BarChart3 size={18} />
              </p>
              <h2 className="mt-2 text-4xl font-black text-gold-600 dark:text-blue-400">
                {data?.reports || 0}
              </h2>
            </div>

            <div className={card}>
              <p className="flex items-center gap-2 text-base font-semibold text-slate-500 dark:text-slate-400">
                Health Index <TrendingUp size={18} className="text-emerald-500" />
              </p>
              <h2 className="mt-2 text-4xl font-black text-slate-900 dark:text-white">{data?.healthIndex || 0}%</h2>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <ProgressCard
              label={`${selectedBranch.toUpperCase()} Attendance Rate`}
              value={data?.healthIndex || 0}
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
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-2">
              <div className="flex gap-4">
                <button
                  onClick={() => setLeaveTab("student")}
                  className={`font-semibold pb-2 flex items-center gap-2 ${leaveTab === "student" ? "text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`}
                >
                  Student Leaves
                  {leaves.filter((l) => l.status === "Pending").length > 0 && (
                    <span className="flex items-center justify-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                      {leaves.filter((l) => l.status === "Pending").length} new
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setLeaveTab("faculty")}
                  className={`font-semibold pb-2 flex items-center gap-2 ${leaveTab === "faculty" ? "text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`}
                >
                  Faculty Leaves
                  {facultyLeaves.filter((l) => l.status === "Pending").length > 0 && (
                    <span className="flex items-center justify-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                      {facultyLeaves.filter((l) => l.status === "Pending").length} new
                    </span>
                  )}
                </button>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 cursor-pointer hover:text-blue-600 transition-colors">
                <input
                  type="checkbox"
                  checked={showOnlyUnresponded}
                  onChange={(e) => setShowOnlyUnresponded(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Show only unresponded
              </label>
            </div>

            {leaveTab === "student" && (
              <>
                <h2 className="mb-4 text-xl font-black text-accent-blue">
                  Student Leave Requests
                </h2>
                {leaves.filter(l => !showOnlyUnresponded || l.status === "Pending").length > 0 ? (
              <div className="max-h-[480px] overflow-y-auto pr-1 space-y-4">
                {[...leaves].filter(l => !showOnlyUnresponded || l.status === "Pending").sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()).map((leave) => (
                  <div key={leave._id} className={inner}>
                    <div className="flex items-center justify-between">
                      <p className="flex items-center gap-2">
                        <b>Name:</b> {leave.studentName}
                        {leave.status === "Pending" && (
                          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                            New
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400">
                        Updated: {new Date(leave.updatedAt).toLocaleString()}
                      </p>
                    </div>
                    <p><b>From:</b> {new Date(leave.fromDate).toLocaleDateString()}</p>
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

                    {leave.status === "Pending" && (
                      <div className="mt-4 flex gap-3">
                        <button
                          onClick={() => update(leave._id, "Approved")}
                          className="rounded-xl bg-emerald-500/10 px-4 py-2 font-bold text-emerald-600 transition hover:bg-emerald-500/20"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => update(leave._id, "Rejected")}
                          className="rounded-xl bg-rose-500/10 px-4 py-2 font-bold text-rose-600 transition hover:bg-rose-500/20"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <MailX size={18} /> No pending leave requests for {selectedBranch.toUpperCase()}
              </p>
            )}
            </>
          )}

          {leaveTab === "faculty" && (
            <>
              <h2 className="mb-4 text-xl font-black text-accent-blue">
                Faculty Leave Requests
              </h2>
              {facultyLeaves.filter(l => !showOnlyUnresponded || l.status === "Pending").length > 0 ? (
                <div className="max-h-[480px] overflow-y-auto pr-1 space-y-4">
                  {[...facultyLeaves].filter(l => !showOnlyUnresponded || l.status === "Pending").sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()).map((leave) => (
                    <div key={leave._id} className={inner}>
                      <div className="flex items-center justify-between">
                        <p className="flex items-center gap-2">
                          <b>Name:</b> {leave.facultyName}
                          {leave.status === "Pending" && (
                            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                              New
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-400">
                          Updated: {new Date(leave.updatedAt || leave.createdAt || 0).toLocaleString()}
                        </p>
                      </div>
                      <p><b>From:</b> {new Date(leave.fromDate).toLocaleDateString()}</p>
                      <p><b>To:</b> {new Date(leave.toDate).toLocaleDateString()}</p>
                      <p className="whitespace-pre-wrap"><b>Reason:</b> {leave.reason}</p>
                      
                      {leave.fileUrl && (
                        <div className="mt-2">
                          <a href={leave.fileUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-blue-500 hover:underline">
                            📄 View Attachment
                          </a>
                        </div>
                      )}

                      <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-blue-500/10">
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

                        {leave.status === "Pending" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateFacultyLeave(leave._id, "Approved")}
                              className="rounded-xl bg-accent-emerald px-4 py-2 font-semibold text-navy-900 shadow-sm transition hover:brightness-110"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => updateFacultyLeave(leave._id, "Rejected")}
                              className="rounded-xl bg-accent-rose px-4 py-2 font-semibold text-navy-900 shadow-sm transition hover:brightness-110"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 dark:text-slate-400">
                  No pending faculty leaves
                </p>
              )}
            </>
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

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="p-4 font-bold">Time</th>
                  <th className="p-4 font-bold">Subject</th>
                  <th className="p-4 font-bold">Faculty</th>
                  <th className="p-4 font-bold">Room</th>
                  <th className="p-4 font-bold">Semester</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/10 text-slate-800 dark:text-slate-200">
                {schedule.map((item: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-white/5 transition">
                    <td className="p-4 font-semibold text-blue-600 dark:text-blue-400">
                      {item.startTime} - {item.endTime}
                    </td>
                    <td className="p-4">
                      <p className="font-bold">{item.subject}</p>
                    </td>
                    <td className="p-4 font-medium">{item.facultyId?.name || "TBA"}</td>
                    <td className="p-4">{item.room}</td>
                    <td className="p-4">Sem {item.semester}</td>
                  </tr>
                ))}
                {schedule.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">No classes scheduled for {selectedDay}.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === "performance" && (
        <>
          <SectionHeader
            title={`${selectedBranch.toUpperCase()} Department Performance`}
            description="Analyze department performance, attendance rate, risk indicators and top-performing areas."
          />

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <div className={card}>
              <h2 className="mb-2 text-xl font-black text-gold-600 dark:text-blue-400">
                Attendance Rate
              </h2>
              <p className="text-3xl font-black text-slate-900 dark:text-white">
                {data?.healthIndex || 0}%
              </p>
            </div>

            <div className={card}>
              <h2 className="mb-2 text-xl font-black text-rose-500 dark:text-rose-400">
                Total Students
              </h2>
              <p className="text-3xl font-black text-slate-900 dark:text-white">
                {data?.totalStudents || 0}
              </p>
            </div>

            <div className={card}>
              <h2 className="mb-2 text-xl font-black text-emerald-500 dark:text-emerald-400">
                Top Department
              </h2>
              <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {data?.topDepartment || "N/A"}
              </p>
            </div>
          </div>
        </>
      )}

      {activeTab === "events" && (
        <>
          <SectionHeader
            title="Institutional Updates"
            description="Create and manage institutional updates for your department."
          />

          <div className={card}>
            <h2 className="mb-4 text-xl font-black text-gold-600 dark:text-blue-400">
              Publish Update
            </h2>
            {/* Event Type Selection */}
              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <input type="radio" name="eventType" value="event" checked={eventType === 'event'} onChange={() => setEventType('event')} />
                  Event (Has Date/Venue)
                </label>
                <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <input type="radio" name="eventType" value="notification" checked={eventType === 'notification'} onChange={() => setEventType('notification')} />
                  Notification (Announcement)
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <input type="text" placeholder={eventType === 'event' ? "Event Title" : "Notification Title"} value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} className="rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-blue-500/15 dark:bg-[#111B44] dark:text-white" />
                
                {eventType === 'event' && (
                  <>
                    <input type="text" placeholder="Venue" value={eventVenue} onChange={(e) => setEventVenue(e.target.value)} className="rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-blue-500/15 dark:bg-[#111B44] dark:text-white" />
                    <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-blue-500/15 dark:bg-[#111B44] dark:text-white" />
                  </>
                )}
              </div>
            <textarea value={eventDesc} onChange={(e) => setEventDesc(e.target.value)} placeholder="Event description..." rows={3} className="mt-4 w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30 dark:border-blue-500/15 dark:bg-[#111B44] dark:text-white" />
            <div className="mt-4">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 transition hover:border-gold-500 dark:border-blue-500/20 dark:bg-[#111B44] dark:hover:border-blue-400">
                <span className="text-2xl">📎</span>
                <div>
                  <p className="font-semibold text-slate-700 dark:text-white">Upload Document (Optional)</p>
                  <p className="text-sm text-slate-400">{eventFile ? eventFile.name : "PDF, DOCX, JPG, PNG (Max 10MB)"}</p>
                </div>
                <input type="file" onChange={(e) => setEventFile(e.target.files?.[0] || null)} className="hidden" accept=".pdf,.docx,.jpg,.jpeg,.png" />
              </label>
            </div>
            <button onClick={handlePublishEvent} disabled={isPublishing} className="mt-5 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 dark:from-blue-600 dark:to-blue-400 px-5 py-2 font-semibold text-slate-900 shadow-md transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
              {isPublishing ? "Publishing..." : "Publish Update"}
            </button>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-blue-500/10 dark:bg-[#0B1437]">
              <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-white">
                📢 Notifications
              </h2>
              <div className="space-y-4">
                {events.filter(e => e.type === 'notification').length === 0 ? (
                  <p className="text-sm text-slate-500">No recent notifications.</p>
                ) : (
                  [...events].filter(e => e.type === 'notification').sort((a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime()).map((evt) => (
                    <div key={evt._id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-colors hover:bg-slate-100 dark:border-blue-500/5 dark:bg-blue-900/10 dark:hover:bg-blue-900/20">
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
                      {evt.targetAudience !== 'all' && (
                        <div className="mt-2 text-right">
                          <button onClick={() => handleDeleteEvent(evt._id, evt.type)} className="text-red-500 hover:text-red-700 font-bold p-1 text-sm" title="Delete">
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-blue-500/10 dark:bg-[#0B1437]">
              <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-white">
                📅 Events
              </h2>
              <div className="space-y-4">
                {events.filter(e => e.type === 'event' || !e.type).length === 0 ? (
                  <p className="text-sm text-slate-500">No upcoming events.</p>
                ) : (
                  [...events].filter(e => e.type === 'event' || !e.type).sort((a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime()).map((evt) => (
                    <div key={evt._id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-colors hover:bg-slate-100 dark:border-blue-500/5 dark:bg-blue-900/10 dark:hover:bg-blue-900/20">
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
                      {evt.targetAudience !== 'all' && (
                        <div className="mt-2 text-right">
                          <button onClick={() => handleDeleteEvent(evt._id, evt.type)} className="text-red-500 hover:text-red-700 font-bold p-1 text-sm" title="Delete">
                            Delete
                          </button>
                        </div>
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
