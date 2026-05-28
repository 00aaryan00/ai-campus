import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { authApi, tenantAdminApi } from "../services/api";
import { useAuth } from "../context/AuthContext";

type RosterEntry = {
  _id: string;
  email: string;
  name: string;
  role: "student" | "faculty" | "hod";
  department?: string;
  enrollmentNumber?: string;
  isActive: boolean;
};

type ManagedUser = {
  _id: string;
  name: string;
  email: string;
  role: "student" | "faculty" | "hod";
  department?: string;
  enrollmentNumber?: string | null;
  status: "invited" | "active" | "disabled";
};

type PreparedRosterRow = {
  email: string;
  name: string;
  role: "student" | "faculty" | "hod";
  department?: string;
  enrollmentNumber?: string;
  isActive?: boolean;
};

type RosterDraft = {
  name: string;
  role: "student" | "faculty" | "hod";
  department: string;
  enrollmentNumber: string;
  isActive: boolean;
};

const parseCsvLine = (line: string) => {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  out.push(current.trim());
  return out;
};

const normalizeHeaderKey = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

const getField = (row: Record<string, unknown>, aliases: string[]) => {
  const normalized: Record<string, unknown> = {};
  Object.keys(row).forEach((key) => {
    normalized[normalizeHeaderKey(key)] = row[key];
  });
  for (const alias of aliases) {
    const hit = normalized[normalizeHeaderKey(alias)];
    if (hit !== undefined && hit !== null && String(hit).trim() !== "") return String(hit).trim();
  }
  return "";
};

const normalizeRole = (value: string) => {
  const role = String(value || "").trim().toLowerCase();
  if (role === "teacher") return "faculty";
  return role;
};

const toPreparedRows = (rows: Array<Record<string, unknown>>) =>
  rows.map((row) => {
    const email = getField(row, ["email", "mail", "email_id"]).toLowerCase();
    const name = getField(row, ["name", "full_name", "student_name", "faculty_name"]);
    const role = normalizeRole(getField(row, ["role", "user_role", "designation"])) as
      | "student"
      | "faculty"
      | "hod";
    const department = getField(row, ["department", "dept", "branch"]);
    const enrollmentNumberRaw = getField(row, [
      "enrollmentNumber",
      "enrollment_number",
      "enrollment",
      "roll_no",
      "roll_number",
    ]);
    return {
      email,
      name,
      role,
      department,
      enrollmentNumber: role === "student" ? enrollmentNumberRaw : "",
    };
  });

export default function TenantAdminOnboarding() {
  const { token } = useAuth();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
  const authToken = token || localStorage.getItem("authToken");

  const [authMode, setAuthMode] = useState<"email_domain" | "roster_based">("email_domain");
  const [domains, setDomains] = useState("");

  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [rejectedRows, setRejectedRows] = useState<Array<{ rowNumber: number; reason: string }>>([]);
  const [loading, setLoading] = useState(false);

  const [rosterSavingId, setRosterSavingId] = useState<string | null>(null);
  const [rosterActiveDrafts, setRosterActiveDrafts] = useState<Record<string, boolean>>({});
  const [rosterDrafts, setRosterDrafts] = useState<Record<string, RosterDraft>>({});
  const [managingRosterId, setManagingRosterId] = useState<string | null>(null);

  const [rosterEntries, setRosterEntries] = useState<RosterEntry[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterRoleFilter, setRosterRoleFilter] = useState<"" | "student" | "faculty" | "hod">("");
  const [rosterDepartmentFilter, setRosterDepartmentFilter] = useState("");
  const [rosterIsActiveFilter, setRosterIsActiveFilter] = useState<"" | "true" | "false">("");
  const [rosterSearch, setRosterSearch] = useState("");
  const [lastRosterSyncAt, setLastRosterSyncAt] = useState<Date | null>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userRoleFilter, setUserRoleFilter] = useState<"" | "student" | "faculty" | "hod">("");
  const [userSearch, setUserSearch] = useState("");
  const [lastUsersSyncAt, setLastUsersSyncAt] = useState<Date | null>(null);
  const [managingUserId, setManagingUserId] = useState<string | null>(null);
  const [userSavingId, setUserSavingId] = useState<string | null>(null);
  const [userDrafts, setUserDrafts] = useState<
    Record<string, { name: string; role: "student" | "faculty" | "hod"; department: string; enrollmentNumber: string; status: "invited" | "active" | "disabled" }>
  >({});

  const [studentRows, setStudentRows] = useState<PreparedRosterRow[]>([]);
  const [studentFileName, setStudentFileName] = useState("");
  const [staffRows, setStaffRows] = useState<PreparedRosterRow[]>([]);
  const [staffFileName, setStaffFileName] = useState("");

  const loadTenantMeta = async () => {
    if (!tenantSlug) return;
    const health = await authApi.tenantHealth(tenantSlug);
    setAuthMode(health.tenant.authMode);
    setDomains((health.tenant.domains || []).join(", "));
  };

  const loadRoster = async () => {
    if (!tenantSlug || !authToken) return;
    setRosterLoading(true);
    try {
      const response = await tenantAdminApi.listRoster(authToken, tenantSlug, {
        role: rosterRoleFilter || undefined,
        department: rosterDepartmentFilter.trim() || undefined,
        isActive:
          rosterIsActiveFilter === ""
            ? undefined
            : rosterIsActiveFilter === "true",
      });
      setRosterEntries(response.entries);
      
      const drafts: Record<string, boolean> = {};
      const managementDrafts: Record<string, RosterDraft> = {};
      response.entries.forEach((r) => {
        drafts[r._id] = r.isActive;
        managementDrafts[r._id] = {
          name: r.name || "",
          role: r.role,
          department: r.department || "",
          enrollmentNumber: r.enrollmentNumber || "",
          isActive: r.isActive,
        };
      });
      setRosterActiveDrafts(drafts);
      setRosterDrafts(managementDrafts);
      
      setLastRosterSyncAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load roster");
    } finally {
      setRosterLoading(false);
    }
  };

  const loadUsers = async () => {
    if (!tenantSlug || !authToken) return;
    setUsersLoading(true);
    try {
      const response = await tenantAdminApi.listUsers(authToken, tenantSlug, {
        role: userRoleFilter || undefined,
      });
      setUsers(response.users);
      const drafts: Record<string, { name: string; role: "student" | "faculty" | "hod"; department: string; enrollmentNumber: string; status: "invited" | "active" | "disabled" }> = {};
      response.users.forEach((u) => {
        drafts[u._id] = {
          name: u.name || "",
          role: u.role,
          department: u.department || "",
          enrollmentNumber: u.enrollmentNumber || "",
          status: u.status,
        };
      });
      setUserDrafts(drafts);
      setLastUsersSyncAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        await loadTenantMeta();
        await loadRoster();
        await loadUsers();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to initialize");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug, token, rosterRoleFilter, rosterDepartmentFilter, rosterIsActiveFilter, userRoleFilter]);

  const parseRosterFile = async (file: File) => {
    const lower = file.name.toLowerCase();
    if (lower.endsWith(".csv")) {
      const content = await file.text();
      const lines = content.replace(/\r/g, "").split("\n").filter(Boolean);
      if (lines.length < 2) throw new Error("CSV must include headers and at least one data row.");
      const headers = parseCsvLine(lines[0]);
      const rows = lines.slice(1).map((line) => {
        const cols = parseCsvLine(line);
        const row: Record<string, string> = {};
        headers.forEach((h, i) => {
          row[h] = cols[i] || "";
        });
        return row;
      });
      return toPreparedRows(rows);
    }
    if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) throw new Error("Excel file has no sheet.");
      const sheet = workbook.Sheets[firstSheetName];
      const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      if (!jsonRows.length) throw new Error("Excel file has no data rows.");
      return toPreparedRows(jsonRows);
    }
    throw new Error("Please upload .csv, .xlsx, or .xls file");
  };

  const handleSelectFile = async (file: File | null, group: "students" | "staff") => {
    if (!file) return;
    setError("");
    setMsg("");
    setRejectedRows([]);
    try {
      const rows = await parseRosterFile(file);
      if (group === "students") {
        setStudentRows(rows);
        setStudentFileName(file.name);
      } else {
        setStaffRows(rows);
        setStaffFileName(file.name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse selected file");
    }
  };

  const uploadGroup = async (group: "students" | "staff") => {
    if (!tenantSlug || !authToken) return;
    const rows = group === "students" ? studentRows : staffRows;
    if (!rows.length) {
      setError(`Select ${group === "students" ? "students" : "faculty/hod"} file first.`);
      return;
    }

    setLoading(true);
    setMsg("");
    setError("");
    setRejectedRows([]);
    try {
      const res = await tenantAdminApi.uploadRosterRows(authToken, tenantSlug, rows, group);
      setMsg(
        `${group === "students" ? "Student" : "Faculty/HOD"} roster uploaded. inserted=${res.summary.inserted}, updated=${res.summary.updated}, rejected=${res.summary.rejected}`
      );
      setRejectedRows(res.rejected || []);
      await loadRoster();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const saveRosterStatus = async (entry: RosterEntry) => {
    if (!tenantSlug || !authToken) return;
    const nextStatus = rosterActiveDrafts[entry._id];
    if (nextStatus === undefined || nextStatus === entry.isActive) return;

    setRosterSavingId(entry._id);
    setError("");
    try {
      await tenantAdminApi.updateRosterEntry(authToken, tenantSlug, entry._id, {
        isActive: nextStatus,
      });
      setMsg(`Updated status for ${entry.name}`);
      await loadRoster();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update roster status");
    } finally {
      setRosterSavingId(null);
    }
  };

  const saveRosterProfile = async (entry: RosterEntry) => {
    if (!tenantSlug || !authToken) return;
    const draft = rosterDrafts[entry._id];
    if (!draft) return;

    setRosterSavingId(entry._id);
    setError("");
    try {
      await tenantAdminApi.updateRosterEntry(authToken, tenantSlug, entry._id, {
        name: draft.name.trim(),
        role: draft.role,
        department: draft.department.trim(),
        enrollmentNumber: draft.role === "student" ? draft.enrollmentNumber.trim() : "",
        isActive: draft.isActive,
      });

      setMsg(`Updated ${draft.name || entry.name}`);
      await loadRoster();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update roster entry");
    } finally {
      setRosterSavingId(null);
    }
  };

  const visibleRoster = useMemo(() => {
    const q = rosterSearch.trim().toLowerCase();
    if (!q) return rosterEntries;
    return rosterEntries.filter((r) =>
      [r.name, r.email, r.department || "", r.role, r.enrollmentNumber || ""]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rosterSearch, rosterEntries]);

  const managingEntry = useMemo(
    () => rosterEntries.find((r) => r._id === managingRosterId) || null,
    [managingRosterId, rosterEntries]
  );
  const managingDraft = managingEntry ? rosterDrafts[managingEntry._id] : null;
  const visibleUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.name, u.email, u.role, u.department || "", u.enrollmentNumber || "", u.status]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [users, userSearch]);
  const managingUser = useMemo(
    () => users.find((u) => u._id === managingUserId) || null,
    [users, managingUserId]
  );
  const managingUserDraft = managingUser ? userDrafts[managingUser._id] : null;

  const saveUserProfile = async (user: ManagedUser) => {
    if (!tenantSlug || !authToken) return;
    const draft = userDrafts[user._id];
    if (!draft) return;
    setUserSavingId(user._id);
    setError("");
    try {
      await tenantAdminApi.updateUser(authToken, tenantSlug, user._id, {
        name: draft.name.trim(),
        role: draft.role,
        department: draft.department.trim(),
        enrollmentNumber: draft.role === "student" ? draft.enrollmentNumber.trim() : "",
      });
      await tenantAdminApi.setUserStatus(authToken, tenantSlug, user._id, draft.status);
      setMsg(`Updated ${draft.name || user.name}`);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setUserSavingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#091222] text-slate-100 p-4">
      <div className="mx-auto max-w-[1450px] rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
          <div className="text-sm text-slate-300">Tenant Admin</div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => navigate(-1)} className="rounded-lg border border-white/20 px-3 py-1.5 text-sm">Back</button>
            <button onClick={() => tenantSlug && navigate(`/t/${tenantSlug}/admin`)} className="rounded-lg border border-emerald-300/40 px-3 py-1.5 text-sm text-emerald-200">Admin Dashboard</button>
          </div>
        </div>
        <h1 className="text-2xl font-bold">Tenant Admin Onboarding</h1>
        <p className="text-slate-300 mt-1">Tenant: {tenantSlug}</p>

        <div className="mt-3 rounded-xl border border-cyan-300/20 bg-cyan-500/10 px-4 py-3 text-sm">
          Current auth mode: <span className="font-bold text-cyan-200">{authMode}</span>
          {authMode === "email_domain" ? (
            <span className="ml-2 text-slate-300">Users signup with institution domain email.</span>
          ) : (
            <span className="ml-2 text-slate-300">Users signup via institute-registered roster email.</span>
          )}
        </div>
        {authMode === "email_domain" ? (
          <div className="mt-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
            <div className="font-semibold text-slate-200">Allowed Domains</div>
            {domains.trim() ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {domains
                  .split(",")
                  .map((d) => d.trim())
                  .filter(Boolean)
                  .map((domain) => (
                    <span key={domain} className="rounded-full border border-cyan-300/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100">
                      {domain}
                    </span>
                  ))}
              </div>
            ) : (
              <div className="mt-1 text-slate-400">No domains configured.</div>
            )}
          </div>
        ) : null}

        {authMode === "roster_based" ? (
          <>
            <div className="mt-4 rounded-xl border border-white/10 p-4">
              <h2 className="font-semibold">Upload Roster Files (Excel/CSV)</h2>
              <p className="text-sm text-slate-300 mt-1">Upload separate files for Students and Faculty/HOD.</p>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <h3 className="font-semibold text-cyan-200">Students File</h3>
                  <p className="mt-1 text-xs text-slate-400">Only student rows, enrollment required.</p>
                  <input
                    type="file"
                    accept=".csv,text/csv,.xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={(e) => handleSelectFile(e.target.files?.[0] || null, "students")}
                    className="mt-3 w-full text-sm"
                  />
                  <p className="mt-2 text-xs text-slate-400">Headers: <code>email,name,role,department,enrollmentNumber</code></p>
                  {studentFileName ? <p className="mt-2 text-sm text-emerald-200">Selected: {studentFileName} ({studentRows.length} rows)</p> : null}
                  <button
                    disabled={loading || studentRows.length === 0}
                    onClick={() => uploadGroup("students")}
                    className="mt-3 rounded-xl bg-emerald-400 px-4 py-2 text-slate-950 font-bold disabled:opacity-60"
                  >
                    Upload Students
                  </button>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <h3 className="font-semibold text-cyan-200">Faculty/HOD File</h3>
                  <p className="mt-1 text-xs text-slate-400">Only faculty/hod rows, enrollment not required.</p>
                  <input
                    type="file"
                    accept=".csv,text/csv,.xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={(e) => handleSelectFile(e.target.files?.[0] || null, "staff")}
                    className="mt-3 w-full text-sm"
                  />
                  <p className="mt-2 text-xs text-slate-400">Headers: <code>email,name,role,department</code></p>
                  {staffFileName ? <p className="mt-2 text-sm text-emerald-200">Selected: {staffFileName} ({staffRows.length} rows)</p> : null}
                  <button
                    disabled={loading || staffRows.length === 0}
                    onClick={() => uploadGroup("staff")}
                    className="mt-3 rounded-xl bg-emerald-400 px-4 py-2 text-slate-950 font-bold disabled:opacity-60"
                  >
                    Upload Faculty/HOD
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold">3) Roster Allowlist</h2>
                  <p className="text-sm text-slate-300">Users who are allowed to sign up via the roster.</p>
                </div>
                <p className="text-xs text-slate-400">
                  Last synced: {lastRosterSyncAt ? lastRosterSyncAt.toLocaleTimeString() : "not loaded"}
                </p>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[160px]">
                  <label className="text-xs text-slate-400">Role</label>
                  <select
                    value={rosterRoleFilter}
                    onChange={(e) => setRosterRoleFilter(e.target.value as "" | "student" | "faculty" | "hod")}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/20 p-2 text-sm"
                  >
                    <option value="">All roles</option>
                    <option value="student">Student</option>
                    <option value="faculty">Faculty</option>
                    <option value="hod">HOD</option>
                  </select>
                </div>
                <div className="min-w-[200px]">
                  <label className="text-xs text-slate-400">Department</label>
                  <input
                    value={rosterDepartmentFilter}
                    onChange={(e) => setRosterDepartmentFilter(e.target.value)}
                    placeholder="e.g. CSE"
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/20 p-2 text-sm"
                  />
                </div>
                <div className="min-w-[160px]">
                  <label className="text-xs text-slate-400">Active</label>
                  <select
                    value={rosterIsActiveFilter}
                    onChange={(e) => setRosterIsActiveFilter(e.target.value as "" | "true" | "false")}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/20 p-2 text-sm"
                  >
                    <option value="">All</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
                <div className="min-w-[240px] flex-1">
                  <label className="text-xs text-slate-400">Search</label>
                  <input
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    placeholder="Search name, email, role, dept, enrollment"
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/20 p-2 text-sm"
                  />
                </div>
                <button
                  onClick={loadRoster}
                  className="rounded-lg border border-emerald-300/40 px-4 py-2 text-emerald-200 font-semibold text-sm"
                >
                  Refresh roster
                </button>
                <button
                  onClick={() => {
                    setRosterRoleFilter("");
                    setRosterDepartmentFilter("");
                    setRosterIsActiveFilter("");
                    setRosterSearch("");
                  }}
                  className="rounded-lg border border-white/20 px-4 py-2 text-sm"
                >
                  Clear filters
                </button>
              </div>

              <div className="mt-4 max-h-[560px] overflow-auto rounded-lg border border-white/10">
                <table className="w-full text-sm min-w-[1050px]">
                  <thead className="bg-white/5 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Role</th>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-left">Department</th>
                      <th className="px-3 py-2 text-left">Enrollment</th>
                      <th className="px-3 py-2 text-left">Active</th>
                      <th className="px-3 py-2 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rosterLoading ? (
                      <tr>
                        <td className="px-3 py-3 text-slate-300" colSpan={7}>
                          Loading roster...
                        </td>
                      </tr>
                    ) : visibleRoster.length === 0 ? (
                      <tr>
                        <td className="px-3 py-3 text-slate-300" colSpan={7}>
                          No roster entries found.
                        </td>
                      </tr>
                    ) : (
                      visibleRoster.map((r) => (
                        <tr key={r._id} className="border-t border-white/10">
                          <td className="px-3 py-2">{r.name}</td>
                          <td className="px-3 py-2 capitalize">{r.role}</td>
                          <td className="px-3 py-2">{r.email}</td>
                          <td className="px-3 py-2">{r.department || "-"}</td>
                          <td className="px-3 py-2">{r.enrollmentNumber || "-"}</td>
                          <td className="px-3 py-2">
                            <select
                              value={rosterActiveDrafts[r._id] !== undefined ? (rosterActiveDrafts[r._id] ? "true" : "false") : (r.isActive ? "true" : "false")}
                              onChange={(e) => {
                                const value = e.target.value === "true";
                                setRosterActiveDrafts((prev) => ({
                                  ...prev,
                                  [r._id]: value,
                                }));
                                setRosterDrafts((prev) => ({
                                  ...prev,
                                  [r._id]: {
                                    ...(prev[r._id] || {
                                      name: r.name,
                                      role: r.role,
                                      department: r.department || "",
                                      enrollmentNumber: r.enrollmentNumber || "",
                                      isActive: r.isActive,
                                    }),
                                    isActive: value,
                                  },
                                }));
                              }}
                              className="rounded border border-white/15 bg-black/20 px-2 py-1 text-xs"
                            >
                              <option value="true">Yes</option>
                              <option value="false">No</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex gap-2">
                              <button
                                disabled={rosterSavingId === r._id || (rosterActiveDrafts[r._id] !== undefined ? rosterActiveDrafts[r._id] === r.isActive : true)}
                                onClick={() => saveRosterStatus(r)}
                                className="rounded bg-cyan-400 px-3 py-1 text-xs font-semibold text-slate-950 disabled:opacity-50"
                              >
                                {rosterSavingId === r._id ? "Saving..." : "Save status"}
                              </button>
                              <button
                                onClick={() => setManagingRosterId((prev) => (prev === r._id ? null : r._id))}
                                className="rounded border border-white/20 px-3 py-1 text-xs font-semibold"
                              >
                                {managingRosterId === r._id ? "Close" : "Manage"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {managingEntry && managingDraft ? (
                <div className="mt-4 rounded-xl border border-cyan-300/30 bg-cyan-500/10 p-4">
                  <h3 className="text-base font-bold">Manage Entry: {managingEntry.email}</h3>
                  <p className="mt-1 text-xs text-slate-300">
                    Edit profile fields and click Save entry. Student role requires enrollment number.
                  </p>

                  <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    <input
                      value={managingDraft.name}
                      onChange={(e) =>
                        setRosterDrafts((prev) => ({
                          ...prev,
                          [managingEntry._id]: { ...managingDraft, name: e.target.value },
                        }))
                      }
                      placeholder="Name"
                      className="rounded-lg border border-white/15 bg-black/20 p-2 text-sm"
                    />

                    <select
                      value={managingDraft.role}
                      onChange={(e) =>
                        setRosterDrafts((prev) => ({
                          ...prev,
                          [managingEntry._id]: {
                            ...managingDraft,
                            role: e.target.value as "student" | "faculty" | "hod",
                            enrollmentNumber:
                              e.target.value === "student" ? managingDraft.enrollmentNumber : "",
                          },
                        }))
                      }
                      className="rounded-lg border border-white/15 bg-black/20 p-2 text-sm"
                    >
                      <option value="student">student</option>
                      <option value="faculty">faculty</option>
                      <option value="hod">hod</option>
                    </select>

                    <select
                      value={managingDraft.isActive ? "true" : "false"}
                      onChange={(e) =>
                        setRosterDrafts((prev) => ({
                          ...prev,
                          [managingEntry._id]: {
                            ...managingDraft,
                            isActive: e.target.value === "true",
                          },
                        }))
                      }
                      className="rounded-lg border border-white/15 bg-black/20 p-2 text-sm"
                    >
                      <option value="true">Active (Yes)</option>
                      <option value="false">Active (No)</option>
                    </select>

                    <input
                      value={managingDraft.department}
                      onChange={(e) =>
                        setRosterDrafts((prev) => ({
                          ...prev,
                          [managingEntry._id]: { ...managingDraft, department: e.target.value },
                        }))
                      }
                      placeholder="Department"
                      className="rounded-lg border border-white/15 bg-black/20 p-2 text-sm"
                    />

                    <input
                      value={managingDraft.enrollmentNumber}
                      onChange={(e) =>
                        setRosterDrafts((prev) => ({
                          ...prev,
                          [managingEntry._id]: { ...managingDraft, enrollmentNumber: e.target.value },
                        }))
                      }
                      disabled={managingDraft.role !== "student"}
                      placeholder="Enrollment Number (student only)"
                      className="rounded-lg border border-white/15 bg-black/20 p-2 text-sm disabled:opacity-50"
                    />
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      disabled={rosterSavingId === managingEntry._id}
                      onClick={() => saveRosterProfile(managingEntry)}
                      className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"
                    >
                      {rosterSavingId === managingEntry._id ? "Saving..." : "Save entry"}
                    </button>
                    <button
                      onClick={() => setManagingRosterId(null)}
                      className="rounded-lg border border-white/20 px-4 py-2 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </>
        ) : null}
        <div className="mt-4 rounded-xl border border-white/10 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold">Registered Users</h2>
              <p className="text-sm text-slate-300">Student, faculty, and HOD users for this institution.</p>
            </div>
            <p className="text-xs text-slate-400">Last synced: {lastUsersSyncAt ? lastUsersSyncAt.toLocaleTimeString() : "not loaded"}</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[160px]">
              <label className="text-xs text-slate-400">Role</label>
              <select value={userRoleFilter} onChange={(e) => setUserRoleFilter(e.target.value as "" | "student" | "faculty" | "hod")} className="mt-1 w-full rounded-lg border border-white/15 bg-black/20 p-2 text-sm">
                <option value="">All roles</option><option value="student">Student</option><option value="faculty">Faculty</option><option value="hod">HOD</option>
              </select>
            </div>
            <div className="min-w-[240px] flex-1">
              <label className="text-xs text-slate-400">Search</label>
              <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search name, email, role, dept, enrollment, status" className="mt-1 w-full rounded-lg border border-white/15 bg-black/20 p-2 text-sm" />
            </div>
            <button onClick={loadUsers} className="rounded-lg border border-emerald-300/40 px-4 py-2 text-emerald-200 font-semibold text-sm">Refresh users</button>
          </div>
          <div className="mt-4 max-h-[520px] overflow-auto rounded-lg border border-white/10">
            <table className="w-full text-sm min-w-[1000px]">
              <thead className="bg-white/5 sticky top-0"><tr><th className="px-3 py-2 text-left">Name</th><th className="px-3 py-2 text-left">Role</th><th className="px-3 py-2 text-left">Email</th><th className="px-3 py-2 text-left">Department</th><th className="px-3 py-2 text-left">Enrollment</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Action</th></tr></thead>
              <tbody>
                {usersLoading ? <tr><td className="px-3 py-3 text-slate-300" colSpan={7}>Loading users...</td></tr> : visibleUsers.length === 0 ? <tr><td className="px-3 py-3 text-slate-300" colSpan={7}>No registered users found.</td></tr> : visibleUsers.map((u) => (
                  <tr key={u._id} className="border-t border-white/10"><td className="px-3 py-2">{u.name}</td><td className="px-3 py-2 capitalize">{u.role}</td><td className="px-3 py-2">{u.email}</td><td className="px-3 py-2">{u.department || "-"}</td><td className="px-3 py-2">{u.enrollmentNumber || "-"}</td><td className="px-3 py-2 capitalize">{u.status}</td><td className="px-3 py-2"><button onClick={() => setManagingUserId((prev) => (prev === u._id ? null : u._id))} className="rounded border border-white/20 px-3 py-1 text-xs font-semibold">{managingUserId === u._id ? "Close" : "Manage"}</button></td></tr>
                ))}
              </tbody>
            </table>
          </div>
          {managingUser && managingUserDraft ? (
            <div className="mt-4 rounded-xl border border-cyan-300/30 bg-cyan-500/10 p-4">
              <h3 className="text-base font-bold">Manage User: {managingUser.email}</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <input value={managingUserDraft.name} onChange={(e) => setUserDrafts((prev) => ({ ...prev, [managingUser._id]: { ...managingUserDraft, name: e.target.value } }))} className="rounded-lg border border-white/15 bg-black/20 p-2 text-sm" />
                <select value={managingUserDraft.role} onChange={(e) => setUserDrafts((prev) => ({ ...prev, [managingUser._id]: { ...managingUserDraft, role: e.target.value as "student" | "faculty" | "hod", enrollmentNumber: e.target.value === "student" ? managingUserDraft.enrollmentNumber : "" } }))} className="rounded-lg border border-white/15 bg-black/20 p-2 text-sm"><option value="student">student</option><option value="faculty">faculty</option><option value="hod">hod</option></select>
                <select value={managingUserDraft.status} onChange={(e) => setUserDrafts((prev) => ({ ...prev, [managingUser._id]: { ...managingUserDraft, status: e.target.value as "invited" | "active" | "disabled" } }))} className="rounded-lg border border-white/15 bg-black/20 p-2 text-sm"><option value="invited">invited</option><option value="active">active</option><option value="disabled">disabled</option></select>
                <input value={managingUserDraft.department} onChange={(e) => setUserDrafts((prev) => ({ ...prev, [managingUser._id]: { ...managingUserDraft, department: e.target.value } }))} className="rounded-lg border border-white/15 bg-black/20 p-2 text-sm" />
                <input value={managingUserDraft.enrollmentNumber} onChange={(e) => setUserDrafts((prev) => ({ ...prev, [managingUser._id]: { ...managingUserDraft, enrollmentNumber: e.target.value } }))} disabled={managingUserDraft.role !== "student"} className="rounded-lg border border-white/15 bg-black/20 p-2 text-sm disabled:opacity-50" />
              </div>
              <div className="mt-3 flex gap-2">
                <button disabled={userSavingId === managingUser._id} onClick={() => saveUserProfile(managingUser)} className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">{userSavingId === managingUser._id ? "Saving..." : "Save user"}</button>
                <button onClick={() => setManagingUserId(null)} className="rounded-lg border border-white/20 px-4 py-2 text-sm">Cancel</button>
              </div>
            </div>
          ) : null}
        </div>

        {msg ? <p className="mt-4 text-emerald-300">{msg}</p> : null}
        {error ? <p className="mt-4 text-rose-300">{error}</p> : null}
        {rejectedRows.length > 0 ? (
          <div className="mt-4 rounded-xl border border-rose-300/30 bg-rose-500/10 p-4">
            <h3 className="font-semibold text-rose-200">Rejected Rows</h3>
            <ul className="mt-2 space-y-1 text-sm text-rose-100">
              {rejectedRows.slice(0, 12).map((r) => (
                <li key={`${r.rowNumber}-${r.reason}`}>Row {r.rowNumber}: {r.reason}</li>
              ))}
            </ul>
            {rejectedRows.length > 12 ? <p className="mt-2 text-xs text-rose-200">Showing first 12 of {rejectedRows.length} rejected rows.</p> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
