import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { platformApi } from "../services/api";

const PLATFORM_TOKEN_KEY = "platformSuperAdminToken";

type Institution = {
  id: string;
  name: string;
  slug: string;
};

export default function PlatformInstitutions() {
  const token = useMemo(() => localStorage.getItem(PLATFORM_TOKEN_KEY), []);
  const navigate = useNavigate();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      navigate("/platform/login");
      return;
    }

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await platformApi.listInstitutions();
        setInstitutions(response.institutions || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load institutions");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [navigate, token]);

  return (
    <div className="min-h-screen bg-[#0b1020] p-4 text-slate-100">
      <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-slate-100">
            <img src="/logo.jpg" alt="Logo" className="h-8 w-8 rounded-md bg-white p-0.5 object-contain" />
            <span className="font-semibold">AI Classroom</span>
          </Link>
          <div className="flex gap-2">
            <button onClick={() => navigate("/platform/login")} className="rounded-lg border border-white/20 px-3 py-1.5 text-sm">
              Re-login
            </button>
            <button onClick={() => navigate("/platform/institutions/new")} className="rounded-lg bg-cyan-400 px-3 py-1.5 text-sm font-semibold text-slate-950">
              Add New Tenant
            </button>
          </div>
        </div>

        <h1 className="text-2xl font-bold">Registered Tenants</h1>
        <p className="mt-1 text-slate-300">All institutions created by super admin are listed here.</p>

        <div className="mt-5 rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="px-4 py-3 text-left">Institution Name</th>
                <th className="px-4 py-3 text-left">Slug</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-3 text-slate-300" colSpan={2}>Loading tenants...</td>
                </tr>
              ) : institutions.length === 0 ? (
                <tr>
                  <td className="px-4 py-3 text-slate-300" colSpan={2}>No tenants found.</td>
                </tr>
              ) : (
                institutions.map((institution) => (
                  <tr key={institution.id} className="border-t border-white/10">
                    <td className="px-4 py-3">{institution.name}</td>
                    <td className="px-4 py-3 text-cyan-200">{institution.slug}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
      </div>
    </div>
  );
}

