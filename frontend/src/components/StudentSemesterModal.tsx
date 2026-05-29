import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../services/api";
import { authApi } from "../services/api"; // Will need to add an endpoint or fetch directly

export default function StudentSemesterModal() {
  const { user, token, tenantSlug, updateUser } = useAuth();
  const [semester, setSemester] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Only show if the user is a student and has NO semester
  if (!user || user.role !== "student" || user.semester) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!semester) {
      setError("Please select a semester.");
      return;
    }
    
    // Quick confirmation as requested by user
    if (!window.confirm(`Are you sure you want to select ${semester}? This cannot be easily changed later. Choose carefully.`)) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Remove /api prefix since API_BASE_URL already contains it
      const response = await fetch(`${API_BASE_URL}/t/${tenantSlug}/auth/semester`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ semester })
      });

      let data: any = {};
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      }
      
      if (!response.ok) {
        throw new Error(data.message || `Server error: ${response.status} ${response.statusText}`);
      }

      updateUser({ semester: data.user.semester });
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const semesters = [
    "Semester 1", "Semester 2", "Semester 3", "Semester 4", 
    "Semester 5", "Semester 6", "Semester 7", "Semester 8"
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-navy-950 p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-black text-white font-display mb-2">Welcome to AI Classroom</h2>
          <p className="text-sm text-slate-300">
            Before you can access your dashboard and class schedule, please tell us which semester you are currently in.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              Select Your Semester <span className="text-rose-500">*</span>
            </label>
            <select
              value={semester}
              onChange={(e) => {
                setSemester(e.target.value);
                setError("");
              }}
              className="w-full rounded-xl border border-white/20 bg-black/40 p-3 text-slate-100 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30"
              required
            >
              <option value="" disabled>-- Choose Carefully --</option>
              {semesters.map((s, idx) => (
                <option key={s} value={(idx + 1).toString()}>{s}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-rose-400 font-semibold">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 py-3 font-bold text-navy-950 shadow-lg shadow-gold-500/30 transition hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Confirm My Semester"}
          </button>
        </form>
      </div>
    </div>
  );
}
