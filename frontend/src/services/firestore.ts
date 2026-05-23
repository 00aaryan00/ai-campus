import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export async function getStudentDoc() {
  const ref = doc(db, "dashboards", "student");
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return snap.data() as {
    name: string;
    attendance: number;
    grade: string;
    chartData: { name: string; value: number }[];
    rank: number;
    percentile: number;
    feedback: string;
    weakArea: string;
    leaderboardName: string;
    nearestCompetitor: string;
    competitorDelta: number;
    recommendedTopic: string;
    practiceLevel: string;
    practiceQuestions: number;
  };
}