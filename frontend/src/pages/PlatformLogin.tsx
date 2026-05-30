import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { platformApi } from "../services/api";
import logo from "../assets/logo.png";



const PLATFORM_TOKEN_KEY = "platformSuperAdminToken";

export default function PlatformLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await platformApi.login({ email, password });
      localStorage.setItem(PLATFORM_TOKEN_KEY, res.token);
      navigate("/platform/institutions");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1020] p-4 text-slate-100">
      <div className="mx-auto w-full max-w-md pt-10">
      <div className="mb-4 w-full rounded-2xl border border-white/10 bg-black/25 px-5 py-3">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-100">
            {/* <img src="/logo.jpg" alt="Logo" className="h-8 w-8 rounded-md bg-white p-0.5 object-contain" /> */}
            <img
  src={logo}
  alt="AI Classroom"
  className="w-10 h-10 rounded-lg bg-white p-1 object-contain"
/>
            <span className="font-semibold">AI Classroom</span>
          </Link>
          <button type="button" onClick={() => navigate(-1)} className="rounded-lg border border-white/20 px-3 py-1.5 text-sm">Back</button>
        </div>
      </div>
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-bold">Platform Admin Login</h1>
        <p className="text-slate-300 mt-1">Login as super admin</p>
        <input className="mt-5 w-full rounded-xl border border-white/15 bg-black/20 p-3" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <input type="password" className="mt-3 w-full rounded-xl border border-white/15 bg-black/20 p-3" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} />
        {error ? <p className="text-rose-300 text-sm mt-3">{error}</p> : null}
        <button disabled={loading} className="mt-4 w-full rounded-xl bg-cyan-400 text-slate-950 font-bold py-3">{loading ? "Signing in..." : "Sign in"}</button>
      </form>
      </div>
    </div>
  );
}

