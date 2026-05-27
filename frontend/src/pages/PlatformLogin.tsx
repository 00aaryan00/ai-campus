import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { platformApi } from "../services/api";

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
      navigate("/platform/institutions/new");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-[#0b1020] p-4 text-slate-100">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-bold">Platform Admin Login</h1>
        <p className="text-slate-300 mt-1">Login as super admin</p>
        <input className="mt-5 w-full rounded-xl border border-white/15 bg-black/20 p-3" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <input type="password" className="mt-3 w-full rounded-xl border border-white/15 bg-black/20 p-3" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} />
        {error ? <p className="text-rose-300 text-sm mt-3">{error}</p> : null}
        <button disabled={loading} className="mt-4 w-full rounded-xl bg-cyan-400 text-slate-950 font-bold py-3">{loading ? "Signing in..." : "Sign in"}</button>
      </form>
    </div>
  );
}

