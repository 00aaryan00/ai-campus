import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { platformApi } from "../services/api";

const PLATFORM_TOKEN_KEY = "platformSuperAdminToken";

export default function PlatformCreateInstitution() {
  const token = useMemo(() => localStorage.getItem(PLATFORM_TOKEN_KEY), []);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    slug: "",
    domains: "",
    authMode: "roster_based" as "email_domain" | "roster_based",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        navigate("/platform/login");
        return;
      }
      try {
        await platformApi.me(token);
      } catch {
        localStorage.removeItem(PLATFORM_TOKEN_KEY);
        navigate("/platform/login");
      } finally {
        setCheckingSession(false);
      }
    };
    verify();
  }, [navigate, token]);

  const set = (key: keyof typeof form, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Please login as super admin first.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await platformApi.createInstitution(token, {
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase(),
        domains: form.authMode === "email_domain" ? form.domains.split(",").map((d) => d.trim().toLowerCase()).filter(Boolean) : [],
        authMode: form.authMode,
        adminName: form.adminName.trim(),
        adminEmail: form.adminEmail.trim().toLowerCase(),
        adminPassword: form.adminPassword,
      });
      setSuccess(`Created ${res.institution.slug}. Institution admin: ${res.institutionAdmin.email}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return <div className="min-h-screen grid place-items-center bg-[#0b1020] text-slate-200">Checking session...</div>;
  }

  return (
    <div className="min-h-screen bg-[#0b1020] p-4 text-slate-100">
      <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm">
          <span className="text-slate-300">Platform Setup</span>
          <div className="flex gap-2">
            <button onClick={() => navigate("/platform/institutions")} className="rounded-md border border-white/20 px-2 py-1">Back</button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Create Institution</h1>
          <button className="text-cyan-300" onClick={() => navigate("/platform/login")}>Re-login</button>
        </div>
        <form onSubmit={submit} className="mt-5 grid gap-3">
          <input className="rounded-xl border border-white/15 bg-black/20 p-3" placeholder="Institution name" value={form.name} onChange={(e)=>set("name", e.target.value)} />
          <input className="rounded-xl border border-white/15 bg-black/20 p-3" placeholder="Slug (e.g. rgipt)" value={form.slug} onChange={(e)=>set("slug", e.target.value)} />
          <select className="rounded-xl border border-white/15 bg-black/20 p-3" value={form.authMode} onChange={(e)=>setForm((p)=>({...p, authMode: e.target.value as "email_domain"|"roster_based"}))}>
            <option value="roster_based">roster_based</option>
            <option value="email_domain">email_domain</option>
          </select>
          {form.authMode === "email_domain" && (
            <input className="rounded-xl border border-white/15 bg-black/20 p-3" placeholder="Domains comma-separated (e.g. rgipt.ac.in)" value={form.domains} onChange={(e)=>set("domains", e.target.value)} />
          )}
          <hr className="border-white/10 my-2" />
          <input className="rounded-xl border border-white/15 bg-black/20 p-3" placeholder="Institution admin name" value={form.adminName} onChange={(e)=>set("adminName", e.target.value)} />
          <input className="rounded-xl border border-white/15 bg-black/20 p-3" placeholder="Institution admin email" value={form.adminEmail} onChange={(e)=>set("adminEmail", e.target.value)} />
          <input className="rounded-xl border border-white/15 bg-black/20 p-3" placeholder="Institution admin password" value={form.adminPassword} onChange={(e)=>set("adminPassword", e.target.value)} />
          {error ? <p className="text-rose-300 text-sm">{error}</p> : null}
          {success ? <p className="text-emerald-300 text-sm">{success}</p> : null}
          <button disabled={loading} className="rounded-xl bg-cyan-400 py-3 text-slate-950 font-bold">
            {loading ? "Creating..." : "Create Institution"}
          </button>
        </form>
      </div>
    </div>
  );
}

