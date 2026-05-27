import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function TenantEntry() {
  const [tenantSlug, setTenantSlug] = useState("");
  const navigate = useNavigate();

  const proceed = (target: "login" | "signup") => {
    const slug = tenantSlug.trim().toLowerCase();
    if (!slug) return;
    navigate(`/t/${slug}/${target}`);
  };

  return (
    <div className="min-h-screen grid place-items-center bg-[#090f1e] px-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-8 text-slate-100 backdrop-blur">
        <h1 className="text-2xl font-bold">Enter your institution</h1>
        <p className="mt-2 text-slate-300">Use your tenant slug to continue.</p>
        <input
          value={tenantSlug}
          onChange={(e) => setTenantSlug(e.target.value)}
          placeholder="e.g. rgipt"
          className="mt-6 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 outline-none focus:border-cyan-300"
        />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => proceed("login")}
            disabled={!tenantSlug.trim()}
            className="rounded-xl bg-cyan-400 py-3 font-bold text-slate-950 disabled:opacity-50"
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
          className="mt-3 w-full rounded-xl border border-cyan-300/40 py-3 font-semibold text-cyan-200"
        >
          Super Admin Setup
        </button>
      </div>
    </div>
  );
}
