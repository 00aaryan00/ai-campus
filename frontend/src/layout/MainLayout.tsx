import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";
import { 
  LayoutDashboard, 
  BookOpen, 
  CheckCircle, 
  FileText, 
  FlaskConical, 
  TrendingUp, 
  Bell, 
  CalendarDays,
  Calendar,
  AlertTriangle 
} from "lucide-react";


type MainLayoutProps = {
  children: ReactNode;
};

const roleTabs = {
  student: [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { id: "classes", label: "Classes", icon: <BookOpen size={20} /> },
    { id: "attendance", label: "Attendance", icon: <CheckCircle size={20} /> },
    { id: "leave", label: "Leave Application", icon: <FileText size={20} /> },
    { id: "exams", label: "Exams", icon: <FlaskConical size={20} /> },
    { id: "performance", label: "Performance", icon: <TrendingUp size={20} /> },
    { id: "events", label: "Updates", icon: <Bell size={20} /> },
  ],
  faculty: [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { id: "classes", label: "Classes", icon: <BookOpen size={20} /> },
    { id: "leaves", label: "Leave Requests", icon: <FileText size={20} /> },
    { id: "attendance", label: "Attendance", icon: <CheckCircle size={20} /> },
    { id: "exams", label: "Create Exam", icon: <FlaskConical size={20} /> },
    { id: "performance", label: "Performance", icon: <TrendingUp size={20} /> },
    { id: "events", label: "Updates", icon: <Bell size={20} /> },
  ],
  hod: [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { id: "leaves", label: "Leave Monitoring", icon: <FileText size={20} /> },
    { id: "timetable", label: "Timetable", icon: <CalendarDays size={20} /> },
    { id: "performance", label: "Performance", icon: <TrendingUp size={20} /> },
    { id: "events", label: "Updates", icon: <Bell size={20} /> },
  ],
  principal: [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { id: "leaves", label: "Leave Overview", icon: <FileText size={20} /> },
    { id: "timetable", label: "Timetable Upload", icon: <CalendarDays size={20} /> },
    { id: "alerts", label: "Smart Alerts", icon: <AlertTriangle size={20} /> },
    { id: "performance", label: "Performance", icon: <TrendingUp size={20} /> },
    { id: "events", label: "Updates", icon: <Bell size={20} /> },
  ],
};

export default function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState((location.state as any)?.tab || "dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { logout } = useAuth();

  useEffect(() => {
    const handler = (e: any) => setUnreadCount(e.detail);
    window.addEventListener("updateUnreadCount", handler);
    return () => window.removeEventListener("updateUnreadCount", handler);
  }, []);

  const role = location.pathname.includes("faculty")
    ? "faculty"
    : location.pathname.includes("principal") || location.pathname.includes("admin")
    ? "principal"
    : location.pathname.includes("hod")
    ? "hod"
    : "student";

  const handleLogout = async () => {
    await logout();
    const parts = location.pathname.split("/").filter(Boolean);
    const routeTenant = parts[0] === "t" ? parts[1] : null;
    navigate(routeTenant ? `/t/${routeTenant}/login` : "/");
  };

  const changeTab = (tabId: string) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
    window.dispatchEvent(
      new CustomEvent(`${role}TabChange`, { detail: tabId })
    );

    const parts = location.pathname.split("/").filter(Boolean);
    const tenantSlug = parts[0] === "t" ? parts[1] : null;

    if (tenantSlug) {
      if (role === "student" && !location.pathname.match(/\/student\/?$/)) {
        navigate(`/t/${tenantSlug}/student`, { state: { tab: tabId } });
      } else if (role === "faculty" && !location.pathname.match(/\/faculty\/?$/)) {
        navigate(`/t/${tenantSlug}/faculty`, { state: { tab: tabId } });
      } else if (role === "hod" && !location.pathname.match(/\/hod\/?$/)) {
        navigate(`/t/${tenantSlug}/hod`, { state: { tab: tabId } });
      } else if (role === "principal" && !location.pathname.match(/\/admin\/?$/)) {
        navigate(`/t/${tenantSlug}/admin`, { state: { tab: tabId } });
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-[#020817] dark:text-white">
      <div className="flex min-h-screen">
        {/* ─── SIDEBAR (Desktop) ─── */}
        <aside className="sticky top-0 h-screen hidden w-[260px] flex-col justify-between border-r border-slate-200/60 bg-white/90 p-6 shadow-card backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#090b14]/95 lg:flex overflow-y-auto">
          <div>
            {/* Logo */}
            <div className="mb-4 flex items-center gap-3">
              <img src={logo} alt="Logo" className="h-14 w-14 bg-white rounded-lg p-0.5 object-contain" />
              <div>
                <h1 className="font-display text-2xl font-black">
                  <span className="text-gold-600 dark:text-[#6366f1]">AI</span>
                  <span className="text-slate-800 dark:text-white"> Classroom</span>
                </h1>
                <p className="text-sm text-slate-400">Intelligence System</p>
              </div>
            </div>

            {/* Nav Tabs */}
            <nav className="space-y-1">
              {roleTabs[role].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => changeTab(tab.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-base font-semibold transition-all duration-200
                    ${
                      activeTab === tab.id
                        ? "bg-gradient-to-r from-gold-50 to-gold-50/30 text-gold-700 shadow-sm dark:bg-[#6366f1]/15 dark:text-[#6366f1] dark:border dark:border-[#6366f1]/20 dark:from-transparent dark:to-transparent"
                        : "text-slate-600 hover:bg-gold-50 hover:text-slate-900 dark:text-[#94a3b8] dark:hover:bg-[#6366f1]/10 dark:hover:text-[#f1f5f9]"
                    }`}
                >
                  <span className="flex items-center justify-center w-6 h-6">{tab.icon}</span>
                  {tab.label}
                  {tab.id === 'events' && unreadCount > 0 && (
                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

        </aside>

        <main className="flex-1">
          

          {/* ─── MOBILE NAV BAR ─── */}
          <div className="border-b border-slate-200/60 bg-white/90 px-4 py-3 dark:border-white/5 dark:bg-[#111B44]/80 lg:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src="/logo.jpg" alt="Logo" className="h-10 w-10 bg-white rounded-lg p-0.5 object-contain" />
                <div>
                  <h1 className="text-xl font-black">
                    <span className="text-gold-600 dark:text-[#6366f1]">AI</span>
                    <span className="text-slate-800 dark:text-white"> Classroom</span>
                  </h1>
                  <p className="text-sm text-slate-400">Intelligence System</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-500 dark:bg-red-500/10 dark:text-red-400"
              >
                Logout
              </button>
            </div>

            {/* Mobile Tab Pills */}
            {mobileMenuOpen && (
              <div className="mt-3 flex flex-wrap gap-2">
                {roleTabs[role].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => changeTab(tab.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      activeTab === tab.id
                        ? "bg-gradient-to-r from-gold-600 to-gold-400 dark:from-blue-600 dark:to-blue-400 text-navy-900 shadow-sm"
                        : "bg-gold-50 dark:bg-blue-900/20 text-slate-600 dark:bg-blue-500/8 dark:text-blue-300"
                    }`}
                  >
                    {tab.icon} {tab.label}
                    {tab.id === 'events' && unreadCount > 0 && (
                      <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end items-center gap-4 px-4 pt-4 md:px-8 md:pt-6">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-500 transition hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
            >
              <span>🚪</span>
              Logout
            </button>
          </div>

          <section className="px-4 pb-8 pt-6 text-slate-900 dark:text-white md:px-8 md:pb-8 md:pt-8">
            {children}
          </section>
        </main>
      </div>
    </div>
  );
}
