import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

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

const leaveCollection = collection(db, "leaveRequests");

export const applyLeave = async (
  leaveData: Omit<LeaveRequest, "id" | "status" | "createdAt">
) => {
  await addDoc(leaveCollection, {
    ...leaveData,
    status: "Pending",
    createdAt: serverTimestamp(),
  });
};

export const listenLeaveRequests = (
  callback: (leaves: LeaveRequest[]) => void
) => {
  const q = query(leaveCollection);

  return onSnapshot(q, (snapshot) => {
    const leaves = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as LeaveRequest[];

    callback(leaves);
  });
};

export const updateLeaveStatus = async (
  id: string,
  status: "Approved" | "Rejected"
) => {
  const leaveRef = doc(db, "leaveRequests", id);
  await updateDoc(leaveRef, { status });
};