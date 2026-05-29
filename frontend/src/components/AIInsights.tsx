type AIInsightsProps = {
  role: "student" | "faculty" | "principal" | "hod";
  department?: string;
};

const insights: Record<string, string[]> = {
  student: [
    "📉 Your attendance dropped this week. Try to maintain above 75%.",
    "📘 Focus more on Mathematics — it's your weak area.",
    "🧠 Practice 10 medium-level questions daily.",
  ],
  faculty: [
    "📊 Class performance improved by 12% this week.",
    "⚠️ 4 students need attention due to low attendance.",
    "📝 Assign revision work before the next assessment.",
  ],
  principal: [
    "🏫 Institution performance is stable this week.",
    "📌 CSE department shows the best academic growth.",
    "⚠️ Review attendance alerts for at-risk students.",
  ],
  hod: [
    "📈 Department attendance is improving.",
    "⚠️ Some faculty reports are still pending.",
    "🎯 Focus on students below average performance.",
  ],
};

const hodInsights: Record<string, string[]> = {
  cse: [
    "💻 CSE attendance is improving this week.",
    "⚠️ Review students struggling in programming subjects.",
    "🎯 Focus on AI Lab and Data Structures performance.",
  ],
  ece: [
    "📡 ECE lab performance needs monitoring.",
    "⚠️ Digital Systems reports are pending.",
    "🎯 Focus on VLSI and communication subjects.",
  ],
  eee: [
    "⚡ EEE attendance needs attention.",
    "⚠️ Power Systems performance is slightly low.",
    "🎯 Focus on machines lab and circuit analysis.",
  ],
  mech: [
    "⚙️ MECH workshop performance is improving.",
    "⚠️ CAD lab attendance needs review.",
    "🎯 Focus on thermal engineering performance.",
  ],
};

export default function AIInsights({ role, department }: AIInsightsProps) {
  const selectedInsights =
    role === "hod" && department
      ? hodInsights[department] || insights.hod
      : insights[role];

  return (
    <div className="card-hover mt-8 rounded-3xl border border-slate-200/60 hover:border-gold-500 bg-white/90 p-6 text-slate-900 shadow-card backdrop-blur-xl dark:border-blue-500/10 dark:bg-[#0C1330] dark:text-white transition-all">
      <h2 className="mb-4 text-xl font-black text-gold-600 dark:text-blue-400">
        AI Insights
      </h2>

      <ul className="space-y-3">
        {selectedInsights.map((item, index) => (
          <li
            key={index}
            className="card-hover rounded-2xl border border-slate-200/40 bg-slate-50 p-4 text-slate-700 dark:border-blue-500/10 dark:bg-[#111B44] dark:text-white"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
