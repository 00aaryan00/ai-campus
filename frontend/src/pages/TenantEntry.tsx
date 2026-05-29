import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { platformApi } from "../services/api";

type InstitutionOption = {
  id: string;
  name: string;
  slug: string;
};

export default function TenantEntry() {
  const [tenantSlug, setTenantSlug] = useState("");
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    const loadInstitutions = async () => {
      try {
        const response = await platformApi.listInstitutions();
        if (!active) return;
        setInstitutions(response.institutions || []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load institutions");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadInstitutions();
    return () => {
      active = false;
    };
  }, []);

  const proceed = (target: "login" | "signup") => {
    const slug = tenantSlug.trim().toLowerCase();
    if (!slug) return;
    navigate(`/t/${slug}/${target}`);
  };

  return (
    <div className="min-h-screen grid place-items-center bg-navy-950 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-8 text-slate-100 backdrop-blur">
        <h1 className="text-2xl font-bold">Enter your institution</h1>
        <p className="mt-2 text-slate-300">Select your institution name to continue.</p>
        <select
          value={tenantSlug}
          onChange={(e) => setTenantSlug(e.target.value)}
          disabled={loading || institutions.length === 0}
          className="mt-6 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/50 transition-all"
        >
          <option value="" className="bg-navy-900 text-slate-100">
            {loading ? "Loading institutions..." : "Select institution"}
          </option>
          {institutions.map((institution) => (
            <option key={institution.id} value={institution.slug} className="bg-navy-900 text-slate-100">
              {institution.name} ({institution.slug})
            </option>
          ))}
        </select>
        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => proceed("login")}
            disabled={!tenantSlug.trim()}
            className="rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 py-3 font-bold text-white shadow-lg shadow-gold-500/25 transition disabled:opacity-50"
          >
            Go to Login
          </button>
          <button
            onClick={() => proceed("signup")}
            disabled={!tenantSlug.trim()}
            className="rounded-xl border border-white/20 py-3 font-semibold disabled:opacity-50"
          >
            Go to Signup
          </button>
        </div>
        <button
          onClick={() => navigate("/platform/login")}
          className="mt-3 w-full rounded-xl border border-gold-500/40 py-3 font-semibold text-gold-400 hover:bg-gold-500/10 transition"
        >
          Super Admin Setup
        </button>
      </div>
    </div>
  );
}
