import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../services/api";

export type TimetableRow = {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subject: string;
  room: string;
  facultyEmail: string;
  department: string;
  semester: string;
};

export default function TimetableUploader() {
  const { token, tenantSlug } = useAuth();
  const [data, setData] = useState<TimetableRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/t/${tenantSlug}/timetable/my-schedule`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const result = await response.json();
        if (result.success && result.schedule) {
          const parsed: TimetableRow[] = result.schedule.map((row: any) => ({
            dayOfWeek: row.dayOfWeek || "",
            startTime: row.startTime || "",
            endTime: row.endTime || "",
            subject: row.subject || "",
            room: row.room || "",
            facultyEmail: row.facultyId?.email || "",
            department: row.department || "",
            semester: row.semester || "",
          }));
          setData(parsed);
        }
      } catch (err) {
        console.error("Failed to fetch existing timetable", err);
      }
    };
    if (token && tenantSlug) fetchTimetable();
  }, [token, tenantSlug]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const json = XLSX.utils.sheet_to_json<any>(ws);

        // Map to our expected format
        const parsed: TimetableRow[] = json.map((row: any) => ({
          dayOfWeek: row.Day || row.dayOfWeek || "",
          startTime: row["Start Time"] || row.startTime || "",
          endTime: row["End Time"] || row.endTime || "",
          subject: row.Subject || row.subject || "",
          room: row.Room || row.room || "",
          facultyEmail: row["Teacher Email"] || row.facultyEmail || "",
          department: row.Department || row.department || "",
          semester: row.Semester || row["Semester/Year"] || row.semester || "",
        }));

        setData(parsed);
        setError(null);
        setSuccess(null);
      } catch (err) {
        setError("Failed to parse file. Ensure it's a valid Excel or CSV.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleCellEdit = (index: number, field: keyof TimetableRow, value: string) => {
    const updated = [...data];
    updated[index][field] = value;
    setData(updated);
  };

  const removeRow = (index: number) => {
    const updated = [...data];
    updated.splice(index, 1);
    setData(updated);
  };

  const addRow = () => {
    setData([...data, {
      dayOfWeek: "Monday", startTime: "", endTime: "", subject: "",
      room: "", facultyEmail: "", department: "", semester: ""
    }]);
  };

  const handleSave = async () => {
    if (data.length === 0) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_BASE_URL}/t/${tenantSlug}/timetable/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ timetableData: data })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Failed to save timetable.");
      }

      setSuccess(result.message);
      // We don't clear data so it remains visible and editable!
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200/60 bg-white/90 p-6 shadow-card backdrop-blur-xl dark:border-blue-500/10 dark:bg-[#0C1330]">
      <h2 className="mb-4 text-xl font-black text-slate-900 dark:text-white font-display">
        Upload Timetable
      </h2>
      
      {!data.length ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-10 dark:border-blue-500/20 dark:bg-[#111B44]">
          <span className="text-4xl mb-4">📁</span>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400 text-center max-w-md">
            Upload an Excel (.xlsx) or CSV file with the following columns:<br/>
            <b className="text-slate-700 dark:text-slate-300">Day, Start Time, End Time, Subject, Room, Teacher Email, Department, Semester</b>
          </p>
          <label className="cursor-pointer rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 px-6 py-3 font-bold text-navy-950 shadow-md shadow-gold-500/30 transition hover:brightness-110">
            Select File
            <input type="file" accept=".xlsx, .csv" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      ) : (
        <div>
          <div className="mb-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="font-semibold text-slate-600 dark:text-slate-300">
              Timetable Data ({data.length} classes)
            </p>
            <div className="flex flex-wrap gap-2">
              <label className="cursor-pointer rounded-lg bg-blue-100 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-200 dark:bg-blue-500/20 dark:text-blue-300">
                Import Excel
                <input type="file" accept=".xlsx, .csv" className="hidden" onChange={handleFileUpload} />
              </label>
              <button onClick={addRow} className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300">
                + Add Row
              </button>
              <button onClick={() => setData([])} className="rounded-lg bg-rose-100 px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-200 dark:bg-rose-500/20 dark:text-rose-300">
                Clear All
              </button>
              <button onClick={handleSave} disabled={loading} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-600 disabled:opacity-50">
                {loading ? "Saving..." : "Confirm & Save"}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 dark:bg-white/5">
                <tr>
                  <th className="p-3 text-left">Day</th>
                  <th className="p-3 text-left">Time</th>
                  <th className="p-3 text-left">Subject</th>
                  <th className="p-3 text-left">Room</th>
                  <th className="p-3 text-left">Teacher Email</th>
                  <th className="p-3 text-left">Dept/Sem</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={idx} className="border-t border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="p-2">
                      <select value={row.dayOfWeek} onChange={(e) => handleCellEdit(idx, "dayOfWeek", e.target.value)} className="w-full bg-transparent p-1 outline-none">
                        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(d => <option key={d}>{d}</option>)}
                      </select>
                    </td>
                    <td className="p-2 flex gap-1">
                      <input type="text" value={row.startTime} onChange={(e) => handleCellEdit(idx, "startTime", e.target.value)} className="w-20 bg-transparent border-b border-slate-300 p-1 outline-none dark:border-slate-600" placeholder="Start" />
                      <span>-</span>
                      <input type="text" value={row.endTime} onChange={(e) => handleCellEdit(idx, "endTime", e.target.value)} className="w-20 bg-transparent border-b border-slate-300 p-1 outline-none dark:border-slate-600" placeholder="End" />
                    </td>
                    <td className="p-2">
                      <input type="text" value={row.subject} onChange={(e) => handleCellEdit(idx, "subject", e.target.value)} className="w-full bg-transparent border-b border-slate-300 p-1 outline-none dark:border-slate-600" />
                    </td>
                    <td className="p-2">
                      <input type="text" value={row.room} onChange={(e) => handleCellEdit(idx, "room", e.target.value)} className="w-full bg-transparent border-b border-slate-300 p-1 outline-none dark:border-slate-600" />
                    </td>
                    <td className="p-2">
                      <input type="email" value={row.facultyEmail} onChange={(e) => handleCellEdit(idx, "facultyEmail", e.target.value)} className="w-full bg-transparent border-b border-slate-300 p-1 outline-none dark:border-slate-600" />
                    </td>
                    <td className="p-2">
                      <div className="flex gap-1 flex-col">
                        <input type="text" value={row.department} onChange={(e) => handleCellEdit(idx, "department", e.target.value)} className="w-full bg-transparent border-b border-slate-300 p-1 outline-none text-xs dark:border-slate-600" placeholder="Dept" />
                        <input type="text" value={row.semester} onChange={(e) => handleCellEdit(idx, "semester", e.target.value)} className="w-full bg-transparent border-b border-slate-300 p-1 outline-none text-xs dark:border-slate-600" placeholder="Sem" />
                      </div>
                    </td>
                    <td className="p-2 text-center">
                      <button onClick={() => removeRow(idx)} className="text-rose-500 hover:text-rose-600 font-bold">X</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error && <p className="mt-4 text-sm font-bold text-rose-500">{error}</p>}
      {success && <p className="mt-4 text-sm font-bold text-emerald-500">{success}</p>}
    </div>
  );
}
