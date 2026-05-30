import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import Charts from "../components/Charts";
import DayStatusCard from "../components/DayStatusCard";
import AIInsights from "../components/AIInsights";
import Notifications from "../components/Notifications";
import ProgressCard from "../components/ProgressCard";
import { listenLeaveRequests } from "../services/leaveServices";
import type { LeaveRequest } from "../services/leaveServices";
import { useAuth } from "../context/AuthContext";
import { Users, Briefcase, TrendingUp, Calendar, Trash2 } from "lucide-react";
import TimetableUploader from "../components/TimetableUploader";
import { eventApi, API_BASE_URL } from "../services/api";
import type { EventItem, EventAudience } from "../services/api";

type PrincipalData = {
  name: string;
  totalStudents: number;
  faculty: number;
  departments: number;
  institutionPerformance: number;
  healthIndex: number;
  criticalAlerts: number;
  topDepartment: string;
  chartData: { name: string; value: number }[];
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
  const [leaveOverview, setLeaveOverview] = useState<LeaveRequest[]>([]);

  // Events State
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventTitle, setEventTitle] = useState("");
  const [eventVenue, setEventVenue] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [eventFile, setEventFile] = useState<File | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    setData({
      name: "Principal Demo",
      totalStudents: 1200,
      faculty: 82,
      departments: 6,
      institutionPerformance: 81,
      healthIndex: 86,
      criticalAlerts: 3,
      topDepartment: "CSE",
      chartData: [
        { name: "Mon", value: 74 },
        { name: "Tue", value: 77 },
        { name: "Wed", value: 79 },
        { name: "Thu", value: 82 },
        { name: "Fri", value: 84 },
      ],
    });

    const unsubscribe = listenLeaveRequests((leaves) => {
      setLeaveOverview(leaves);
    });

    // Fetch Events
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

    return () => unsubscribe();
  }, []);

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
    if (!eventTitle || !eventVenue || !eventDate) return alert("Please fill title, venue, and date.");
    try {
      setIsPublishing(true);
      const token = localStorage.getItem("authToken") || "";
      if (!token || !tenantSlug) return;
      
      const formData = new FormData();
      formData.append("title", eventTitle);
      formData.append("venue", eventVenue);
      formData.append("date", eventDate);
      formData.append("description", eventDesc);
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
        alert("Event published successfully!");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to publish event");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      const token = localStorage.getItem("authToken") || "";
      if (!token || !tenantSlug) return;
      
      const res = await eventApi.deleteEvent(token, tenantSlug, eventId);
      if (res.success) {
        setEvents((prev) => prev.filter(e => e._id !== eventId));
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete event");
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
                Faculty <Briefcase size={18} className="text-blue-500" />
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

          <div className={card}>
            <Charts
              title1="Institution Growth"
              title2="Monthly Performance"
              data={data.chartData}
            />
          </div>

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
            title="Institutional Events"
            description="Schedule and manage institution-wide events, upload official notices and documents."
          />

          <div className={card}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
                <Calendar size={24} className="text-indigo-500" /> Schedule New Event
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <input type="text" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="Event Title" className="rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30 dark:border-blue-500/15 dark:bg-[#111B44] dark:text-white" />
              <input type="text" value={eventVenue} onChange={(e) => setEventVenue(e.target.value)} placeholder="Venue" className="rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30 dark:border-blue-500/15 dark:bg-[#111B44] dark:text-white" />
              <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30 dark:border-blue-500/15 dark:bg-[#111B44] dark:text-white" />
            </div>
            <textarea value={eventDesc} onChange={(e) => setEventDesc(e.target.value)} placeholder="Event description..." rows={3} className="mt-4 w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30 dark:border-blue-500/15 dark:bg-[#111B44] dark:text-white" />
            <div className="mt-4">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 transition hover:border-gold-500 dark:border-blue-500/20 dark:bg-[#111B44] dark:hover:border-blue-400">
                <span className="text-2xl">📎</span>
                <div>
                  <p className="font-semibold text-slate-700 dark:text-white">Upload Notice / Schedule</p>
                  <p className="text-sm text-slate-400">{eventFile ? eventFile.name : "PDF, DOCX, JPG, PNG (Max 10MB)"}</p>
                </div>
                <input type="file" onChange={(e) => setEventFile(e.target.files?.[0] || null)} className="hidden" accept=".pdf,.docx,.jpg,.jpeg,.png" />
              </label>
            </div>
            <button onClick={handlePublishEvent} disabled={isPublishing} className="mt-5 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 dark:from-blue-600 dark:to-blue-400 px-5 py-2 font-semibold text-slate-900 shadow-md transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
              {isPublishing ? "Publishing..." : "Publish Event"}
            </button>
          </div>

          <div className={`mt-6 ${card}`}>
            <h2 className="mb-4 text-xl font-black text-accent-blue">📋 Upcoming Events</h2>
            <div className="space-y-3">
              {events.length === 0 ? (
                <p className="text-slate-500">No events scheduled.</p>
              ) : (
                events.map((evt) => (
                  <div key={evt._id} className={inner}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-lg font-bold">{evt.title}</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          📍 {evt.venue} &middot; 🗓️ {new Date(evt.date).toLocaleDateString()}
                          {evt.targetAudience !== 'all' && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-slate-200 dark:bg-slate-700 px-2.5 py-0.5 text-xs font-medium text-slate-800 dark:text-slate-200">
                              Dept: {evt.targetAudience.toUpperCase()}
                            </span>
                          )}
                        </p>
                        {evt.description && (
                          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{evt.description}</p>
                        )}
                        {evt.fileUrl && (
                          <a href={`${API_BASE_URL}${evt.fileUrl}`} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-blue-500 hover:underline">
                            📎 View Attachment
                          </a>
                        )}
                      </div>
                      <button onClick={() => handleDeleteEvent(evt._id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition" title="Delete Event">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
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
                  <p className="font-semibold">Board of Governors Meeting</p>
                  <span className="text-xs text-slate-400">1 hour ago</span>
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Emergency meeting scheduled for next Monday regarding the new academic policy changes.</p>
              </div>
              <div className={inner}>
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Accreditation Audit Preparation</p>
                  <span className="text-xs text-slate-400">2 days ago</span>
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">All departments must submit their NAAC documentation by end of this month.</p>
              </div>
              <div className={inner}>
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Infrastructure Upgrade Approved</p>
                  <span className="text-xs text-slate-400">5 days ago</span>
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">New smart classrooms and AI labs approved for CSE and ECE departments. Work begins next quarter.</p>
              </div>
            </div>
          </div>
        </>
      )}
    </MainLayout>
  );
}
