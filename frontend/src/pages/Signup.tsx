import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import { authApi } from "../services/api";
import { useAuth } from "../context/AuthContext";

type TenantInfo = {
  id: string;
  name: string;
  slug: string;
  status: string;
  authMode: "email_domain" | "roster_based";
  domains: string[];
};

type Role = "student" | "faculty" | "hod";
type Step = 1 | 2 | 3 | 4;

const roleCards: Array<{ role: Role; title: string; desc: string }> = [
  { role: "student", title: "Student", desc: "Join classes, take tests, and track progress." },
  { role: "faculty", title: "Faculty", desc: "Create exams and monitor class performance." },
  { role: "hod", title: "HOD", desc: "Manage departmental outcomes and oversight." },
];

export default function Signup() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
  const { signupRequest } = useAuth();

  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [enrollmentNumber, setEnrollmentNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [devPassword, setDevPassword] = useState<string | null>(null);

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

  const canStep2 = Boolean(role);
  const canStep3 = name.trim().length >= 2 && email.includes("@") && department.trim().length >= 2;
  const needsEnrollment = role === "student";
  const emailFieldLabel =
    tenant?.authMode === "roster_based" ? "Institute-registered email" : "Institution domain email";
  const emailFieldHint =
    tenant?.authMode === "roster_based"
      ? "Use the email that your institute has registered for you (can be personal email)."
      : "Use your institutional domain email ID.";
  const canSubmit = useMemo(() => {
    if (!canStep3 || !role) return false;
    if (needsEnrollment && enrollmentNumber.trim().length < 2) return false;
    return true;
  }, [canStep3, enrollmentNumber, needsEnrollment, role]);

  const handleSubmit = async () => {
    if (!tenantSlug || !role || !canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await signupRequest({
        tenantSlug,
        role,
        name: name.trim(),
        email: email.trim(),
        department: department.trim(),
        enrollmentNumber: needsEnrollment ? enrollmentNumber.trim() : undefined,
      });
      setSuccessMessage(response.message);
      setDevPassword(response.devGeneratedPassword || null);
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup request failed");
    } finally {
      setSubmitting(false);
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,#164e63,#0f172a_45%,#020617)] text-slate-100 p-4 md:p-8">
      <div className="mx-auto mb-4 flex max-w-5xl items-center justify-between rounded-2xl border border-white/10 bg-black/25 px-5 py-3">
        <Link to="/" className="flex items-center gap-2 text-slate-100">
          <img src="/logo.jpg" alt="Logo" className="h-8 w-8 rounded-md bg-white p-0.5 object-contain" />
          <span className="font-semibold">AI Classroom</span>
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="rounded-lg border border-white/20 px-3 py-1.5 text-sm">Back</button>
          <Link to="/tenant-access" className="rounded-lg border border-cyan-300/40 px-3 py-1.5 text-sm text-cyan-200">Institution Choice</Link>
        </div>
      </div>
      <div className="mx-auto max-w-5xl rounded-3xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
        <div className="grid md:grid-cols-[1fr_1.4fr]">
          <aside className="p-8 md:p-10 bg-gradient-to-b from-emerald-500/20 to-transparent">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.2em] text-emerald-300">Guided Signup</div>
              <ThemeToggle />
            </div>
            <h1 className="mt-8 text-3xl font-black">{tenant.name}</h1>
            <p className="mt-2 text-emerald-100/80">Answer a few questions and we will set up access.</p>
            <div className="mt-8 flex gap-2">
              {[1, 2, 3, 4].map((dot) => (
                <span
                  key={dot}
                  className={`h-2.5 w-9 rounded-full ${step >= dot ? "bg-emerald-300" : "bg-white/20"}`}
                />
              ))}
            </div>
          </aside>

          <main className="p-8 md:p-10">
            {step === 1 ? (
              <>
                <h2 className="text-2xl font-bold">Who are you?</h2>
                <p className="text-slate-300 mt-1">Select your role to continue.</p>
                <div className="mt-6 grid gap-3">
                  {roleCards.map((item) => (
                    <button
                      key={item.role}
                      onClick={() => setRole(item.role)}
                      className={`rounded-xl border p-4 text-left transition ${
                        role === item.role
                          ? "border-emerald-300 bg-emerald-400/15"
                          : "border-white/15 bg-black/20 hover:border-emerald-300/50"
                      }`}
                    >
                      <div className="font-semibold">{item.title}</div>
                      <div className="text-sm text-slate-300">{item.desc}</div>
                    </button>
                  ))}
                </div>
                <button
                  disabled={!canStep2}
                  onClick={() => setStep(2)}
                  className="mt-6 w-full rounded-xl bg-emerald-400 text-slate-950 font-bold py-3 disabled:opacity-50"
                >
                  Continue
                </button>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <h2 className="text-2xl font-bold">Basic details</h2>
                <p className="text-slate-300 mt-1">{emailFieldHint}</p>
                <div className="mt-6 space-y-4">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                    className="w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 outline-none focus:border-emerald-300"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={emailFieldLabel}
                    className="w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 outline-none focus:border-emerald-300"
                  />
                  <input
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Department (e.g. CSE)"
                    className="w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 outline-none focus:border-emerald-300"
                  />
                </div>
                <div className="mt-6 flex gap-3">
                  <button onClick={() => setStep(1)} className="flex-1 rounded-xl border border-white/20 py-3">
                    Back
                  </button>
                  <button
                    disabled={!canStep3}
                    onClick={() => setStep(3)}
                    className="flex-1 rounded-xl bg-emerald-400 text-slate-950 font-bold py-3 disabled:opacity-50"
                  >
                    Continue
                  </button>
                </div>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <h2 className="text-2xl font-bold">Final checks</h2>
                <p className="text-slate-300 mt-1">Only details required for your role are asked.</p>
                <div className="mt-6 space-y-4 rounded-xl border border-white/15 bg-black/20 p-4">
                  <div className="text-sm">Role: <span className="font-semibold capitalize">{role}</span></div>
                  <div className="text-sm">Name: <span className="font-semibold">{name}</span></div>
                  <div className="text-sm">Email: <span className="font-semibold">{email}</span></div>
                  <div className="text-sm">Department: <span className="font-semibold">{department}</span></div>
                  {needsEnrollment ? (
                    <input
                      value={enrollmentNumber}
                      onChange={(e) => setEnrollmentNumber(e.target.value)}
                      placeholder="Enrollment number"
                      className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 outline-none focus:border-emerald-300"
                    />
                  ) : (
                    <div className="text-sm text-slate-300">Enrollment number is not required for this role.</div>
                  )}
                </div>
                {error ? <p className="text-sm text-rose-300 mt-3">{error}</p> : null}
                <div className="mt-6 flex gap-3">
                  <button onClick={() => setStep(2)} className="flex-1 rounded-xl border border-white/20 py-3">
                    Back
                  </button>
                  <button
                    disabled={!canSubmit || submitting}
                    onClick={handleSubmit}
                    className="flex-1 rounded-xl bg-emerald-400 text-slate-950 font-bold py-3 disabled:opacity-50"
                  >
                    {submitting ? "Requesting..." : "Request account"}
                  </button>
                </div>
              </>
            ) : null}

            {step === 4 ? (
              <>
                <h2 className="text-2xl font-bold">Request submitted</h2>
                <p className="text-slate-300 mt-1">{successMessage}</p>
                {devPassword ? (
                  <div className="mt-4 rounded-xl border border-amber-300/40 bg-amber-500/10 p-4 text-sm text-amber-100">
                    Dev password: <span className="font-bold">{devPassword}</span>
                  </div>
                ) : null}
                <div className="mt-6">
                  <button
                    onClick={() => navigate(`/t/${tenantSlug}/login`)}
                    className="w-full rounded-xl bg-emerald-400 text-slate-950 font-bold py-3"
                  >
                    Go to login
                  </button>
                </div>
              </>
            ) : null}

            <p className="mt-6 text-sm text-slate-300">
              Already have credentials?{" "}
              <Link to={`/t/${tenantSlug}/login`} className="text-emerald-300 font-semibold">
                Sign in
              </Link>
            </p>
          </main>
        </div>
      </div>
    </div>
  );
}
