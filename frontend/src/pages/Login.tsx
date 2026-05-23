import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Mail } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/ThemeToggle";

type Role = "student" | "faculty" | "hod" | "principal";

const initialRoleCredentials: Record<Role, { email: string; password: string }> = {
  student: { email: "", password: "" },
  faculty: { email: "", password: "" },
  hod: { email: "", password: "" },
  principal: { email: "principal@demo.com", password: "principal123" },
};

const roleColors: Record<Role, string> = {
  student: "from-[#2563EB] to-[#1E3A8A]",
  faculty: "from-[#10B981] to-[#047857]",
  hod: "from-[#0D9488] to-[#0F766E]",
  principal: "from-[#8B5CF6] to-[#5B21B6]",
};

export default function Login() {
  const [role, setRoleState] = useState<Role>("student");
  const [hodBranch, setHodBranch] = useState("cse");

  const [email, setEmail] = useState(initialRoleCredentials.student.email);
  const [password, setPassword] = useState(initialRoleCredentials.student.password);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRoleChange = (selectedRole: Role) => {
    setRoleState(selectedRole);
    setEmail(initialRoleCredentials[selectedRole].email);
    setPassword(initialRoleCredentials[selectedRole].password);
  };

  const handleGoogleLogin = async () => {
    alert("Google login is disabled. Use email/password with backend auth.");
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await login({ email, password, selectedRole: role });

      if (role === "hod") {
        localStorage.setItem("hodBranch", hodBranch);
      }

      navigate(`/${role}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      alert(message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#0B1121] p-4 font-sans transition-colors duration-300">
      <div className="flex w-full max-w-[1000px] flex-col overflow-hidden rounded-[2rem] bg-white dark:bg-[#111827] shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] md:flex-row border border-slate-200 dark:border-white/5">
        <div className={`relative flex w-full flex-col items-center justify-between bg-gradient-to-br ${roleColors[role]} p-8 transition-all duration-700 md:w-5/12`}>
          <div className="absolute top-4 right-4">
            <ThemeToggle />
          </div>

          <div className="mt-4 flex flex-col items-center justify-center">
            <img src="/logo.jpg" alt="Logo" className="h-20 w-20 object-contain" />
            <span className="mt-3 font-display text-2xl font-black text-white tracking-wide">AI Classroom</span>
          </div>

          <div className="relative z-10 my-6 flex w-full max-w-[280px] flex-col items-center rounded-2xl bg-white/10 backdrop-blur-md p-6 text-center shadow-2xl transition-transform duration-500 hover:scale-105 border border-white/20">
            <div className="mb-4 flex h-[70px] w-[70px] items-center justify-center rounded-full bg-white/20 text-3xl shadow-inner border border-white/30">
              {role === "student" && "S"}
              {role === "faculty" && "F"}
              {role === "hod" && "H"}
              {role === "principal" && "P"}
            </div>
            <h3 className="text-xl font-bold text-white capitalize">{role}</h3>
            <p className="mt-3 text-sm text-white/90 leading-relaxed">
              {role === "principal"
                ? "Principal login is frontend demo-only for now."
                : "Login uses backend API and real database authentication."}
            </p>
          </div>
        </div>

        <div className="relative w-full bg-white dark:bg-[#111827] p-8 md:w-7/12 flex flex-col justify-center transition-colors duration-300">
          <button onClick={() => navigate("/")} className="absolute right-6 top-6 text-slate-400 hover:text-slate-800 dark:hover:text-white transition">X</button>

          <h2 className="text-center font-display text-3xl font-black text-slate-900 dark:text-white transition-colors">Sign In to Continue</h2>
          <p className="mt-2 text-center text-sm font-medium text-slate-500 dark:text-slate-400 transition-colors">Choose role and login</p>

          <div className="mx-auto mt-6 w-full max-w-[420px]">
            <button onClick={handleGoogleLogin} className="flex w-full items-center justify-center gap-3 rounded-lg bg-slate-100 dark:bg-[#1F2937] py-2.5 font-semibold text-slate-800 dark:text-white transition hover:bg-slate-200 dark:hover:bg-[#374151] border border-slate-200 dark:border-slate-700">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-white">
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="h-4 w-4" />
              </div>
              Sign in with Google
            </button>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700"></div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Or Continue With</span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700"></div>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-3">
              {(["student", "faculty", "hod", "principal"] as Role[]).map((r) => (
                <div
                  key={r}
                  onClick={() => handleRoleChange(r)}
                  className={`cursor-pointer rounded-lg border p-2 flex items-center gap-3 transition-all duration-300 ${
                    role === r
                      ? "border-[#2563EB] bg-[#2563EB]/10 shadow-[0_0_15px_rgba(37,99,235,0.15)] scale-[1.02]"
                      : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1F2937] hover:border-slate-300 dark:hover:border-slate-500"
                  }`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg transition-colors ${role === r ? "bg-[#2563EB] text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}>
                    {r[0].toUpperCase()}
                  </div>
                  <p className={`text-sm font-bold capitalize transition-colors ${role === r ? "text-[#2563EB]" : "text-slate-600 dark:text-slate-300"}`}>{r}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-4">
              {role === "hod" && (
                <select
                  value={hodBranch}
                  onChange={(e) => setHodBranch(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1F2937] p-3 text-slate-900 dark:text-white outline-none focus:border-[#2563EB] dark:focus:border-[#2563EB] transition"
                >
                  <option value="cse">CSE Department</option>
                  <option value="ece">ECE Department</option>
                  <option value="eee">EEE Department</option>
                  <option value="mech">MECH Department</option>
                </select>
              )}

              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1F2937] px-4 py-3 pr-10 text-slate-900 dark:text-white outline-none focus:border-[#2563EB] dark:focus:border-[#2563EB] transition"
                />
                <Mail size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1F2937] px-4 py-3 pr-10 text-slate-900 dark:text-white outline-none focus:border-[#2563EB] dark:focus:border-[#2563EB] transition"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <button type="submit" className="mt-2 w-full rounded-lg bg-[#2563EB] py-3.5 font-bold text-white transition hover:bg-blue-700 hover:shadow-[0_0_20px_rgba(37,99,235,0.3)]">
                Login
              </button>
            </form>

            <div className="mt-6">
              <Link to="/signup" className="flex w-full items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1F2937] py-3.5 font-semibold text-slate-900 dark:text-white transition hover:bg-slate-100 dark:hover:bg-slate-800">
                Do not have an Account? <span className="ml-1 text-[#2563EB]">Sign Up</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
