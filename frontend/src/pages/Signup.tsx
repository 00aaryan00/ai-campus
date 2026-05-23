import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

import ThemeToggle from "../components/ThemeToggle";
import { useAuth } from "../context/AuthContext";

type SignupRole = "student" | "faculty" | "hod" | "principal";

const roles = [
  {
    key: "student" as SignupRole,
    title: "Candidate/Student",
    desc: "Explore courses, track progress, and complete AI assessments for your future.",
    icon: "S",
  },
  {
    key: "faculty" as SignupRole,
    title: "Faculty",
    desc: "Organise classes, manage assessments and track student progress.",
    icon: "F",
  },
  {
    key: "hod" as SignupRole,
    title: "HOD",
    desc: "Oversee department performance, manage leaves and schedules.",
    icon: "H",
  },
  {
    key: "principal" as SignupRole,
    title: "Principal",
    desc: "Principal access is frontend demo-only for now.",
    icon: "P",
  },
];

const roleColors: Record<SignupRole, string> = {
  student: "from-[#2563EB] to-[#1E3A8A]",
  faculty: "from-[#10B981] to-[#047857]",
  hod: "from-[#0D9488] to-[#0F766E]",
  principal: "from-[#8B5CF6] to-[#5B21B6]",
};

export default function Signup() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [step, setStep] = useState<"role" | "form">("role");
  const [selectedRole, setSelectedRole] = useState<SignupRole>("student");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [department, setDepartment] = useState("cse");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    if (selectedRole === "principal") {
      alert("Principal registration is not available in backend yet. Use principal demo login.");
      navigate("/login");
      return;
    }

    try {
      await register({
        name,
        email,
        password,
        role: selectedRole,
        department,
      });

      if (selectedRole === "hod") {
        localStorage.setItem("hodBranch", department);
      }

      alert(`${selectedRole.toUpperCase()} account created successfully!`);
      navigate(`/${selectedRole}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registration failed";
      alert(message);
    }
  };

  const currentRoleData = roles.find((r) => r.key === selectedRole) || roles[0];

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#0B1121] p-4 font-sans transition-colors duration-300">
      <div className="flex w-full max-w-[1000px] flex-col overflow-hidden rounded-[2rem] bg-white dark:bg-[#111827] shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] md:flex-row border border-slate-200 dark:border-white/5">
        <div className={`relative flex w-full flex-col items-center justify-between bg-gradient-to-br ${roleColors[selectedRole]} p-8 transition-all duration-700 md:w-5/12`}>
          <div className="absolute top-4 right-4">
            <ThemeToggle />
          </div>
          <div className="mt-4 flex flex-col items-center justify-center">
            <img src="/logo.jpg" alt="Logo" className="h-20 w-20 object-contain" />
            <span className="mt-3 font-display text-2xl font-black text-white tracking-wide">AI Classroom</span>
          </div>
          <div className="relative z-10 my-6 flex w-full max-w-[280px] flex-col items-center rounded-2xl bg-white/10 backdrop-blur-md p-6 text-center shadow-2xl transition-transform duration-500 hover:scale-105 border border-white/20">
            <div className="mb-4 flex h-[70px] w-[70px] items-center justify-center rounded-full bg-white/20 text-3xl shadow-inner border border-white/30">
              {currentRoleData.icon}
            </div>
            <h3 className="text-xl font-bold text-white">{currentRoleData.title}</h3>
            <p className="mt-3 text-sm text-white/90 leading-relaxed">{currentRoleData.desc}</p>
          </div>
        </div>

        <div className="relative w-full bg-white dark:bg-[#111827] p-8 md:w-7/12 flex flex-col justify-center transition-colors duration-300">
          <button onClick={() => (step === "form" ? setStep("role") : navigate("/"))} className="absolute left-6 top-6 text-slate-400 hover:text-slate-800 dark:hover:text-white transition font-medium">
            {step === "form" ? "Back" : "Home"}
          </button>

          {step === "role" ? (
            <div className="mx-auto w-full max-w-[420px]">
              <h2 className="text-center font-display text-3xl font-black text-slate-900 dark:text-white">Register</h2>
              <p className="mt-2 text-center text-sm font-medium text-slate-500 dark:text-slate-400">Select your role</p>

              <div className="mt-6 flex flex-col gap-3">
                {roles.map((role) => (
                  <button
                    key={role.key}
                    onClick={() => {
                      setSelectedRole(role.key);
                      setStep("form");
                    }}
                    className="flex w-full items-center gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1F2937] p-4 text-left transition hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-2xl text-slate-600 dark:text-slate-300">{role.icon}</div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">{role.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{role.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-6">
                <Link to="/login" className="flex w-full items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1F2937] py-3.5 font-semibold text-slate-900 dark:text-white transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-500">
                  Already have an account? <span className="ml-1 text-[#2563EB]">Sign In</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-[420px]">
              <h2 className="text-center font-display text-3xl font-black text-slate-900 dark:text-white">Create Account</h2>
              <p className="mt-2 text-center text-sm font-medium text-slate-500 dark:text-slate-400">Register as <span className="text-[#2563EB] font-bold">{selectedRole.toUpperCase()}</span></p>

              <form onSubmit={handleRegister} className="mt-6 space-y-4">
                <input type="text" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1F2937] px-4 py-3 text-slate-900 dark:text-white outline-none focus:border-[#2563EB]" required />
                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1F2937] px-4 py-3 text-slate-900 dark:text-white outline-none focus:border-[#2563EB]" required />

                <select value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1F2937] p-3 text-slate-900 dark:text-white outline-none focus:border-[#2563EB]">
                  <option value="cse">CSE Department</option>
                  <option value="ece">ECE Department</option>
                  <option value="eee">EEE Department</option>
                  <option value="mech">MECH Department</option>
                </select>

                <div className="relative">
                  <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1F2937] px-4 py-3 pr-10 text-slate-900 dark:text-white outline-none focus:border-[#2563EB]" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>

                <div className="relative">
                  <input type={showConfirmPassword ? "text" : "password"} placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1F2937] px-4 py-3 pr-10 text-slate-900 dark:text-white outline-none focus:border-[#2563EB]" required />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition">{showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>

                <button type="submit" className="mt-4 w-full rounded-lg bg-[#2563EB] py-3.5 font-bold text-white transition hover:bg-blue-700">Register</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
