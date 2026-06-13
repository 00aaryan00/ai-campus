import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import Charts from "../components/Charts";
import DayStatusCard from "../components/DayStatusCard";
import AIInsights from "../components/AIInsights";
import Notifications from "../components/Notifications";
import ProgressCard from "../components/ProgressCard";
import { TrendingUp, Users, BookOpen, Clock, FileText, CheckCircle, XCircle } from "lucide-react";
import { leaveApi, dashboardApi, eventApi, facultyLeaveApi, type LeaveItem, type EventItem, type FacultyLeaveItem } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Calendar, Trash2 } from "lucide-react";
import TimetableUploader from "../components/TimetableUploader";
import { API_BASE_URL } from "../services/api";
import type { EventAudience } from "../services/api";

type PrincipalData = {
  totalStudents: number;
  faculty: number;
  departments: number;
  institutionPerformance: number;
  healthIndex: number;
  criticalAlerts: number;
  topDepartment: string;
  chartData: any;
  name?: string;
};

type TabType = "dashboard" | "leaves" | "timetable" | "alerts" | "performance" | "events" | "notifications";

const smartAlerts = [
  "12 students are below 75% attendance",
  "CSE department has highest performance this week",
  "3 leave requests require urgent review",
];

const card =
  "card-hover rounded-3xl border border-slate-200/60 bg-white/90 p-6 text-slate-900 shadow-card backdrop-blur-xl transition dark:border-blue-500/10 dark:bg-[#0C1330] dark:text-white";

const cardClass = card;

const inner =
  "card-hover rounded-2xl border border-slate-200/40 bg-slate-50 p-4 text-slate-700 dark:border-blue-500/10 dark:bg-[#111B44] dark:text-white";

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

export default function PrincipalDashboard() {
  const { user } = useAuth();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [data, setData] = useState<PrincipalData | null>(null);
  const [leaveOverview, setLeaveOverview] = useState<LeaveItem[]>([]);
  const [hodLeaves, setHodLeaves] = useState<FacultyLeaveItem[]>([]);
  const [leaveTab, setLeaveTab] = useState<"student" | "staff">("student");

  // Events State
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventTitle, setEventTitle] = useState("");
  const [eventVenue, setEventVenue] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [eventType, setEventType] = useState<"event" | "notification">("event");
  const [eventFile, setEventFile] = useState<File | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!tenantSlug || !token) return;

        const [statsRes, leavesRes, eventsRes, hodLeavesRes] = await Promise.all([
          dashboardApi.getPrincipalStats(token, tenantSlug),
          user?.role === "institution_admin" ? leaveApi.getAllLeaves(token, tenantSlug) : Promise.resolve({ success: false, leaves: [] }),
          eventApi.getEvents(token, tenantSlug),
          facultyLeaveApi.getHodLeaves(token, tenantSlug)
        ]);

        if (statsRes.success) setData(statsRes.stats);
        if (leavesRes.success) setLeaveOverview(leavesRes.leaves);
        if (eventsRes.success) setEvents(eventsRes.events);
        if (hodLeavesRes.success) setHodLeaves(hodLeavesRes.leaves);
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      }
    };
    fetchAllData();
  }, [tenantSlug, user?.role]);

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<TabType>;
      setActiveTab(customEvent.detail);
    };

    window.addEventListener("principalTabChange", handler);

    return () => {
      window.removeEventListener("principalTabChange", handler);
    };
  }, [tenantSlug]);

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

  const updateStaffLeave = async (id: string, status: "Approved" | "Rejected") => {
    try {
      const token = localStorage.getItem("authToken") || "";
      if (tenantSlug && token) {
        await facultyLeaveApi.updateLeaveStatus(token, tenantSlug, id, status);
        const res = await facultyLeaveApi.getHodLeaves(token, tenantSlug);
        if (res.success) setHodLeaves(res.leaves);
      }
    } catch {
      alert("Failed to update staff leave status");
    }
  };

  if (!data) {
    return (
      <MainLayout>
        <p className="text-slate-500 dark:text-slate-400">Loading...</p>
      </MainLayout>
    );
  }

  const totalLeaves = leaveOverview.length;
  const pendingLeaves = leaveOverview.filter(
    (leave) => leave.status === "Pending"
  ).length;
  const approvedLeaves = leaveOverview.filter(
    (leave) => leave.status === "Approved"
  ).length;
  const rejectedLeaves = leaveOverview.filter(
    (leave) => leave.status === "Rejected"
  ).length;

  const displayName = user?.name?.trim() || data.name;
  const adminMeta = user?.department?.trim()?.toUpperCase() || user?.email?.trim() || "Institution Admin";

  return (
    <MainLayout>
      {/* Welcome Banner */}
      <div className="mb-8">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white">
          Principal Dashboard
        </h1>

        <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
          Welcome back, {displayName} 👋 | {adminMeta}
        </p>
        {tenantSlug ? (
          <Link
            to={`/t/${tenantSlug}/admin/onboarding`}
            className="mt-3 inline-block rounded-xl bg-cyan-50 dark:bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-700 dark:text-cyan-400 transition hover:bg-cyan-100 dark:hover:bg-cyan-500/20"
          >
            Open Tenant Onboarding
          </Link>
        ) : null}
      </div>

      {activeTab === "dashboard" && (
        <>
          <SectionHeader
            title="Institution Overview"
            description="Institution-wide overview of students, faculty, departments and academic performance."
          />

          <div className="grid gap-6 md:grid-cols-5">
            <DayStatusCard />

            <div className={cardClass}>
              <p className="flex items-center gap-2 text-base font-semibold text-slate-500 dark:text-slate-400">
                Total Students <Users size={18} className="text-purple-500" />
              </p>
              <h2 className="mt-2 text-4xl font-black text-slate-900 dark:text-white">
                {data.totalStudents}
              </h2>
            </div>

            <div className={cardClass}>
              <p className="flex items-center gap-2 text-base font-semibold text-slate-500 dark:text-slate-400">
                Faculty <BookOpen size={18} className="text-blue-500" />
              </p>
              <h2 className="mt-2 text-4xl font-black text-slate-900 dark:text-white">{data.faculty}</h2>
            </div>

            <div className={cardClass}>
              <p className="flex items-center gap-2 text-base font-semibold text-slate-500 dark:text-slate-400">
                Performance <TrendingUp size={18} className="text-emerald-500" />
              </p>
              <h2 className="mt-2 text-4xl font-black text-slate-900 dark:text-white">{data.departments}</h2>
            </div>

            <div className={card}>
              <p className="text-base font-semibold text-slate-500 dark:text-slate-400">
                Performance 📈
              </p>
              <h2 className="mt-2 text-4xl font-black text-gold-600 dark:text-blue-400">
                {data.institutionPerformance}%
              </h2>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <ProgressCard
              label="Institution Performance"
              value={data.institutionPerformance}
            />
            <Notifications />
          </div>

          <AIInsights role="principal" />
        </>
      )}

      {activeTab === "leaves" && (
        <>
          <SectionHeader
            title="Leave Overview"
            description="Monitor leave statistics across the institution including pending, approved and rejected requests."
          />

          <div className={card}>
            <h2 className="mb-4 text-xl font-black text-gold-600 dark:text-blue-400">
              Leave Statistics
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className={inner}>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Total Leaves
                </p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">{totalLeaves}</h3>
              </div>

              <div className={inner}>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Pending
                </p>
                <h3 className="text-3xl font-black text-gold-600 dark:text-blue-400">
                  {pendingLeaves}
                </h3>
              </div>

              <div className={inner}>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Approved
                </p>
                <h3 className="text-3xl font-black text-emerald-500">
                  {approvedLeaves}
                </h3>
              </div>

              <div className={inner}>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Rejected
                </p>
                <h3 className="text-3xl font-black text-red-500 dark:text-red-400">
                  {rejectedLeaves}
                </h3>
              </div>
            </div>
          </div>

          <div className={card}>
            <div className="mb-6 flex gap-4 border-b border-slate-200 dark:border-slate-700 pb-2">
              <button
                onClick={() => setLeaveTab("student")}
                className={`font-semibold pb-2 ${leaveTab === "student" ? "text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`}
              >
                Student Leaves
              </button>
              <button
                onClick={() => setLeaveTab("staff")}
                className={`font-semibold pb-2 flex items-center gap-2 ${leaveTab === "staff" ? "text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`}
              >
                Staff/HOD Leaves
                {hodLeaves.filter((l) => l.status === "Pending").length > 0 && (
                  <span className="flex items-center justify-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                    {hodLeaves.filter((l) => l.status === "Pending").length} new
                  </span>
                )}
              </button>
            </div>

            {leaveTab === "student" && (
              <>
                <h2 className="mb-4 text-xl font-black text-accent-blue">
                  Institution Leave Log (Students)
                </h2>

                {leaveOverview.length > 0 ? (
                  <div className="max-h-[480px] overflow-y-auto pr-1 space-y-4">
                    {[...leaveOverview].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()).map((leave) => (
                      <div key={leave._id} className={inner}>
                        <div className="flex items-center justify-between">
                          <p><b>Name:</b> {leave.studentName} <span className="text-sm text-slate-500">({leave.department?.toUpperCase()})</span></p>
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
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 text-slate-400">
                    <p>No leave requests found.</p>
                  </div>
                )}
              </>
            )}

            {leaveTab === "staff" && (
              <>
                <h2 className="mb-4 text-xl font-black text-accent-blue">
                  HOD & Staff Leave Requests
                </h2>
                {hodLeaves.length > 0 ? (
                  <div className="max-h-[480px] overflow-y-auto pr-1 space-y-4">
                    {[...hodLeaves].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()).map((leave) => (
                      <div key={leave._id} className={inner}>
                        <div className="flex items-center justify-between">
                          <p><b>Name:</b> {leave.facultyName} <span className="text-sm text-slate-500">({leave.department?.toUpperCase()})</span></p>
                          <p className="text-xs text-slate-400">
                            Updated: {new Date(leave.updatedAt || leave.createdAt || 0).toLocaleString()}
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
                                onClick={() => updateStaffLeave(leave._id, "Approved")}
                                className="rounded-xl bg-accent-emerald px-4 py-2 font-semibold text-navy-900 shadow-sm transition hover:brightness-110"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => updateStaffLeave(leave._id, "Rejected")}
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
                  <div className="flex flex-col items-center justify-center p-8 text-slate-400">
                    <p>No staff leave requests found.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {activeTab === "timetable" && (
        <TimetableUploader />
      )}

      {activeTab === "alerts" && (
        <>
          <SectionHeader
            title="Smart Institutional Alerts"
            description="Review important institutional alerts and areas that require academic attention."
          />

          <div className={card}>
            <h2 className="mb-4 text-xl font-black text-accent-blue">
              Active Alerts
            </h2>

            <div className="space-y-3">
              {smartAlerts.map((alert, index) => (
                <div key={index} className={`${inner} border-l-4 border-l-gold-500`}>
                  {alert}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === "performance" && (
        <>
          <SectionHeader
            title="Institution Performance"
            description="Track institutional growth, health index, critical alerts and top department performance."
          />

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <div className={card}>
              <h2 className="mb-2 text-xl font-black text-gold-600 dark:text-blue-400">
                Institutional Health Index
              </h2>
              <p className="text-3xl font-black text-slate-900 dark:text-white">{data.healthIndex}/100</p>
            </div>

            <div className={card}>
              <h2 className="mb-2 text-xl font-black text-red-500 dark:text-red-400">
                Critical Alerts
              </h2>
              <p className="text-3xl font-black text-slate-900 dark:text-white">{data.criticalAlerts}</p>
            </div>

            <div className={card}>
              <h2 className="mb-2 text-xl font-black text-accent-blue">
                Top Department
              </h2>
              <p className="text-3xl font-black text-gold-600 dark:text-blue-400">{data.topDepartment}</p>
            </div>
          </div>
        </>
      )}

      {activeTab === "events" && (
        <>
          <SectionHeader
            title="Institutional Updates"
            description="Schedule and manage institution-wide events, upload official notices and documents."
          />

          <div className={card}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
                <Calendar size={24} className="text-indigo-500" /> Publish Update
              </h2>
            </div>
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
                      <div className="mt-2 text-right">
                        <button onClick={() => handleDeleteEvent(evt._id, evt.type)} className="text-red-500 hover:text-red-700 font-bold p-1 text-sm" title="Delete">
                          Delete
                        </button>
                      </div>
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
                      <div className="mt-2 text-right">
                        <button onClick={() => handleDeleteEvent(evt._id, evt.type)} className="text-red-500 hover:text-red-700 font-bold p-1 text-sm" title="Delete">
                          Delete
                        </button>
                      </div>
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
