export type LeaveRequest = {
  id?: string;
  studentName: string;
  role: "Student" | "Teacher" | "Staff";
  department?: string;
  reason: string;
  fromDate: string;
  toDate: string;
  status: "Pending" | "Approved" | "Rejected";
  createdAt?: any;
};

const LEAVE_STORAGE_KEY = "leaveRequests";

const readLeaves = (): LeaveRequest[] => {
  try {
    const raw = localStorage.getItem(LEAVE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LeaveRequest[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLeaves = (leaves: LeaveRequest[]) => {
  localStorage.setItem(LEAVE_STORAGE_KEY, JSON.stringify(leaves));
  window.dispatchEvent(new Event("leaveRequestsUpdated"));
};

export const applyLeave = async (
  leaveData: Omit<LeaveRequest, "id" | "status" | "createdAt">
) => {
  const leaves = readLeaves();
  leaves.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...leaveData,
    status: "Pending",
    createdAt: new Date().toISOString(),
  });
  writeLeaves(leaves);
};

export const listenLeaveRequests = (
  callback: (leaves: LeaveRequest[]) => void
) => {
  const emit = () => callback(readLeaves());
  emit();
  window.addEventListener("leaveRequestsUpdated", emit);
  return () => window.removeEventListener("leaveRequestsUpdated", emit);
};

export const updateLeaveStatus = async (
  id: string,
  status: "Approved" | "Rejected"
) => {
  const leaves = readLeaves().map((leave) =>
    leave.id === id ? { ...leave, status } : leave
  );
  writeLeaves(leaves);
};
