import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../services/api";

type TenantInfo = {
  id: string;
  name: string;
  slug: string;
  status: string;
  authMode: "email_domain" | "roster_based";
  domains: string[];
};

const roleRouteMap: Record<string, string> = {
  student: "student",
  faculty: "faculty",
  hod: "hod",
  institution_admin: "admin",
};

export default function Login() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const init = async () => {
      if (!tenantSlug) {
        setError("Institution slug is missing. Please select institution again.");
        setPageLoading(false);
        return;
      }
      setPageLoading(true);
      setError("");
      try {
        const response = await authApi.tenantHealth(tenantSlug);
        setTenant(response.tenant);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to resolve institution");
      } finally {
        setPageLoading(false);
      }
    };

    init();
  }, [tenantSlug]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantSlug) return;
    setLoading(true);
    setError("");
    try {
      const response = await login({ tenantSlug, email, password });
      const route = roleRouteMap[response.role] || "student";
      navigate(`/t/${tenantSlug}/${route}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return <div className="min-h-screen grid place-items-center text-slate-200 bg-[#0b1020]">Loading institution...</div>;
  }

  if (!tenantSlug || !tenant) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#0b1020] px-4">
        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-6 text-rose-100">{error || "Institution not found"}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,#172554,#0b1020_45%,#030712)] text-slate-100 p-4 md:p-8">
      <div className="mx-auto mb-4 flex max-w-5xl items-center justify-between rounded-2xl border border-white/10 bg-black/25 px-5 py-3">
        <Link to="/" className="flex items-center gap-2 text-slate-100">
          <img src="/logo.jpg" alt="Logo" className="h-8 w-8 rounded-md bg-white p-0.5 object-contain" />
          <span className="font-semibold">AI Classroom</span>
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="rounded-lg border border-white/20 px-3 py-1.5 text-sm">Back</button>
        </div>
      </div>
      <div className="mx-auto max-w-5xl rounded-3xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
        <div className="grid md:grid-cols-[1.1fr_1.3fr]">
          <aside className="p-8 md:p-10 bg-gradient-to-b from-cyan-500/20 to-transparent">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">Tenant Access</div>
              <ThemeToggle />
            </div>
            <h1 className="mt-8 text-3xl font-black">{tenant.name}</h1>
            <p className="mt-2 text-cyan-100/80">
              {tenant.authMode === "roster_based"
                ? "Sign in with your institute-registered email account."
                : "Sign in with your institutional domain email account."}
            </p>
            <div className="mt-8 rounded-xl border border-white/15 p-4 text-sm text-cyan-100/90">
              <div>Tenant: {tenant.slug}</div>
              <div>Status: {tenant.status}</div>
            </div>
          </aside>

          <main className="p-8 md:p-10">
            <h2 className="text-2xl font-bold">Welcome back</h2>
            <p className="text-slate-300 mt-1">Enter your email and password to continue.</p>

            <form onSubmit={handleLogin} className="mt-8 space-y-4">
              <div>
                <label className="text-sm text-slate-300">
                  {tenant.authMode === "roster_based"
                    ? "Institute-registered email"
                    : "Institution domain email"}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 outline-none focus:border-cyan-300"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300">Password</label>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 pr-11 outline-none focus:border-cyan-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              {error ? <p className="text-sm text-rose-300">{error}</p> : null}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-cyan-400 text-slate-950 font-bold py-3 hover:bg-cyan-300 disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <p className="mt-6 text-sm text-slate-300">
              New here?{" "}
              <Link to={`/t/${tenantSlug}/signup`} className="text-cyan-300 font-semibold">
                Request account access
              </Link>
            </p>
          </main>
        </div>
      </div>
    </div>
  );
}
